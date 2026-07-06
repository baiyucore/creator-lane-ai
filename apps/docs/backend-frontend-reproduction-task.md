# Creator Lane AI 复现任务书

> 目标不是照抄文件，而是按原项目的工程演进逻辑复现：**先搭后端基础设施，再做前端编辑体验，最后接入 Agent、Workspace 和 Auth**。

| 指标         | 说明                |
| ------------ | ------------------- |
| 复现阶段     | 7 个（阶段 0～6）   |
| 推荐起手方式 | Backend First       |
| 前端核心体验 | TipTap 富文本编辑器 |
| 最终产品核心 | Agent + Workspace   |

**复现原则：** 可以跳过早期 `wallpapers` 模块。它是初始化阶段的壁纸管理功能，后面被 Workspace 替换，不是当前产品主线。

---

## 阶段总览

| 阶段 | 名称               | 主导       | 要实现的目的                                                      | 完成后的结果                                     |
| ---- | ------------------ | ---------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| 0    | Monorepo 工程底座  | 前后端共同 | 先让仓库具备统一安装、启动、检查和构建能力                        | 根目录能管理 `apps/backend` 与 `apps/frontend`   |
| 1    | 后端基础设施       | Backend    | 搭出 NestJS API 服务、数据库、对象存储、缓存和统一响应格式        | 后端能启动，`health`、`upload` 等基础接口可用    |
| 2    | 前端产品壳与编辑器 | Frontend   | 做出 DocFlow 的展示页、工作台壳和可独立运行的 TipTap 富文本编辑器 | 即使不接后端，前端也能展示核心编辑体验           |
| 3    | 前端请求层         | Frontend   | 统一封装 fetch，约定前端如何消费后端标准响应                      | 后续 service 层都通过统一 `request` 访问 API     |
| 4    | Agent 流式能力     | 前后端联动 | 后端提供 AI Agent SSE 流，前端提供对话面板和流式消息渲染          | 在工作区页面可以向 Agent 提问并看到实时回复      |
| 5    | Workspace 数据落地 | 前后端联动 | 把工作区、文件树、编辑器文档从 mock 变成数据库持久化              | Dashboard 能进入工作区，文件树和文档内容来自后端 |
| 6    | Auth 用户体系      | 前后端联动 | 最后补齐登录、用户状态、Cookie Session 和路由守卫                 | 未登录用户不能进入工作区，登录后可正常使用产品   |

---

## 阶段 0：Monorepo 工程底座

### 要写的文件

| 文件                         | 说明                                        |
| ---------------------------- | ------------------------------------------- |
| `package.json`               | 根目录脚本、pnpm 版本、turbo 命令           |
| `pnpm-workspace.yaml`        | 声明 `apps/*` 是 workspace 包               |
| `turbo.json`                 | 定义 build、dev、lint、typecheck 的执行关系 |
| `apps/backend/package.json`  | NestJS 后端脚本和依赖                       |
| `apps/frontend/package.json` | Next.js 前端脚本和依赖                      |

### 目的

这一步解决「项目怎么组织」的问题。不要在这里写复杂业务，只要保证前后端能被同一个仓库管理、安装、启动和检查。

### 验收

根目录执行 `pnpm install` 成功，后续可以通过根目录脚本分别启动后端和前端。

---

## 阶段 1：后端基础设施

> 这是复现时真正建议先写的部分。它给后续前端请求、文件上传、工作区持久化和 Agent trace 提供底座。

