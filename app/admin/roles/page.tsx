"use client";

import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/layout/TopNav";

type Role = { id: number; code: string; name: string; description: string; status: string; isSystem: number; createdAt: string; permissionCodes: string | null };
type Permission = { id: number; code: string; name: string; permissionType: "page" | "button"; parentCode: string | null; sortOrder: number };

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editing, setEditing] = useState<Role | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [form, setForm] = useState({ code: "", name: "", description: "", status: "enabled" });

  async function load() {
    const response = await fetch("/api/admin/roles");
    if (response.status === 401) { window.location.href = "/login"; return; }
    if (response.status === 403) { window.location.href = "/welcome"; return; }
    const data = await response.json();
    setRoles(data.roles || []); setPermissions(data.permissions || []);
  }
  useEffect(() => { load(); }, []);

  const pages = useMemo(() => permissions.filter((p) => p.permissionType === "page"), [permissions]);
  const buttonsOf = (pageCode: string) => permissions.filter((p) => p.parentCode === pageCode);

  function open(role: Role) {
    setEditing(role);
    setChecked(role.permissionCodes ? role.permissionCodes.split(",") : []);
    setForm({ code: role.code, name: role.name, description: role.description || "", status: role.status });
  }

  function toggle(code: string, enabled: boolean) {
    const permission = permissions.find((p) => p.code === code);
    let next = new Set(checked);
    if (enabled) {
      next.add(code);
      if (permission?.parentCode) next.add(permission.parentCode);
    } else {
      next.delete(code);
      if (permission?.permissionType === "page") buttonsOf(permission.code).forEach((child) => next.delete(child.code));
    }
    setChecked([...next]);
  }

  async function save() {
    if (!editing) return;
    const response = await fetch(`/api/admin/roles/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, permissionCodes: checked }) });
    const data = await response.json();
    if (!response.ok) { alert(data.message || "保存失败"); return; }
    setEditing(null); load();
  }

  return (
    <main className="page-shell"><TopNav active="roles" /><section className="admin-shell fade-in"><div className="glass-card admin-card"><div className="admin-title"><h1>角色管理</h1><span className="tag">页面级 + 按钮级权限</span></div></div><div className="glass-card admin-card table-wrap"><table><thead><tr><th>序号</th><th>角色名称</th><th>角色编码</th><th>描述</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>{roles.map((role, index) => <tr key={role.id}><td>{index + 1}</td><td>{role.name}</td><td>{role.code}</td><td>{role.description}</td><td><span className={`tag ${role.status === "enabled" ? "success" : "warn"}`}>{role.status === "enabled" ? "启用" : "禁用"}</span></td><td>{role.createdAt}</td><td><button className="mini-btn" onClick={() => open(role)}>权限配置</button></td></tr>)}</tbody></table></div></section>{editing && <div className="modal-backdrop" onClick={() => setEditing(null)}><div className="glass-card modal" onClick={(e) => e.stopPropagation()}><div className="admin-title"><h2>{editing.name} 权限配置</h2><button className="mini-btn" onClick={() => setEditing(null)}>关闭</button></div>{editing.code === "super_admin" && <div className="error-box">超级管理员为内置角色，默认拥有全部权限，不支持修改权限。</div>}<div className="filters" style={{ margin: "16px 0" }}><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!!editing.isSystem} /><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={!!editing.isSystem} /><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={!!editing.isSystem}><option value="enabled">启用</option><option value="disabled">禁用</option></select></div><div className="permission-grid">{pages.map((page) => <div className="permission-box" key={page.code}><label className="checkbox-line" style={{ color: "var(--text)", fontWeight: 700 }}><input type="checkbox" checked={checked.includes(page.code)} disabled={editing.code === "super_admin"} onChange={(e) => toggle(page.code, e.target.checked)} /> {page.name}</label>{buttonsOf(page.code).map((button) => <label className="checkbox-line" key={button.code}><input type="checkbox" checked={checked.includes(button.code)} disabled={editing.code === "super_admin" || !checked.includes(page.code)} onChange={(e) => toggle(button.code, e.target.checked)} /> {button.name}</label>)}</div>)}</div><div className="actions" style={{ marginTop: 20 }}><button className="btn secondary" onClick={() => setChecked(permissions.map((p) => p.code))} disabled={editing.code === "super_admin"}>全选</button><button className="btn secondary" onClick={() => setChecked([])} disabled={editing.code === "super_admin"}>取消全选</button><button className="btn" onClick={save}>保存</button></div></div></div>}</main>
  );
}
