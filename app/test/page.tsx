"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentQuestion = {
  completed: boolean;
  sessionId: number;
  currentIndex: number;
  total: number;
  question: {
    id: number;
    displayNumber: number;
    originalNumber: number;
    content: string;
    options: Array<{ label: string; value: "yes" | "no" }>;
  };
};

export default function TestPage() {
  const router = useRouter();
  const [data, setData] = useState<CurrentQuestion | null>(null);
  const [selected, setSelected] = useState<"yes" | "no" | "">("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadCurrent(sessionId: number) {
    const response = await fetch(`/api/test/current?sessionId=${sessionId}`);
    const current = await response.json();
    if (!response.ok) throw new Error(current.message || "获取题目失败");
    if (current.completed) {
      router.replace(`/test/result?sessionId=${sessionId}`);
      return;
    }
    setData(current);
    setSelected("");
  }

  useEffect(() => {
    let mounted = true;
    async function boot() {
      try {
        const start = await fetch("/api/test/start", { method: "POST" });
        const startData = await start.json();
        if (!start.ok) throw new Error(startData.message || "开始测评失败");
        if (mounted) await loadCurrent(startData.sessionId);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "请先登录后再答题");
      } finally {
        setLoading(false);
      }
    }
    boot();
    return () => { mounted = false; };
  }, []);

  async function submit() {
    if (!data || !selected) {
      setMessage("请先选择一个答案，再慢慢进入下一题。");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/test/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: data.sessionId, questionId: data.question.id, selectedValue: selected })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "提交失败");
      if (result.completed) {
        router.replace(`/test/result?sessionId=${data.sessionId}`);
      } else {
        await loadCurrent(data.sessionId);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "提交失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="page-shell"><section className="center-wrap"><div className="glass-card test-card">正在为你准备题目...</div></section></main>;
  }

  if (!data) {
    return <main className="page-shell"><section className="center-wrap"><div className="glass-card test-card"><div className="error-box">{message || "暂时无法进入测评"}</div></div></section></main>;
  }

  const progress = Math.round((data.currentIndex / data.total) * 100);

  return (
    <main className="page-shell">
      <section className="center-wrap fade-in">
        <div className="glass-card test-card" key={data.question.id}>
          <div className="progress-meta">
            <span>第 {data.currentIndex + 1} / {data.total} 题</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <h1 className="question-title">{data.question.content}</h1>
          <div className="option-list">
            {data.question.options.map((option) => (
              <button key={option.value} className={`option-card ${selected === option.value ? "selected" : ""}`} onClick={() => setSelected(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          {message && <p className="error-box" style={{ marginTop: 16 }}>{message}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button className="btn" disabled={!selected || submitting} onClick={submit}>{data.currentIndex + 1 === data.total ? "提交" : submitting ? "保存中..." : "下一题"}</button>
          </div>
          <p className="tip">慢慢来，按照真实感受选择就好。</p>
        </div>
      </section>
    </main>
  );
}