| 文件                                                         | 要写什么                                                                   | 这段代码是干嘛的                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `apps/backend/docker-compose.yml`                            | 声明 PostgreSQL、Redis、MinIO、Langfuse 等本地依赖                         | 先把外部依赖跑起来，否则数据库、缓存、上传和 AI trace 都无处落地    |
| `apps/backend/.env.example`                                  | 列出后端需要的环境变量                                                     | 让后续配置数据库、Redis、MinIO、JWT、邮箱、AI Provider 时有统一入口 |
| `apps/backend/src/main.ts`                                   | 启动 NestJS/Fastify、设置 CORS、Swagger、全局前缀和全局过滤器              | 这是所有 HTTP 请求进入后端的第一层                                  |
| `apps/backend/src/app.module.ts`                             | 注册后端模块，如 Drizzle、Redis、MinIO、Health、Upload、Works、Auth、Agent | 决定这个后端应用当前拥有哪些能力                                    |
| `apps/backend/src/utils/env.ts`                              | 根据 NODE_ENV 选择正确的 env 文件并读取变量                                | 保证本地、生产、测试环境能使用不同配置                              |
| `apps/backend/src/core/filter/*.ts`                          | 统一异常返回和错误记录                                                     | 让业务代码只抛 NestJS 异常，前端收到稳定的错误结构                  |
| `apps/backend/src/core/interceptor/transform.interceptor.ts` | 把 Controller 返回值包装成统一响应                                         | 前端 request 层可以稳定读取 `code`、`message`、`data`               |
| `apps/backend/src/common/drizzle/*`                          | 封装 Drizzle 数据库连接                                                    | 所有业务 service 通过它读写 PostgreSQL                              |
| `apps/backend/src/common/redis/*`                            | 封装 Redis 客户端                                                          | 为缓存、验证码、会话、限流等能力做准备                              |
| `apps/backend/src/common/minio/*`                            | 封装 MinIO 上传、读取和桶管理                                              | 图片、文档附件、工作区文件等资源需要对象存储                        |
| `apps/backend/src/common/langfuse/*`                         | 封装 Langfuse trace 能力                                                   | 后续 Agent 调用大模型时可以记录链路和生成结果                       |
| `apps/backend/src/api/health/*`                              | 提供健康检查接口                                                           | 用于确认服务和部署是否正常                                          |
| `apps/backend/src/api/upload/*`                              | 提供图片上传接口                                                           | 前端编辑器插图、头像或附件上传都可以复用                            |

### 验收

```bash
pnpm infra:up
cd apps/backend && pnpm dev
curl http://127.0.0.1:8080/health        # 200
# 浏览器打开 http://127.0.0.1:8080/docs   # Swagger
```

---

## 阶段 2：前端产品壳与富文本编辑器

> 前端第一目标不是登录，也不是 Agent，而是先把「智能文档产品」的核心编辑体验跑起来。

| 文件                                              | 要写什么                                                     | 这段代码是干嘛的                                                |
| ------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `apps/frontend/next.config.ts`                    | 配置 Next.js 行为                                            | 前端应用启动、构建和资源处理的入口配置                          |
| `apps/frontend/src/app/layout.tsx`                | 定义全站根布局，挂载字体、主题、全局 Provider                | 所有页面都从这里继承公共结构                                    |
| `apps/frontend/src/app/globals.css`               | 放置 Tailwind、全局变量和编辑器基础样式入口                  | 保证 UI 组件和编辑器有统一视觉基础                              |
| `apps/frontend/src/components/ui/*`               | 沉淀 Button、Card、Dialog、Input 等基础组件                  | 避免业务页面重复写底层 UI                                       |
| `apps/frontend/src/components/theme-provider.tsx` | 提供主题上下文                                               | 让页面支持明暗主题切换                                          |
| `apps/frontend/src/app/page.tsx`                  | DocFlow 营销落地页                                           | 先告诉用户产品是什么：智能文档协作平台                          |
| `apps/frontend/src/app/dashboard/layout.tsx`      | Dashboard 外壳和导航区域                                     | 后续工作区列表、账号操作都挂在这个布局里                        |
| `apps/frontend/src/app/dashboard/page.tsx`        | 工作台首页                                                   | 给用户一个进入创作或工作区的起点                                |
| `apps/frontend/src/extensions/extension-kit.ts`   | 聚合 TipTap 扩展                                             | 编辑器只需要引入一个 ExtensionKit 就能启用整套能力              |
| `apps/frontend/src/extensions/**`                 | 实现代码块、表格、图片、斜杠命令、拖拽、提及、链接等编辑能力 | 这是产品最早的核心体验，决定它不是普通表单，而是文档编辑器      |
| `apps/frontend/src/app/create/page.tsx`           | 早期独立创作页                                               | 用于验证 TipTap 编辑器是否可以独立运行，后面演进成 `/work/[id]` |

