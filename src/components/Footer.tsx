import Link from 'next/link';

const FOOTER_LINKS = [
  { label: '首页', href: '/' },
  { label: '电影', href: '/movie' },
  { label: '电视剧', href: '/drama' },
  { label: '综艺', href: '/variety' },
  { label: '动漫', href: '/anime' },
  { label: '短剧', href: '/short' },
  { label: '搜索', href: '/search' },
];

export default function Footer() {
  return (
    <footer
      className="w-full py-4 mt-8 border-t hidden md:block"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4">
        {/* Links */}
        <div className="flex items-center justify-center gap-4 mb-3">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs transition-colors hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              {link.label}
            </Link>
          ))}
        </div>
        {/* Copyright */}
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2026 影视森林 · 仅供学习交流 · 资源来源于互联网
        </p>
      </div>
    </footer>
  );
}
