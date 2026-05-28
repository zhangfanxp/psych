import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { execute, getPool, query } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

type RoleRow = RowDataPacket & Record<string, unknown>;
type PermissionRow = RowDataPacket & Record<string, unknown>;

type InsertRow = RowDataPacket & { id: number };

export async function GET(request: NextRequest) {
  const guard = requireSuperAdmin(request);
  if (guard.response) return guard.response;
  const params = request.nextUrl.searchParams;
  const filters = {
    name: `%${params.get("name") || ""}%`,
    status: params.get("status") || ""
  };
  try {
    const roles = await query<RoleRow[]>(
      `SELECT r.id, r.code, r.name, r.description, r.status, r.is_system AS isSystem,
              DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
              GROUP_CONCAT(p.code ORDER BY p.sort_order SEPARATOR ',') AS permissionCodes
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE (:name = '%%' OR r.name LIKE :name OR r.code LIKE :name)
         AND (:status = '' OR r.status = :status)
       GROUP BY r.id
       ORDER BY r.id ASC`,
      filters
    );
    const permissions = await query<PermissionRow[]>(
      "SELECT id, code, name, permission_type AS permissionType, parent_code AS parentCode, sort_order AS sortOrder FROM permissions ORDER BY sort_order ASC"
    );
    return NextResponse.json({ roles, permissions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "获取角色列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = requireSuperAdmin(request);
  if (guard.response) return guard.response;
  const body = await request.json();
  const code = String(body.code || "").trim();
  const name = String(body.name || "").trim();
  if (!code || !name) return NextResponse.json({ message: "请填写角色编码和角色名称" }, { status: 400 });

  try {
    const result = await execute(
      `INSERT INTO roles (code, name, description, status, is_system)
       VALUES (:code, :name, :description, :status, 0)`,
      {
        code,
        name,
        description: body.description || null,
        status: body.status === "disabled" ? "disabled" : "enabled"
      }
    );
    return NextResponse.json({ id: result.insertId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "新增角色失败，编码可能已存在" }, { status: 500 });
  }
}
