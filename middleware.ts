import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}
("next-auth/middleware");

export const config = {
  // matcher: [
  //   // 보호할 경로 지정
  //   "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  // ],
  matcher: [],
};
