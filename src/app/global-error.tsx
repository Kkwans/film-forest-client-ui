'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: 'var(--bg-primary, #0f0f23)',
          color: 'var(--text-primary, #e0e0e0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎬💥</div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
            }}
          >
            影视森林出了点问题
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted, #888)',
              marginBottom: '1.5rem',
              maxWidth: '24rem',
            }}
          >
            {error.message || '应用遇到了意外错误，请尝试刷新页面'}
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: 'var(--accent, #667eea)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            刷新页面
          </button>
        </div>
      </body>
    </html>
  );
}
