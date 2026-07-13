import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileEdit,
  FileText,
  GitBranch,
  Globe2,
  Lock,
  type LucideIcon,
  Mail,
  Menu,
  MessageSquare,
  MessageSquareQuote,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type BenefitBullet = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type Benefit = {
  title: string;
  description: string;
  preview: 'editor' | 'collab' | 'security';
  bullets: BenefitBullet[];
};

type PricingTier = {
  name: string;
  price: string;
  unit?: string;
  cta: string;
  href: string;
  highlighted?: boolean;
  features: string[];
};

const SITE = {
  name: 'DocFlow',
  url: 'https://www.codecrack.cn',
  description: '智能文档协作平台，让写作与团队协同更高效。',
};

const NAV_ITEMS = [
  { label: '功能特性', href: '#features' },
  { label: '价格方案', href: '#pricing' },
  { label: '用户评价', href: '#testimonials' },
  { label: '常见问题', href: '#faq' },
];

const BRANDS = ['Notion', 'Stripe', 'Dropbox', 'Shopify', 'Slack', 'Linear'];

const BENEFITS: Benefit[] = [
  {
    title: 'AI 智能写作',
    description:
      '内置强大的 AI 写作助手，支持智能续写、内容改写与创意激发。无论是日报、报告还是创意内容，都能高效产出。',
    preview: 'editor',
    bullets: [
      {
        icon: BarChart3,
        title: '智能内容补全',
        description: '基于上下文理解，自动给出高质量的写作建议与续写内容。',
      },
      {
        icon: Target,
        title: '自定义写作目标',
        description: '设定风格、语气和字数目标，让 AI 按你的要求精准输出。',
      },
      {
        icon: TrendingUp,
        title: '多轮对话润色',
        description: '通过对话式交互持续优化文章，直到满意为止。',
      },
    ],
  },
  {
    title: '实时多人协作',
    description:
      '基于 Yjs CRDT 算法实现零冲突的实时协作编辑，支持多人同时在线修改，所有变更即时同步，团队效率倍增。',
    preview: 'collab',
    bullets: [
      {
        icon: Users,
        title: '多人同步编辑',
        description: '多位团队成员可同时编辑同一文档，操作实时可见。',
      },
      {
        icon: GitBranch,
        title: '完整版本历史',
        description: '每次修改均自动记录，随时一键回溯到任意历史版本。',
      },
      {
        icon: MessageSquare,
        title: '评论与反馈',
        description: '在文档任意位置添加评论，方便团队沟通与审阅。',
      },
    ],
  },
  {
    title: '安全可靠存储',
    description:
      '采用企业级数据加密方案，完善的权限管理体系，配合自动云端备份，让你的文档资产始终安全无忧。',
    preview: 'security',
    bullets: [
      {
        icon: Lock,
        title: '端到端数据加密',
        description: '传输与存储全程加密，你的数据只有你能看到。',
      },
      {
        icon: Shield,
        title: '细粒度权限控制',
        description: '对每个文档、每位成员精准设置查看、编辑或管理权限。',
      },
      {
        icon: RefreshCw,
        title: '自动备份恢复',
        description: '增量备份实时运行，即使意外发生也能秒速恢复文档。',
      },
    ],
  },
];

const PRICING_TIERS: PricingTier[] = [
  {
    name: '免费版',
    price: '¥0',
    cta: '免费注册',
    href: '/register',
    features: [
      '最多 3 个文档',
      '基础 AI 写作（每月 50 次）',
      '单人使用',
      '云端自动保存',
      '邮件支持',
    ],
  },
  {
    name: '专业版',
    price: '¥99',
    unit: '/月',
    cta: '立即升级',
    href: '/register',
    highlighted: true,
    features: [
      '无限文档数量',
      '高级 AI 写作（无限次）',
      '最多 10 人协作',
      '完整版本历史',
      '优先客服支持',
      '自定义域名',
    ],
  },
  {
    name: '企业版',
    price: '联系我们',
    cta: '联系销售',
    href: '/login',
    features: [
      '无限文档 & 空间',
      '专属 AI 模型微调',
      '无限成员数量',
      '私有化部署支持',
      '专属客户成功经理',
      '定制化培训服务',
    ],
  },
];

