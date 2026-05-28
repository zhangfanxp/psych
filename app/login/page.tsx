"use client";

import { useState } from "react";
import { Eye, EyeOff, Moon, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("账号和密码不能为空");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, remember })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "登录失败");
      window.location.href = data.redirectPath;
    } catch (err) {
      setError(err instanceof Error ? err.message : "账号或密码不正确，请检查后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="login-grid fade-in">
        <div>
          <div className="brand-pill"><Sparkles size={18} /> Calm Tech 心理陪伴</div>
          <h1 className="hero-title">探索<span className="gradient-text">真实的自己</span></h1>
          <p className="hero-copy">通过温柔的心理成长测评，了解你的情绪、学习压力与内在状态。这里没有对错，只有更靠近自己的小小一步。</p>
          <div className="orb-stack" aria-hidden="true">
            <div className="orb">☁</div>
            <div className="orb">✦</div>
            <div className="orb"><Moon size={30} /></div>
          </div>
        </div>
        <form className="glass-card form-card" onSubmit={submit}>
          <h2>欢迎回来</h2>
          <p>登录后，我们会为你保存答题进度和记录。</p>
          <div className="form-stack">
            {error && <div className="error-box">{error}</div>}
            <label>
              <span>用户名 / 学号</span>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入账号" />
            </label>
            <label>
              <span>密码</span>
              <div style={{ position: "relative" }}>
                <input className="input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" style={{ paddingRight: 52 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="mini-btn" style={{ position: "absolute", right: 8, top: 8 }} aria-label="显示或隐藏密码">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <label className="checkbox-line" style={{ marginTop: 0 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> 记住我
            </label>
            <button className="btn" disabled={loading}>{loading ? "正在登录..." : "登录"}</button>
          </div>
        </form>
      </section>
    </main>
  );
}
