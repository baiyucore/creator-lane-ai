# Canonical Tailwind v4 Rules

本仓库按 Tailwind v4 规范统一 class 名称，禁止继续使用旧别名。

## 规则 1：线性渐变方向

- 错误：`bg-gradient-to-b`
- 正确：`bg-linear-to-b`

方向同理：`t|tr|r|br|b|bl|l|tl`。

## 规则 2：径向渐变

- 错误：`bg-gradient-radial`
- 正确：`bg-radial`

## 规则 3：圆锥渐变

- 错误：`bg-gradient-conic`
- 正确：`bg-conic`

## 规则 4：背景尺寸写法

- 错误：`bg-[size:180px_180px]`
- 正确：`bg-size-[180px_180px]`

## 执行标准

出现任一旧类名即视为不通过，必须修复后再提交。
