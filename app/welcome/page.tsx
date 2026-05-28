import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";

export default function WelcomePage() {
  return (
    <main className="page-shell">
      <TopNav active="welcome" />
      <section className="center-wrap fade-in">
        <div className="glass-card content-card">
          <div className="brand-pill">不是考试，是一次自我探索</div>
          <h1 style={{ marginTop: 20 }}>你好，欢迎来到今天的心理成长小测评</h1>
          <p className="lead">这里没有对错答案，只需要选择最接近你真实感受的选项。我们会把你的答题过程安全保存，结果仅作为成长参考。</p>
          <div className="info-grid">
            <div className="info-tile"><strong>100</strong><span>道单选题</span></div>
            <div className="info-tile"><strong>是 / 否</strong><span>轻量选择</span></div>
            <div className="info-tile"><strong>10-15</strong><span>分钟左右</span></div>
            <div className="info-tile"><strong>安全</strong><span>记录保存</span></div>
          </div>
          <ul className="soft-list">
            <li>请根据最近一段时间的真实感受作答。</li>
            <li>每道题只能回答一次，提交后不支持修改。</li>
            <li>如果感到不舒服，可以暂停，并寻求老师、家长或心理老师帮助。</li>
          </ul>
          <Link className="btn" href="/test" style={{ display: "inline-flex", alignItems: "center" }}>开始答题 →</Link>
        </div>
      </section>
    </main>
  );
}
