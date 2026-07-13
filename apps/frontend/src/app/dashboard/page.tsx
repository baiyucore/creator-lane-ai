import Link from 'next/link';

export default function DashboardPage() {
  return (
    <section className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-sm backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Content Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">赛道内容工作台</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          围绕公众号等文本场景，按赛道拆解选题、结构与语气，快速生成可发布的内容初稿。
        </p>
        <Link
          href="/dashboard/work"
          className="mt-6 inline-flex h-8 items-center justify-center rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
        >
          开始赛道创作
        </Link>
      </div>
    </section>
  );
}
