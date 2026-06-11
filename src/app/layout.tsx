import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "蚂蚁足球 - 2026世界杯专业赛事分析",
  description: "为线下彩票店和线上足球预测平台提供专业赛事数据分析服务，后置分佣模式，无收益不收费。",
  keywords: ["蚂蚁足球", "世界杯", "足球分析", "赛事预测", "数据分析"],
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
