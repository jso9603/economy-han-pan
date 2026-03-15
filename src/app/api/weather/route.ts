// app/api/weather/route.ts
// ✅ 서버에서 OpenWeatherMap 호출 → API 키 노출 없음
// ✅ 위도/경도는 클라이언트(브라우저 geolocation)에서 받아서 서버가 대신 호출
// ✅ 날씨 특성상 완전 동일 좌표 캐시는 어렵지만, 30분 TTL로 반복 호출 방지

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "위도/경도 필요" }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "서버 환경변수 누락: OPENWEATHER_API_KEY" }, { status: 500 });
  }

  try {
    const [weatherRes, geoRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=kr`,
        { next: { revalidate: 1800 } } // 30분 캐시
      ),
      fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`,
        { next: { revalidate: 86400 } } // 지명은 하루 캐시
      ),
    ]);

    const weatherData = await weatherRes.json();
    const geoData = await geoRes.json();
    const district =
      geoData?.[0]?.local_names?.ko || geoData?.[0]?.name || weatherData.name;

    return NextResponse.json(
      {
        district,
        temp: Math.round(weatherData.main.temp),
        feelsLike: Math.round(weatherData.main.feels_like),
        description: weatherData.weather[0].description,
        humidity: weatherData.main.humidity,
        wind: weatherData.wind.speed,
      },
      {
        headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300" },
      }
    );
  } catch {
    return NextResponse.json({ error: "날씨 조회 실패" }, { status: 500 });
  }
}
