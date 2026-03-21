// app/api/stocks/search/route.ts
// ✅ 서버에서 Yahoo Finance 호출 → CORS 없음
// ✅ revalidate: 60 → 1분 캐시

import { NextRequest, NextResponse } from "next/server";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
        query
      )}&lang=ko&region=KR&quotesCount=8&newsCount=0`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) throw new Error("Yahoo Finance 요청 실패");

    const data = await res.json();

    const results = (data.quotes ?? [])
      .filter((q: any) => q.quoteType === "EQUITY")
      .map((q: any) => ({
        ticker: q.symbol,
        name: q.shortname ?? q.longname ?? q.symbol,
        exchange: q.exchange ?? "",
        market: q.market ?? "",
        // 한국 주식은 .KS / .KQ 접미사로 구분
        isKorean: q.market === "kr_market",
      }));

    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
