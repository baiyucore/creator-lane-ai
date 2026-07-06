# apps/backend 与 apps/frontend 配置差异分析

## 说明

- 当前项目目录：`/Users/gubaiyu/hyt/creator-lane-ai/creator-lane-ai`
- 参考项目目录：`/Users/gubaiyu/hyt/ai_docs/creator-lane-ai`
- 本文只关注 `apps/backend` 与 `apps/frontend` 的配置、基础接线、关键支撑文件差异。
- 不将 `node_modules`、`.next`、`dist`、`.turbo` 这类安装或构建产物视为需要手动补齐的配置项。

## 总结

- `apps/frontend` 缺失的配置更明显，主要集中在环境变量、Next 代理转发、认证接入、主题与 UI 基础设施、请求服务层、编辑器扩展层。
- `apps/backend` 已有一部分基础设施配置，但与参考项目相比，还缺少业务模块接线、全局拦截器、数据库迁移、部分启动与类型配置。
- 如果目标是“先跑起来”，建议优先补齐 frontend 的环境与代理配置，以及 backend 的模块接线和数据库迁移。

## Frontend 差异

### 缺失文件

当前项目中不存在，但参考项目中存在：

- `apps/frontend/.env.development`
- `apps/frontend/.env.production`
- `apps/frontend/next-env.d.ts`
- `apps/frontend/src/components/auth-provider.tsx`
- `apps/frontend/src/components/theme-provider.tsx`
- `apps/frontend/src/components/theme-toggle.tsx`
- `apps/frontend/src/extensions/extension-kit.ts`
- `apps/frontend/src/extensions/index.ts`
- `apps/frontend/src/hooks/use-toast.ts`
- `apps/frontend/src/services/agent.ts`
- `apps/frontend/src/services/auth.ts`
- `apps/frontend/src/services/request.ts`
- `apps/frontend/src/services/upload.ts`
- `apps/frontend/src/services/users.ts`
- `apps/frontend/src/services/workspaces.ts`
- `apps/frontend/src/stores/chatStore.ts`
- `apps/frontend/src/stores/editorStore.ts`
- `apps/frontend/src/utils.ts`
- `apps/frontend/src/utils/editor-selection.ts`
- `apps/frontend/src/app/favicon.ico`
- `apps/frontend/src/app/globals.css`

### 已存在但未对齐的配置

#### `apps/frontend/next.config.ts`

当前项目基本为空配置，参考项目额外包含：

- `BACKEND_ORIGIN` 环境变量读取
- `/api/v1/:path*` 到后端服务的 `rewrites`
- `devIndicators.position = 'bottom-right'`

这意味着当前 frontend 还没有把 API 请求通过 Next 配置层转发到 backend。

#### `apps/frontend/tsconfig.json`

当前项目与参考项目存在这些差异：

- 当前继承 `../../tsconfig.base.json`
- 参考继承 `../../tsconfig.json`
- 当前 `target` 更旧
- 当前 `jsx` 为 `react-jsx`
- 参考 `jsx` 为 `preserve`
- 当前 `include` 范围更广，包含 `.next/dev/types/**/*.ts` 和 `**/*.mts`

这不一定是错误，但说明当前 ts 配置体系和参考项目并没有完全统一。

#### `apps/frontend/components.json`

当前项目：

- `style` 为 `radix-vega`
- `tailwind.css` 指向 `src/styles/globals.css`

参考项目：

- `style` 为 `base-nova`
- `tailwind.css` 指向 `src/app/globals.css`

这里有一个明确问题：

- 当前项目实际并不存在 `src/styles/globals.css`
- 当前真实存在的是 `src/styles/index.css`

也就是说，当前 `components.json` 里的样式入口路径是失配的。

#### `apps/frontend/src/proxy.ts`

当前项目该文件为空。

参考项目在这里做了：

- 读取 `SESSION_COOKIE_NAME`
- 检查登录态 cookie
- 对 `/dashboard/:path*`、`/work/:path*` 做登录保护
- 未登录时跳转到 `/login?next=...`

这说明当前项目还没有接上前端路由层的登录保护。

#### `apps/frontend/src/app/layout.tsx`

当前项目还未接入参考项目中的：

- `ThemeProvider`
- `AuthProvider`
- `Toaster`
- `suppressHydrationWarning`
- `./globals.css`

这意味着当前 layout 还只是最基础的壳，没有接入全局主题、认证上下文和通知系统。

#### `apps/frontend/src/app/page.tsx`

当前首页仍偏脚手架初始化状态，参考项目已经是完整业务展示首页。

这部分更偏页面实现，不完全属于“基础配置”，但它反向说明：