const TESTIMONIALS = [
  {
    name: '张伟',
    role: '某互联网公司产品总监',
    initials: '张',
    message:
      'DocFlow 的 AI 写作功能让我们的产品文档效率提升了 3 倍，实时协作功能更是彻底取代了我们之前繁琐的邮件来回流程。',
  },
  {
    name: '李晓梅',
    role: '独立内容创作者',
    initials: '李',
    message:
      '用了很多编辑器，DocFlow 是唯一让我感觉在用未来工具的产品。AI 续写和改写功能真的极大提升了我的创作效率。',
  },
  {
    name: '王建国',
    role: '技术团队负责人',
    initials: '王',
    message:
      '基于 Yjs 的协作体验非常丝滑，零延迟、零冲突，我们整个研发团队的文档协作效率得到了质的提升。',
  },
];

const FAQS = [
  {
    question: 'DocFlow 支持哪些文档格式？',
    answer:
      'DocFlow 支持 Markdown、富文本（WYSIWYG），并可导入导出 Word/PDF。内置编辑器提供丰富内容块，覆盖绝大多数文档场景。',
  },
  {
    question: '实时协作最多支持多少人？',
    answer:
      '基于 Yjs CRDT 算法，理论上支持大规模协作。专业版支持 10 人，企业版支持无限成员，变更实时同步且零冲突。',
  },
  {
    question: 'AI 写作助手使用什么模型？',
    answer:
      'DocFlow 可接入主流大语言模型，并结合知识库上下文完成续写、改写与总结，输出更贴近团队语境的内容。',
  },
  {
    question: '我的文档数据安全吗？',
    answer:
      '所有数据在传输和存储过程中均启用企业级加密策略。默认不将用户数据用于训练，企业版支持私有化部署。',
  },
  {
    question: '可以免费试用吗？',
    answer: '可以。免费版长期可用且无需绑定信用卡，注册后即可体验核心写作与协作能力，随时升级。',
  },
];

const STATS = [
  {
    value: '10 万+',
    label: '每日新建文档数',
    description: '覆盖个人创作者、企业团队与高校师生。',
    icon: FileText,
    iconClass: 'text-indigo-600 dark:text-indigo-300',
    accentClass: 'bg-indigo-500/75 dark:bg-indigo-300/65',
  },
  {
    value: '4.9 分',
    label: '用户综合评分',
    description: '长期保持同类产品前列的口碑表现。',
    icon: Star,
    iconClass: 'text-indigo-600 dark:text-indigo-300',
    accentClass: 'bg-indigo-500/75 dark:bg-indigo-300/65',
  },
  {
    value: '50+',
    label: '覆盖国家和地区',
    description: '全球用户正在使用 DocFlow 管理文档资产。',
    icon: Globe2,
    iconClass: 'text-indigo-600 dark:text-indigo-300',
    accentClass: 'bg-indigo-500/75 dark:bg-indigo-300/65',
  },
];

const primaryActionClass =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-indigo-600 bg-indigo-600 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(79,70,229,0.52)] transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-[0_16px_30px_-16px_rgba(79,70,229,0.55)]';

