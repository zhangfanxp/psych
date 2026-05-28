import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getPool, query } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

type RoleRow = RowDataPacket & { id: number; is_system: number; code: string };
type PermissionRow = RowDataPacket & { id: number; code: string };

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = requireSuperAdmin(request);
  if (guard.response) return guard.response;
  const { id } = await context.params;
  const roleId = Number(id);
  const body = await request.json();
  if (!roleId) return NextResponse.json({ message: "角色不存在" }, { status: 400 });

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [roleRows] = await conn.query<RoleRow[]>("SELECT * FROM roles WHERE id = ? FOR UPDATE", [roleId]);
    const role = roleRows[0];
    if (!role) throw new Error("ROLE_NOT_FOUND");

    if (!role.is_system) {
      await conn.execute(
        "UPDATE roles SET name = ?, description = ?, status = ? WHERE id = ?",
        [body.name || role.code, body.description || null, body.status === "disabled" ? "disabled" : "enabled", roleId]
      );
    }

    if (Array.isArray(body.permissionCodes) && role.code !== "super_admin") {
      const [permissionRows] = await conn.query<PermissionRow[]>(
        `SELECT id, code FROM permissions WHERE code IN (${body.permissionCodes.map(() => "?").join(",") || "''"})`,
        body.permissionCodes
      );
      await conn.execute("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);
      for (const permission of permissionRows) {
        await conn.execute("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [roleId, permission.id]);
      }
    }

    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    return NextResponse.json({ message: "更新角色失败" }, { status: 500 });
  } finally {
    conn.release();
  }
}
