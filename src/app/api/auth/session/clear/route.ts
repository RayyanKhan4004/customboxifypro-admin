import { NextResponse } from "next/server";

const ACCESS_COOKIE =
  process.env.ADMIN_COOKIE_ACCESS_NAME ?? "boxify_access";
const REFRESH_COOKIE =
  process.env.ADMIN_COOKIE_REFRESH_NAME ?? "boxify_refresh";
const COOKIE_PATHS = ["/", "/api/v1"];
const EXPIRED_AT = "Thu, 01 Jan 1970 00:00:00 GMT";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });

  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    for (const path of COOKIE_PATHS) {
      response.headers.append(
        "Set-Cookie",
        `${name}=; Path=${path}; Expires=${EXPIRED_AT}; HttpOnly; SameSite=Lax`,
      );
    }
  }

  return response;
}
