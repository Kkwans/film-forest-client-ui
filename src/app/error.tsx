"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[Route Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-5xl mb-6">😵</div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        页面加载失败
      </h2>
      <p className="text-sm mb-6 max-w-md" style={{ color: "var(--text-secondary)" }}>
        {error.message || "该页面遇到了意外错误，请尝试刷新"}
        {error.digest && (
          <span className="block text-xs mt-1 opacity-60">
            错误ID: {error.digest}
          </span>
        )}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
          style={{
            borderColor: "var(--border-color)",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
          }}
        >
          🔄 重试
        </button>
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--accent)" }}
        >
          🏠 回到首页
        </button>
      </div>
    </div>
  );
}
