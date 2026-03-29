// app/api/gnews/route.ts

// ✅ 48분 간격 = 3카테고리 × 하루 30회 = 90건 (GNews 100건/일 안전하게)
export const revalidate = 2880;

type GNewsArticle = {
  title: string;
  description: string | null;
  url: string;
  image: string | null; // ✅ GNews 이미지 필드 추가
  source: { name: string };
  publishedAt: string;
};

export type Article = {
  title: string;
  description?: string;
  image?: string;
  url: string;
  source: string;
  publishedAt: string;
  category: "world" | "business" | "technology"; // ✅ 카테고리 필드 추가
};

// GNews 카테고리 3개 병렬 요청
const CATEGORIES = ["world", "business", "technology"] as const;
type Category = (typeof CATEGORIES)[number];

// ✅ AbortSignal.timeout 대신 setTimeout + AbortController 사용
//    (Next.js 서버사이드에서 AbortSignal.timeout 미동작 이슈 대응)
function fetchWithTimeout(url: string, options: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

// ✅ Claude API로 10건 한 번에 번역
async function translateBatch(
  items: { title: string; description?: string }[]
): Promise<{ title: string; description?: string }[]> {
  if (!items.length) return items;

  const input = items.map((item, i) => ({
    id: i,
    title: item.title,
    ...(item.description ? { description: item.description } : {}),
  }));

  // 디버그: API 키 존재 여부 확인
  console.log(
    "[translateBatch] API key 존재:",
    !!process.env.ANTHROPIC_API_KEY
  );

  try {
    const res = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: `다음 뉴스 제목과 설명을 자연스러운 한국어로 번역해주세요.
반드시 아래 JSON 배열 형식만 반환하고, 다른 텍스트는 절대 포함하지 마세요.

입력:
${JSON.stringify(input)}

출력 형식 (예시):
[{"id":0,"title":"번역된 제목","description":"번역된 설명"},{"id":1,"title":"번역된 제목"}]`,
            },
          ],
        }),
      },
      20000 // 20초 (번역 10건 여유있게)
    );

    console.log("[translateBatch] Claude 응답 상태:", res.status);

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[translateBatch] Claude API 오류 응답:", errBody);
      throw new Error(`Claude API error: ${res.status}`);
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text ?? "";

    console.log("[translateBatch] Claude 응답 원문:", raw.slice(0, 200));

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const translated: { id: number; title: string; description?: string }[] =
      JSON.parse(cleaned);

    return items.map((item, i) => {
      const found = translated.find((t) => t.id === i);
      return {
        title: found?.title ?? item.title,
        description: found?.description ?? item.description,
      };
    });
  } catch (e) {
    console.error("[translateBatch] 번역 실패, 원문 반환:", e);
    return items;
  }
}

export async function GET() {
  try {
    // ✅ 3개 카테고리 병렬 요청 (순차 대비 응답 시간 동일)
    const results = await Promise.allSettled(
      CATEGORIES.map((category) =>
        fetchWithTimeout(
          `https://gnews.io/api/v4/top-headlines?lang=en&category=${category}&max=10&apikey=${process.env.GNEWS_API_KEY}`,
          {},
          10000
        ).then((r) => r.json())
      )
    );

    // 성공한 카테고리만 수집, category 태그 붙이기
    const rawWithCategory: { article: GNewsArticle; category: Category }[] = [];

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        const articles: GNewsArticle[] = (result.value.articles ?? []).filter(
          (a: GNewsArticle) => a.title && a.url
        );
        articles.forEach((article) =>
          rawWithCategory.push({ article, category: CATEGORIES[i] })
        );
      } else {
        console.error(`[gnews] ${CATEGORIES[i]} 카테고리 실패:`, result.reason);
      }
    });

    if (!rawWithCategory.length) {
      return Response.json({ articles: [] });
    }

    // ✅ 카테고리별 10건씩 병렬 번역 (30건 한번에 → 타임아웃, 10건씩 병렬 → 안정적)
    const byCategory = CATEGORIES.map((cat) =>
      rawWithCategory.filter(({ category }) => category === cat)
    );

    const translatedByCategory = await Promise.allSettled(
      byCategory.map((group) =>
        translateBatch(
          group.map(({ article: a }) => ({
            title: a.title,
            ...(a.description ? { description: a.description } : {}),
          }))
        )
      )
    );

    const articles: Article[] = byCategory.flatMap((group, ci) => {
      const result = translatedByCategory[ci];
      const translated =
        result.status === "fulfilled"
          ? result.value
          : group.map(({ article: a }) => ({
              title: a.title,
              description: a.description ?? undefined,
            }));

      return group.map(({ article: a, category }, i) => ({
        title: translated[i]?.title ?? a.title,
        description: translated[i]?.description ?? a.description ?? undefined,
        image: a.image ?? undefined,
        url: a.url,
        source: a.source?.name ?? "GNews",
        publishedAt: a.publishedAt,
        category,
      }));
    });

    return Response.json({ articles });
  } catch (e) {
    console.error("[gnews/route] error:", e);
    return Response.json({ articles: [] }, { status: 500 });
  }
}
