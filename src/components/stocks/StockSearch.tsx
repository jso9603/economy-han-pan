"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  isKorean: boolean;
}

export default function StockSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (ticker: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/stocks/${encodeURIComponent(ticker)}`);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 12,
          padding: "12px 18px",
          gap: 10,
          transition: "border-color 0.2s",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#555"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="종목명 또는 티커 검색  (예: 삼성전자, AAPL)"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#fff",
            fontSize: 14,
            letterSpacing: "0.01em",
          }}
        />
        {loading && (
          <span style={{ fontSize: 11, color: "#555" }}>검색 중…</span>
        )}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#161616",
            border: "1px solid #2a2a2a",
            borderRadius: 12,
            overflow: "hidden",
            zIndex: 200,
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          }}
        >
          {results.length > 0 ? (
            results.map((r) => (
              <button
                key={r.ticker}
                onClick={() => handleSelect(r.ticker)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  padding: "12px 18px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid #1e1e1e",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  textAlign: "left",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#1e1e1e")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span
                    style={{ color: "#e8e8e8", fontWeight: 600, fontSize: 14 }}
                  >
                    {r.name}
                  </span>
                  <span style={{ color: "#555", fontSize: 12 }}>
                    {r.ticker} · {r.exchange}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: r.isKorean
                      ? "rgba(74,222,128,0.1)"
                      : "rgba(96,165,250,0.1)",
                    color: r.isKorean ? "#4ade80" : "#60a5fa",
                    letterSpacing: "0.05em",
                  }}
                >
                  {r.isKorean ? "KR" : "US"}
                </span>
              </button>
            ))
          ) : (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#555",
                fontSize: 13,
              }}
            >
              검색 결과가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
