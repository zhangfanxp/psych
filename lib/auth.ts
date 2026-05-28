import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { getDatabaseConfig } from "./config";
import { query } from "./db";

export const SESSION_COOKIE = "mind_session";

type SessionPayload = {
  userId: number;
  username: string;
  roleCode: string;
  realName: string;
  exp: number;
};

type UserRow = RowDataPacket & {
  id: number;
  username: string;
  password_hash: string;
  real_name: string;
  status: string;
  role_code: string;
  role_name: string;
};

function secret() {
  const config = getDatabaseConfig();
  return process.env.AUTH_SECRET || crypto.createHash("sha256").update(`${config.user}:${config.password}:${config.database}`).digest("hex");
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">) {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 8
  };
  const encoded = base64url(JSON.stringify(fullPayload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
  if (payload.exp < Date.now()) return null;
  return payload;
}

export async function authenticate(username: string, password: string) {
  const rows = await query<UserRow[]>(
    `SELECT u.id, u.username, u.password_hash, u.real_name, u.status, r.code AS role_code, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.username = :username
     LIMIT 1`,
    { username }
  );
  const user = rows[0];
  if (!user || user.status !== "enabled") return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return {
    id: user.id,
    username: user.username,
    realName: user.real_name,
    roleCode: user.role_code,
    roleName: user.role_name
  };
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export function getSessionFromRequest(request: NextRequest) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(response: NextResponse, token: string, remember = false) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 14 : 60 * 60 * 8
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function isAdminRole(roleCode?: string) {
  return roleCode === "super_admin" || roleCode === "admin" || roleCode === "teacher";
}

export function requireSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return { session: null, response: NextResponse.json({ message: "请先登录" }, { status: 401 }) };
  }
  return { session, response: null };
}

export function requireAdmin(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return { session: null, response: NextResponse.json({ message: "请先登录" }, { status: 401 }) };
  }
  if (!isAdminRole(session.roleCode)) {
    return { session: null, response: NextResponse.json({ message: "当前账号没有访问权限" }, { status: 403 }) };
  }
  return { session, response: null };
}

export function requireSuperAdmin(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return { session: null, response: NextResponse.json({ message: "请先登录" }, { status: 401 }) };
  }
  if (session.roleCode !== "super_admin") {
    return { session: null, response: NextResponse.json({ message: "当前账号没有访问权限" }, { status: 403 }) };
  }
  return { session, response: null };
}
