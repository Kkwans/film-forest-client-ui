// @ts-nocheck
export default function Footer() {
  return (
    <footer
      className="w-full py-3 mt-8 border-t hidden md:block"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2026 影视森林. 仅供学习交流.
        </p>
      </div>
    </footer>
  );
}