- 当前项目缺少支撑首页所需的 UI 组件
- 当前项目缺少主题切换相关能力
- 当前项目缺少业务服务层调用能力

#### `apps/frontend/src/styles/index.css`

当前已有基础样式，但参考项目的样式体系更完整，额外依赖多个分段样式文件：

- `partials/agent-suggestion.css`
- `partials/ai-brainstorm.css`
- `partials/animations.css`
- `partials/blocks.css`
- `partials/blog.css`
- `partials/code-block.css`
- `partials/code.css`
- `partials/collab.css`
- `partials/draggable.css`
- `partials/frappe-gantt.css`
- `partials/lists.css`
- `partials/math.css`
- `partials/mathlive.css`
- `partials/mention.css`
- `partials/placeholder.css`
- `partials/syntax-highlight.css`
- `partials/table.css`
- `partials/typography.css`

如果后续要补齐参考项目的编辑器与复杂内容展示能力，这一块也需要一起补。

### 依赖层差异

参考项目的 `apps/frontend/package.json` 比当前项目多出大量关键依赖，主要包括：

- 主题与交互：`next-themes`、`sonner`
- UI 基础组件：`@radix-ui/*`、`@base-ui/react`、`cmdk`
- 图标：`@iconify/react`、`@iconify-json/simple-icons`
- 编辑器：`@tiptap/*`
- 协作与流程图：`@xyflow/react`
- 文本与代码处理：`highlight.js`、`lowlight`、`js-beautify`
- 数学与 markdown：`katex`、`mathlive`、`mdast-util-*`、`micromark-extension-gfm`
- 工具类：`lodash-es`

这说明当前 frontend 还没具备参考项目的完整编辑器与业务交互基础。

## Backend 差异

### 缺失文件

当前项目中不存在，但参考项目中存在：

- `apps/backend/src/agent/agent-provider.config.ts`
- `apps/backend/src/agent/agent.controller.ts`
- `apps/backend/src/agent/agent.module.ts`
- `apps/backend/src/agent/agent.service.ts`
- `apps/backend/src/metadata.ts`
- `apps/backend/src/utils/remove_water.ts`
- `apps/backend/src/utils/timeout-exclude-paths.ts`
- `apps/backend/public/bg_48.png`
- `apps/backend/public/bg_96.png`

从 `app.module.ts` 的引用关系看，参考项目中还存在但本次未直接枚举到的目录：

- `src/api/auth/*`
- `src/api/health/*`
- `src/api/upload/*`
- `src/api/works/*`
- `src/core/interceptor/*`
- `src/common/drizzle/*`
- `src/common/langfuse/*`
- `src/common/minio/*`
- `src/common/redis/*`

这些模块如果当前项目没有完整落地，那么 backend 只是基础壳，还未接上完整业务。

### 已存在但未对齐的配置

#### `apps/backend/src/app.module.ts`

当前项目接入了基础 infra，但参考项目额外接入：

- `AgentModule`
- `AuthModule`
- `HealthModule`
- `WorksModule`
- `UploadModule`

另外参考项目还注册了两个全局拦截器：

- `LangfuseTraceInterceptor`
- `TransformInterceptor`

说明当前 backend 还没有把主要业务模块和全局响应处理链路接完整。

#### `apps/backend/src/main.ts`

当前与参考相比，主要差异有：

- 当前 swagger 路径是 `swagger`
- 参考 swagger 路径是 `docs`
- 当前 CORS methods 少了 `PATCH`
- 当前目录导入路径与参考略有不同

当前项目其实已经具备不少基础能力：

- Fastify 启动
- `multipart`
- `helmet`
- `rate-limit`
- `cookie`
- `csrf`
- `cors`
- `ValidationPipe`
- Swagger

所以 backend 不是“没配置”，而是“基础设施已配，业务层接线未完全对齐参考”。

#### `apps/backend/tsconfig.json`

当前与参考的关键差异：

- 当前继承 `../../tsconfig.base.json`
- 参考继承 `../../tsconfig.json`
- 当前 `module` 是 `CommonJS`
- 参考 `module` 是 `Node16`
- 当前 `moduleResolution` 是 `node`
- 参考 `moduleResolution` 是 `node16`
- 参考 `target` 更高
- 当前 `declaration` 为 `false`
- 参考 `declaration` 为 `true`
- 参考开启了 `removeComments`、`incremental`
- 参考排除了 `test` 和 `src/metadata.ts`

这说明 backend 的编译输出策略和参考项目并没有完全统一。

#### `apps/backend/package.json`

当前与参考相比，差异主要有：

