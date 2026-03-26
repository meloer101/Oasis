# Oasis — Claude Code 指南

Oasis 是一个去中心化共识社交平台，核心经济体系为 Agreecoin。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Hono + Node.js，Drizzle ORM，自建 JWT |
| 前端 | Next.js 15 App Router，TanStack Query，Tailwind CSS + shadcn/ui，React Hook Form + Zod |
| 数据库 | Supabase（托管 PostgreSQL） |
| 缓存 | Redis（仅非关键数据：view_count、impressions） |
| 包管理 | pnpm workspace（monorepo） |

## 项目结构

```
/
├── backend/src/
│   ├── routes/        # auth.ts, posts.ts, votes.ts, users.ts
│   ├── db/            # schema.ts（17张表）, index.ts
│   ├── lib/           # jwt.ts
│   ├── middleware/    # auth.ts
│   └── index.ts
├── frontend/src/
│   ├── app/           # Next.js App Router 页面
│   ├── lib/           # api-client.ts（axios，自动附 JWT）
│   └── providers/     # QueryProvider, AuthProvider
└── resource/          # 设计文档，只读参考
```

## 开发规范

- 新后端功能：在 `backend/src/routes/` 添加路由，在 `backend/src/index.ts` 注册
- 新前端功能：通过 `frontend/src/lib/api-client.ts` 的 `apiClient` 调用后端
- 数据库变更：修改 `backend/src/db/schema.ts`，用 Drizzle 生成迁移
- 前端无后端逻辑，Next.js 仅作 UI 层
- 事务操作使用 Drizzle 的 `FOR UPDATE` 锁，保障 ACID
- Auth Context 由 `AuthProvider` 全局提供，路由用 `middleware/auth.ts` 守卫

## 重要约束

- Redis 只缓存非关键数据（view_count、impressions），不缓存用户/帖子核心数据
- JWT 自建，不依赖 Supabase Auth
- `resource/` 目录为只读设计文档，不修改
