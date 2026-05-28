import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";

function parseJson<T>(value: unknown): T {
  return typeof value === "string" ? JSON.parse(value) : (value as T);
}

type SessionRow = RowDataPacket & {
  id: number;
  user_id: number;
  status: string;
  question_order: string | number[];
  option_orders: string | Record<string, string[]>;
  current_index: number;
};
type QuestionRow = RowDataPacket & { id: number; question_number: number; content: string };

export async function GET(request: NextRequest) {
  const guard = requireSession(request);
  if (guard.response) return guard.response;
  const session = guard.session!;
  const sessionId = Number(request.nextUrl.searchParams.get("sessionId"));
  if (!sessionId) return NextResponse.json({ message: "缺少测评会话" }, { status: 400 });

  try {
    const sessions = await query<SessionRow[]>(
      "SELECT * FROM test_sessions WHERE id = :sessionId AND user_id = :userId LIMIT 1",
      { sessionId, userId: session.userId }
    );
    const testSession = sessions[0];
    if (!testSession) return NextResponse.json({ message: "测评会话不存在" }, { status: 404 });
    if (testSession.status === "completed") return NextResponse.json({ completed: true, sessionId });

    const order = parseJson<number[]>(testSession.question_order);
    const optionOrders = parseJson<Record<string, string[]>>(testSession.option_orders);
    const questionId = order[testSession.current_index];
    const questions = await query<QuestionRow[]>("SELECT id, question_number, content FROM questions WHERE id = :questionId LIMIT 1", { questionId });
    const question = questions[0];
    if (!question) return NextResponse.json({ message: "题目不存在" }, { status: 404 });

    return NextResponse.json({
      completed: false,
      sessionId,
      currentIndex: testSession.current_index,
      total: order.length,
      question: {
        id: question.id,
        displayNumber: testSession.current_index + 1,
        originalNumber: question.question_number,
        content: question.content,
        options: (optionOrders[String(question.id)] || ["是", "否"]).map((label) => ({
          label,
          value: label === "是" ? "yes" : "no"
        }))
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "获取题目失败，请稍后再试" }, { status: 500 });
  }
}
