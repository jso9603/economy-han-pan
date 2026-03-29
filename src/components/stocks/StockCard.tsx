"use client";

import Link from "next/link";

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

const RISK_COLOR: Record<string, string> = {
  낮음: "#4ade80",
  보통: "#fbbf24",
  높음: "#f87171",
};

export default function StockCard({ stock }: { stock: StockRec }) {
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
