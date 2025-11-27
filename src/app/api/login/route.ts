import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "appraisal_auth";
// For now we hard-code 1234. Later you can swap to process.env.APP_PASSWORD.
const PASSWORD = process.env.APP_PASSWORD || "1234";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || password !== PASSWORD) {
      return NextResponse.json(
        { ok: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true });

    // Set an auth cookie that middleware will read
    res.cookies.set(COOKIE_NAME, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // required for Vercel HTTPS
      sameSite: "lax",
      path: "/", // visible on all routes
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return res;
  } catch (err) {
    console.error("POST /api/login error", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
