import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '关于与数据署名 - 影视森林',
  description: '影视森林项目说明、第三方数据来源与 TMDB API 署名。',
};

const TMDB_LOGO = 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_2-9665a76b1ae401a510ec1e0ca40ddcb3b0cfe45f1d51b77a308fea0845885648.svg';

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="rounded-2xl border p-6 sm:p-8" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>About / Credits</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">关于影视森林</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          影视森林是用于整理、检索和发现影视资源的聚合工具。来源站原始海报会被保留；登录用户可以选择是否使用自己的 TMDB 凭据进行智能海报匹配。
        </p>
      </header>

      <section id="tmdb" className="scroll-mt-24 rounded-2xl border p-6 sm:p-8" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h2 className="text-lg font-bold text-foreground">TMDB 数据与图片署名</h2>
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="mt-5 inline-flex no-underline" aria-label="访问 The Movie Database">
          {/* 官方批准的 blue long 2 标志；不修改颜色、比例或方向。 */}
          {/* eslint-disable-next-line @next/next/no-img-element -- TMDB 要求直接展示其官方托管标志。 */}
          <img src={TMDB_LOGO} width="180" height="76" alt="The Movie Database (TMDB)" className="h-auto w-40 sm:w-44" />
        </a>
        <p className="mt-5 rounded-xl border px-4 py-3 text-sm font-medium leading-6 text-foreground" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          当用户启用“TMDB 智能识别”时，系统仅使用该用户自行配置的凭据请求 TMDB API，用于匹配内容及选择官方海报。TMDB 匹配失败、超时、限流或凭据无效时，界面会继续展示来源站原图。
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <a href="https://developer.themoviedb.org/docs/faq" target="_blank" rel="noreferrer" className="font-medium" style={{ color: 'var(--accent)' }}>TMDB API 与署名要求 ↗</a>
          <a href="https://www.themoviedb.org/about/logos-attribution" target="_blank" rel="noreferrer" className="font-medium" style={{ color: 'var(--accent)' }}>官方标志与归属说明 ↗</a>
        </div>
      </section>

      <Link href="/" className="self-start rounded-xl border px-4 py-2 text-sm font-medium no-underline" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
        ← 返回首页
      </Link>
    </div>
  );
}
