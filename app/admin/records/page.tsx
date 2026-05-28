"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/layout/TopNav";

type RecordItem = { id: number; realName: string; username: string; studentClass: string; testName: string; totalScore: number; resultLevel: string; resultLevelCode: string; completedAt: string };
type Detail = { detail: Record<string, string | number>; answers: Array<{ questionNumber: number; content: string; selectedLabel: string; score: number; answeredAt: string }> };

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [filters, setFilters] = useState({ name: "", username: "", level: "", startDate: "", endDate: "" });
  const [detail, setDetail] = useState<Detail | null>(null);

  async function load() {
    const qs = new URLSearchParams(filters).toString();
    const response = await fetch(`/api/admin/records?${qs}`);
    if (response.status === 401) { window.location.href = "/login"; return; }
    if (response.status === 403) { window.location.href = "/welcome"; return; }
    const data = await response.json();
    setRecords(data.records || []);
  }

  async function openDetail(id: number) {
    const response = await fetch(`/api/admin/records/${id}`);
    const data = await response.json();
    setDetail(data);
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="page-shell">
      <TopNav active="records" />
      <section className="admin-shell fade-in">
        <div className="glass-card admin-card">
          <div className="admin-title"><h1>答题记录</h1><button className="btn secondary" onClick={() => window.print()}>导出 / 打印</button></div>
          <div className="filters">
            <input className="input" placeholder="学生姓名" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
            <input className="input" placeholder="学号 / 用户名" value={filters.username} onChange={(e) => setFilters({ ...filters, username: e.target.value })} />
            <select className="select" value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
              <option value="">全部结果</option><option value="normal">正常</option><option value="mild_anxiety">轻度焦虑</option><option value="needs_support">需要干预</option>
            </select>
            <input className="input" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
            <button className="btn" onClick={load}>查询</button>
          </div>
        </div>
        <div className="glass-card admin-card table-wrap">
          <table><thead><tr><th>序号</th><th>学生姓名</th><th>账号</th><th>班级</th><th>测试名称</th><th>总分</th><th>结果等级</th><th>完成时间</th><th>操作</th></tr></thead>
            <tbody>{records.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{item.realName}</td><td>{item.username}</td><td>{item.studentClass || "-"}</td><td>{item.testName}</td><td>{item.totalScore}</td><td><span className={`tag ${item.resultLevelCode === "normal" ? "success" : "warn"}`}>{item.resultLevel}</span></td><td>{item.completedAt}</td><td><button className="mini-btn" onClick={() => openDetail(item.id)}>查看详情</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
      {detail && <div className="modal-backdrop" onClick={() => setDetail(null)}><div className="glass-card modal" onClick={(e) => e.stopPropagation()}><div className="admin-title"><h2>答题详情</h2><button className="mini-btn" onClick={() => setDetail(null)}>关闭</button></div><div className="info-grid"><div className="info-tile"><strong>{detail.detail.realName}</strong><span>学生姓名</span></div><div className="info-tile"><strong>{detail.detail.totalScore}</strong><span>总分</span></div><div className="info-tile"><strong>{detail.detail.resultLevel}</strong><span>结果等级</span></div><div className="info-tile"><strong>{detail.detail.completedAt}</strong><span>完成时间</span></div></div><div className="table-wrap"><table><thead><tr><th>题号</th><th>题目内容</th><th>答案</th><th>分值</th><th>时间</th></tr></thead><tbody>{detail.answers.map((answer, index) => <tr key={index}><td>{index + 1}</td><td>{answer.content}</td><td>{answer.selectedLabel}</td><td>{answer.score}</td><td>{answer.answeredAt}</td></tr>)}</tbody></table></div></div></div>}
    </main>
  );
}
