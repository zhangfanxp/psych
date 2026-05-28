import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getPool, query, execute } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { optionLabel, shuffle } from "@/lib/assessment";

function parseJson<T>(value: unknown): T {
  return typeof value === "string" ? JSON.parse(value) : (value as T);
}

type TestRow = RowDataPacket & { id: number };
type QuestionRow = RowDataPacket & { id: number };
type SessionRow = RowDataPacket & { id: number; question_order: string | number[] };

export async function POST(request: NextRequest) {
  const guard = requireSession(request);
  if (guard.response) return guard.response;
  const session = guard.session!;

  try {
    const tests = await query<TestRow[]>("SELECT id FROM tests WHERE code = 'student_anxiety_100' AND status = 'enabled' LIMIT 1");
    const test = tests[0];
    if (!test) return NextResponse.json({ message: "测评配置尚未初始化，请先运行 npm run db:init" }, { status: 500 });

    const existing = await query<SessionRow[]>(
      `SELECT id, question_order FROM test_sessions WHERE user_id = :userId AND test_id = :testId AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1`,
      { userId: session.userId, testId: test.id }
    );
    if (existing[0]) {
      return NextResponse.json({ sessionId: existing[0].id, resumed: true });
    }

    const questions = await query<QuestionRow[]>(
      "SELECT id FROM questions WHERE test_id = :testId AND status = 'enabled' ORDER BY question_number ASC",
      { testId: test.id }
    );
    const questionOrder = shuffle(questions.map((item) => item.id));
    const optionOrders = Object.fromEntries(
      questionOrder.map((id) => [id, shuffle<"yes" | "no">(["yes", "no"]).map(optionLabel)])
    );

    const result = await execute(
      `INSERT INTO test_sessions (user_id, test_id, question_order, option_orders)
       VALUES (:userId, :testId, CAST(:questionOrder AS JSON), CAST(:optionOrders AS JSON))`,
      {
        userId: session.userId,
        testId: test.id,
        questionOrder: JSON.stringify(questionOrder),
        optionOrders: JSON.stringify(optionOrders)
      }
    );

    return NextResponse.json({ sessionId: result.insertId, resumed: false });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "开始测评失败，请稍后再试" }, { status: 500 });
  }
}
