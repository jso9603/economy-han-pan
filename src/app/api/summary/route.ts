// app/api/summary/route.ts
// ✅ 서버에서 Claude API 호출 → API 키 노출 없음
// ✅ revalidate: 86400 → 하루 1번 캐시
//    → 유저 3,000명 × 3회 진입 = 9,000 요청이 와도 Claude는 하루 1번만 호출!
//    → 비용: ~$0.008/일 고정

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const revalidate = 86400; // 24시간 캐시

export async function POST() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "서버 환경변수 누락: ANTHROPIC_API_KEY" },
      { status: 500 }
    );
  }

  // 최신 주가/뉴스 데이터를 서버 내부에서 직접 가져옴
  try {
    // 주가 데이터 가져오기 (캐시 활용)
    const [stocksRes, newsRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stocks`, {
        next: { revalidate: 300 },
      }),
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/news`, {
        next: { revalidate: 3600 },
      }),
    ]);

    const stocks = await stocksRes.json();
    const newsArticles = await newsRes.json();

    const stockText = stocks
      .filter((s: { error?: string }) => !s.error)
      .map(
        (s: {
          label: string;
          price: number;
          changePercent: number;
          symbol: string;
        }) =>
          `${s.label}: ${
            s.symbol === "KRW=X"
              ? `${s.price?.toFixed(0)}원`
              : s.price?.toFixed(2)
          } (${s.changePercent >= 0 ? "+" : ""}${s.changePercent?.toFixed(2)}%)`
      )
      .join(", ");

    const newsText = (Array.isArray(newsArticles) ? newsArticles : [])
      .slice(0, 5)
      .map((a: { title: string }) => `- ${a.title}`)
      .join("\n");

    const today = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001", // 요약엔 Haiku로 충분 → 비용 1/3
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `오늘(${today}) 경제 데이터를 바탕으로 한국 투자자를 위한 간결한 경제 요약을 3~4문장으로 작성해주세요. 친근하고 읽기 쉬운 한국어로 작성해주세요.

[주요 지수]
${stockText}

[주요 뉴스]
${newsText}

요약:`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json(
      { text, generatedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "요약 생성 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
