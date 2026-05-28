import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const remember = Boolean(body.remember);

    if (!username || !password) {
      return NextResponse.json({ message: "账号和密码不能为空" }, { status: 400 });
    }

    const user = await authenticate(username, password);
    if (!user) {
      return NextResponse.json({ message: "账号或密码不正确，请检查后再试" }, { status: 401 });
    }

    const token = createSessionToken({
      userId: user.id,
      username: user.username,
      realName: user.realName,
      roleCode: user.roleCode
    });
    const redirectPath = user.roleCode === "super_admin" ? "/admin/records" : "/welcome";
    const response = NextResponse.json({ user, redirectPath });
    setSessionCookie(response, token, remember);
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "登录服务暂时不可用，请稍后再试" }, { status: 500 });
  }
}
