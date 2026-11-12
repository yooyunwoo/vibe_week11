import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

// 글꼴은 한 가지만 쓰고, 굵기와 크기로 위계를 만든다
const plex = IBM_Plex_Sans_KR({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "할 일 목록",
  description: "나 혼자 쓰는 할 일 목록 앱",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${plex.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-page font-sans text-ink">
        {children}
      </body>
    </html>
  );
}
