import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

type RoleRow = RowDataPacket & { id: number };

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = requireSuperAdmin(request);
  if (guard.response) return guard.response;
  const { id } = await context.params;
  const userId = Number(id);
  const body = await request.json();
  if (!userId) return NextResponse.json({ message: "用户不存在" }, { status: 400 });

  try {
    if (body.resetPassword) {
      const newPassword = String(body.newPassword || "123456");
      if (newPassword.length < 6) return NextResponse.json({ message: "新密码至少 6 位" }, { status: 400 });
      const hash = await bcrypt.hash(newPassword, 10);
      await execute("UPDATE users SET password_hash = :hash WHERE id = :userId", { hash, userId });
      return NextResponse.json({ ok: true });
    }

    const roleCode = String(body.roleCode || "student");
    const roles = await query<RoleRow[]>("SELECT id FROM roles WHERE code = :roleCode LIMIT 1", { roleCode });
    if (!roles[0]) return NextResponse.json({ message: "角色不存在" }, { status: 400 });
    await execute(
      `UPDATE users SET real_name = :realName, phone = :phone, student_class = :studentClass,
              role_id = :roleId, status = :status
       WHERE id = :userId`,
      {
        realName: body.realName || "未命名用户",
        phone: body.phone || null,
        studentClass: body.studentClass || null,
        roleId: roles[0].id,
        status: body.status === "disabled" ? "disabled" : "enabled",
        userId
      }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "更新用户失败" }, { status: 500 });
  }
}
