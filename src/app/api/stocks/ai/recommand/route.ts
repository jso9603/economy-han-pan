// app/api/stocks/recommend/route.ts
// ✅ Vercel KV에서 캐싱된 AI 추천 결과 서빙
// ✅ 캐시 없으면 Claude API로 실시간 분석 (fallback)
// ✅ 실제 운영 시: Vercel Cron으로 매일 새벽 갱신 권장

import { NextResponse } from "next/server";

// ── 타입 ─────────────────────────────────────────────────────
interface StockRecommendation {
  ticker: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  reason: string; // AI 추천 이유 (2~3문장)
  targetPrice: number | null;
  riskLevel: "낮음" | "보통" | "높음";
  term: "단기" | "장기";
}

interface RecommendResult {
  updatedAt: string;
  shortTerm: StockRecommendation[]; // 단기 (1~4주)
  longTerm: StockRecommendation[]; // 장기 (3개월 이상)
}

// ── 분석할 후보 종목 풀 ────────────────────────────────────────
// 실제 운영 시 더 넓은 풀에서 선정하도록 확장 가능
const CANDIDATE_TICKERS = [
  // 한국
  "005930.KS", // 삼성전자
  "000660.KS", // SK하이닉스
  "035420.KS", // NAVER
  "051910.KS", // LG화학
  "006400.KS", // 삼성SDI
  "068270.KS", // 셀트리온
  "035720.KS", // 카카오
  "003550.KS", // LG
  // 미국
  "NVDA",
  "MSFT",
  "AAPL",
  "AMZN",
  "GOOGL",
  "META",
  "TSLA",
  "AMD",
  "AVGO",
  "TSM",
];

// ── Yahoo Finance에서 가격 데이터 수집 ─────────────────────────
async function fetchPrices(tickers: string[]) {
  const results = await Promise.all(
    tickers.map(async (symbol) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            symbol
          )}?interval=1d&range=1mo`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 300 },
          }
        );
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        const closes =
          data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        const validCloses = closes.filter((c: number | null) => c !== null);

        const price = meta?.regularMarketPrice ?? null;
        const prevClose = meta?.chartPreviousClose ?? null;
        const changePercent =
          price && prevClose ? ((price - prevClose) / prevClose) * 100 : null;

        // 1개월 수익률
        const monthReturn =
          validCloses.length >= 2
            ? ((validCloses[validCloses.length - 1] - validCloses[0]) /
                validCloses[0]) *
              100
            : null;

        return {
          ticker: symbol,
          name: meta?.longName ?? meta?.shortName ?? symbol,
          price,
          changePercent,
          monthReturn,
          currency: meta?.currency ?? "KRW",
        };
      } catch {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

// ── Claude API로 추천 종목 선정 ────────────────────────────────
async function analyzeWithClaude(priceData: any[]): Promise<RecommendResult> {
  console.log("3333");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(apiKey);
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수가 없습니다.");

  const prompt = `다음은 오늘 주요 주식들의 시장 데이터입니다:

${JSON.stringify(priceData, null, 2)}

위 데이터를 분석하여 투자 추천 종목을 선정해주세요.

반드시 아래 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{
  "shortTerm": [
    {
      "ticker": "종목 심볼",
      "name": "종목명",
      "reason": "단기 추천 이유 2~3문장. 구체적 수치와 근거 포함.",
      "targetPrice": 목표가(숫자, 현재가 기준 5~15% 상단),
      "riskLevel": "낮음 | 보통 | 높음"
    }
  ],
  "longTerm": [
    {
      "ticker": "종목 심볼",
      "name": "종목명",
      "reason": "장기 추천 이유 2~3문장. 구조적 성장 근거 포함.",
      "targetPrice": 목표가(숫자, 현재가 기준 20~50% 상단),
      "riskLevel": "낮음 | 보통 | 높음"
    }
  ]
}

조건:
- shortTerm: 1~4주 단기 모멘텀 관점, 3종목 선정
- longTerm: 3개월 이상 장기 가치 관점, 3종목 선정
- 각 종목은 shortTerm과 longTerm에 중복 불가
- targetPrice는 반드시 숫자로 (문자열 금지)
- riskLevel은 반드시 "낮음", "보통", "높음" 중 하나`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API 오류: ${res.status}`);

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "{}";

  // JSON 파싱 (마크다운 코드블록 제거)
  const clean = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  const parsed = JSON.parse(clean);

  // 가격 데이터 병합
  const priceMap = Object.fromEntries(priceData.map((p: any) => [p.ticker, p]));

  const enrich = (list: any[], term: "단기" | "장기") =>
    (list ?? []).map((item: any) => ({
      ...item,
      price: priceMap[item.ticker]?.price ?? null,
      changePercent: priceMap[item.ticker]?.changePercent ?? null,
      term,
    }));

  return {
    updatedAt: new Date().toISOString(),
    shortTerm: enrich(parsed.shortTerm ?? [], "단기"),
    longTerm: enrich(parsed.longTerm ?? [], "장기"),
  };
}

// ── Vercel KV 연동 (설치 시 활성화) ───────────────────────────
// pnpm add @vercel/kv 후 아래 주석 해제
//
// import { kv } from "@vercel/kv";
// const CACHE_KEY = "stock:recommend";
// const CACHE_TTL = 60 * 60 * 6; // 6시간
//
// async function getFromCache(): Promise<RecommendResult | null> {
//   try { return await kv.get<RecommendResult>(CACHE_KEY); }
//   catch { return null; }
// }
// async function setCache(data: RecommendResult) {
//   try { await kv.set(CACHE_KEY, data, { ex: CACHE_TTL }); }
//   catch {}
// }

// ── 임시 인메모리 캐시 (Vercel KV 없을 때 사용) ──────────────
let memCache: { data: RecommendResult; ts: number } | null = null;
const MEM_TTL = 1000 * 60 * 60 * 6; // 6시간

// ── GET 핸들러 ────────────────────────────────────────────────
export async function GET() {
  // 1. 캐시 확인
  if (memCache && Date.now() - memCache.ts < MEM_TTL) {
    return NextResponse.json(memCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
      },
    });
  }

  try {
    // 2. 가격 데이터 수집
    const prices = await fetchPrices(CANDIDATE_TICKERS);

    // 3. Claude 분석
    const result = await analyzeWithClaude(prices);

    // 4. 캐시 저장
    memCache = { data: result, ts: Date.now() };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "추천 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
