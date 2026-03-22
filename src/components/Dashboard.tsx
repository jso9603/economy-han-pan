"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { StockData, WeatherData, NewsArticle } from "@/types";
import NewsSection from "@/components/NewsSection";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number | null, symbol?: string): string {
  if (n === null) return "—";
  if (symbol === "KRW=X") return `${n.toFixed(0)}원`;
  if (n > 1000) return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  return n.toFixed(2);
}

function getWeatherEmoji(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("clear") || d.includes("맑음")) return "☀️";
  if (d.includes("cloud") || d.includes("구름")) return "☁️";
  if (d.includes("rain") || d.includes("비")) return "🌧️";
  if (d.includes("snow") || d.includes("눈")) return "❄️";
  if (d.includes("thunder")) return "⛈️";
  if (d.includes("mist") || d.includes("fog") || d.includes("안개"))
    return "🌫️";
  return "🌤️";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}시간 전`;
  return `${m}분 전`;
}

// ─── 검색 결과 타입 ───────────────────────────────────────────────────────────
interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  isKorean: boolean;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StockCard({ stock }: { stock: StockData }) {
  const isUp = (stock.changePercent ?? 0) >= 0;
  const color = stock.error ? "#888" : isUp ? "#00e5a0" : "#ff5c7c";
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "16px 18px",
        flex: "1 1 130px",
        transition: "transform 0.2s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.transform = "translateY(-2px)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div
        style={{
          fontSize: 11,
          color: "#888",
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {stock.label}
      </div>
      {stock.error ? (
        <div style={{ fontSize: 13, color: "#888" }}>조회 실패</div>
      ) : (
        <>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#f0f0f0",
              fontFamily: "monospace",
              letterSpacing: -0.5,
            }}
          >
            {formatNumber(stock.price, stock.symbol)}
          </div>
          <div
            style={{
              fontSize: 12,
              color,
              marginTop: 4,
              fontFamily: "monospace",
            }}
          >
            {stock.changePercent !== null
              ? `${isUp ? "▲" : "▼"} ${Math.abs(stock.changePercent).toFixed(
                  2
                )}%`
              : "—"}
          </div>
        </>
      )}
    </div>
  );
}

function WeatherWidget({
  weather,
}: {
  weather: WeatherData | null;
  loading: boolean;
}) {
  if (!weather)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#888",
          fontSize: 13,
        }}
      >
        <span
          style={{
            animation: "spin 1s linear infinite",
            display: "inline-block",
          }}
        >
          ⟳
        </span>
        위치 확인 중...
      </div>
    );
  if (weather.error)
    return (
      <div style={{ color: "#888", fontSize: 13 }}>🌐 {weather.error}</div>
    );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 28 }}>
        {getWeatherEmoji(weather.description)}
      </span>
      <div>
        <div style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>
          {weather.district}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#f0f0f0",
            lineHeight: 1.2,
          }}
        >
          {weather.temp}°C
        </div>
        <div style={{ fontSize: 11, color: "#888" }}>
          {weather.description} · 체감 {weather.feelsLike}°C
        </div>
      </div>
      <div
        style={{
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          paddingLeft: 12,
          fontSize: 11,
          color: "#888",
          lineHeight: 1.8,
        }}
      >
        <div>💧 {weather.humidity}%</div>
        <div>🌬️ {weather.wind}m/s</div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

interface Props {
  initialStocks: StockData[];
  initialNews: NewsArticle[];
}

export default function Dashboard({ initialStocks, initialNews }: Props) {
  const [stocks, setStocks] = useState<StockData[]>(initialStocks);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [news, setNews] = useState<NewsArticle[]>(initialNews);
  const [summary, setSummary] = useState<{
    text: string;
    loading: boolean;
    error?: string;
    generatedAt?: string;
  }>({ text: "", loading: false });
  const [stocksLoading, setStocksLoading] = useState(false);

  // ── 검색 state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  // 검색 디바운스
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        setSearchResults(data.results ?? []);
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchSelect = (ticker: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(`/stocks/${encodeURIComponent(ticker)}`);
  };

  // ── 뉴스 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/knews")
      .then((res) => res.json())
      .then((data) => setNews(data))
      .catch(() => {});
  }, []);

  // ── 날씨 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(
            `/api/weather?lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setWeather(data);
        } catch {
          setWeather({
            district: "",
            temp: 0,
            feelsLike: 0,
            description: "",
            humidity: 0,
            wind: 0,
            error: "날씨 조회 실패",
          });
        } finally {
          setWeatherLoading(false);
        }
      },
      () => {
        setWeather({
          district: "",
          temp: 0,
          feelsLike: 0,
          description: "",
          humidity: 0,
          wind: 0,
          error: "위치 권한 필요",
        });
        setWeatherLoading(false);
      }
    );
  }, []);

  // ── 주가 새로고침 ────────────────────────────────────────────────────────
  const refetchStocks = useCallback(async () => {
    setStocksLoading(true);
    try {
      const res = await fetch("/api/stocks");
      const data = await res.json();
      setStocks(data);
    } finally {
      setStocksLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchStocks();
  }, [refetchStocks]);

  // ── AI 요약 ─────────────────────────────────────────────────────────────
  const generateSummary = useCallback(async () => {
    setSummary({ text: "", loading: true });
    try {
      const res = await fetch("/api/summary", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSummary({
        text: data.text,
        loading: false,
        generatedAt: data.generatedAt,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "요약 생성 실패";
      setSummary({ text: "", loading: false, error: msg });
    }
  }, []);

  // ── 시간 ────────────────────────────────────────────────────────────────
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  const dateStr =
    now?.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }) ?? "";
  const timeStr =
    now?.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) ??
    "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#f0f0f0",
        fontFamily: "'Noto Sans KR', sans-serif",
        paddingBottom: 40,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap');
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10,10,10,0.9)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          gap: 16,
        }}
      >
        {/* 로고 + 날짜 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>
            <span style={{ color: "#00e5a0" }}>경제</span> 한 판
          </div>
          <div
            style={{
              width: 1,
              height: 18,
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <div style={{ fontSize: 12, color: "#666" }}>
            {dateStr} · {timeStr}
          </div>
        </div>

        {/* 검색창 */}
        <div
          ref={searchRef}
          style={{ position: "relative", flex: 1, maxWidth: 420 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "8px 14px",
              gap: 8,
            }}
          >
            <svg
              width="14"
              height="14"
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="종목 검색  (삼성전자, 구글, AAPL...)"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#e8e8e8",
                fontSize: 13,
              }}
            />
            {searchLoading && (
              <span style={{ fontSize: 11, color: "#555", flexShrink: 0 }}>
                검색 중…
              </span>
            )}
          </div>

          {/* 검색 드롭다운 */}
          {searchOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: "#161616",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                overflow: "hidden",
                zIndex: 200,
                boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
              }}
            >
              {searchResults.length > 0 ? (
                searchResults.map((r) => (
                  <button
                    key={r.ticker}
                    onClick={() => handleSearchSelect(r.ticker)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      padding: "11px 16px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div>
                      <span
                        style={{
                          color: "#e8e8e8",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {r.name}
                      </span>
                      <span
                        style={{ color: "#555", fontSize: 11, marginLeft: 8 }}
                      >
                        {r.ticker}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        flexShrink: 0,
                        background: r.isKorean
                          ? "rgba(74,222,128,0.1)"
                          : "rgba(96,165,250,0.1)",
                        color: r.isKorean ? "#4ade80" : "#60a5fa",
                      }}
                    >
                      {r.isKorean ? "KR" : "US"}
                    </span>
                  </button>
                ))
              ) : (
                <div
                  style={{
                    padding: "16px",
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

        {/* 새로고침 버튼 */}
        <button
          onClick={refetchStocks}
          disabled={stocksLoading}
          style={{
            padding: "7px 14px",
            flexShrink: 0,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            color: "#888",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {stocksLoading ? "⟳ 로딩 중..." : "⟳ 새로고침"}
        </button>
      </div>

      {/* ── Body ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "28px 32px 0",
          animation: "fadeIn 0.5s ease",
        }}
      >
        {/* 날씨 */}
        <div style={{ marginBottom: 28 }}>
          <WeatherWidget weather={weather} loading={weatherLoading} />
        </div>

        {/* 주요 지수 */}
        <section style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
              color: "#555",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 14,
              fontWeight: 600,
            }}
          >
            📈 주요 지수
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {stocks.map((s) => (
              <StockCard key={s.symbol} stock={s} />
            ))}
          </div>
        </section>

        {/* 메인 그리드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* 뉴스 */}
          <section>
            <NewsSection news={news} />
          </section>

          {/* AI 요약 + 시장 요약 */}
          <section style={{ position: "sticky", top: 80 }}>
            <div
              style={{
                fontSize: 11,
                color: "#555",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 14,
                fontWeight: 600,
              }}
            >
              🤖 오늘의 경제 요약
            </div>
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,229,160,0.06) 0%, rgba(0,150,255,0.04) 100%)",
                border: "1px solid rgba(0,229,160,0.15)",
                borderRadius: 14,
                padding: 20,
              }}
            >
              {summary.loading ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      style={{
                        height: 14,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 4,
                        animation: "pulse 1.5s infinite",
                        width: i === 3 ? "60%" : "100%",
                      }}
                    />
                  ))}
                </div>
              ) : summary.error ? (
                <div style={{ fontSize: 12, color: "#888" }}>
                  ⚠️ {summary.error}
                </div>
              ) : summary.text ? (
                <>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#ccc",
                      lineHeight: 1.75,
                      margin: 0,
                    }}
                  >
                    {summary.text}
                  </p>
                  {summary.generatedAt && (
                    <div style={{ fontSize: 10, color: "#444", marginTop: 10 }}>
                      🗂️ 서버 캐시 ·{" "}
                      {new Date(summary.generatedAt).toLocaleTimeString(
                        "ko-KR"
                      )}{" "}
                      생성
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    주가, 뉴스 데이터를 바탕으로
                    <br />
                    Claude가 오늘의 경제를 요약해드려요
                  </div>
                  <button
                    onClick={generateSummary}
                    style={{
                      padding: "10px 20px",
                      background: "#00e5a0",
                      border: "none",
                      borderRadius: 8,
                      color: "#0a0a0a",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✨ AI 요약 생성
                  </button>
                </div>
              )}
              {summary.text && !summary.loading && (
                <button
                  onClick={generateSummary}
                  style={{
                    marginTop: 14,
                    padding: "7px 14px",
                    background: "transparent",
                    border: "1px solid rgba(0,229,160,0.3)",
                    borderRadius: 6,
                    color: "#00e5a0",
                    fontSize: 11,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  ↺ 다시 생성 (캐시 반환됨)
                </button>
              )}
            </div>

            {/* 시장 요약 */}
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#555",
                  marginBottom: 10,
                  fontWeight: 600,
                }}
              >
                📊 시장 요약
              </div>
              {stocks
                .filter((s) => !s.error)
                .map((s) => (
                  <div
                    key={s.symbol}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#888" }}>
                      {s.label}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: "#e0e0e0",
                        }}
                      >
                        {formatNumber(s.price, s.symbol)}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          marginLeft: 6,
                          fontFamily: "monospace",
                          color:
                            (s.changePercent ?? 0) >= 0 ? "#00e5a0" : "#ff5c7c",
                        }}
                      >
                        {s.changePercent !== null
                          ? `${
                              (s.changePercent ?? 0) >= 0 ? "+" : ""
                            }${s.changePercent.toFixed(2)}%`
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: "#444" }}>
            경제 한 판 · 데이터는 캐시될 수 있어요
          </span>
          <span style={{ fontSize: 11, color: "#444" }}>
            Yahoo Finance · OpenWeatherMap · NewsAPI · Claude
          </span>
        </div>
      </div>
    </div>
  );
}
