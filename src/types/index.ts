// export interface StockData {
//   symbol: string;
//   label: string;
//   price: number | null;
//   change: number | null;
//   changePercent: number | null;
//   error?: string;
// }

export interface WeatherData {
  district: string;
  temp: number;
  feelsLike: number;
  description: string;
  humidity: number;
  wind: number;
  error?: string;
}

// export interface NewsArticle {
//   title: string;
//   source: string;
//   publishedAt: string;
//   url: string;
//   description: string;
// }

/////// knews
// types/index.ts
// 기존 타입에 category, thumbnail 추가

export interface StockData {
  symbol: string;
  label: string;
  price: number | null;
  changePercent: number | null;
  error?: boolean;
}

export interface WeatherData {
  district: string;
  temp: number;
  feelsLike: number;
  description: string;
  humidity: number;
  wind: number;
  error?: string;
}

export interface NewsArticle {
  title: string;
  url: string;
  description?: string;
  publishedAt: string;
  source: string;
  category: "경제" | "국제" | string;
  thumbnail: string | null;
}
