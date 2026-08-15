import { Metadata, Viewport } from 'next';
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import PageTransition from "@/components/PageTransition";
import ScrollToTop from "@/components/ScrollToTop";
import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "影视森林",
  description: "影视资源聚合平台 - 电影/剧集/综艺/动漫/短剧",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className="app-shell min-h-screen flex flex-col"
        style={{
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
        }}
      >
        <ThemeProvider>
          <a className="skip-link" href="#main-content">跳到主要内容</a>
          <Header />
          <PageTransition />
          <ToastProvider>
          <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-[120rem] mx-auto px-4 py-6 pb-safe-bottom sm:px-6 lg:px-8">
            {children}
          </main>
          </ToastProvider>
          <Footer />
          <MobileBottomNav />
          <ScrollToTop />
        </ThemeProvider>
      </body>
    </html>
  );
}
