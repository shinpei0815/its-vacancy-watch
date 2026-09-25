import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ITS 空室ウォッチ",
  description: "ITS健保の保養施設について、希望日の空室を追跡する個人用ダッシュボード",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
