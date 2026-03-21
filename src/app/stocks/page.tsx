// app/stocks/page.tsx
import Link from "next/link";
import StockSearch from "@/components/stocks/StockSearch";

interface StockRec {
  ticker: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  reason: string;
  targetPrice: number | null;
  riskLevel: "낮음" | "보통" | "높음";
  term: "단기" | "장기";
}

interface RecommendData {
  updatedAt: string;
  shortTerm: StockRec[];
  longTerm: StockRec[];
  error?: string;
}

export const dynamic = "force-dynamic"; // 추가 (맨 위에)

async function getRecommendations(): Promise<RecommendData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) return null; // 빌드 시 스킵
    const res = await fetch(`${baseUrl}/api/stocks/recommend`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const RISK_COLOR: Record<string, string> = {
  낮음: "#4ade80",
  보통: "#fbbf24",
  높음: "#f87171",
};

function StockCard({ stock }: { stock: StockRec }) {
  const isPositive = (stock.changePercent ?? 0) >= 0;
  const isKorean = stock.ticker.endsWith(".KS") || stock.ticker.endsWith(".KQ");
  const currency = isKorean ? "KRW" : "USD";

  const formatPrice = (p: number | null) => {
    if (p === null) return "—";
    return currency === "KRW"
      ? `₩${p.toLocaleString("ko-KR")}`
      : `$${p.toFixed(2)}`;
  };

  return (
    <Link
      href={`/stocks/${encodeURIComponent(stock.ticker)}`}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          background: "#111",
          border: "1px solid #222",
          borderRadius: 16,
          padding: "20px 22px",
          cursor: "pointer",
          transition: "border-color 0.2s, transform 0.15s",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#333";
          (e.currentTarget as HTMLDivElement).style.transform =
            "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#222";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span style={{ color: "#e8e8e8", fontWeight: 700, fontSize: 16 }}>
                {stock.name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: isKorean
                    ? "rgba(74,222,128,0.1)"
                    : "rgba(96,165,250,0.1)",
                  color: isKorean ? "#4ade80" : "#60a5fa",
                }}
              >
                {isKorean ? "KR" : "US"}
              </span>
            </div>
            <span style={{ color: "#555", fontSize: 12 }}>{stock.ticker}</span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 20,
              background: `${RISK_COLOR[stock.riskLevel]}18`,
              color: RISK_COLOR[stock.riskLevel],
            }}
          >
            리스크 {stock.riskLevel}
          </span>
        </div>

        {/* 가격 */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              color: "#fff",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.02em",
            }}
          >
            {formatPrice(stock.price)}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isPositive ? "#f87171" : "#60a5fa",
            }}
          >
            {isPositive ? "▲" : "▼"}{" "}
            {Math.abs(stock.changePercent ?? 0).toFixed(2)}%
          </span>
        </div>

        {/* AI 이유 */}
        <p
          style={{
            color: "#888",
            fontSize: 13,
            lineHeight: 1.6,
            margin: 0,
            borderLeft: "2px solid #2a2a2a",
            paddingLeft: 12,
          }}
        >
          {stock.reason}
        </p>

        {/* 목표가 */}
        {stock.targetPrice && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#161616",
              borderRadius: 10,
              padding: "10px 14px",
            }}
          >
            <span style={{ color: "#555", fontSize: 12 }}>AI 목표가</span>
            <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>
              {formatPrice(stock.targetPrice)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default async function StocksPage() {
  const data = await getRecommendations();

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
      {/* 헤더 */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <Link
            href="/"
            style={{ color: "#555", textDecoration: "none", fontSize: 13 }}
          >
            ← 홈으로
          </Link>
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            margin: "0 0 6px",
            letterSpacing: "-0.03em",
          }}
        >
          📈 AI 추천 종목
        </h1>
        <p style={{ color: "#555", fontSize: 14, margin: 0 }}>
          Claude AI가 시장 데이터를 분석하여 선정한 추천 종목입니다
          {data?.updatedAt && (
            <span style={{ marginLeft: 8, color: "#444" }}>
              · 업데이트:{" "}
              {new Date(data.updatedAt).toLocaleString("ko-KR", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </p>
      </div>

      {/* 검색 */}
      <div style={{ marginBottom: 40 }}>
        <StockSearch />
      </div>

      {data?.error || !data ? (
        <div
          style={{
            background: "#111",
            border: "1px solid #222",
            borderRadius: 16,
            padding: "40px",
            textAlign: "center",
            color: "#555",
          }}
        >
          <p style={{ fontSize: 14 }}>추천 데이터를 불러오지 못했습니다.</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            ANTHROPIC_API_KEY 환경변수를 확인해주세요.
          </p>
        </div>
      ) : (
        <>
          {/* 단기 추천 */}
          <section style={{ marginBottom: 48 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  background: "rgba(96,165,250,0.12)",
                  color: "#60a5fa",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 20,
                }}
              >
                단기 · 1~4주
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                단기 추천 종목
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {data.shortTerm.map((s) => (
                <StockCard key={s.ticker} stock={s} />
              ))}
            </div>
          </section>

          {/* 장기 추천 */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  background: "rgba(74,222,128,0.12)",
                  color: "#4ade80",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 20,
                }}
              >
                장기 · 3개월 이상
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                장기 추천 종목
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {data.longTerm.map((s) => (
                <StockCard key={s.ticker} stock={s} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
