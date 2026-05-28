import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

type DetailRow = RowDataPacket & Record<string, unknown>;
type AnswerRow = RowDataPacket & Record<string, unknown>;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = requireSuperAdmin(request);
  if (guard.response) return guard.response;
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!sessionId) return NextResponse.json({ message: "记录不存在" }, { status: 400 });

  try {
    const details = await query<DetailRow[]>(
      `SELECT s.id, u.real_name AS realName, u.username, u.student_class AS studentClass,
              t.name AS testName, s.total_score AS totalScore, s.result_level_name AS resultLevel,
              DATE_FORMAT(s.completed_at, '%Y-%m-%d %H:%i:%s') AS completedAt
       FROM test_sessions s
       JOIN users u ON u.id = s.user_id
       JOIN tests t ON t.id = s.test_id
       WHERE s.id = :sessionId AND s.status = 'completed'
       LIMIT 1`,
      { sessionId }
    );
    const detail = details[0];
    if (!detail) return NextResponse.json({ message: "记录不存在" }, { status: 404 });
    const answers = await query<AnswerRow[]>(
      `SELECT question_number AS questionNumber, question_content_snapshot AS content,
              selected_label AS selectedLabel, score, DATE_FORMAT(answered_at, '%Y-%m-%d %H:%i:%s') AS answeredAt
       FROM answers
       WHERE session_id = :sessionId
       ORDER BY id ASC`,
      { sessionId }
    );
    return NextResponse.json({ detail, answers });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "获取答题详情失败" }, { status: 500 });
  }
}
