import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

type RecordRow = RowDataPacket & Record<string, unknown>;

export async function GET(request: NextRequest) {
  const guard = requireSuperAdmin(request);
  if (guard.response) return guard.response;
  const params = request.nextUrl.searchParams;
  const filters = {
    name: `%${params.get("name") || ""}%`,
    username: `%${params.get("username") || ""}%`,
    studentClass: params.get("studentClass") || "",
    level: params.get("level") || "",
    startDate: params.get("startDate") || "",
    endDate: params.get("endDate") || ""
  };
  const dateConditions: string[] = [];
  if (filters.startDate) dateConditions.push("s.completed_at >= CONCAT(:startDate, ' 00:00:00')");
  if (filters.endDate) dateConditions.push("s.completed_at <= CONCAT(:endDate, ' 23:59:59')");

  try {
    const rows = await query<RecordRow[]>(
      `SELECT s.id, u.real_name AS realName, u.username, u.student_class AS studentClass,
              t.name AS testName, s.total_score AS totalScore, s.result_level_name AS resultLevel,
              s.result_level_code AS resultLevelCode, DATE_FORMAT(s.completed_at, '%Y-%m-%d %H:%i:%s') AS completedAt
       FROM test_sessions s
       JOIN users u ON u.id = s.user_id
       JOIN tests t ON t.id = s.test_id
       WHERE s.status = 'completed'
         AND (:name = '%%' OR u.real_name LIKE :name)
         AND (:username = '%%' OR u.username LIKE :username)
         AND (:studentClass = '' OR u.student_class = :studentClass)
         AND (:level = '' OR s.result_level_code = :level)
         ${dateConditions.length ? `AND ${dateConditions.join(" AND ")}` : ""}
       ORDER BY s.completed_at DESC
       LIMIT 300`,
      filters
    );
    return NextResponse.json({ records: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "获取答题记录失败" }, { status: 500 });
  }
}