### 验收

打开 `http://127.0.0.1:3000/create`，编辑器能打字、插代码块、斜杠命令可用。

---

## 阶段 3：前端请求层

> 这一层是前后端的第一座桥。它不负责具体业务，只负责让所有 API 调用有统一规范。

| 文件                                    | 要写什么                                           | 这段代码是干嘛的                                 |
| --------------------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `apps/frontend/src/services/request.ts` | 封装基础请求函数、baseURL、错误处理、响应解包      | 让业务 service 不直接写 fetch 细节               |
| `apps/frontend/.env.development`        | 配置 `NEXT_PUBLIC_API_BASE_URL`                    | 让前端知道后端 API 地址                          |
| `apps/frontend/src/services/*.ts`       | 每个业务域一个 service，如 agent、auth、workspaces | 页面只调用语义化函数，不关心 HTTP 方法和路径细节 |

### 验收

能 `request.get('/health')` 拿到后端数据。

---

## 阶段 4：Agent 流式能力

> Agent 必须前后端一起推进：后端负责模型、工具和 SSE，前端负责工作区里的 AI 对话体验。

| 端       | 文件                                                                  | 要写什么                                       | 这段代码是干嘛的                                |
| -------- | --------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| Backend  | `apps/backend/src/agent/agent.module.ts`                              | 注册 Agent 模块                                | 把 Agent 能力接入 AppModule                     |
| Backend  | `apps/backend/src/agent/agent.controller.ts`                          | 暴露 Agent 流式接口                            | 前端发送用户消息后，从这里接收 SSE 事件         |
| Backend  | `apps/backend/src/agent/agent.service.ts`                             | 组织 Agent 执行流程                            | Controller 不直接操作 LangGraph，只委托 Service |
| Backend  | `apps/backend/src/agent/agent-provider.config.ts`                     | 配置 SiliconFlow 或其他模型 Provider           | 隔离模型供应商配置，后续更换 Provider 更容易    |
| Backend  | `apps/backend/src/agent/graph/code-agent.graph.ts`                    | 定义 Agent 状态机和工具调用流程                | 决定 Agent 如何思考、何时调用工具、何时输出结果 |
| Backend  | `apps/backend/src/agent/tools/workspace-tools.ts`                     | 提供读文件、写文件、列目录等工具               | 让 Agent 能真正操作工作区内容                   |
| Backend  | `apps/backend/src/agent/stream/*.ts`                                  | 把 LangGraph 事件映射为前端可消费的 SSE 消息   | 前端不需要理解后端内部事件结构                  |
| Frontend | `apps/frontend/src/services/agent.ts`                                 | 调用 Agent 流式接口                            | 把 SSE 数据转换成前端消息事件                   |
| Frontend | `apps/frontend/src/app/work/[id]/_components/workspace-ai-panel/*`    | 实现 AI 面板、输入框、消息列表、消息卡片、hook | 用户在工作区里和 Agent 对话的主入口             |
| Frontend | `apps/frontend/src/app/work/[id]/_components/file-explorer-sidebar/*` | 实现文件树、文件图标、展开折叠、选择文件       | Agent 与编辑器都需要一个可视化工作区文件结构    |

### 前端 IDE 化增强（可选，原项目 4/27 提交）

| 文件                                                           | 作用       |
| -------------------------------------------------------------- | ---------- |
| `apps/frontend/src/app/work/[id]/_components/activity-bar.tsx` | 左侧图标栏 |
| `apps/frontend/src/app/work/[id]/_components/editor-tabs.tsx`  | 多标签页   |
| `apps/frontend/src/app/work/[id]/_components/status-bar.tsx`   | 底部状态栏 |

