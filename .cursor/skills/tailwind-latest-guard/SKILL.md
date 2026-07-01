---
name: tailwind-latest-guard
description: 在本仓库中强制使用 Tailwind CSS v4 最新规范。对前端改动进行过期类名检测，发现旧写法必须先修复再交付。
---

# Tailwind Latest Guard（本仓库）

适用范围：`apps/frontend` 及所有 TSX/样式相关改动。

## 强制要求

1. 只使用 Tailwind v4 的规范类名（canonical classes）。
2. 遇到旧别名（例如 `bg-gradient-to-*`）必须改为新版写法（`bg-linear-to-*`）。
3. 前端改动提交前必须通过以下检查：
   - `pnpm lint`（已内置 Tailwind v4 旧类名拦截规则）
   - `pnpm typecheck`

## 检查方式

```bash
pnpm lint
```

ESLint 会对 `apps/**/*.{ts,tsx}` 中的字符串和模板字符串执行 Tailwind v4 旧类名检测，并在报错中给出替换方向。

## 工作流

1. 写代码。
2. 运行 `pnpm lint`。
3. 若有违规，按提示替换旧类名。
4. 重新运行检测直到通过。
5. 运行 `pnpm typecheck` 确认类型检查通过。

## 当前规范映射

- `bg-gradient-to-{direction}` → `bg-linear-to-{direction}`
- `bg-gradient-radial` → `bg-radial`
- `bg-gradient-conic` → `bg-conic`
- `bg-[size:...]` → `bg-size-[...]`

更详细规则见 [rules/canonical-tailwind-v4.md](./rules/canonical-tailwind-v4.md)。
