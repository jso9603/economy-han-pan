// app/api/news/route.ts
// ✅ 서버에서 NewsAPI 호출 → CORS 없음, API 키 노출 없음
// ✅ revalidate: 3600 → 1시간 캐시 (유저 수천 명이 와도 1시간에 1번만 호출)
//    → NewsAPI Developer 무료 플랜(100req/day) 유지 가능!

import { NextResponse } from "next/server";

export const revalidate = 3600; // 1시간 캐시

export async function GET() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "서버 환경변수 누락: NEWS_API_KEY" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=economy+OR+stock+OR+finance&language=en&sortBy=publishedAt&pageSize=8&apiKey=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();

    if (data.status !== "ok") {
      throw new Error(data.message || "NewsAPI 오류");
    }

    const articles = (data.articles || []).map((a: {
      title: string;
      source: { name: string };
      publishedAt: string;
      url: string;
      description: string;
    }) => ({
      title: a.title,
      source: a.source?.name || "",
      publishedAt: a.publishedAt,
      url: a.url,
      description: a.description || "",
    }));

    return NextResponse.json(articles, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "뉴스 조회 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
