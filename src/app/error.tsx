"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Route Error]", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        padding: "1rem",
      }}
    >
      <div style={{ fontSize: "3.5rem", marginBottom: "1.5rem" }}>😵</div>
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
          color: "var(--text-primary)",
        }}
      >
        页面加载失败
      </h2>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--text-secondary)",
          marginBottom: "1.5rem",
          maxWidth: "28rem",
        }}
      >
        {error.message || "该页面遇到了意外错误，请尝试刷新"}
        {error.digest && (
          <span
            style={{
              display: "block",
              fontSize: "0.75rem",
              marginTop: "0.25rem",
              opacity: 0.6,
            }}
          >
            错误ID: {error.digest}
          </span>
        )}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
          }}
        >
          🔄 重试
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          🏠 回到首页
        </button>
      </div>
    </div>
  );
}
