// app/api/stocks/search/route.ts
// ✅ 로컬 종목 DB로 한글 검색 지원 ("구" → 구글, 기아 등)
// ✅ 영문 검색 시 Yahoo Finance 병합
// ✅ 한 글자 검색부터 동작

import { NextRequest, NextResponse } from "next/server";

export const revalidate = 60;

// ── 로컬 종목 DB ──────────────────────────────────────────────
const LOCAL_STOCKS = [
  // 한국 대형주
  {
    ticker: "005930.KS",
    name: "삼성전자",
    keywords: ["삼성", "삼성전자"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "000660.KS",
    name: "SK하이닉스",
    keywords: ["sk하이닉스", "하이닉스", "sk"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "035420.KS",
    name: "NAVER",
    keywords: ["네이버", "naver"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "035720.KS",
    name: "카카오",
    keywords: ["카카오"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "323410.KS",
    name: "카카오뱅크",
    keywords: ["카카오뱅크"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "051910.KS",
    name: "LG화학",
    keywords: ["lg화학", "엘지화학"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "006400.KS",
    name: "삼성SDI",
    keywords: ["삼성sdi"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "068270.KS",
    name: "셀트리온",
    keywords: ["셀트리온"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "003550.KS",
    name: "LG",
    keywords: ["lg", "엘지"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "066570.KS",
    name: "LG전자",
    keywords: ["lg전자", "엘지전자"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "373220.KS",
    name: "LG에너지솔루션",
    keywords: ["lg에너지", "에너지솔루션"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "005380.KS",
    name: "현대차",
    keywords: ["현대차", "현대자동차", "현대"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "000270.KS",
    name: "기아",
    keywords: ["기아", "기아차", "기아자동차"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "207940.KS",
    name: "삼성바이오로직스",
    keywords: ["삼성바이오", "바이오로직스"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "005490.KS",
    name: "POSCO홀딩스",
    keywords: ["포스코", "posco"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "055550.KS",
    name: "신한지주",
    keywords: ["신한", "신한지주", "신한은행"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "105560.KS",
    name: "KB금융",
    keywords: ["kb금융", "kb", "국민은행"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "086790.KS",
    name: "하나금융지주",
    keywords: ["하나금융", "하나은행", "하나"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "316140.KS",
    name: "우리금융지주",
    keywords: ["우리금융", "우리은행", "우리"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "009540.KS",
    name: "HD한국조선해양",
    keywords: ["한국조선", "hd조선", "조선"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "329180.KS",
    name: "HD현대중공업",
    keywords: ["현대중공업", "hd현대중공업"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "012450.KS",
    name: "한화에어로스페이스",
    keywords: ["한화에어로", "한화항공", "한화"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "042700.KS",
    name: "한미반도체",
    keywords: ["한미반도체", "한미"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "032830.KS",
    name: "삼성생명",
    keywords: ["삼성생명"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "017670.KS",
    name: "SK텔레콤",
    keywords: ["sk텔레콤", "sk텔", "skt"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "030200.KS",
    name: "KT",
    keywords: ["kt", "케이티"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "034730.KS",
    name: "SK",
    keywords: ["sk이노베이션", "sk이노"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "003670.KS",
    name: "포스코퓨처엠",
    keywords: ["포스코퓨처엠", "포퓨엠"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "259960.KS",
    name: "크래프톤",
    keywords: ["크래프톤", "배틀그라운드"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "352820.KS",
    name: "하이브",
    keywords: ["하이브", "bts", "빅히트"],
    exchange: "KSE",
    isKorean: true,
  },
  {
    ticker: "041510.KQ",
    name: "에스엠",
    keywords: ["에스엠", "sm엔터", "sm"],
    exchange: "KSQ",
    isKorean: true,
  },
  {
    ticker: "035900.KQ",
    name: "JYP Ent.",
    keywords: ["jyp", "제이와이피"],
    exchange: "KSQ",
    isKorean: true,
  },
  {
    ticker: "247540.KQ",
    name: "에코프로비엠",
    keywords: ["에코프로비엠", "에코프로"],
    exchange: "KSQ",
    isKorean: true,
  },
  {
    ticker: "086520.KQ",
    name: "에코프로",
    keywords: ["에코프로"],
    exchange: "KSQ",
    isKorean: true,
  },
  {
    ticker: "196170.KQ",
    name: "알테오젠",
    keywords: ["알테오젠"],
    exchange: "KSQ",
    isKorean: true,
  },

  // 미국 대형주
  {
    ticker: "AAPL",
    name: "Apple",
    keywords: ["애플", "apple"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    keywords: ["마이크로소프트", "ms", "microsoft"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "GOOGL",
    name: "Alphabet (Google)",
    keywords: ["구글", "google", "알파벳", "alphabet"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "AMZN",
    name: "Amazon",
    keywords: ["아마존", "amazon"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "NVDA",
    name: "NVIDIA",
    keywords: ["엔비디아", "nvidia"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "META",
    name: "Meta",
    keywords: ["메타", "페이스북", "meta", "facebook"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "TSLA",
    name: "Tesla",
    keywords: ["테슬라", "tesla"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "AMD",
    name: "AMD",
    keywords: ["amd", "에이엠디"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "AVGO",
    name: "Broadcom",
    keywords: ["브로드컴", "broadcom"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "TSM",
    name: "TSMC",
    keywords: ["tsmc", "대만반도체"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "JPM",
    name: "JPMorgan",
    keywords: ["jp모건", "jpmorgan"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "V",
    name: "Visa",
    keywords: ["비자", "visa"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "MA",
    name: "Mastercard",
    keywords: ["마스터카드", "mastercard"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "XOM",
    name: "ExxonMobil",
    keywords: ["엑슨모빌", "exxon"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "NFLX",
    name: "Netflix",
    keywords: ["넷플릭스", "netflix"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "DIS",
    name: "Disney",
    keywords: ["디즈니", "disney"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "INTC",
    name: "Intel",
    keywords: ["인텔", "intel"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "QCOM",
    name: "Qualcomm",
    keywords: ["퀄컴", "qualcomm"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "ORCL",
    name: "Oracle",
    keywords: ["오라클", "oracle"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "CRM",
    name: "Salesforce",
    keywords: ["세일즈포스", "salesforce"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "UBER",
    name: "Uber",
    keywords: ["우버", "uber"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "ABNB",
    name: "Airbnb",
    keywords: ["에어비앤비", "airbnb"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "PLTR",
    name: "Palantir",
    keywords: ["팔란티어", "palantir"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "COIN",
    name: "Coinbase",
    keywords: ["코인베이스", "coinbase"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "PYPL",
    name: "PayPal",
    keywords: ["페이팔", "paypal"],
    exchange: "NASDAQ",
    isKorean: false,
  },
  {
    ticker: "SQ",
    name: "Block",
    keywords: ["블록", "스퀘어", "block", "square"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "SHOP",
    name: "Shopify",
    keywords: ["쇼피파이", "shopify"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "WMT",
    name: "Walmart",
    keywords: ["월마트", "walmart"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "BRK.B",
    name: "Berkshire Hathaway",
    keywords: ["버크셔", "berkshire"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "JNJ",
    name: "Johnson & Johnson",
    keywords: ["존슨앤존슨", "jnj"],
    exchange: "NYSE",
    isKorean: false,
  },
  {
    ticker: "SPOT",
    name: "Spotify",
    keywords: ["스포티파이", "spotify"],
    exchange: "NYSE",
    isKorean: false,
  },
];

// ── 로컬 DB 검색 ──────────────────────────────────────────────
function searchLocal(query: string) {
  const q = query.toLowerCase().trim();
  return LOCAL_STOCKS.filter(
    (s) =>
      s.ticker.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.keywords.some((k) => k.includes(q))
  ).slice(0, 8);
}

// ── Yahoo Finance fallback (영문 검색 전용) ───────────────────
async function searchYahoo(query: string) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
        query
      )}&lang=en&quotesCount=6&newsCount=0`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.quotes ?? [])
      .filter((q: any) => q.quoteType === "EQUITY")
      .map((q: any) => ({
        ticker: q.symbol,
        name: q.shortname ?? q.longname ?? q.symbol,
        exchange: q.exchange ?? "",
        isKorean: q.market === "kr_market",
      }));
  } catch {
    return [];
  }
}

// ── 중복 제거 ────────────────────────────────────────────────
function dedupe<T extends { ticker: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter(({ ticker }) => {
    if (seen.has(ticker)) return false;
    seen.add(ticker);
    return true;
  });
}

// ── 한글 포함 여부 ────────────────────────────────────────────
const hasKorean = (s: string) => /[가-힣]/.test(s);

// ── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 1) {
    return NextResponse.json({ results: [] });
  }

  // 1. 로컬 DB 항상 먼저 검색
  const localResults = searchLocal(query);

  // 2. 영문 입력일 때만 Yahoo 병합 (한글은 Yahoo가 오류냄)
  const yahooResults = !hasKorean(query) ? await searchYahoo(query) : [];

  // 3. 로컬 우선 병합 + 중복 제거 + 8개 제한
  const results = dedupe([...localResults, ...yahooResults]).slice(0, 8);

  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    }
  );
}
