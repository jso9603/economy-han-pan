// app/page.tsx
// Server Component: 주가, 뉴스는 서버에서 미리 fetch (SSR + 캐시)
// Client Component: 날씨만 브라우저 geolocation 필요

import { Suspense } from "react";
import { StockData, NewsArticle } from "@/types";
import Dashboard from "@/components/Dashboard";

async function getStocks(): Promise<StockData[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stocks`, {
      next: { revalidate: 300 },
    });
    return res.json();
  } catch {
    return [];
  }
}

async function getNews(): Promise<NewsArticle[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/news`, {
      next: { revalidate: 3600 },
    });
    return res.json();
  } catch {
    return [];
  }
}

async function getKNews(): Promise<NewsArticle[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/knews`, {
      next: { revalidate: 3600 },
    });
    return res.json();
  } catch {
    return [];
  }
}

export default async function Page() {
  const [stocks, news] = await Promise.all([getStocks(), getKNews()]);

  return (
    <Suspense fallback={null}>
      <Dashboard initialStocks={stocks} initialNews={news} />
    </Suspense>
  );
}
