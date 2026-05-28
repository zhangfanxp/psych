"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/layout/TopNav";

type User = { id: number; realName: string; username: string; phone: string; studentClass: string; roleCode: string; roleName: string; status: string; createdAt: string };
type Role = { id: number; code: string; name: string };

const emptyForm = { realName: "", username: "", password: "123456", phone: "", studentClass: "", roleCode: "student", status: "enabled" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/users");
    if (response.status === 401) { window.location.href = "/login"; return; }
    if (response.status === 403) { window.location.href = "/welcome"; return; }
    const data = await response.json();
    setUsers(data.users || []); setRoles(data.roles || []);
  }
  useEffect(() => { load(); }, []);

  function edit(user: User) {
    setEditing(user);
    setForm({ realName: user.realName, username: user.username, password: "", phone: user.phone || "", studentClass: user.studentClass || "", roleCode: user.roleCode, status: user.status });
    setShowForm(true);
  }

  async function save() {
    const url = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
    const response = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) { alert(data.message || "保存失败"); return; }
    setShowForm(false); setEditing(null); setForm(emptyForm); load();
  }

  async function resetPassword(user: User) {
    if (!confirm(`确定将 ${user.realName} 的密码重置为 123456 吗？`)) return;
    await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resetPassword: true, newPassword: "123456" }) });
    alert("密码已重置为 123456");
  }

  return (
    <main className="page-shell"><TopNav active="users" /><section className="admin-shell fade-in"><div className="glass-card admin-card"><div className="admin-title"><h1>用户列表</h1><button className="btn" onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}>新增用户</button></div></div><div className="glass-card admin-card table-wrap"><table><thead><tr><th>序号</th><th>用户姓名</th><th>账号</th><th>手机号</th><th>角色</th><th>班级</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>{users.map((user, index) => <tr key={user.id}><td>{index + 1}</td><td>{user.realName}</td><td>{user.username}</td><td>{user.phone || "-"}</td><td><span className="tag">{user.roleName}</span></td><td>{user.studentClass || "-"}</td><td><span className={`tag ${user.status === "enabled" ? "success" : "warn"}`}>{user.status === "enabled" ? "启用" : "禁用"}</span></td><td>{user.createdAt}</td><td className="actions"><button className="mini-btn" onClick={() => edit(user)}>编辑</button><button className="mini-btn" onClick={() => resetPassword(user)}>重置密码</button></td></tr>)}</tbody></table></div></section>{showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><div className="glass-card modal" onClick={(e) => e.stopPropagation()}><div className="admin-title"><h2>{editing ? "编辑用户" : "新增用户"}</h2><button className="mini-btn" onClick={() => setShowForm(false)}>关闭</button></div><div className="filters"><input className="input" placeholder="用户姓名" value={form.realName} onChange={(e) => setForm({ ...form, realName: e.target.value })} /><input className="input" placeholder="用户账号" disabled={!!editing} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /><input className="input" placeholder="初始密码" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><input className="input" placeholder="手机号" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><input className="input" placeholder="班级" value={form.studentClass} onChange={(e) => setForm({ ...form, studentClass: e.target.value })} /><select className="select" value={form.roleCode} onChange={(e) => setForm({ ...form, roleCode: e.target.value })}>{roles.map((role) => <option value={role.code} key={role.code}>{role.name}</option>)}</select><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="enabled">启用</option><option value="disabled">禁用</option></select><button className="btn" onClick={save}>保存</button></div></div></div>}</main>
  );
}
