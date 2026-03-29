"use client";

// app/gnews/page.tsx

import { useState } from "react";
import useSWR from "swr";
import type { Article } from "@/app/api/gnews/route";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SOURCE_EMOJI: Record<string, string> = {
  Reuters: "📡",
  Bloomberg: "💹",
  "Financial Times": "🗞",
  CNBC: "📺",
  "The Wall Street Journal": "📰",
};

const CATEGORY_LABEL: Record<string, string> = {
  all: "전체",
  world: "🌐 세계",
  business: "💹 경제",
  technology: "💻 기술",
};

const CATEGORY_COLOR: Record<string, { bg: string; text: string }> = {
  world: { bg: "#eff6ff", text: "#2563eb" },
  business: { bg: "#ecfdf5", text: "#00a86b" },
  technology: { bg: "#f5f3ff", text: "#7c3aed" },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "방금 전";
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

function SkeletonItem() {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "12px 14px",
        borderBottom: "0.5px solid #f5f5f5",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 8,
          background: "#f0f0f0",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: 10,
            borderRadius: 3,
            background: "#f0f0f0",
            marginBottom: 6,
            width: "30%",
          }}
        />
        <div
          style={{
            height: 13,
            borderRadius: 4,
            background: "#f0f0f0",
            marginBottom: 5,
            width: "90%",
          }}
        />
        <div
          style={{
            height: 11,
            borderRadius: 4,
            background: "#f0f0f0",
            marginBottom: 5,
            width: "75%",
          }}
        />
        <div
          style={{
            height: 10,
            borderRadius: 4,
            background: "#f0f0f0",
            width: "40%",
          }}
        />
      </div>
    </div>
  );
}

export default function GNewsPage() {
  const [activeTab, setActiveTab] = useState<
    "all" | "world" | "business" | "technology"
  >("all");

  const { data, isLoading, error, mutate } = useSWR("/api/gnews", fetcher, {
    refreshInterval: 2880000, // 48분 — 3카테고리 × 30회 = 하루 90건
    revalidateOnFocus: false,
  });

  const allArticles: Article[] = data?.articles ?? [];

  // 탭 클릭 = 클라이언트 필터링만 (추가 API 요청 없음)
  const articles =
    activeTab === "all"
      ? allArticles
      : allArticles.filter((a) => a.category === activeTab);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f2f2f7",
        fontFamily: "-apple-system, 'Segoe UI', sans-serif",
      }}
    >
      {/* 헤더 + 탭 */}
      <div
        style={{
          background: "#fff",
          borderBottom: "0.5px solid #e5e5e5",
          padding: "16px 16px 0",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#111",
                margin: 0,
              }}
            >
              🌐 글로벌 속보
            </h1>
            <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0 0" }}>
              GNews · Claude 번역 · 48분마다 갱신
            </p>
          </div>
          <button
            onClick={() => mutate()}
            style={{
              background: "#f5f5f5",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              color: "#555",
              cursor: "pointer",
            }}
          >
            🔄 새로고침
          </button>
        </div>

        {/* 카테고리 탭 — 탭 전환 시 추가 API 요청 없음, 클라이언트 필터만 */}
        <div style={{ display: "flex" }}>
          {(["all", "world", "business", "technology"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 12,
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? "#00a86b" : "#aaa",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab
                    ? "2px solid #00a86b"
                    : "2px solid transparent",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {CATEGORY_LABEL[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* 본문 */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "12px 0" }}>
        {isLoading && (
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              margin: "0 12px",
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              margin: "0 12px",
              padding: "32px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>😵</div>
            <div style={{ fontSize: 14, color: "#555", marginBottom: 4 }}>
              뉴스를 불러오지 못했어요
            </div>
            <div style={{ fontSize: 12, color: "#bbb" }}>
              잠시 후 다시 시도해주세요
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {articles.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  margin: "0 12px",
                  padding: "32px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 14, color: "#555" }}>뉴스가 없어요</div>
              </div>
            ) : (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  overflow: "hidden",
                  margin: "0 12px",
                }}
              >
                {articles.map((news, i) => (
                  <a
                    key={news.url}
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "12px 14px",
                      borderBottom:
                        i < articles.length - 1
                          ? "0.5px solid #f5f5f5"
                          : "none",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    {/* 썸네일 */}
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        background: "#f5f5f5",
                        flexShrink: 0,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                      }}
                    >
                      {news.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={news.image}
                          alt={news.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.parentElement!.textContent =
                              SOURCE_EMOJI[news.source] ?? "📰";
                          }}
                        />
                      ) : (
                        SOURCE_EMOJI[news.source] ?? "📰"
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* 카테고리 뱃지 */}
                      <div
                        style={{
                          display: "inline-block",
                          fontSize: 9,
                          fontWeight: 600,
                          padding: "1px 5px",
                          borderRadius: 3,
                          marginBottom: 4,
                          background:
                            CATEGORY_COLOR[news.category]?.bg ?? "#f5f5f5",
                          color: CATEGORY_COLOR[news.category]?.text ?? "#888",
                        }}
                      >
                        {CATEGORY_LABEL[news.category]}
                      </div>

                      {/* 제목 */}
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#111",
                          lineHeight: 1.45,
                          marginBottom: 4,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {news.title}
                      </div>

                      {/* 설명 */}
                      {news.description && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#888",
                            lineHeight: 1.4,
                            marginBottom: 4,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {news.description}
                        </div>
                      )}

                      <div style={{ fontSize: 10, color: "#bbb" }}>
                        {news.source} · {timeAgo(news.publishedAt)}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            <div
              style={{
                textAlign: "center",
                fontSize: 10,
                color: "#ccc",
                padding: "12px 0",
              }}
            >
              48분마다 자동 갱신 · GNews 하루 90건 사용
            </div>
          </>
        )}
      </div>
    </div>
  );
}
