"use client";

// components/NewsSection.tsx
import { useState, useEffect, useCallback } from "react";
import { NewsArticle } from "@/types";

// ── 날짜 포맷 ────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}일 전`;
  if (h > 0) return `${h}시간 전`;
  return `${m}분 전`;
}

// CDATA 잔여물 제거 (RSS 파싱 방어)
function cleanUrl(url: string): string {
  return url
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

// ── 기사 본문 타입 ────────────────────────────────────────────────────────────
interface ArticleContent {
  paragraphs: string[];
  thumbnail: string | null;
  error?: string;
}

// ── 모달 ─────────────────────────────────────────────────────────────────────
function NewsModal({
  article,
  onClose,
}: {
  article: NewsArticle;
  onClose: () => void;
}) {
  const [content, setContent] = useState<ArticleContent | null>(null);
  const [loading, setLoading] = useState(true);

  // 기사 본문 fetch: AbortController로 모달 닫힐 때 중복 요청 취소
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setContent(null);

    fetch(`/api/article?url=${encodeURIComponent(cleanUrl(article.url))}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setContent(data))
      .catch((err) => {
        if (err.name === "AbortError") return; // 모달 닫혀서 취소된 경우 무시
        setContent({
          paragraphs: [],
          thumbnail: null,
          error: "본문을 불러오지 못했어요",
        });
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [article.url]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const thumbnail = content?.thumbnail ?? article.thumbnail;
  const accentColor = article.category === "경제" ? "#00e5a0" : "#63b3ff";
  const accentBg =
    article.category === "경제"
      ? "rgba(0,229,160,0.15)"
      : "rgba(99,179,255,0.15)";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 660,
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          overflow: "hidden",
          animation: "slideUp 0.25s ease",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 썸네일 */}
        {thumbnail && (
          <div
            style={{
              width: "100%",
              height: 240,
              overflow: "hidden",
              flexShrink: 0,
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.parentElement!.style.display = "none";
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 80,
                background: "linear-gradient(transparent, #141414)",
              }}
            />
          </div>
        )}

        <div style={{ padding: "24px 28px 28px", overflowY: "auto", flex: 1 }}>
          {/* 카테고리 + 출처 */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 14,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                padding: "3px 10px",
                borderRadius: 20,
                background: accentBg,
                color: accentColor,
              }}
            >
              {article.category}
            </span>
            <span style={{ fontSize: 11, color: "#555" }}>
              {article.source} · {timeAgo(article.publishedAt)}
            </span>
          </div>

          {/* 제목 */}
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#f0f0f0",
              lineHeight: 1.55,
              margin: "0 0 20px",
            }}
          >
            {article.title}
          </h2>

          {/* 본문 */}
          <div style={{ marginBottom: 24, minHeight: 80 }}>
            {loading ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {[100, 95, 88, 92, 70].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      height: 14,
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.06)",
                      width: `${w}%`,
                      animation: `pulse 1.4s ease ${i * 0.1}s infinite`,
                    }}
                  />
                ))}
              </div>
            ) : content?.error ? (
              <div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    marginBottom: 14,
                    background: "rgba(255,92,124,0.07)",
                    border: "1px solid rgba(255,92,124,0.15)",
                    fontSize: 12,
                    color: "#ff5c7c",
                  }}
                >
                  ⚠️ 본문을 직접 가져오지 못했어요. 요약 내용만 표시합니다.
                </div>
                {article.description && (
                  <p
                    style={{
                      fontSize: 14,
                      color: "#aaa",
                      lineHeight: 1.85,
                      margin: 0,
                    }}
                  >
                    {article.description}
                  </p>
                )}
              </div>
            ) : content && content.paragraphs.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {content.paragraphs.map((p, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 14,
                      color: "#ccc",
                      lineHeight: 1.85,
                      margin: 0,
                      wordBreak: "keep-all",
                    }}
                  >
                    {p}
                  </p>
                ))}
              </div>
            ) : article.description ? (
              <p
                style={{
                  fontSize: 14,
                  color: "#aaa",
                  lineHeight: 1.85,
                  margin: 0,
                }}
              >
                {article.description}
              </p>
            ) : null}
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.06)",
              marginBottom: 20,
            }}
          />

          {/* 버튼 */}
          <div style={{ display: "flex", gap: 10 }}>
            <a
              href={cleanUrl(article.url)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                padding: "11px 0",
                textAlign: "center",
                background: accentColor,
                borderRadius: 10,
                color: "#0a0a0a",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              원문 보기 →
            </a>
            <button
              onClick={onClose}
              style={{
                padding: "11px 20px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                color: "#888",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 개별 카드 ─────────────────────────────────────────────────────────────────
function NewsCard({
  article,
  onClick,
  index,
}: {
  article: NewsArticle;
  onClick: () => void;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        gap: 14,
        cursor: "pointer",
        padding: "14px 16px",
        borderRadius: 12,
        background: hovered
          ? "rgba(255,255,255,0.05)"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${
          hovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"
        }`,
        transition: "all 0.18s ease",
        animation: `fadeIn 0.4s ease ${index * 0.06}s both`,
      }}
    >
      {/* 썸네일 */}
      <div
        style={{
          width: 80,
          height: 60,
          borderRadius: 8,
          overflow: "hidden",
          flexShrink: 0,
          background: "rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {article.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.thumbnail}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement!.innerHTML = `<span style="font-size:24px">${
                article.category === "경제" ? "📈" : "🌍"
              }</span>`;
            }}
          />
        ) : (
          <span style={{ fontSize: 24 }}>
            {article.category === "경제" ? "📈" : "🌍"}
          </span>
        )}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: hovered ? "#fff" : "#e0e0e0",
            lineHeight: 1.45,
            marginBottom: 6,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            transition: "color 0.18s",
          }}
        >
          {article.title}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "#555",
          }}
        >
          <span
            style={{
              color: article.category === "경제" ? "#00e5a0" : "#63b3ff",
              fontWeight: 600,
            }}
          >
            {article.source}
          </span>
          <span>{timeAgo(article.publishedAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function NewsSection({ news }: { news: NewsArticle[] }) {
  const [activeTab, setActiveTab] = useState<"경제" | "국제">("경제");
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null
  );

  const filtered = news.filter((a) => a.category === activeTab);
  const closeModal = useCallback(() => setSelectedArticle(null), []);

  return (
    <>
      {selectedArticle && (
        <NewsModal article={selectedArticle} onClose={closeModal} />
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* 헤더 + 탭 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#555",
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          📰 주요 뉴스
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "rgba(255,255,255,0.04)",
            padding: 3,
            borderRadius: 8,
          }}
        >
          {(["경제", "국제"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "5px 14px",
                borderRadius: 6,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.18s ease",
                background:
                  activeTab === tab
                    ? tab === "경제"
                      ? "rgba(0,229,160,0.2)"
                      : "rgba(99,179,255,0.2)"
                    : "transparent",
                color:
                  activeTab === tab
                    ? tab === "경제"
                      ? "#00e5a0"
                      : "#63b3ff"
                    : "#555",
              }}
            >
              {tab === "경제" ? "📈 경제" : "🌍 국제"}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 리스트 */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: 24,
            background: "rgba(255,92,124,0.06)",
            border: "1px solid rgba(255,92,124,0.15)",
            borderRadius: 12,
            fontSize: 13,
            color: "#ff5c7c",
            textAlign: "center",
          }}
        >
          ⚠️ 뉴스를 불러오지 못했어요
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((article, i) => (
            <NewsCard
              key={cleanUrl(article.url)}
              article={article}
              index={i}
              onClick={() => setSelectedArticle(article)}
            />
          ))}
        </div>
      )}
    </>
  );
}
