import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import { execute, query } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

type UserRow = RowDataPacket & Record<string, unknown>;
type RoleRow = RowDataPacket & { id: number; code: string; name: string };

export async function GET(request: NextRequest) {
  const guard = requireSuperAdmin(request);
  if (guard.response) return guard.response;
  const params = request.nextUrl.searchParams;
  const filters = {
    name: `%${params.get("name") || ""}%`,
    username: `%${params.get("username") || ""}%`,
    phone: `%${params.get("phone") || ""}%`,
    role: params.get("role") || "",
    status: params.get("status") || "",
    studentClass: params.get("studentClass") || ""
  };
  try {
    const users = await query<UserRow[]>(
      `SELECT u.id, u.real_name AS realName, u.username, u.phone, u.student_class AS studentClass,
              u.status, r.code AS roleCode, r.name AS roleName, DATE_FORMAT(u.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE (:name = '%%' OR u.real_name LIKE :name)
         AND (:username = '%%' OR u.username LIKE :username)
         AND (:phone = '%%' OR COALESCE(u.phone, '') LIKE :phone)
         AND (:role = '' OR r.code = :role)
         AND (:status = '' OR u.status = :status)
         AND (:studentClass = '' OR u.student_class = :studentClass)
       ORDER BY u.created_at DESC
       LIMIT 300`,
      filters
    );
    const roles = await query<RoleRow[]>("SELECT id, code, name FROM roles WHERE status = 'enabled' ORDER BY id ASC");
    return NextResponse.json({ users, roles });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "获取用户列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = requireSuperAdmin(request);
  if (guard.response) return guard.response;
  const body = await request.json();
  const username = String(body.username || "").trim();
  const realName = String(body.realName || "").trim();
  const password = String(body.password || "");
  const roleCode = String(body.roleCode || "student");
  if (!username || !realName || password.length < 6) {
    return NextResponse.json({ message: "请填写用户名、姓名和至少 6 位初始密码" }, { status: 400 });
  }
  try {
    const roles = await query<RoleRow[]>("SELECT id FROM roles WHERE code = :roleCode LIMIT 1", { roleCode });
    if (!roles[0]) return NextResponse.json({ message: "角色不存在" }, { status: 400 });
    const hash = await bcrypt.hash(password, 10);
    await execute(
      `INSERT INTO users (username, password_hash, real_name, phone, student_class, role_id, status)
       VALUES (:username, :hash, :realName, :phone, :studentClass, :roleId, :status)`,
      {
        username,
        hash,
        realName,
        phone: body.phone || null,
        studentClass: body.studentClass || null,
        roleId: roles[0].id,
        status: body.status === "disabled" ? "disabled" : "enabled"
      }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "新增用户失败，账号可能已存在" }, { status: 500 });
  }
}
