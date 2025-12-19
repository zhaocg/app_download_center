import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "内部安装包下载中心",
  description: "公司内部 APK / IPA 下载与安装中心"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
          <header className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/80 pb-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                内部安装包下载中心
              </h1>
              <p className="text-xs text-slate-600">
                管理 APK / IPA 上传、下载、安装与分享
              </p>
            </div>
            <nav className="flex items-center gap-2 text-xs">
              <Link
                href="/"
                className="rounded border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-100"
              >
                资源列表
              </Link>
              <Link
                href="/history"
                className="rounded border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-100"
              >
                上传历史
              </Link>
              <Link
                href="/upload"
                className="rounded bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-500"
              >
                上传安装包
              </Link>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
