import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "경제 한 판",
  description: "오늘의 경제를 한 페이지에서",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, background: "#0a0a0a" }}>{children}</body>
    </html>
  );
}
