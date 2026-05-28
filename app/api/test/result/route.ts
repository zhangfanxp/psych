import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getResultLevel } from "@/lib/assessment";

type ResultRow = RowDataPacket & {
  id: number;
  user_id: number;
  total_score: number;
  result_level_code: string;
  result_level_name: string;
  completed_at: string;
  test_name: string;
};

export async function GET(request: NextRequest) {
  const guard = requireSession(request);
  if (guard.response) return guard.response;
  const user = guard.session!;
  const sessionId = Number(request.nextUrl.searchParams.get("sessionId"));
  if (!sessionId) return NextResponse.json({ message: "缺少测评会话" }, { status: 400 });

  try {
    const rows = await query<ResultRow[]>(
      `SELECT s.*, t.name AS test_name
       FROM test_sessions s
       JOIN tests t ON t.id = s.test_id
       WHERE s.id = :sessionId AND s.user_id = :userId AND s.status = 'completed'
       LIMIT 1`,
      { sessionId, userId: user.userId }
    );
    const result = rows[0];
    if (!result) return NextResponse.json({ message: "暂未找到已完成的测评结果" }, { status: 404 });
    const level = getResultLevel(Number(result.total_score));
    const superAdmin = user.roleCode === "super_admin";
    const showNormalNotice = !superAdmin && result.result_level_code === "normal";

    return NextResponse.json({
      sessionId,
      testName: result.test_name,
      completedAt: result.completed_at,
      message: level.studentMessage,
      advice: superAdmin ? level.adminAdvice : null,
      showNormalNotice,
      normalNoticeTitle: showNormalNotice ? "一切正常，请继续相信自己" : null,
      normalNoticeMessage: showNormalNotice
        ? "从这次测评结果看，你近期的整体状态比较平稳。谢谢你认真地照顾自己的感受，也请继续保持这份觉察力：规律作息、适度表达、遇到压力时主动寻求支持，都是很棒的能力。"
        : null,
      score: superAdmin ? result.total_score : null,
      level: superAdmin ? result.result_level_name : null,
      levelCode: superAdmin ? result.result_level_code : null
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "获取结果失败，请稍后再试" }, { status: 500 });
  }
}
