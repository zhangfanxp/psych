"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

type Result = {
  testName: string;
  completedAt: string;
  message: string;
  advice: string | null;
  showNormalNotice: boolean;
  normalNoticeTitle: string | null;
  normalNoticeMessage: string | null;
  score: number | null;
  level: string | null;
};

function ResultContent() {
  const params = useSearchParams();
  const sessionId = params.get("sessionId");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [showNormalModal, setShowNormalModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/test/result?sessionId=${sessionId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "获取结果失败");
        setResult(data);
        setShowNormalModal(Boolean(data.showNormalNotice));
      } catch (err) {
        setError(err instanceof Error ? err.message : "获取结果失败");
      }
    }
    if (sessionId) load();
  }, [sessionId]);

  if (error) return <div className="glass-card content-card"><div className="error-box">{error}</div></div>;
  if (!result) return <div className="glass-card content-card">正在整理你的完成信息...</div>;

  const chartData = result.score == null ? [
    { name: "专注", value: 72 }, { name: "表达", value: 78 }, { name: "支持", value: 86 }
  ] : [
    { name: "得分", value: result.score }, { name: "参考线", value: 56 }, { name: "关注线", value: 65 }
  ];

  return (
    <>
      <div className="glass-card content-card fade-in">
        <div className="result-hero">
          <div>
            <div className="brand-pill">测评已完成</div>
            <h1 style={{ marginTop: 20 }}>你已经完成本次心理成长测评</h1>
            <p className="lead">{result.message}</p>
            <ul className="soft-list">
              <li>这份结果只是一个参考，不代表诊断结论。</li>
              <li>如果持续感到不舒服，建议和信任的老师、家长或专业心理老师聊一聊。</li>
              <li>{result.score == null ? "你的作答已安全保存，后续如有需要，老师会以温和的方式提供支持。" : `总分：${result.score}，状态参考：${result.level}`}</li>
            </ul>
          </div>
          <div className="chart-card">
            <div className="result-mark">✓</div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 12 }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" fill="#86A8E7" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="actions" style={{ marginTop: 24 }}>
          <Link className="btn secondary" href="/welcome">返回首页</Link>
          <Link className="btn" href="/test">再测一次</Link>
        </div>
      </div>
      {showNormalModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="glass-card modal" style={{ maxWidth: 560, textAlign: "center" }}>
            <div className="result-mark" style={{ margin: "0 auto 18px" }}>✓</div>
            <h2 style={{ margin: "0 0 12px", fontSize: 30 }}>{result.normalNoticeTitle}</h2>
            <p className="lead" style={{ marginBottom: 24 }}>{result.normalNoticeMessage}</p>
            <button className="btn" onClick={() => setShowNormalModal(false)}>谢谢，我知道了</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function ResultPage() {
  return (
    <main className="page-shell">
      <section className="center-wrap">
        <Suspense fallback={<div className="glass-card content-card">正在加载...</div>}>
          <ResultContent />
        </Suspense>
      </section>
    </main>
  );
}
