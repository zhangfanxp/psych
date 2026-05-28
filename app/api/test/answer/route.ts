import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getResultLevel } from "@/lib/assessment";

function parseJson<T>(value: unknown): T {
  return typeof value === "string" ? JSON.parse(value) : (value as T);
}

type SessionRow = RowDataPacket & {
  id: number;
  user_id: number;
  test_id: number;
  status: string;
  question_order: string | number[];
  current_index: number;
};
type QuestionRow = RowDataPacket & { id: number; question_number: number; content: string; yes_score: number; no_score: number };
type SumRow = RowDataPacket & { total_score: number };

export async function POST(request: NextRequest) {
  const guard = requireSession(request);
  if (guard.response) return guard.response;
  const user = guard.session!;
  const body = await request.json();
  const sessionId = Number(body.sessionId);
  const questionId = Number(body.questionId);
  const selectedValue = body.selectedValue === "yes" ? "yes" : body.selectedValue === "no" ? "no" : null;

  if (!sessionId || !questionId || !selectedValue) {
    return NextResponse.json({ message: "请选择答案后再继续" }, { status: 400 });
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [sessionRows] = await conn.query<SessionRow[]>(
      "SELECT * FROM test_sessions WHERE id = ? AND user_id = ? FOR UPDATE",
      [sessionId, user.userId]
    );
    const testSession = sessionRows[0];
    if (!testSession) throw new Error("SESSION_NOT_FOUND");
    if (testSession.status === "completed") throw new Error("SESSION_COMPLETED");

    const order = parseJson<number[]>(testSession.question_order);
    const expectedQuestionId = Number(order[testSession.current_index]);
    if (expectedQuestionId !== questionId) throw new Error("QUESTION_SEQUENCE_CHANGED");

    const [questionRows] = await conn.query<QuestionRow[]>("SELECT * FROM questions WHERE id = ? LIMIT 1", [questionId]);
    const question = questionRows[0];
    if (!question) throw new Error("QUESTION_NOT_FOUND");

    const score = selectedValue === "yes" ? question.yes_score : question.no_score;
    await conn.execute(
      `INSERT INTO answers (session_id, user_id, test_id, question_id, question_number, question_content_snapshot, selected_value, selected_label, score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, user.userId, testSession.test_id, question.id, question.question_number, question.content, selectedValue, selectedValue === "yes" ? "是" : "否", score]
    );

    const nextIndex = testSession.current_index + 1;
    const completed = nextIndex >= order.length;
    if (completed) {
      const [sumRows] = await conn.query<SumRow[]>("SELECT COALESCE(SUM(score), 0) AS total_score FROM answers WHERE session_id = ?", [sessionId]);
      const totalScore = Number(sumRows[0]?.total_score || 0);
      const level = getResultLevel(totalScore);
      await conn.execute(
        `UPDATE test_sessions SET status = 'completed', current_index = ?, total_score = ?, result_level_code = ?, result_level_name = ?, completed_at = NOW() WHERE id = ?`,
        [nextIndex, totalScore, level.code, level.name, sessionId]
      );
    } else {
      await conn.execute("UPDATE test_sessions SET current_index = ? WHERE id = ?", [nextIndex, sessionId]);
    }

    await conn.commit();
    return NextResponse.json({ completed, sessionId });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    const message = error instanceof Error && error.message === "SESSION_COMPLETED"
      ? "本次测评已经完成"
      : error instanceof Error && error.message === "QUESTION_SEQUENCE_CHANGED"
        ? "当前题目已作答或顺序不一致，请刷新页面继续"
        : "提交答案失败，请稍后再试";
    return NextResponse.json({ message }, { status: 400 });
  } finally {
    conn.release();
  }
}
