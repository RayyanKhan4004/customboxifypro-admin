import { NextRequest, NextResponse } from "next/server";

const backendOrigin = (process.env.BACKEND_ORIGIN ?? "http://localhost:3002").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 15_000;

type RouteContext = { params: Promise<{ path: string[] }> };

async function relay(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");
  headers.delete("accept-encoding");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(
      `${backendOrigin}/api/v1/${path.join("/")}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
        redirect: "manual",
        signal: controller.signal,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          success: false,
          statusCode: 504,
          code: "UPSTREAM_TIMEOUT",
          message: "The API did not respond in time. Please try again.",
          details: [],
          requestId: "",
        },
        { status: 504 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        statusCode: 502,
        code: "UPSTREAM_UNAVAILABLE",
        message: "The API is currently unreachable. Please try again shortly.",
        details: [],
        requestId: "",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseHeaders = new Headers(response.headers);
  for (const header of [
    "set-cookie",
    "connection",
    "content-encoding",
    "content-length",
    "keep-alive",
    "transfer-encoding",
  ]) {
    responseHeaders.delete(header);
  }

  const isJson = response.headers
    .get("content-type")
    ?.toLowerCase()
    .includes("application/json");
  const responseBody = isJson ? await response.arrayBuffer() : response.body;
  const relayed = new NextResponse(responseBody, {
    status: response.status,
    headers: responseHeaders,
  });
  const isHttpLocalhost = request.nextUrl.hostname === "localhost" && request.nextUrl.protocol === "http:";

  for (const cookie of response.headers.getSetCookie()) {
    relayed.headers.append(
      "set-cookie",
      isHttpLocalhost
        ? cookie.replace(/;\s*secure/gi, "").replace(/;\s*domain=[^;]+/gi, "")
        : cookie,
    );
  }

  return relayed;
}

export const dynamic = "force-dynamic";

export const GET = relay;
export const POST = relay;
export const PATCH = relay;
export const PUT = relay;
export const DELETE = relay;
export const OPTIONS = relay;
