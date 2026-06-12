import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "蚂蚁足球 - 2026世界杯高精度预测",
  description: "个人高精度世界杯赛事预测工具：胜平负、比分、进球数，MSI六维模型+实时数据驱动",
  keywords: ["蚂蚁足球", "世界杯", "足球预测", "赛事分析", "比分预测"],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
