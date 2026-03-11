import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function GET(request) {
  const sessionCookie = request.cookies.get('user_session');

  if (!sessionCookie) {
    return NextResponse.json({
        authenticated: false,
        user: null
    }, { status: 200 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload: user } = await jwtVerify(sessionCookie.value, secret);

    return NextResponse.json({
        authenticated: true,
        user: user
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
        authenticated: false,
        user: null
    }, { status: 200 });
  }
}