### 验收

在 `/work/[id]` 页面发消息，能看到 AI 流式回复。

---

## 阶段 5：Workspace 工作区数据落地

> 这一阶段把前端文件树和编辑器内容从 mock 变成真实数据库数据，是从 Demo 走向产品的关键。

| 端       | 文件                                                       | 要写什么                                           | 这段代码是干嘛的                                           |
| -------- | ---------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| Backend  | `apps/backend/drizzle/0001_workspace_foundation.sql`       | 创建 workspace 和 workspace_file 等表              | 让工作区和文件从前端 mock 变成数据库数据                   |
| Backend  | `apps/backend/src/schema/workspace/*.ts`                   | 定义 Drizzle 表结构                                | Service 查询数据库时使用类型安全的 schema                  |
| Backend  | `apps/backend/src/api/works/works.controller.ts`           | 暴露工作区和文件 CRUD 接口                         | 前端 Dashboard、文件树、编辑器保存都通过这些接口           |
| Backend  | `apps/backend/src/api/works/works.service.ts`              | 实现创建工作区、列文件、读文件、保存内容等业务逻辑 | Controller 只接收请求，真正的数据规则在 Service            |
| Backend  | `apps/backend/src/agent/tools/workspace-database-tools.ts` | 让 Agent 通过数据库读写工作区文件                  | Agent 不再只操作 mock 文件，而是操作真实 workspace 数据    |
| Frontend | `apps/frontend/src/services/workspaces.ts`                 | 封装工作区 API 调用                                | 页面不用直接拼 works 接口路径                              |
| Frontend | `apps/frontend/src/app/dashboard/work/page.tsx`            | 展示工作区列表                                     | 用户从 Dashboard 选择或进入某个工作区                      |
| Frontend | `apps/frontend/src/app/work/[id]/page.tsx`                 | 整合编辑器、文件树、AI 面板、保存逻辑              | 这是产品核心页面，负责把 Workspace、Editor、Agent 连接起来 |

### 路由演进说明

原项目将 `/create` 重构为 `/work/[id]`，并删除 `wallpapers` 相关页面。

### 验收

- Dashboard 能看到工作区列表
- 进入工作区，左侧文件树来自数据库
- 编辑文档能保存
- AI 能读写当前工作区文件

---

## 阶段 6：Auth 用户体系

> 鉴权放最后做。先把核心工作区和 Agent 跑通，再加邮箱验证码、Cookie Session 和路由守卫。

| 端       | 文件                                             | 要写什么                                            | 这段代码是干嘛的                              |
| -------- | ------------------------------------------------ | --------------------------------------------------- | --------------------------------------------- |
| Backend  | `apps/backend/drizzle/0002_auth_users.sql`       | 创建用户表                                          | 登录体系必须有用户身份落点                    |
| Backend  | `apps/backend/src/schema/user/user.table.ts`     | 定义用户表结构                                      | 让 Auth 和 User Service 类型安全地读写用户    |
| Backend  | `apps/backend/src/api/auth/auth.controller.ts`   | 提供发送验证码、登录、退出、获取当前用户等接口      | 前端登录页和 AuthProvider 的所有请求入口      |
| Backend  | `apps/backend/src/api/auth/auth.service.ts`      | 处理验证码生成、校验、用户创建、签发 Cookie Session | 鉴权业务规则集中在这里                        |
| Backend  | `apps/backend/src/api/auth/jwt.strategy.ts`      | 从请求 Cookie 中解析 JWT                            | 后端判断当前请求属于哪个用户                  |
| Backend  | `apps/backend/src/common/email/email.service.ts` | 发送邮箱验证码，开发环境可输出到日志                | 最终登录方式是邮箱验证码，而不是密码          |
| Frontend | `apps/frontend/src/app/(auth)/login/page.tsx`    | 实现邮箱验证码登录页面                              | 用户输入邮箱、获取验证码、提交登录            |
| Frontend | `apps/frontend/src/components/auth-provider.tsx` | 维护当前用户状态                                    | 页面可以知道用户是否已登录，以及用户是谁      |
| Frontend | `apps/frontend/src/services/auth.ts`             | 封装登录、退出、获取当前用户接口                    | 登录页面和全局 Provider 复用同一套 API 调用   |
| Frontend | `apps/frontend/src/proxy.ts`                     | 保护需要登录的路由                                  | 未登录访问 Dashboard 或 Work 页面时跳到登录页 |

