// app/stocks/page.tsx
import Link from "next/link";
import StockSearch from "@/components/stocks/StockSearch";
import StockCard from "@/components/stocks/StockCard";

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
    console.log("$$$$$$$");
    const res = await fetch(`${baseUrl}/api/stocks/ai/recommand`, {
      next: { revalidate: 3600 },
    });
    console.log("res", res);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function StocksPage() {
  const raw = await getRecommendations();
  const data = raw?.shortTerm && raw?.longTerm ? raw : null;

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

      {!data ? (
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
