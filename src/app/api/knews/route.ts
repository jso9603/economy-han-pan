// app/api/news/route.ts
import { NextResponse } from "next/server";
import { NewsArticle } from "@/types";

const RSS_FEEDS = [
  {
    url: "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=02&plink=RSSREADER",
    source: "SBS",
    category: "경제",
  },
  {
    url: "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=07&plink=RSSREADER",
    source: "SBS",
    category: "국제",
  },
];

// CDATA 포함 여부 관계없이 태그 내용 추출
function getTagContent(xml: string, tag: string): string {
  // 1순위: <tag><![CDATA[...]]></tag>
  const cdataMatch = xml.match(
    new RegExp(
      `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`,
      "i"
    )
  );
  if (cdataMatch) return cdataMatch[1].trim();

  // 2순위: <tag>...</tag> 일반 텍스트
  const plainMatch = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  );
  if (plainMatch) return plainMatch[1].trim();

  return "";
}

function decodeHtml(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripHtml(html: string): string {
  return decodeHtml(
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function extractImage(html: string): string | null {
  return html.match(/<img[^>]+src=["'](https?[^"']+)["']/i)?.[1] ?? null;
}

function parseRSS(
  xml: string,
  source: string,
  category: string
): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemMatches = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)];

  for (const match of itemMatches) {
    const item = match[1];

    const title = stripHtml(getTagContent(item, "title"));

    // link: CDATA 우선, 없으면 guid에서 URL 추출
    let link = getTagContent(item, "link");
    if (!link.startsWith("http")) {
      const guid = getTagContent(item, "guid");
      if (guid.startsWith("http")) link = guid;
    }
    // 혹시 남은 CDATA 마커 제거
    link = link
      .replace(/^<!\[CDATA\[/, "")
      .replace(/\]\]>$/, "")
      .trim();

    const description = stripHtml(getTagContent(item, "description"));
    const pubDate = getTagContent(item, "pubDate");

    // 썸네일: enclosure → media:thumbnail → media:content → content:encoded → description 내 img
    let thumbnail: string | null =
      item.match(
        /<enclosure[^>]+url=["'](https?[^"']+)["'][^>]*type=["']image/i
      )?.[1] ??
      item.match(/<media:thumbnail[^>]+url=["'](https?[^"']+)["']/i)?.[1] ??
      item.match(
        /<media:content[^>]+url=["'](https?[^"']+)["'][^>]*medium=["']image["']/i
      )?.[1] ??
      null;

    if (!thumbnail) {
      const encoded = getTagContent(item, "content:encoded");
      thumbnail = extractImage(encoded) ?? extractImage(description) ?? null;
    }

    if (title && link.startsWith("http")) {
      items.push({
        title,
        url: link,
        description: description.slice(0, 300),
        publishedAt: pubDate
          ? new Date(pubDate).toISOString()
          : new Date().toISOString(),
        source,
        category,
        thumbnail,
      });
    }

    if (items.length >= 5) break;
  }

  return items;
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      RSS_FEEDS.map(async ({ url, source, category }) => {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
          next: { revalidate: 1800 },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        return parseRSS(xml, source, category);
      })
    );

    const allNews: NewsArticle[] = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    return NextResponse.json(allNews, {
      headers: {
        "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("News fetch error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
