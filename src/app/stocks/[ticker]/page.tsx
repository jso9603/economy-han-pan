// app/stocks/[ticker]/page.tsx
import Link from "next/link";
import StockChart from "@/components/stocks/StockChart";

interface StockDetail {
  ticker: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  isKorean: boolean;
  high52w: number | null;
  low52w: number | null;
  volume: number | null;
  avgVolume: number | null;
  marketCap: number | null;
  pe: number | null;
  history: { date: string; close: number }[];
  institutional: {
    insidersPercent: number | null;
    institutionsPercent: number | null;
    topHolders: {
      name: string;
      pctHeld: number | null;
      shares: number | null;
      change: number | null;
    }[];
  } | null;
  error?: string;
}

async function getStockDetail(ticker: string): Promise<StockDetail | null> {
  try {
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
      }/api/stocks/${encodeURIComponent(ticker)}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// 숫자 포맷 헬퍼
function fmt(value: number | null, currency: string) {
  if (value === null) return "—";
  return currency === "KRW"
    ? `₩${value.toLocaleString("ko-KR")}`
    : `$${value.toFixed(2)}`;
}
function fmtLarge(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}조`;
  if (value >= 1e8) return `${(value / 1e8).toFixed(1)}억`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString();
}
function fmtPct(value: number | null) {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

// 기관 보유 비중 바
function HoldingBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  const pct = value !== null ? value * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ color: "#888", fontSize: 13 }}>{label}</span>
        <span style={{ color: "#e8e8e8", fontWeight: 700, fontSize: 13 }}>
          {fmtPct(value)}
        </span>
      </div>
      <div
        style={{
          background: "#1e1e1e",
          borderRadius: 4,
          height: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker: rawTicker } = await params;
  const ticker = decodeURIComponent(rawTicker);
  const data = await getStockDetail(ticker);

  if (!data || data.error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          padding: "32px 24px",
          color: "#fff",
        }}
      >
        <Link
          href="/stocks"
          style={{ color: "#555", textDecoration: "none", fontSize: 13 }}
        >
          ← 추천 종목으로
        </Link>
        <div style={{ marginTop: 40, textAlign: "center", color: "#555" }}>
          <p>종목 데이터를 불러오지 못했습니다.</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>{data?.error}</p>
        </div>
      </div>
    );
  }

  const isPositive = (data.changePercent ?? 0) >= 0;

  // 한국식 색상: 오르면 빨강, 내리면 파랑
  const changeColor = isPositive ? "#f87171" : "#60a5fa";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        padding: "32px 24px",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      {/* 뒤로 가기 */}
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/stocks"
          style={{ color: "#555", textDecoration: "none", fontSize: 13 }}
        >
          ← 추천 종목으로
        </Link>
      </div>

      {/* 종목 헤더 */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.03em",
            }}
          >
            {data.name}
          </h1>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 20,
              background: data.isKorean
                ? "rgba(74,222,128,0.1)"
                : "rgba(96,165,250,0.1)",
              color: data.isKorean ? "#4ade80" : "#60a5fa",
            }}
          >
            {data.isKorean ? "KR" : "US"}
          </span>
        </div>
        <span style={{ color: "#555", fontSize: 13 }}>{data.ticker}</span>

        {/* 가격 */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginTop: 16,
          }}
        >
          <span
            style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em" }}
          >
            {fmt(data.price, data.currency)}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: changeColor }}>
              {isPositive ? "▲" : "▼"}{" "}
              {fmt(Math.abs(data.change ?? 0), data.currency)}
            </span>
            <span style={{ fontSize: 13, color: changeColor }}>
              ({isPositive ? "+" : ""}
              {(data.changePercent ?? 0).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* 2열 레이아웃 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* 왼쪽: 차트 + 지표 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 차트 카드 */}
          <div
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: 16,
              padding: "20px 16px 12px",
            }}
          >
            <p style={{ color: "#555", fontSize: 12, margin: "0 0 16px 6px" }}>
              최근 3개월 주가
            </p>
            <StockChart
              history={data.history}
              currency={data.currency}
              isPositive={isPositive}
            />
          </div>

          {/* 주요 지표 */}
          <div
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: 16,
              padding: "20px 22px",
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                margin: "0 0 18px",
                color: "#888",
              }}
            >
              주요 지표
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px 24px",
              }}
            >
              {[
                { label: "52주 최고", value: fmt(data.high52w, data.currency) },
                { label: "52주 최저", value: fmt(data.low52w, data.currency) },
                { label: "시가총액", value: fmtLarge(data.marketCap) },
                {
                  label: "PER",
                  value: data.pe ? `${data.pe.toFixed(1)}배` : "—",
                },
                { label: "거래량", value: fmtLarge(data.volume) },
                { label: "평균 거래량", value: fmtLarge(data.avgVolume) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ color: "#555", fontSize: 12, margin: "0 0 4px" }}>
                    {label}
                  </p>
                  <p
                    style={{
                      color: "#e8e8e8",
                      fontWeight: 700,
                      fontSize: 15,
                      margin: 0,
                    }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: 기관 수급 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {data.isKorean ? (
            /* 한국 주식: pykrx 연동 전 안내 */
            <div
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 16,
                padding: "24px 22px",
              }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  margin: "0 0 16px",
                  color: "#888",
                }}
              >
                기관/외국인 수급
              </h3>
              <div
                style={{
                  background: "#161616",
                  borderRadius: 10,
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#555", fontSize: 13, margin: "0 0 8px" }}>
                  KRX 기관 수급 데이터는
                </p>
                <p style={{ color: "#555", fontSize: 13, margin: 0 }}>
                  pykrx 연동 후 제공됩니다
                </p>
                <a
                  href="https://github.com/sharebook-kr/pykrx"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#4ade80",
                    fontSize: 12,
                    marginTop: 12,
                    display: "block",
                  }}
                >
                  pykrx 설정 가이드 →
                </a>
              </div>
            </div>
          ) : data.institutional ? (
            /* 미국 주식: 기관 보유 현황 */
            <div
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 16,
                padding: "24px 22px",
              }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  margin: "0 0 20px",
                  color: "#888",
                }}
              >
                기관/내부자 보유 현황
              </h3>
              <HoldingBar
                label="기관 보유 비중"
                value={data.institutional.institutionsPercent}
                color="#60a5fa"
              />
              <HoldingBar
                label="내부자 보유 비중"
                value={data.institutional.insidersPercent}
                color="#a78bfa"
              />

              {data.institutional.topHolders.length > 0 && (
                <>
                  <p
                    style={{
                      color: "#555",
                      fontSize: 12,
                      margin: "20px 0 12px",
                    }}
                  >
                    주요 기관 보유
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {data.institutional.topHolders.map((h) => (
                      <div
                        key={h.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "#161616",
                          borderRadius: 10,
                          padding: "10px 14px",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              color: "#e8e8e8",
                              fontSize: 13,
                              fontWeight: 600,
                              margin: "0 0 2px",
                            }}
                          >
                            {h.name}
                          </p>
                          <p style={{ color: "#555", fontSize: 11, margin: 0 }}>
                            {fmtLarge(h.shares)}주
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p
                            style={{
                              color: "#e8e8e8",
                              fontWeight: 700,
                              fontSize: 14,
                              margin: "0 0 2px",
                            }}
                          >
                            {fmtPct(h.pctHeld)}
                          </p>
                          {h.change !== null && (
                            <p
                              style={{
                                fontSize: 11,
                                margin: 0,
                                color: h.change >= 0 ? "#4ade80" : "#f87171",
                              }}
                            >
                              {h.change >= 0 ? "▲" : "▼"}{" "}
                              {Math.abs(h.change).toLocaleString()}주
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 16,
                padding: "24px 22px",
              }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  margin: "0 0 16px",
                  color: "#888",
                }}
              >
                기관 보유 현황
              </h3>
              <p style={{ color: "#555", fontSize: 13, textAlign: "center" }}>
                데이터를 불러오지 못했습니다
              </p>
            </div>
          )}

          {/* 매수/매도 의견 (AI) */}
          <div
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: 16,
              padding: "24px 22px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 14 }}>✨</span>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  margin: 0,
                  color: "#888",
                }}
              >
                AI 매수/매도 의견
              </h3>
            </div>
            <div
              style={{
                background: "#161616",
                borderRadius: 10,
                padding: "16px",
                color: "#888",
                fontSize: 13,
                lineHeight: 1.7,
                textAlign: "center",
              }}
            >
              <p style={{ margin: "0 0 10px" }}>개별 종목 AI 의견은</p>
              <p style={{ margin: "0 0 10px" }}>추천 종목 페이지에서</p>
              <p style={{ margin: 0 }}>확인하실 수 있습니다</p>
              <Link
                href="/stocks"
                style={{
                  display: "inline-block",
                  marginTop: 14,
                  color: "#4ade80",
                  fontSize: 12,
                  textDecoration: "none",
                }}
              >
                추천 종목 보기 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