### 验收

- 未登录访问 `/dashboard` → 跳转 `/login`
- 输入邮箱收验证码 → 登录成功 → 能访问工作区

---

## 你可以直接照着执行的复现任务

| 顺序 | 任务              | 这一任务的目的                                               |
| ---- | ----------------- | ------------------------------------------------------------ |
| 1    | 先建 monorepo     | 只追求能 install、lint、typecheck、分别启动前后端            |
| 2    | 写后端基础设施    | 不要急着做页面，先让 API 服务、数据库、MinIO、Redis 可用     |
| 3    | 写第一个后端 API  | 用 health 和 upload 验证请求链路、响应格式、Swagger 是否正常 |
| 4    | 写前端 UI 底座    | 接入 Tailwind、shadcn 基础组件、主题 Provider、根布局        |
| 5    | 写 TipTap 编辑器  | 先独立完成 `/create`，证明编辑器体验成立                     |
| 6    | 写 request 封装   | 统一前端访问后端的方式，后续所有 service 都基于它            |
| 7    | 写 Agent 后端     | 先用接口或 Postman 测 SSE，不急着接 UI                       |
| 8    | 写 Agent 前端     | 做 AI 面板、消息列表、输入框，把 SSE 消息渲染出来            |
| 9    | 写 Workspace 后端 | 新增工作区表和 Works API，让文件树与文档内容能持久化         |
| 10   | 接 Workspace 前端 | 把 `/work/[id]` 从 mock 数据改为真实 API 数据                |
| 11   | 最后写 Auth       | 先完成核心功能，再加登录、Cookie、路由守卫                   |

---

## 最终验收路径

1. `/` 能看到产品落地页 → 前端壳完成
2. `/create` 或 `/work/[id]` 能打开 TipTap 编辑器 → 核心编辑体验完成
3. 后端 `/health` 和 Swagger 可访问 → 基础 API 服务完成
4. `/work/[id]` 能显示文件树、编辑文档、保存内容 → Workspace 打通
5. AI 面板能发送消息并流式显示回复 → Agent 打通
6. 未登录访问 Dashboard 会跳转登录页，登录后可进入工作区 → Auth 打通

---

## 附录：原项目 Git 演进时间线（参考）

| 日期       | 提交重点                                                                    |
| ---------- | --------------------------------------------------------------------------- |
| 2026-04-16 | 初始化：前后端同一天提交，后端含 wallpapers，前端含 TipTap + DocFlow 落地页 |
| 2026-04-21 | 前端重构：`/create` → `/work/[id]`，删除 wallpapers；新增 Workflow Studio   |
| 2026-04-25 | 前端：`request.ts` 请求封装                                                 |
| 2026-04-26 | 前后端：Agent 模块 + 工作区 AI 面板                                         |
| 2026-04-27 | 前后端：Agent 增强 + Workspace + Auth 初版                                  |
| 2026-04-29 | 前后端：邮箱验证码登录定稿                                                  |

**一句话总结：** 复现时从 `apps/backend` 的 Docker + NestJS 基建入手，再写 `apps/frontend` 的 TipTap 编辑器；两者能独立跑通后，用 `request.ts` 桥接；然后按 **Agent → Workspace → Auth** 的顺序前后端同步推进。
