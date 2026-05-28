"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/ui/LogoutButton";

type Me = {
  roleCode: string;
};

export function TopNav({ active }: { active?: string }) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    async function loadMe() {
      const response = await fetch("/api/auth/me");
      if (!response.ok) return;
      const data = await response.json();
      setMe(data.user);
    }
    loadMe();
  }, []);

  const links = [{ href: "/welcome", label: "欢迎页", key: "welcome" }];
  if (me?.roleCode === "super_admin") {
    links.push(
      { href: "/admin/records", label: "答题记录", key: "records" },
      { href: "/admin/users", label: "用户列表", key: "users" },
      { href: "/admin/roles", label: "角色管理", key: "roles" }
    );
  }

  return (
    <nav className="top-nav">
      <Link href="/welcome" className="brand-pill">心理成长测评系统</Link>
      <div className="nav-links">
        {links.map((link) => (
          <Link className={`nav-link ${active === link.key ? "active" : ""}`} href={link.href} key={link.key}>
            {link.label}
          </Link>
        ))}
        <LogoutButton />
      </div>
    </nav>
  );
}