- 当前 `name` 为 `@monorepo/backend`
- 参考为 `cloud-transformer`
- 当前 `dev` 脚本是 `db:generate + nest start --watch`
- 参考 `dev` / `start:dev` 是 `db:migrate + nest start --watch`
- 当前多了 `infra:*`、`lint`、`clean`
- 参考多了 `test:debug`
- 参考 Jest 增加了 `moduleNameMapper`

从运行方式看，参考项目更偏向“启动前自动迁移数据库”，当前项目更偏向“先生成迁移文件”。

#### `apps/backend/.env.example` 与 `.env.development`

当前项目与参考项目字段整体接近，但仍有两类重点差异：

1. 值不同

- 数据库用户名密码
- Redis 用户名密码
- MinIO 用户名密码
- Langfuse 地址和相关连接参数

2. Langfuse 部署思路不同

当前项目偏向本地 docker 化 Langfuse：

- `LANGFUSE_BASE_URL = http://127.0.0.1:3001`
- 有 `LANGFUSE_WEB_PORT`
- 有单独的 `langfuse` postgres 库连接

参考项目偏向云端或简化接法：

- `LANGFUSE_BASE_URL = https://cloud.langfuse.com`
- 没有 `LANGFUSE_WEB_PORT`
- `LANGFUSE_NEXTAUTH_URL = http://127.0.0.1:3000`

所以这里不一定是“漏配”，更可能是“部署方案不同”。如果你是要完全按参考项目靠齐，这里也要一起统一。

#### `apps/backend/drizzle.config.ts`

这份文件内容本次对比中没有显著差异，至少不是当前最主要的缺口。

### 数据库迁移差异

当前项目 migration：

- `drizzle/0000_bizarre_talon.sql`

参考项目 migration：

- `drizzle/0000_worried_shooting_star.sql`
- `drizzle/0001_workspace_foundation.sql`
- `drizzle/0002_auth_users.sql`

说明当前 backend 的数据库结构还没有对齐参考项目的 workspace/auth 基础表设计。

如果后续要接认证、工作区、作品相关业务，这一块是必须补齐的。

## 明确存在的问题

以下项可以认为不是“设计选择不同”，而是当前状态下的明确缺口：

- frontend 缺少 `next-env.d.ts`
- frontend 缺少 `.env.development` 和 `.env.production`
- frontend 的 `next.config.ts` 没有后端 API rewrite
- frontend 的 `src/proxy.ts` 为空
- frontend 的 `components.json` 指向了不存在的 `src/styles/globals.css`
- frontend 缺少主题、认证、通知 provider 相关基础文件
- frontend 缺少请求服务层和业务 service 层
- backend 缺少 agent 与若干业务模块接线
- backend 缺少参考项目中的多份数据库 migration
- backend 的 `app.module.ts` 没有接入参考项目里的关键业务模块和全局拦截器

## 可能属于方案差异，不一定必须照抄的项

以下项建议先确认目标，再决定是否完全同步：

- backend `package.json` 的脚本组织方式
- backend / frontend `tsconfig` 的继承关系和 target 配置
- Langfuse 的部署方式与环境变量内容
- frontend 首页实现内容
- `components.json` 的 `style` 风格值

## 建议补齐顺序

### 第一阶段：先保证基础运行链路

1. frontend 补齐：
   - `.env.development`
   - `.env.production`
   - `next-env.d.ts`
   - `next.config.ts` rewrite
   - `src/proxy.ts`
2. 修正 frontend 的 `components.json` 样式入口路径
3. backend 补齐：
   - `app.module.ts` 所需业务模块
   - 缺失 migration
   - 启动与数据库迁移策略

### 第二阶段：补齐基础能力层

1. frontend 补齐：
   - `AuthProvider`
   - `ThemeProvider`
   - `Toaster`
   - `request.ts` 和业务 services
2. backend 补齐：
   - `AgentModule`
   - `AuthModule`
   - `UploadModule`
   - `WorksModule`
   - 全局拦截器

### 第三阶段：补齐编辑器与复杂页面能力

1. frontend 补齐：
   - `@tiptap/*` 依赖
   - `extensions/*`
   - `stores/*`
   - 样式 partials
2. backend 补齐：
   - 与 AI、上传、鉴权、作品流转相关的业务实现

## 建议

如果你的目标是“按参考项目最小代价补齐能跑通的配置”，建议只先处理下面这些：

- frontend：
  - `next-env.d.ts`
  - `.env.*`
  - `next.config.ts`
  - `src/proxy.ts`
  - `components.json` 样式路径
- backend：
  - `app.module.ts`
  - 业务模块目录
  - drizzle migrations
  - 必要的环境变量字段

如果你的目标是“尽量完整对齐参考项目”，那就需要继续补 frontend 的 provider/service/editor 体系，以及 backend 的 auth/agent/upload/works 全链路模块。