const secondaryActionClass =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300/80 bg-white/78 px-4 text-sm font-semibold text-slate-700 backdrop-blur transition-[transform,background-color,border-color,color] hover:-translate-y-0.5 hover:border-indigo-300/70 hover:bg-indigo-50/80 hover:text-indigo-700 dark:border-slate-500/45 dark:bg-[#20283d]/88 dark:text-slate-200 dark:hover:border-indigo-300/40 dark:hover:bg-[#293453] dark:hover:text-indigo-100';

function EditorPreview() {
  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-border/70 bg-card/90 shadow-xl shadow-primary/10 backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-border/70 bg-muted/50 px-4 py-3">
        <span className="size-2.5 rounded-full bg-rose-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-muted-foreground">AI 写作助手</span>
      </div>
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/5 rounded bg-foreground/90" />
        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded bg-muted" />
          <div className="h-2.5 w-11/12 rounded bg-muted" />
          <div className="h-2.5 w-4/5 rounded bg-muted" />
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/80 text-primary-foreground">
              <Sparkles className="size-3" />
            </span>
            <span className="text-xs font-medium text-primary">AI 续写建议</span>
          </div>
          <div className="space-y-1">
            <div className="h-2 w-full rounded bg-primary/25" />
            <div className="h-2 w-3/4 rounded bg-primary/25" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded bg-muted" />
          <div className="h-2.5 w-10/12 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function CollabPreview() {
  const users = [
    { color: '#6366f1', name: 'A', status: '张三正在编辑第 3 段...' },
    { color: '#06b6d4', name: 'B', status: '李四正在评论...' },
    { color: '#f59e0b', name: 'C', status: '王五已查看' },
  ];

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-border/70 bg-card/90 shadow-xl shadow-primary/10 backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-border/70 bg-muted/50 px-4 py-3">
        <span className="size-2.5 rounded-full bg-rose-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-muted-foreground">实时协作 · 3 人在线</span>
      </div>
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/5 rounded bg-foreground/90" />
        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded bg-muted" />
          <div className="h-2.5 w-11/12 rounded bg-muted" />
        </div>
        <div className="space-y-2 pt-2">
          {users.map((user) => (
            <div
              key={user.name}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-2.5 py-2"
            >
              <span
                className="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: user.color }}
              >
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground">{user.status}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-700 dark:text-emerald-300">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium">所有更改已实时同步</span>
        </div>
      </div>
    </div>
  );
}

function SecurityPreview() {
  const rows = [
    { label: '查看权限', enabled: true },
    { label: '编辑权限', enabled: true },
    { label: '管理权限', enabled: false },
    { label: '分享权限', enabled: false },
  ];

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-border/70 bg-card/90 shadow-xl shadow-primary/10 backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-border/70 bg-muted/50 px-4 py-3">
        <span className="size-2.5 rounded-full bg-rose-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-muted-foreground">权限管理</span>
      </div>
      <div className="space-y-3 p-5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between border-b border-border/70 py-2"
          >
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span
              className={cn(
                'flex h-5 w-10 items-center rounded-full px-0.5 transition-colors',
                row.enabled ? 'justify-end bg-primary' : 'justify-start bg-muted',
              )}
            >
              <span className="size-4 rounded-full bg-card shadow-sm" />
            </span>
          </div>
        ))}
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
          <span className="text-xs font-medium text-primary">AES-256 加密已启用</span>
        </div>
      </div>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[580px]">
      <div className="absolute inset-x-10 top-8 h-72 rounded-[2rem] bg-[radial-gradient(circle,rgba(99,102,241,0.22),transparent_72%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(129,140,248,0.3),transparent_72%)]" />
      <div className="relative rounded-[2rem] border border-border/70 bg-card/92 p-4 shadow-2xl shadow-primary/15 backdrop-blur">
        <div className="flex items-center gap-1.5 border-b border-border/70 px-2 pb-3">
          <span className="size-2.5 rounded-full bg-rose-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs text-muted-foreground">产品需求文档.docflow</span>
        </div>
        <div className="space-y-4 p-3 sm:p-5">
          <div className="h-5 w-4/5 rounded bg-foreground/90" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-full rounded bg-muted" />
            <div className="h-2.5 w-11/12 rounded bg-muted" />
            <div className="h-2.5 w-4/5 rounded bg-muted" />
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Sparkles className="size-4" />
              <span className="text-xs font-medium">AI 建议</span>
            </div>
            <div className="space-y-1">
              <div className="h-2 w-full rounded bg-primary/20" />
              <div className="h-2 w-3/4 rounded bg-primary/20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: 'A', color: '#6366f1' },
              { label: 'B', color: '#06b6d4' },
              { label: 'C', color: '#f59e0b' },
            ].map((member, index) => (
              <span
                key={member.label}
                className="inline-flex size-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-semibold text-white"
                style={{ backgroundColor: member.color, marginLeft: index > 0 ? '-8px' : 0 }}
              >
                {member.label}
              </span>
            ))}
            <span className="ml-2 text-xs text-muted-foreground">3 人正在协作</span>
          </div>
        </div>
      </div>
      <div className="absolute -right-2 top-20 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 shadow-lg dark:text-emerald-300">
        已实时同步
      </div>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/78 backdrop-blur-xl dark:border-slate-700/45 dark:bg-[#0b1222]/76">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-flex size-8 items-center justify-center rounded-xl border border-indigo-300/45 bg-indigo-500/12 text-indigo-600 dark:border-indigo-300/30 dark:bg-indigo-400/16 dark:text-indigo-300">
            <FileEdit className="size-4" />
          </span>
          {SITE.name}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Link href="/login" className={secondaryActionClass}>
            登录
          </Link>
          <Link href="/register" className={primaryActionClass}>
            免费开始
          </Link>
        </div>

        <details className="group relative lg:hidden">
          <summary className="inline-flex size-9 list-none items-center justify-center rounded-xl border border-slate-300/80 bg-white/80 text-slate-700 [&::-webkit-details-marker]:hidden dark:border-slate-500/45 dark:bg-[#1f2940] dark:text-slate-200">
            <Menu className="size-4" />
          </summary>
          <div className="absolute right-0 top-11 w-64 rounded-2xl border border-slate-200/80 bg-white/92 p-3 shadow-xl shadow-slate-900/10 backdrop-blur dark:border-slate-600/40 dark:bg-[#101a2d]/96">
            <nav className="grid gap-1">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-[#263451] dark:hover:text-indigo-200"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/login" className={secondaryActionClass}>
                登录
              </Link>
              <Link href="/register" className={primaryActionClass}>
                开始
              </Link>
            </div>
            <div className="mt-3 flex justify-end">
              <ThemeToggle />
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(99,102,241,0.14),transparent_42%),radial-gradient(circle_at_86%_14%,rgba(59,130,246,0.12),transparent_38%)] dark:bg-[radial-gradient(circle_at_14%_10%,rgba(99,102,241,0.2),transparent_50%),radial-gradient(circle_at_86%_14%,rgba(59,130,246,0.16),transparent_46%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.13)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.13)_1px,transparent_1px)] bg-size-[44px_44px] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.1)_1px,transparent_1px)]"
      />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
        <div>
          <Badge className="rounded-full border border-indigo-300/45 bg-indigo-500/10 px-3 py-1 text-indigo-700 hover:bg-indigo-500/16 dark:border-indigo-300/35 dark:bg-indigo-400/14 dark:text-indigo-200">
            Next Gen 文档协作体验
          </Badge>
          <h1 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            智能、高效、简洁的
            <span className="block">企业级文档协作平台</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            基于 Tiptap + Yjs 构建，支持实时多人协作、AI
            智能写作与丰富内容格式，让每一份文档都可沉淀、可协同、可复用。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={primaryActionClass}>
              免费开始使用
              <ArrowRight className="size-4" />
            </Link>
            <a href="#features" className={secondaryActionClass}>
              了解更多功能
            </a>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 sm:gap-6">
            {[
              { value: '10 万+', label: '活跃用户' },
              { value: '50+', label: '覆盖地区' },
              { value: '99.9%', label: '稳定可用性' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200/80 bg-white/86 px-4 py-3 shadow-sm shadow-slate-900/5 backdrop-blur dark:border-slate-600/45 dark:bg-[#162238]/90 dark:shadow-slate-950/25"
              >
                <p className="text-2xl font-semibold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}

function BrandWall() {
  return (
    <section className="border-y border-slate-200/70 bg-white/72 py-10 dark:border-slate-700/45 dark:bg-[#0f1729]/86">
      <div className="mx-auto w-full max-w-7xl px-5">
        <p className="text-center text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
          被 2000+ 团队与个人创作者信赖
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-6">
          {BRANDS.map((brand) => (
            <span
              key={brand}
              className="rounded-xl border border-slate-200/85 bg-white/88 px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:border-indigo-300/55 hover:text-indigo-700 dark:border-slate-600/45 dark:bg-[#1a253b]/88 dark:text-slate-300 dark:hover:border-indigo-300/35 dark:hover:text-indigo-200"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const PREVIEW_MAP = {
  editor: EditorPreview,
  collab: CollabPreview,
  security: SecurityPreview,
} as const;

function Features() {
  return (
    <section id="features" className="space-y-8 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          为什么团队选择 DocFlow
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          写作、协作、沉淀并不是三个系统。我们把它们整合进一个工作流，让团队始终在同一份真实文档上高效协同。
        </p>
      </div>

      {BENEFITS.map((benefit, index) => {
        const Preview = PREVIEW_MAP[benefit.preview];

        return (
          <article
            key={benefit.title}
            className={cn(
              'grid items-center gap-8 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_38px_-24px_rgba(15,23,42,0.22)] backdrop-blur sm:gap-10 sm:p-8 lg:grid-cols-2 dark:border-slate-600/42 dark:bg-[#111b2f]/94 dark:shadow-[0_20px_42px_-28px_rgba(0,0,0,0.88)]',
              index % 2 === 0 && 'lg:[&>*:first-child]:order-2',
            )}
          >
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {benefit.title}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {benefit.description}
              </p>
              <div className="mt-6 space-y-4">
                {benefit.bullets.map((bullet) => {
                  const Icon = bullet.icon;

                  return (
                    <div key={bullet.title} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex size-10 items-center justify-center rounded-xl border border-indigo-300/45 bg-indigo-500/12 text-indigo-700 dark:border-indigo-300/30 dark:bg-indigo-400/15 dark:text-indigo-200">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <h4 className="text-base font-semibold text-foreground">{bullet.title}</h4>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {bullet.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <Preview />
          </article>
        );
      })}
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">价格方案</h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          简单透明，无隐藏费用。按团队规模与协作深度选择合适方案，随时升级。
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={cn(
              'h-full rounded-3xl border-slate-200/80 bg-white/90 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.2)] backdrop-blur dark:border-slate-600/42 dark:bg-[#111b2f]/94 dark:shadow-[0_18px_40px_-26px_rgba(0,0,0,0.88)]',
              tier.highlighted &&
                'relative border-indigo-300/70 ring-1 ring-indigo-300/65 shadow-xl shadow-indigo-500/16 dark:border-indigo-300/35 dark:ring-indigo-300/35',
            )}
          >
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                {tier.highlighted ? (
                  <Badge className="rounded-full bg-indigo-600 text-white">最受欢迎</Badge>
                ) : null}
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-semibold tracking-tight">{tier.price}</span>
                {tier.unit ? (
                  <span className="pb-1 text-sm text-muted-foreground">{tier.unit}</span>
                ) : null}
              </div>
              <CardDescription>
                {tier.highlighted ? '适合高频协作团队' : '按需启用核心能力'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <Link
                href={tier.href}
                className={cn(
                  'inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition-[transform,background-color,box-shadow,color,border-color] hover:-translate-y-0.5',
                  tier.highlighted
                    ? 'bg-indigo-600 text-white shadow-[0_12px_26px_-14px_rgba(79,70,229,0.56)] hover:bg-indigo-500'
                    : 'border border-slate-300/80 bg-white/78 text-slate-700 hover:border-indigo-300/70 hover:bg-indigo-50/85 hover:text-indigo-700 dark:border-slate-500/45 dark:bg-[#212a40] dark:text-slate-200 dark:hover:border-indigo-300/40 dark:hover:bg-[#2b3756] dark:hover:text-indigo-100',
                )}
              >
                {tier.cta}
              </Link>
              <ul className="mt-5 space-y-2.5">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="testimonials" className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">用户真实评价</h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          来自产品团队、独立创作者与研发团队的真实反馈。
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <Card
            key={item.name}
            className="group relative h-full overflow-hidden rounded-[30px] border-slate-200/80 bg-white/90 transform-[translateZ(0)] will-change-transform transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-indigo-300/65 hover:shadow-[0_24px_54px_-26px_rgba(79,70,229,0.24)] dark:border-slate-600/42 dark:bg-[#111b2f]/94 dark:hover:border-indigo-300/40 dark:hover:shadow-[0_28px_58px_-28px_rgba(0,0,0,0.88)]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full bg-radial from-indigo-400/16 to-transparent opacity-65 blur-sm transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:opacity-100 group-hover:blur-0 dark:from-indigo-300/18"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/35 via-transparent to-transparent opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 dark:from-white/5"
            />
            <CardHeader className="relative h-full gap-4 pb-6">
              <span className="inline-flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/12 text-primary transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
                <MessageSquareQuote className="size-[18px]" />
              </span>
              <CardDescription className="min-h-[128px] text-[15px] leading-relaxed text-foreground/88 dark:text-foreground/92">
                “{item.message}”
              </CardDescription>
              <div className="mt-auto flex items-center gap-3 border-t border-border/70 pt-4">
                <span className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-base font-semibold text-foreground shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
                  {item.initials}
                </span>
                <div>
                  <p className="text-base font-semibold text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star
                    key={`${item.name}-${starIndex + 1}`}
                    className="size-4 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300"
                  />
                ))}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="py-16 sm:py-20">
      <div className="grid gap-5 sm:grid-cols-3">
        {STATS.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.value}
              className="group relative h-full overflow-hidden rounded-[30px] border-slate-200/85 bg-white/92 text-center shadow-[0_14px_30px_-22px_rgba(15,23,42,0.25)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-indigo-300/55 hover:shadow-[0_22px_42px_-24px_rgba(79,70,229,0.24)] dark:border-slate-600/42 dark:bg-[#121b2e]/95 dark:shadow-[0_20px_38px_-24px_rgba(0,0,0,0.82)] dark:hover:border-indigo-300/35"
            >
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-x-6 top-0 h-1 rounded-b-full',
                  item.accentClass,
                )}
              />
              <CardHeader className="relative items-center gap-4 px-7 pt-8 pb-8">
                <span
                  className={cn(
                    'inline-flex size-14 items-center justify-center rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-500/45 dark:bg-[#1b263d]',
                    item.iconClass,
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <CardTitle className="text-4xl leading-none tracking-tight sm:text-5xl">
                  {item.value}
                </CardTitle>
                <CardDescription className="text-2xl font-semibold tracking-tight text-foreground">
                  {item.label}
                </CardDescription>
                <p className="max-w-[24ch] text-base leading-relaxed text-slate-500 dark:text-slate-300/85">
                  {item.description}
                </p>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-16 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
        <div>
          <Badge variant="outline" className="rounded-full">
            FAQ
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">常见问题</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            还有其他问题？欢迎直接发邮件联系我们，我们会在 24 小时内回复。
          </p>
          <a
            href="mailto:hello@codecrack.cn"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Mail className="size-4" />
            hello@codecrack.cn
          </a>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => (
            <details
              key={faq.question}
              open={index === 0}
              className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white/92 dark:border-slate-600/42 dark:bg-[#111b2f]/94"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-semibold text-foreground sm:text-base">
                  {faq.question}
                </span>
                <span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="my-10 rounded-[2rem] border border-slate-200/85 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(239,246,255,0.84))] px-6 py-12 shadow-[0_22px_46px_-30px_rgba(15,23,42,0.22)] sm:my-14 sm:px-8 sm:py-14 lg:my-20 lg:py-16 dark:border-slate-600/42 dark:bg-[linear-gradient(145deg,rgba(19,27,44,0.94),rgba(14,22,36,0.95))] dark:shadow-[0_24px_46px_-28px_rgba(0,0,0,0.85)]">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[44px]">
          加入超过 10 万用户，开启智能写作之旅
        </h2>
        <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300/88">
          从第一份文档开始，让 AI、协作和版本能力成为你的默认工作流。
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-[0_18px_34px_-18px_rgba(79,70,229,0.48)]"
          >
            立即免费注册
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#features"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300/80 bg-white/82 px-6 text-sm font-semibold text-slate-700 transition-[transform,background-color,border-color,color] hover:-translate-y-0.5 hover:border-indigo-300/70 hover:bg-indigo-50/85 hover:text-indigo-700 dark:border-slate-500/45 dark:bg-[#212a40] dark:text-slate-200 dark:hover:border-indigo-300/40 dark:hover:bg-[#2b3756] dark:hover:text-indigo-100"
          >
            了解功能特性
          </a>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/70 bg-white/84 py-12 dark:border-slate-700/45 dark:bg-[#0e1627]/94 sm:py-14">
      <div className="mx-auto w-full max-w-7xl px-5">
        <div className="grid gap-10 border-b border-slate-200/75 pb-10 dark:border-slate-700/45 md:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="inline-flex size-8 items-center justify-center rounded-xl border border-indigo-300/45 bg-indigo-500/12 text-indigo-600 dark:border-indigo-300/30 dark:bg-indigo-400/16 dark:text-indigo-300">
                <FileEdit className="size-4" />
              </span>
              {SITE.name}
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {SITE.description}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">快速导航</h4>
            <ul className="mt-3 space-y-2">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">联系我们</h4>
            <a
              href="mailto:hello@codecrack.cn"
              className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="size-4" />
              hello@codecrack.cn
            </a>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://www.codecrack.cn"
                target="_blank"
                rel="noreferrer"
                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-300/75 text-slate-500 transition-colors hover:border-indigo-300/60 hover:text-indigo-700 dark:border-slate-500/45 dark:text-slate-300 dark:hover:border-indigo-300/40 dark:hover:text-indigo-200"
                aria-label="官网"
              >
                <Globe2 className="size-4" />
              </a>
              <a
                href="mailto:hello@codecrack.cn"
                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-300/75 text-slate-500 transition-colors hover:border-indigo-300/60 hover:text-indigo-700 dark:border-slate-500/45 dark:text-slate-300 dark:hover:border-indigo-300/40 dark:hover:text-indigo-200"
                aria-label="邮件"
              >
                <Mail className="size-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {currentYear} {SITE.name}. 保留所有权利。
          </p>
          <p>
            由{' '}
            <a href={SITE.url} className="transition-colors hover:text-foreground">
              DocFlow Team
            </a>{' '}
            用心构建
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-slate-50 text-foreground dark:bg-[#0a1323]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_4%,rgba(96,165,250,0.1),transparent_36%),radial-gradient(circle_at_86%_8%,rgba(56,189,248,0.08),transparent_32%)] dark:bg-[radial-gradient(circle_at_12%_4%,rgba(99,102,241,0.14),transparent_42%),radial-gradient(circle_at_86%_8%,rgba(34,211,238,0.1),transparent_38%)]"
      />
      <SiteHeader />
      <main className="relative">
        <Hero />
        <BrandWall />
        <div className="mx-auto w-full max-w-7xl px-5">
          <Features />
          <Pricing />
          <Testimonials />
          <FAQ />
          <Stats />
          <CTA />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
