// app/api/stocks/[ticker]/route.ts
// ✅ 서버에서 Yahoo Finance 호출 → CORS 없음
// ✅ revalidate: 300 → 5분 캐시
// ✅ 가격 데이터 + 기관 보유 현황(US) + AI 매수/매도 의견

import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  try {
    // ── 1. 가격 + 기본 메타 ──────────────────────────────────
    const [chartRes, quoteRes] = await Promise.all([
      fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          ticker
        )}?interval=1d&range=3mo`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 300 },
        }
      ),
      fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          ticker
        )}?interval=1d&range=1d`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 300 },
        }
      ),
      // fetch(
      //   `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${process.env.FMP_API_KEY}`,
      //   { next: { revalidate: 3600 } }
      // ).catch(() => null),
    ]);

    const chartData = await chartRes.json();
    const quoteData = await quoteRes.json();

    const meta = chartData?.chart?.result?.[0]?.meta ?? {};
    const timestamps = chartData?.chart?.result?.[0]?.timestamp ?? [];
    const closes =
      chartData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const volumes =
      chartData?.chart?.result?.[0]?.indicators?.quote?.[0]?.volume ?? [];

    // 최근 60거래일만 사용
    const history = timestamps
      .slice(-60)
      .map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        close: closes[timestamps.length - 60 + i] ?? null,
        volume: volumes[timestamps.length - 60 + i] ?? null,
      }))
      .filter((d: any) => d.close !== null);

    const quote = quoteData?.chart?.result?.[0]?.meta ?? {};

    // ── 2. 기관/외국인 보유 현황 (미국 주식 전용, Yahoo Finance) ──
    // 한국 주식은 Yahoo에서 기관 데이터 미제공 → null 반환
    let institutionalData = null;
    const isKorean = ticker.endsWith(".KS") || ticker.endsWith(".KQ");

    if (!isKorean) {
      try {
        const holderRes = await fetch(
          `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
            ticker
          )}?modules=institutionOwnership,majorHoldersBreakdown`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 3600 }, // 기관 데이터는 1시간 캐시
          }
        );
        const holderData = await holderRes.json();
        const summary = holderData?.quoteSummary?.result?.[0];

        const breakdown = summary?.majorHoldersBreakdown;
        const ownership = summary?.institutionOwnership?.ownershipList ?? [];

        institutionalData = {
          // 보유 비율 요약
          insidersPercent: breakdown?.insidersPercentHeld?.raw ?? null,
          institutionsPercent: breakdown?.institutionsPercentHeld?.raw ?? null,
          // 상위 5개 기관
          topHolders: ownership.slice(0, 5).map((h: any) => ({
            name: h.organization ?? "",
            pctHeld: h.pctHeld?.raw ?? null,
            shares: h.position?.raw ?? null,
            // 변동: 전분기 대비
            change: h.change?.raw ?? null,
          })),
        };
      } catch {
        // 기관 데이터 없어도 나머지는 반환
      }
    }

    // ── 3. 가격 변동 계산 ────────────────────────────────────
    const price = meta?.regularMarketPrice ?? null;
    const prevClose = meta?.chartPreviousClose ?? null;
    const change =
      price !== null && prevClose !== null ? price - prevClose : null;
    const changePercent =
      change !== null && prevClose ? (change / prevClose) * 100 : null;

    // const fmpData = fmpRes?.ok ? await fmpRes.json() : [];
    // const marketCap = fmpData?.[0]?.mktCap ?? null;
    return NextResponse.json(
      {
        ticker,
        name: meta?.longName ?? meta?.shortName ?? ticker,
        price,
        change,
        changePercent,
        currency: meta?.currency ?? "KRW",
        isKorean,
        // 52주 고/저
        high52w: quote?.fiftyTwoWeekHigh ?? null,
        low52w: quote?.fiftyTwoWeekLow ?? null,
        // 거래량
        volume: quote?.regularMarketVolume ?? null,
        // 시가총액
        marketCap: 0,
        // 차트용 히스토리
        history,
        // 기관 수급 (미국만)
        institutional: institutionalData,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (e) {
    console.error("[ticker] API 오류:", e);
    return NextResponse.json(
      { error: "종목 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
