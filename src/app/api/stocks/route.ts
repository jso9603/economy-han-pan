// app/api/stocks/route.ts
// ✅ 서버에서 Yahoo Finance 호출 → CORS 없음
// ✅ revalidate: 300 → 5분 캐시 (유저 1,000명이 와도 5분에 1번만 호출)

import { NextResponse } from "next/server";

export const revalidate = 300; // 5분 캐시

const STOCKS = [
  { symbol: "^KS11", label: "KOSPI" },
  { symbol: "^IXIC", label: "NASDAQ" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "KRW=X", label: "USD/KRW" },
];

export async function GET() {
  const results = await Promise.all(
    STOCKS.map(async (s) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s.symbol)}?interval=1d&range=2d`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 300 }, // Next.js fetch 레벨 캐시
          }
        );
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice ?? null;
        const prevClose = meta?.chartPreviousClose ?? null;
        const change = price !== null && prevClose !== null ? price - prevClose : null;
        const changePercent =
          change !== null && prevClose ? (change / prevClose) * 100 : null;
        return { ...s, price, change, changePercent };
      } catch {
        return { ...s, price: null, change: null, changePercent: null, error: "조회 실패" };
      }
    })
  );

  return NextResponse.json(results, {
    headers: {
      // 브라우저도 5분 캐시
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
