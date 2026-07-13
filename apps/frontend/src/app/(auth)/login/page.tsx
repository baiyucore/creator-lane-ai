'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconifyIcon } from '@/components/ui/iconify-icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getGithubLoginUrl, loginWithEmailCode, sendEmailCode } from '@/services/auth';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageShell />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageShell() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden h-[360px] animate-pulse rounded-3xl border border-border/70 bg-card/70 lg:block" />
        <div className="mx-auto h-[460px] w-full max-w-md animate-pulse rounded-3xl border border-border/80 bg-card/95" />
      </div>
    </main>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requestNext = searchParams.get('next');
  const next =
    requestNext?.startsWith('/') && !requestNext.startsWith('//') ? requestNext : '/dashboard';

  // 发送验证码
  async function handleSendCode() {
    setSendingCode(true);
    const result = await sendEmailCode(email);
    setSendingCode(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setCodeSent(true);
    toast.success(result.data?.message ?? '验证码已发送，请查收邮件');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!codeSent) {
      await handleSendCode();
      return;
    }
    setSubmitting(true);
    const result = await loginWithEmailCode(email, code);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('登录成功');
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent_32%),radial-gradient(circle_at_82%_12%,color-mix(in_oklab,var(--color-chart-2)_18%,transparent),transparent_30%),linear-gradient(180deg,transparent, color-mix(in_oklab,var(--color-muted)_48%,transparent))]"
      />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden rounded-3xl border border-border/70 bg-card/70 p-8 shadow-sm backdrop-blur lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Sparkles className="size-4" />
            Creator Lane AI
          </div>
          <div className="mt-14 space-y-5">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground xl:text-5xl">
              登录后继续构建你的 AI 内容工作台
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              管理创作工作区、沉淀内容资产，并让 AI
              在你的上下文里持续协作。首次使用邮箱验证码登录时会自动创建账号。
            </p>
          </div>
          <div className="mt-12 grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
              安全登录态由 HttpOnly Cookie 保存，前端无需手动管理 token。
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
              支持邮箱验证码和 GitHub 授权两种方式，适配本地开发和团队协作。
            </div>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md rounded-3xl border-border/80 bg-card/95 shadow-xl shadow-black/5 backdrop-blur">
          <CardHeader className="space-y-3 px-6 pt-7 sm:px-8 sm:pt-8">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight">欢迎回来</CardTitle>
              <CardDescription className="text-sm leading-6">
                使用邮箱验证码登录，或通过 GitHub 授权继续访问工作台。
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-7 sm:px-8 sm:pb-8">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  autoComplete="email"
                  className="h-11"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              {codeSent && (
                <div className="space-y-2">
                  <Label htmlFor="code">验证码</Label>
                  <Input
                    id="code"
                    autoComplete="one-time-code"
                    className="h-11"
                    inputMode="numeric"
                    maxLength={6}
                    minLength={6}
                    pattern="[0-9]{6}"
                    placeholder="输入 6 位验证码"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    required
                  />
                </div>
              )}
              <Button
                className="h-11 w-full gap-2"
                disabled={sendingCode || submitting}
                type="submit"
              >
                {codeSent
                  ? submitting
                    ? '登录中...'
                    : '登录'
                  : sendingCode
                    ? '发送中...'
                    : '发送验证码'}
                {!sendingCode && !submitting && <ArrowRight className="size-4" />}
              </Button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-3 text-xs text-muted-foreground">或</span>
              </div>
            </div>

            <a
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-all hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              href={getGithubLoginUrl()}
            >
              <IconifyIcon className="size-5" name="simple-icons:github" />
              使用 GitHub 登录
            </a>

            <p className="text-center text-sm text-muted-foreground">
              首次使用邮箱验证码登录时会自动创建账号。
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
