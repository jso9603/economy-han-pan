// app/api/article/route.ts
import { NextRequest, NextResponse } from "next/server";

interface ArticleResult {
  paragraphs: string[];
  thumbnail: string | null;
  error?: string;
}

const ALLOWED_HOSTS = [
  "news.sbs.co.kr",
  "www.yna.co.kr",
  "www.hankyung.com",
  "www.mk.co.kr",
  "www.chosun.com",
  "www.joongang.co.kr",
];

function decodeHtml(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(html: string): string {
  return decodeHtml(
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function getMeta(html: string, prop: string): string | null {
  const m =
    html.match(
      new RegExp(
        `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']{4,})["']`,
        "i"
      )
    ) ??
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']{4,})["'][^>]+property=["']${prop}["']`,
        "i"
      )
    );
  return m ? decodeHtml(m[1]) : null;
}

function extractParagraphs(html: string): string[] {
  // 1. main_text 블록 먼저 잘라냄 → 사이드바/관련기사 영역 차단
  const mainBlock =
    html.match(/<div[^>]+class="[^"]*main_text[^"]*"[^>]*>([\s\S]*)/i)?.[1] ??
    html;

  // 2. articleBody itemprop 또는 text_area 클래스
  const bodyHtml =
    mainBlock.match(
      /<div[^>]+itemprop="articleBody"[^>]*>([\s\S]*?)<div[^>]+class="[^"]*(?:relate|recommend|ad_|copy)[^"]*"/i
    )?.[1] ??
    mainBlock.match(/<div[^>]+itemprop="articleBody"[^>]*>([\s\S]*)/i)?.[1] ??
    mainBlock.match(
      /<div[^>]+class="[^"]*text_area[^"]*"[^>]*>([\s\S]*)/i
    )?.[1] ??
    "";

  if (!bodyHtml) return [];

  // 3. <br> 기준으로 단락 분리 (SBS는 <p> 없이 <br>로 구분)
  const lines = bodyHtml
    .split(/<br\s*\/?>/gi)
    .map((seg) => stripTags(seg))
    .filter((t) => t.length > 15 && !/^[▶◀■●▲▼※]/.test(t));

  if (lines.length > 0) return lines;

  // 4. <p> 태그 폴백
  return [...bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((t) => t.length > 15);
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url") ?? "";
  const url = rawUrl
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();

  if (!url.startsWith("http")) {
    return NextResponse.json(
      { error: "유효하지 않은 URL", paragraphs: [], thumbnail: null },
      { status: 400 }
    );
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return NextResponse.json(
      { error: "URL 파싱 실패", paragraphs: [], thumbnail: null },
      { status: 400 }
    );
  }

  if (!ALLOWED_HOSTS.includes(hostname)) {
    return NextResponse.json(
      {
        error: `허용되지 않은 도메인: ${hostname}`,
        paragraphs: [],
        thumbnail: null,
      },
      { status: 403 }
    );
  }

  try {
    const res = await fetch(url, {
      headers: {
        // 실제 Chrome 브라우저처럼 위장
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: `https://${hostname}/`,
        "sec-ch-ua":
          '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      // 캐시 없이 항상 새로 fetch (봇 감지 우회)
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `HTTP ${res.status}`, paragraphs: [], thumbnail: null },
        { status: 502 }
      );
    }

    const html = await res.text();

    // 디버그: 서버 콘솔에서 HTML 구조 확인 (파싱 실패 시 원인 파악용)
    if (process.env.NODE_ENV === "development") {
      const keys = [
        "main_text",
        "text_area",
        "articleBody",
        "article_cont",
        "w_article_left",
      ];
      const found = keys.filter((k) => html.includes(k));
      console.log(`[article] ${url}`);
      console.log(
        `[article] html length: ${html.length}, status: ${res.status}`
      );
      console.log(`[article] found classes: ${found.join(", ") || "없음"}`);
      if (html.length < 500)
        console.log(`[article] html preview:`, html.slice(0, 500));
    }

    const thumbnail = getMeta(html, "og:image");
    const paragraphs = extractParagraphs(html);

    return NextResponse.json(
      {
        paragraphs,
        thumbnail,
        error: paragraphs.length === 0 ? "본문 파싱 실패" : undefined,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error(`[article] ${url}:`, msg);
    return NextResponse.json(
      { error: msg, paragraphs: [], thumbnail: null },
      { status: 500 }
    );
  }
}
