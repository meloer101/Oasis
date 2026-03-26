# Oasis 前端设计与执行方案

> 本文档是 Oasis 社区平台的完整前端架构设计，供 Cursor 编程时作为唯一参考。
> 与后端设计文档配合使用，覆盖：路由、页面、布局、数据获取、状态管理、组件结构、API 契约、执行顺序。

---

## 1. 技术栈确认

| 层级 | 技术 | 版本 | 职责 |
|------|------|------|------|
| 框架 | Next.js (App Router) | 15+ | SSR/SSG、路由、API Route Handlers |
| UI 库 | React | 19+ | 组件化 UI |
| 类型 | TypeScript | 5+ | 全项目强类型 |
| 样式 | Tailwind CSS + shadcn/ui | 4.x | 原子类 + 可修改组件库 |
| 数据同步 | TanStack Query (React Query) | 5+ | 客户端缓存、乐观更新、无限滚动 |
| 表单 | React Hook Form + Zod | - | 表单验证 |
| 状态管理 | React Context（仅全局轻量） | - | Auth / FeedTab / Modal |
| HTTP | 原生 fetch（封装一层） | - | API 调用 |
| 图标 | Lucide React | - | 统一图标风格 |

**不使用的技术及原因：**
- 不用 Redux / Zustand — TanStack Query + Context 已足够，Oasis 没有复杂的客户端状态
- 不用 Server Actions 做 mutation — 投币需要乐观更新，Server Actions 是 request-response 模式，做不了
- 不用 tRPC — RESTful 足够简单，tRPC 在这个规模下增加了不必要的复杂度
- 不用 Clerk / NextAuth — 自建 JWT，保持对认证逻辑的完全控制

---

## 2. 项目目录结构

```
oasis/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # 根 layout：QueryProvider + AuthProvider
│   │   ├── globals.css                   # Tailwind 全局样式
│   │   │
│   │   ├── (auth)/                       # 认证页面组：无侧栏布局
│   │   │   ├── layout.tsx                # 居中卡片布局
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── onboarding/page.tsx       # 新用户引导（选兴趣标签）
│   │   │
│   │   ├── (main)/                       # 核心页面组：三栏桌面布局
│   │   │   ├── layout.tsx                # 三栏布局：Sidebar + Content + RightPanel
│   │   │   ├── page.tsx                  # Feed 首页（默认热度流）
│   │   │   ├── post/
│   │   │   │   ├── create/page.tsx       # 发帖页
│   │   │   │   └── [id]/page.tsx         # 帖子详情页
│   │   │   ├── wallet/page.tsx           # 钱包页
│   │   │   ├── user/[id]/page.tsx        # 用户主页
│   │   │   ├── circle/
│   │   │   │   ├── create/page.tsx       # 创建圈子
│   │   │   │   └── [id]/page.tsx         # 圈子详情页
│   │   │   ├── tag/[name]/page.tsx       # 标签 Feed 页
│   │   │   ├── discover/page.tsx         # 发现页
│   │   │   ├── notifications/page.tsx    # 通知页
│   │   │   └── settings/page.tsx         # 设置页
│   │   │
│   │   └── api/                          # API Route Handlers（代理后端）
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── register/route.ts
│   │       │   └── me/route.ts
│   │       ├── feed/route.ts
│   │       ├── post/
│   │       │   ├── route.ts              # GET 列表 / POST 创建
│   │       │   └── [id]/
│   │       │       ├── route.ts          # GET 详情
│   │       │       ├── vote/route.ts     # POST 投币
│   │       │       └── comment/route.ts  # GET 评论列表 / POST 发评论
│   │       ├── wallet/
│   │       │   ├── route.ts              # GET 余额
│   │       │   └── transactions/route.ts # GET 交易记录
│   │       ├── user/[id]/route.ts
│   │       ├── circle/
│   │       │   ├── route.ts              # POST 创建圈子
│   │       │   └── [id]/
│   │       │       ├── route.ts          # GET 详情
│   │       │       ├── join/route.ts     # POST 加入
│   │       │       └── feed/route.ts     # GET 圈内帖子
│   │       ├── tag/[name]/route.ts
│   │       ├── discover/route.ts
│   │       └── notifications/route.ts
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx               # 左侧导航栏（桌面固定）
│   │   │   ├── RightPanel.tsx            # 右侧面板（热门标签/推荐圈子/钱包摘要）
│   │   │   ├── MobileNav.tsx             # 移动端底部导航
│   │   │   └── Header.tsx                # 顶部栏（搜索 + 通知 + 用户头像）
│   │   ├── feed/
│   │   │   ├── FeedList.tsx              # Feed 帖子列表（含无限滚动）
│   │   │   ├── FeedTabs.tsx              # 热度流/关注流/新鲜流 Tab 切换
│   │   │   └── PostCard.tsx              # 帖子卡片（温度条 + 投币按钮）
│   │   ├── post/
│   │   │   ├── PostContent.tsx           # 帖子正文渲染
│   │   │   ├── PostMeta.tsx              # 帖子元信息（作者/温度/时间/标签）
│   │   │   ├── VoteButton.tsx            # 投币按钮组件
│   │   │   ├── TemperatureBar.tsx        # 温度可视化条
│   │   │   ├── CommentList.tsx           # 评论列表
│   │   │   ├── CommentForm.tsx           # 评论输入框
│   │   │   └── CreatePostForm.tsx        # 发帖表单
│   │   ├── wallet/
│   │   │   ├── WalletCard.tsx            # 钱包余额卡片
│   │   │   ├── TransactionList.tsx       # 交易记录列表
│   │   │   └── BadgeDisplay.tsx          # 徽章展示
│   │   ├── circle/
│   │   │   ├── CircleCard.tsx            # 圈子卡片
│   │   │   ├── CircleHeader.tsx          # 圈子页头部信息
│   │   │   └── CreateCircleForm.tsx      # 创建圈子表单
│   │   ├── user/
│   │   │   ├── UserAvatar.tsx            # 用户头像（含徽章角标）
│   │   │   ├── UserProfile.tsx           # 用户主页信息卡
│   │   │   └── FollowButton.tsx          # 关注按钮
│   │   ├── shared/
│   │   │   ├── TagBadge.tsx              # 标签徽章
│   │   │   ├── LoadingSpinner.tsx        # 加载动画
│   │   │   ├── EmptyState.tsx            # 空状态占位
│   │   │   ├── ErrorBoundary.tsx         # 错误边界
│   │   │   └── InfiniteScrollTrigger.tsx # 无限滚动触发器
│   │   └── ui/                           # shadcn/ui 组件（自动生成）
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── tabs.tsx
│   │       ├── toast.tsx
│   │       └── ...
│   │
│   ├── hooks/
│   │   ├── useFeed.ts                    # Feed 数据获取（useInfiniteQuery）
│   │   ├── usePost.ts                    # 帖子详情获取
│   │   ├── useVote.ts                    # 投币 mutation（含乐观更新）
│   │   ├── useCreatePost.ts             # 发帖 mutation
│   │   ├── useComments.ts               # 评论列表 + 发评论
│   │   ├── useWallet.ts                 # 钱包余额 + 交易记录
│   │   ├── useUser.ts                   # 用户信息
│   │   ├── useCircle.ts                 # 圈子信息 + 加入/退出
│   │   ├── useFollow.ts                 # 关注/取关
│   │   ├── useNotifications.ts          # 通知列表（轮询）
│   │   ├── useAuth.ts                   # 登录/注册/登出
│   │   └── useDiscover.ts              # 发现页数据
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx               # 当前用户 + JWT + 余额快照
│   │   ├── FeedTabContext.tsx            # Feed Tab 状态（hot/follow/fresh）
│   │   └── ModalContext.tsx              # 全局弹窗状态
│   │
│   ├── lib/
│   │   ├── api.ts                        # fetch 封装：baseURL + JWT 注入 + 错误处理
│   │   ├── constants.ts                  # 全局常量（API 地址、分页大小等）
│   │   ├── utils.ts                      # 工具函数（格式化时间/温度等）
│   │   └── types.ts                      # 全局 TypeScript 类型定义
│   │
│   └── providers/
│       └── QueryProvider.tsx             # TanStack Query 的 QueryClientProvider
│
├── public/
│   └── ...
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. 布局系统设计

### 3.1 根 Layout（`src/app/layout.tsx`）

职责：挂载全局 Provider。

```tsx
// 伪代码结构
<html>
  <body>
    <QueryProvider>       {/* TanStack Query */}
      <AuthProvider>      {/* 用户状态 */}
        <ModalProvider>   {/* 全局弹窗 */}
          {children}
        </ModalProvider>
      </AuthProvider>
    </QueryProvider>
    <Toaster />           {/* 全局 Toast 通知 */}
  </body>
</html>
```

### 3.2 认证 Layout（`src/app/(auth)/layout.tsx`）

无侧栏，页面居中卡片布局。适用于 login / register / onboarding。

```tsx
// 伪代码结构
<div className="min-h-screen flex items-center justify-center bg-background">
  <div className="w-full max-w-md">
    {children}
  </div>
</div>
```

### 3.3 主 Layout（`src/app/(main)/layout.tsx`）— 三栏桌面布局

Oasis 是"深度讨论"社区，桌面体验优先。三栏布局如下：

```
┌──────────────────────────────────────────────────────────┐
│                       Header                              │
│  [Logo]        [搜索框]         [通知铃铛] [用户头像]       │
├────────┬───────────────────────────────┬──────────────────┤
│        │                               │                  │
│ Sidebar│       Content Area            │  Right Panel     │
│ 240px  │       flex-1                  │  300px           │
│ 固定    │       min-w-0                 │  固定             │
│        │                               │                  │
│ ▸ Feed │  ┌─────────────────────────┐  │ ┌──────────────┐ │
│ ▸ 发现  │  │  热度流 | 关注流 | 新鲜流  │  │ │ 💰 余额: 245 │ │
│ ▸ 钱包  │  ├─────────────────────────┤  │ ├──────────────┤ │
│ ▸ 通知  │  │                         │  │ │ 🔥 热门标签   │ │
│ ▸ 设置  │  │  帖子卡片列表            │  │ │  #VibeCoding │ │
│        │  │  无限滚动                 │  │ │  #AITools    │ │
│ ──────  │  │                         │  │ ├──────────────┤ │
│ 我的圈子 │  │                         │  │ │ 🌱 新兴圈子   │ │
│ ▸ AI工具 │  │                         │  │ │  Cursor Tips │ │
│ ▸ 创意.. │  └─────────────────────────┘  │ └──────────────┘ │
│        │                               │                  │
└────────┴───────────────────────────────┴──────────────────┘
```

**响应式规则：**

| 断点 | 布局 |
|------|------|
| `≥1280px` (xl) | 三栏：Sidebar(240) + Content(flex) + RightPanel(300) |
| `≥768px` (md) | 两栏：Sidebar(240) + Content(flex)，右栏隐藏 |
| `<768px` (sm) | 单栏：Content + 底部 MobileNav，侧栏隐藏 |

```tsx
// 伪代码结构
<div className="min-h-screen">
  <Header />
  <div className="flex">
    <Sidebar className="hidden md:block w-60 fixed h-screen" />
    <main className="flex-1 md:ml-60 xl:mr-[300px] min-w-0">
      {children}
    </main>
    <RightPanel className="hidden xl:block w-[300px] fixed right-0 h-screen" />
  </div>
  <MobileNav className="md:hidden fixed bottom-0" />
</div>
```

### 3.4 Sidebar 导航项

```
Logo（点击回 Feed）
────────────────
📰 Feed            → /
🔍 发现             → /discover
💰 钱包             → /wallet
🔔 通知             → /notifications  （带未读数角标）
⚙️ 设置             → /settings
────────────────
我的圈子（列表，最多显示 5 个，展开看全部）
  ▸ AI 工具圈
  ▸ Vibe Coding
  ▸ 创意点子
────────────────
➕ 发帖              → /post/create   （CTA 按钮，视觉突出）
```

### 3.5 RightPanel 内容（根据当前页面动态变化）

| 当前页面 | 右栏内容 |
|---------|---------|
| Feed 首页 | 钱包余额摘要 + 热门标签 + 新兴圈子 + 温度周榜 |
| 帖子详情 | 作者信息卡 + 相关帖子 + 帖子所属标签 |
| 用户主页 | 用户统计 + 共同关注 + 用户圈子 |
| 圈子页 | 圈子信息 + 成员列表 + 圈子规则 |
| 标签页 | 标签热度趋势 + 相关标签 |
| 钱包页 | 徽章展示 + 经济健康提示 |
| 发现页 | 不显示右栏，内容区全宽 |

---

## 4. 页面详细设计

### 4.1 Feed 首页（`/`）

**这是用户打开 Oasis 看到的第一个页面，是产品的核心。**

**路由文件：** `src/app/(main)/page.tsx`

**数据获取策略：**
- `page.tsx`（Server Component）：fetch 热度流第一页 → 传给客户端组件作为 `initialData`
- `FeedList.tsx`（Client Component）：用 `useInfiniteQuery` + `initialData` 接管后续分页

**页面结构：**
```
┌─────────────────────────────────┐
│  🔥 热度流  |  👥 关注流  |  🌱 新鲜流   │  ← FeedTabs 组件
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │ PostCard                   │  │
│  │ @vibecoder · 2h ago       │  │
│  │ 用 Cursor 三小时写完一个 SaaS │  │
│  │                           │  │
│  │ 🌡️ ████████░░ 847         │  │  ← TemperatureBar
│  │ ⚡ 共鸣者  💬 23  🪙 投币    │  │  ← 徽章 + 评论数 + 投币按钮
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ PostCard                   │  │
│  │ ...                        │  │
│  └───────────────────────────┘  │
│                                 │
│  ── 加载更多（IntersectionObserver 自动触发）── │
│                                 │
└─────────────────────────────────┘
```

**Feed Tab 切换逻辑：**
- Tab 状态存在 `FeedTabContext` 中（hot / follow / fresh）
- 切换 Tab 时不改变 URL，改变 TanStack Query 的 queryKey
- 每个 Tab 独立缓存，切回来不重新请求

**API 请求：**
```
GET /api/feed?tab=hot&page=1&limit=20
GET /api/feed?tab=follow&page=1&limit=20
GET /api/feed?tab=fresh&page=1&limit=20
```

**关键 Hook — `useFeed.ts`：**
```ts
// 伪代码
function useFeed(tab: 'hot' | 'follow' | 'fresh', initialData?: FeedPage) {
  return useInfiniteQuery({
    queryKey: ['feed', tab],
    queryFn: ({ pageParam = 1 }) => fetchFeed(tab, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    initialData: initialData
      ? { pages: [initialData], pageParams: [1] }
      : undefined,
    staleTime: 60_000, // 1 分钟内不重新请求
  });
}
```

**PostCard 组件字段：**
```ts
interface PostCardProps {
  id: string;
  author: {
    id: string;
    username: string;
    avatarUrl: string;
    badge: 'seedling' | 'resonator' | 'vibe_master' | 'founder' | null;
    founderNumber: number | null; // #007
  };
  title: string;
  excerpt: string;         // 正文前 200 字
  tags: string[];
  temperature: number;
  agreeCount: number;
  commentCount: number;
  viewCount: number;
  isPromoted: boolean;     // 是否推广帖
  createdAt: string;
  hasVoted: boolean;       // 当前用户是否已投币
  myVoteAmount: number;    // 当前用户投了多少
}
```

### 4.2 帖子详情页（`/post/[id]`）

**路由文件：** `src/app/(main)/post/[id]/page.tsx`

**数据获取策略：**
- `page.tsx`（Server Component）：fetch 帖子详情 + 前 20 条评论 → 传给客户端组件
- 评论分页和投币交互由客户端 TanStack Query 接管

**页面结构：**
```
┌─────────────────────────────────┐
│  ← 返回 Feed                    │
├─────────────────────────────────┤
│                                 │
│  @vibecoder · ⚡ 共鸣者 · 2h ago │
│                                 │
│  用 Cursor 三小时写完了一个完整的 SaaS │
│  —— 复盘                        │
│                                 │
│  [帖子正文，支持 Markdown 渲染]    │
│  [代码块高亮]                     │
│  [图片]                          │
│                                 │
│  #VibeCoding  #Cursor  #SaaS    │  ← 标签
│                                 │
├─────────────────────────────────┤
│  🌡️ 温度 847                    │
│  ████████████░░░░               │
│  已有 42 人投币 · 共 312 coins    │
│                                 │
│  [投币输入: 1-10]  [确认投币]      │  ← VoteButton
│                                 │
├─────────────────────────────────┤
│  💬 评论 (23)                    │
│                                 │
│  ┌─ @aibuilder · 1h ago ──────┐ │
│  │ 太强了，请问数据库用的什么？  │ │
│  │  └─ @vibecoder · 45m ago   │ │
│  │    Supabase，体验很好       │ │
│  └────────────────────────────┘ │
│                                 │
│  [评论输入框]  [提交]             │  ← CommentForm
│                                 │
└─────────────────────────────────┘
```

**投币交互流程（乐观更新）：**
1. 用户输入投币数量（1-10），点击确认
2. 前端立刻更新 UI：温度值增加、投币按钮变为已投状态、余额扣减
3. 发送 POST `/api/post/[id]/vote` 请求
4. 成功 → 保持 UI 状态，显示 Toast "投币成功"
5. 失败 → 回滚 UI 状态，显示 Toast "投币失败：余额不足 / 已达上限"

**关键 Hook — `useVote.ts`：**
```ts
// 伪代码
function useVote(postId: string) {
  const queryClient = useQueryClient();
  const { updateBalance } = useAuth(); // 更新 Context 中的余额快照

  return useMutation({
    mutationFn: (amount: number) => votePost(postId, amount),
    onMutate: async (amount) => {
      // 取消正在进行的帖子查询
      await queryClient.cancelQueries({ queryKey: ['post', postId] });

      // 保存当前状态用于回滚
      const previousPost = queryClient.getQueryData(['post', postId]);

      // 乐观更新帖子数据
      queryClient.setQueryData(['post', postId], (old) => ({
        ...old,
        agreeCount: old.agreeCount + amount,
        temperature: recalcTemperature(old, amount),
        hasVoted: true,
        myVoteAmount: amount,
      }));

      // 乐观更新余额
      updateBalance(-amount);

      return { previousPost };
    },
    onError: (err, amount, context) => {
      // 回滚
      queryClient.setQueryData(['post', postId], context.previousPost);
      updateBalance(amount); // 恢复余额
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success('投币成功！');
      // 同时让 Feed 缓存失效，下次切回去时刷新
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
```

**评论系统：**
- 支持嵌套回复（最多 2 层）
- 评论按时间排序
- 发评论后乐观更新列表
- 评论也可以被投币（v2 考虑）

### 4.3 发帖页（`/post/create`）

**路由文件：** `src/app/(main)/post/create/page.tsx`

**页面结构：**
```
┌─────────────────────────────────┐
│  发布新帖                        │
├─────────────────────────────────┤
│                                 │
│  标题 [___________________________] │
│                                 │
│  正文（支持 Markdown）            │
│  [                               │
│   多行文本编辑器                  │
│   支持代码块、图片上传            │
│                                 ]│
│                                 │
│  标签 [输入 #标签名，自动补全]     │
│        #VibeCoding  #AI  ✕       │
│                                 │
│  发布到圈子（可选）               │
│  [下拉选择已加入的圈子]           │
│                                 │
│  [取消]              [发布帖子]   │
│                                 │
└─────────────────────────────────┘
```

**发帖 API 请求：**
```
POST /api/post
Body: {
  title: string,
  content: string,          // Markdown 格式
  tags: string[],           // 标签名数组
  circleId: string | null   // 可选圈子 ID
}
```

**发帖后的行为：**
- 成功 → 跳转到新帖子详情页
- 同时让 Feed 缓存和钱包缓存失效（发帖有 +5 coins 奖励）

### 4.4 钱包页（`/wallet`）

**路由文件：** `src/app/(main)/wallet/page.tsx`

**页面结构：**
```
┌─────────────────────────────────┐
│  💰 我的钱包                     │
├─────────────────────────────────┤
│                                 │
│  ┌────────────────────────────┐ │
│  │   Agreecoin 余额           │ │
│  │   ████████████████████████ │ │
│  │          1,245             │ │
│  │                            │ │
│  │   🌱 新芽 (≥100)           │ │
│  │   ⚡ 共鸣者 (≥500) ✓ 当前  │ │
│  │   🔥 Vibe Master (≥2000)  │ │
│  │   距下一级还需 755 coins    │ │
│  └────────────────────────────┘ │
│                                 │
│  📊 收支明细                     │
│  ─────────────────────────────  │
│  今日 +20  系统每日发放           │
│  今日 +5   发帖奖励              │
│  今日 -3   投币给 @aibuilder     │
│  昨日 +8   帖子被投币收益         │
│  昨日 +6   评论奖励              │
│  ...                            │
│                                 │
│  ── 加载更多 ──                  │
│                                 │
└─────────────────────────────────┘
```

**API 请求：**
```
GET /api/wallet                    → { balance, badge, nextBadgeThreshold }
GET /api/wallet/transactions?page=1 → { transactions[], nextPage }
```

### 4.5 用户主页（`/user/[id]`）

**页面结构：**
```
┌─────────────────────────────────┐
│  ┌──────┐                       │
│  │ 头像  │  @vibecoder           │
│  │      │  ⚡ 共鸣者 · 创始成员 #007 │
│  └──────┘  已加入 14 天           │
│                                 │
│  关注 128 · 粉丝 342 · 帖子 67    │
│                                 │
│  [关注]  [投币]                   │
├─────────────────────────────────┤
│  帖子 | 投币过的 | 圈子            │  ← Tab 切换
├─────────────────────────────────┤
│  [用户的帖子列表，复用 PostCard]   │
└─────────────────────────────────┘
```

### 4.6 圈子详情页（`/circle/[id]`）

**页面结构：**
```
┌─────────────────────────────────┐
│  🏔️ AI 工具圈                   │
│  山主: @techfan · 成员 89 人      │
│  创建于 2024-03-01               │
│                                 │
│  圈规: 分享 AI 工具使用心得...     │
│                                 │
│  [加入圈子 (需消耗 XX coins)]     │  ← 或 [已加入] [退出]
├─────────────────────────────────┤
│  🔥 热门  |  🕐 最新              │  ← 圈内帖子排序
├─────────────────────────────────┤
│  [圈内帖子列表，复用 PostCard]     │
└─────────────────────────────────┘
```

### 4.7 标签 Feed 页（`/tag/[name]`）

复用 Feed 首页的 `FeedList` 组件，只是 queryKey 变为 `['feed', 'tag', tagName]`，API 请求变为 `GET /api/tag/[name]?page=1`。

页面顶部显示标签名称、使用次数、话题先驱徽章持有者。

### 4.8 发现页（`/discover`）

**页面结构（全宽，不显示右栏）：**
```
┌─────────────────────────────────────────────┐
│  🔍 发现                                     │
├─────────────────────────────────────────────┤
│                                             │
│  🏷️ 热门标签                                │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│  │#AI │ │#VC │ │#Cur│ │#创意│ │#Pro│        │
│  │423 │ │387│ │312│ │289│ │245│        │
│  └────┘ └────┘ └────┘ └────┘ └────┘        │
│                                             │
│  🏔️ 新兴圈子                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Cursor技巧│ │ Claude玩法│ │ 独立开发记 │    │
│  │ 成员 +34  │ │ 成员 +28  │ │ 成员 +19  │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│                                             │
│  📈 温度周榜（过去 7 天温度最高的 20 条帖子）  │
│  1. 用 Cursor 三小时写完... 🌡️ 847          │
│  2. Claude system prompt... 🌡️ 623          │
│  3. ...                                     │
│                                             │
│  👤 值得关注                                 │
│  @vibecoder · @aibuilder · @newthink        │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.9 通知页（`/notifications`）

**通知类型：**
- 🪙 币到账：有人给你的帖子投了认同币
- 🌡️ 温度突破：你的帖子温度突破 100 / 500 / 1000
- 💬 被评论：有人评论了你的帖子
- 👤 被关注：有人关注了你
- 🏔️ 圈子动态：你加入的圈子有新公告

**数据获取：** 用 TanStack Query 轮询（每 30 秒），或未来升级为 WebSocket。

### 4.10 设置页（`/settings`）

基础设置：修改用户名、头像、个人简介。
不做复杂设置，MVP 只需要基本的个人资料编辑。

---

## 5. 数据获取架构

### 5.1 核心原则

```
Server Components (SSR)          TanStack Query (Client)
─────────────────────           ──────────────────────
✅ 首屏渲染（SEO + 速度）         ✅ 分页 / 无限滚动
✅ 不需要交互的静态数据            ✅ 乐观更新（投币）
✅ page.tsx 中的 fetch()          ✅ 轮询（通知）
                                 ✅ 缓存管理
                                 ✅ mutation + 缓存失效
```

### 5.2 SSR → Client 数据交接模式

每个需要 SSR 的页面都遵循同一模式：

```tsx
// page.tsx (Server Component)
export default async function FeedPage() {
  const initialData = await fetchFeedServer('hot', 1);
  return <FeedClient initialData={initialData} />;
}

// FeedClient.tsx (Client Component, "use client")
function FeedClient({ initialData }: { initialData: FeedPage }) {
  const { tab } = useFeedTab();
  const query = useFeed(tab, tab === 'hot' ? initialData : undefined);
  return <FeedList query={query} />;
}
```

### 5.3 API 封装（`src/lib/api.ts`）

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken(); // 从 cookie 或 localStorage 读取 JWT

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `API Error: ${res.status}`);
  }

  return json.data;
}
```

### 5.4 所有 API 端点契约

以下是前端会调用的所有 API 端点，后端需要按这个契约实现：

#### 认证
```
POST /api/auth/register
  Body: { email, username, password }
  Response: { user, token }

POST /api/auth/login
  Body: { email, password }
  Response: { user, token }

GET /api/auth/me
  Headers: Authorization: Bearer <token>
  Response: { user } // 含 balance, badge, founderNumber
```

#### Feed
```
GET /api/feed?tab=hot&page=1&limit=20
GET /api/feed?tab=follow&page=1&limit=20
GET /api/feed?tab=fresh&page=1&limit=20
  Response: {
    posts: PostCard[],
    nextPage: number | null,
    totalCount: number
  }
```

#### 帖子
```
POST /api/post
  Body: { title, content, tags[], circleId? }
  Response: { post }

GET /api/post/[id]
  Response: { post } // 含完整正文、作者信息、温度、投币状态

POST /api/post/[id]/vote
  Body: { amount: 1-10 }
  Response: { newTemperature, authorEarning, platformBurn }

GET /api/post/[id]/comment?page=1&limit=20
  Response: { comments[], nextPage }

POST /api/post/[id]/comment
  Body: { content, parentId? }
  Response: { comment }
```

#### 钱包
```
GET /api/wallet
  Response: { balance, badge, nextBadgeThreshold, todayEarned, todaySpent }

GET /api/wallet/transactions?page=1&limit=20
  Response: { transactions[], nextPage }
  // transaction: { type, amount, description, relatedPostId?, createdAt }
```

#### 用户
```
GET /api/user/[id]
  Response: { user } // 含统计数据

GET /api/user/[id]/posts?page=1
  Response: { posts[], nextPage }

POST /api/user/[id]/follow
  Response: { isFollowing: boolean }

DELETE /api/user/[id]/follow
  Response: { isFollowing: boolean }
```

#### 圈子
```
POST /api/circle
  Body: { name, description, rules?, entryFee? }
  Response: { circle }

GET /api/circle/[id]
  Response: { circle } // 含成员数、山主信息、规则

GET /api/circle/[id]/feed?page=1
  Response: { posts[], nextPage }

POST /api/circle/[id]/join
  Response: { joined: boolean, costCoins: number }

DELETE /api/circle/[id]/join
  Response: { left: boolean }
```

#### 标签
```
GET /api/tag/[name]?page=1&limit=20
  Response: { tag, posts[], nextPage }
```

#### 发现
```
GET /api/discover
  Response: {
    hotTags: { name, postCount, weeklyCoins }[],
    newCircles: { id, name, memberCount, growthRate }[],
    weeklyTop: PostCard[],
    suggestedUsers: { id, username, badge }[]
  }
```

#### 通知
```
GET /api/notifications?page=1&limit=20
  Response: { notifications[], unreadCount, nextPage }

POST /api/notifications/read-all
  Response: { success: true }
```

### 5.5 TanStack Query 配置

```ts
// src/providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,           // 1 分钟内认为数据新鲜
      gcTime: 5 * 60_000,          // 5 分钟后垃圾回收
      retry: 1,                    // 失败最多重试 1 次
      refetchOnWindowFocus: false,  // 不在窗口聚焦时自动刷新
    },
  },
});
```

### 5.6 Query Key 设计

统一的 queryKey 命名规范，方便缓存失效：

```ts
// Feed
['feed', tab]                      // tab = 'hot' | 'follow' | 'fresh'
['feed', 'tag', tagName]
['feed', 'circle', circleId]
['feed', 'user', userId]

// 单个资源
['post', postId]
['user', userId]
['circle', circleId]

// 列表
['comments', postId]
['transactions']
['notifications']

// 单值
['wallet']
['auth', 'me']
```

**缓存失效策略：**
```
投币成功后 → invalidate ['post', postId], ['feed'], ['wallet']
发帖成功后 → invalidate ['feed'], ['wallet']
发评论后   → invalidate ['comments', postId]
关注/取关后 → invalidate ['user', userId], ['feed', 'follow']
加入圈子后 → invalidate ['circle', circleId], ['wallet']
```

---

## 6. 状态管理

### 6.1 AuthContext

```ts
interface AuthState {
  user: User | null;          // 当前用户信息
  token: string | null;       // JWT
  balance: number;            // Agreecoin 余额快照（乐观更新用）
  badge: BadgeType | null;    // 当前徽章
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  updateBalance: (delta: number) => void;  // 乐观更新余额
  refreshUser: () => Promise<void>;        // 重新获取用户信息
}
```

**balance 为什么在 Context 里？**
因为余额显示在 Sidebar 和 RightPanel 等多处，投币的乐观更新需要立刻反映到所有位置。同时 TanStack Query 的 `['wallet']` 也会定期刷新真实值来校准。

### 6.2 FeedTabContext

```ts
interface FeedTabState {
  currentTab: 'hot' | 'follow' | 'fresh';
  setTab: (tab: 'hot' | 'follow' | 'fresh') => void;
}
```

非常简单。切换 Tab 时不改 URL，只改 queryKey，TanStack Query 自动从缓存读取或发请求。

### 6.3 ModalContext

```ts
interface ModalState {
  activeModal: 'login' | 'vote' | 'createCircle' | null;
  modalProps: Record<string, any>;
  openModal: (type: string, props?: any) => void;
  closeModal: () => void;
}
```

用于全局弹窗（未登录时点投币弹出登录框、投币确认弹窗等）。

---

## 7. 核心类型定义

```ts
// src/lib/types.ts

// ========== 用户 ==========
interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  badge: BadgeType | null;
  founderNumber: number | null;  // 创始成员编号，null 表示非创始成员
  balance: number;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: string;
}

type BadgeType = 'seedling' | 'resonator' | 'vibe_master' | 'founder';

// ========== 帖子 ==========
interface Post {
  id: string;
  author: UserBrief;
  title: string;
  content: string;            // Markdown
  tags: string[];
  circleId: string | null;
  circleName: string | null;
  temperature: number;
  agreeCount: number;         // 投币总数
  commentCount: number;
  viewCount: number;
  isPromoted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Feed 中的帖子卡片（比 Post 少了完整 content）
interface PostCard {
  id: string;
  author: UserBrief;
  title: string;
  excerpt: string;            // 前 200 字
  tags: string[];
  circleName: string | null;
  temperature: number;
  agreeCount: number;
  commentCount: number;
  viewCount: number;
  isPromoted: boolean;
  createdAt: string;
  hasVoted: boolean;
  myVoteAmount: number;
}

interface UserBrief {
  id: string;
  username: string;
  avatarUrl: string | null;
  badge: BadgeType | null;
  founderNumber: number | null;
}

// ========== 评论 ==========
interface Comment {
  id: string;
  author: UserBrief;
  content: string;
  parentId: string | null;
  replies: Comment[];          // 嵌套回复（最多 1 层）
  createdAt: string;
}

// ========== 钱包 ==========
interface WalletInfo {
  balance: number;
  badge: BadgeType | null;
  nextBadgeThreshold: number;  // 下一级徽章所需持仓
  todayEarned: number;
  todaySpent: number;
}

interface Transaction {
  id: string;
  type: 'daily_grant' | 'post_reward' | 'comment_reward' | 'login_streak'
      | 'vote_sent' | 'vote_received' | 'promotion' | 'circle_fee'
      | 'platform_burn';
  amount: number;              // 正数为收入，负数为支出
  description: string;
  relatedPostId: string | null;
  relatedUserId: string | null;
  createdAt: string;
}

// ========== 圈子 ==========
interface Circle {
  id: string;
  name: string;
  description: string;
  rules: string | null;
  owner: UserBrief;            // 山主
  memberCount: number;
  entryFee: number;            // 入门投币，0 表示免费
  createdAt: string;
  isMember: boolean;           // 当前用户是否已加入
}

// ========== 通知 ==========
interface Notification {
  id: string;
  type: 'vote_received' | 'comment' | 'follow' | 'temperature_milestone' | 'circle_update';
  message: string;
  relatedPostId: string | null;
  relatedUserId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ========== 分页 ==========
interface PaginatedResponse<T> {
  data: T[];
  nextPage: number | null;
  totalCount: number;
}
```

---

## 8. 关键交互流程

### 8.1 投币流程（最核心的交互）

```
用户点击投币按钮
  → 弹出投币数量选择（1-10 coins 滑块或按钮组）
  → 用户确认
  → 前端乐观更新：
      - PostCard/Post 温度值 +Δ
      - 投币按钮变为已投状态
      - AuthContext.balance -= amount
      - Sidebar/RightPanel 余额同步更新
  → 发送 POST /api/post/[id]/vote { amount }
  → 成功：Toast "投币成功"，后台 invalidate 相关缓存
  → 失败：回滚所有乐观更新，Toast 显示错误原因
```

### 8.2 发帖流程

```
用户点击 Sidebar 的"发帖"按钮
  → 跳转到 /post/create
  → 填写标题、正文（Markdown）、标签、可选圈子
  → 点击"发布"
  → loading 状态
  → POST /api/post
  → 成功：router.push(`/post/${newPostId}`)，invalidate Feed + Wallet
  → 失败：Toast 显示错误，保留表单内容
```

### 8.3 新用户引导流程

```
用户注册成功
  → 跳转到 /onboarding
  → 选择 3-5 个兴趣标签（平台预设的活跃标签）
  → 选完后跳转到 Feed 首页
  → Feed 首页用热度流填充（即使没关注任何人也有内容看）
  → 自动加入"新人广场"圈子
  → 弹出欢迎 Toast，说明每日可领 20 coins
```

### 8.4 通知交互流程

```
Sidebar 通知图标显示未读数角标
  → 用户点击进入 /notifications
  → 加载通知列表
  → 点击某条通知 → 跳转到对应帖子/用户页
  → 离开通知页时自动标记全部已读
```

---

## 9. 温度可视化设计

温度是 Oasis 的核心视觉标识。`TemperatureBar` 组件需要直观展示帖子的共鸣程度。

**温度值的视觉映射：**

| 温度范围 | 颜色 | 状态描述 |
|---------|------|---------|
| 0-99 | 灰色/冷蓝 | 刚发布，尚未被发现 |
| 100-499 | 蓝绿色 | 开始获得共鸣 |
| 500-999 | 橙黄色 | 社区热议 |
| 1000+ | 红橙色 | 🔥 高温帖子 |

**TemperatureBar 组件规格：**
- 水平进度条样式
- 宽度按温度值占比填充（以 1000 为满格参考，超过 1000 仍然满格但数字继续增长）
- 数字显示在条的右侧
- 颜色随温度等级渐变
- PostCard 中用紧凑版（单行），帖子详情页用展开版（含投币人数等详情）

---

## 10. MVP 执行顺序

按优先级分三个 Sprint，每个 Sprint 约 1 周。

### Sprint 1：骨架 + 核心循环（第 1 周）

目标：让"发帖 → 看帖 → 投币 → 看温度变化"这个核心循环跑通。

**任务清单：**

1. **项目初始化**
   - `npx create-next-app@latest oasis --typescript --tailwind --app --src-dir`
   - 安装依赖：`@tanstack/react-query`, `zod`, `react-hook-form`, `lucide-react`
   - 安装 shadcn/ui：`npx shadcn@latest init`，添加 button / card / input / tabs / dialog / toast
   - 配置 `src/lib/api.ts` 封装

2. **布局搭建**
   - 根 layout.tsx（QueryProvider + AuthProvider）
   - (auth)/layout.tsx（居中布局）
   - (main)/layout.tsx（三栏桌面布局）
   - Sidebar 组件（静态导航项）
   - Header 组件（Logo + 搜索框占位 + 用户头像）
   - RightPanel 组件（静态占位内容）

3. **认证流程**
   - AuthContext 实现
   - login / register 页面
   - JWT 存储（httpOnly cookie 优先，或 localStorage）
   - 路由保护中间件（未登录重定向到 /login）

4. **Feed 首页**
   - FeedTabs 组件（三个 Tab 切换）
   - FeedTabContext 实现
   - PostCard 组件（含 TemperatureBar）
   - useFeed Hook（useInfiniteQuery）
   - Feed page.tsx 的 SSR 首屏
   - InfiniteScrollTrigger 无限滚动

5. **帖子详情页**
   - PostContent 组件（Markdown 渲染）
   - PostMeta 组件（作者/温度/时间/标签）
   - 基础评论列表展示

6. **投币功能**
   - VoteButton 组件（数量选择 + 确认）
   - useVote Hook（含乐观更新全流程）
   - TemperatureBar 实时更新

7. **发帖功能**
   - CreatePostForm 组件
   - useCreatePost Hook
   - 标签输入（简单的 tag input，不需要自动补全）

### Sprint 2：钱包 + 社区结构（第 2 周）

目标：让用户能看到自己的经济状况，开始形成社区结构。

**任务清单：**

8. **钱包页**
   - WalletCard 组件（余额 + 徽章进度）
   - TransactionList 组件（无限滚动）
   - BadgeDisplay 组件
   - useWallet Hook

9. **用户主页**
   - UserProfile 组件
   - 用户帖子列表
   - FollowButton 组件 + useFollow Hook
   - UserAvatar 组件（含徽章角标）

10. **圈子功能（简化版）**
    - CircleCard 组件
    - CircleHeader 组件
    - 创建圈子页面
    - 加入/退出圈子
    - 圈内 Feed

11. **标签页**
    - 标签 Feed 页（复用 FeedList）
    - 标签头部信息

12. **评论系统完善**
    - 嵌套回复（最多 2 层）
    - 发评论 + 乐观更新
    - 评论奖励提示

### Sprint 3：发现 + 通知 + 打磨（第 3 周）

目标：完善内容发现和用户召回，打磨体验。

**任务清单：**

13. **发现页**
    - 热门标签展示
    - 新兴圈子列表
    - 温度周榜
    - 值得关注推荐

14. **通知系统**
    - 通知列表页
    - 未读数角标
    - 通知轮询

15. **引导流程**
    - onboarding 页（选兴趣标签）
    - 新用户首次进入 Feed 的引导提示
    - "今日一问"置顶卡片

16. **RightPanel 动态化**
    - 根据当前页面显示不同内容
    - 钱包摘要组件
    - 热门标签组件
    - 新兴圈子组件

17. **创始成员标识**
    - 创始成员 #编号 展示
    - 创始成员徽章样式

18. **体验打磨**
    - 所有页面的 loading 状态
    - 所有页面的 empty 状态
    - 错误状态处理
    - 移动端适配（底部 Nav + 响应式布局）
    - 页面过渡动画

---

## 11. 关键实现注意事项

### 11.1 SSR + Client 的边界

**原则：页面级组件是 Server Component，交互组件是 Client Component。**

```tsx
// ✅ 正确做法
// page.tsx（Server Component，没有 "use client"）
export default async function PostPage({ params }) {
  const post = await fetchPostServer(params.id);  // 服务端 fetch
  return <PostClient post={post} />;               // 传给客户端组件
}

// PostClient.tsx（Client Component）
"use client";
export function PostClient({ post }: { post: Post }) {
  // 这里可以用 hooks、事件处理等
  const vote = useVote(post.id);
  return <div>...</div>;
}
```

```tsx
// ❌ 错误做法
// page.tsx
"use client";  // 不要在 page.tsx 加这个！会丧失 SSR 能力
export default function PostPage() {
  const post = usePost(id);  // 纯客户端获取，首屏白
  return <div>...</div>;
}
```

### 11.2 投币乐观更新的完整性

投币涉及多处 UI 同步更新，必须确保一致性：

1. PostCard / Post 详情中的温度值
2. PostCard / Post 详情中的投币状态（hasVoted + myVoteAmount）
3. AuthContext 中的 balance
4. Sidebar / RightPanel 中显示的余额
5. 如果钱包页也打开了，wallet 缓存也需要 invalidate

### 11.3 Markdown 渲染

帖子正文使用 Markdown。推荐用 `react-markdown` + `rehype-highlight` 渲染：

```bash
npm install react-markdown rehype-highlight
```

支持：标题、粗体/斜体、代码块（带语法高亮）、链接、图片、列表。

### 11.4 图片上传

MVP 阶段可以先不做图片上传，只支持 Markdown 中的外部图片链接。
如果要做，建议用 Supabase Storage 或 S3 兼容存储，通过 `/api/upload` 代理上传。

### 11.5 SEO

每个 page.tsx 都应该导出 `generateMetadata` 函数：

```tsx
export async function generateMetadata({ params }) {
  const post = await fetchPostServer(params.id);
  return {
    title: `${post.title} - Oasis`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt },
  };
}
```

### 11.6 环境变量

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001   # 后端 API 地址
JWT_SECRET=your-jwt-secret                  # 仅服务端使用
DATABASE_URL=postgresql://...               # 仅服务端使用（如果 API Routes 直连数据库）
```

---

## 12. API Route Handlers 的角色

有两种架构选择：

**选项 A：Next.js API Routes 直连数据库（推荐 MVP）**

```
浏览器 → Next.js API Routes → PostgreSQL (Supabase)
```

优点：少一层服务，部署简单，开发快。
适合：MVP 阶段，用户量小。

**选项 B：Next.js API Routes 代理独立后端**

```
浏览器 → Next.js API Routes → Express/Hono 后端 → PostgreSQL
```

优点：后端可独立扩展，前后端完全解耦。
适合：用户量增长后迁移。

**建议：MVP 先用选项 A，数据库逻辑写在 API Route Handlers 里。等验证产品后再拆分独立后端。**

这不影响前端代码——前端始终调用 `/api/xxx`，无论背后是直连数据库还是代理后端。

---

## 13. 给 Cursor 的执行指令

当你把这份文档给 Cursor 时，可以用以下提示词：

```
请根据 OASIS_FRONTEND_BLUEPRINT.md 文档，按照 Sprint 1 的任务清单顺序开始实现 Oasis 项目。

技术栈：Next.js 15 App Router + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query v5

关键约定：
1. 所有 page.tsx 默认是 Server Component，交互组件单独抽出为 "use client"
2. 数据获取用 SSR 首屏 + TanStack Query 接管后续交互
3. API 返回格式统一为 { success: boolean, data: T, error?: string }
4. 投币操作必须实现乐观更新
5. React Context 只用于 Auth / FeedTab / Modal 三个全局状态
6. 组件放在 src/components/ 下按功能分文件夹
7. Hooks 放在 src/hooks/ 下，一个功能一个文件
8. 类型定义集中在 src/lib/types.ts

请从项目初始化和布局搭建开始。
```

---

## 附录 A：温度计算公式（前端展示用）

```
温度 = (认同币 - 质疑币) ÷ 浏览量 × 1000
```

前端不需要计算温度，只需要展示后端返回的 `temperature` 值。
但前端在乐观更新时需要估算温度变化：

```ts
function estimateTemperature(post: Post, addedCoins: number): number {
  const newAgreeCount = post.agreeCount + addedCoins;
  // 简化估算：按比例增加
  return Math.round(post.temperature * (newAgreeCount / post.agreeCount));
}
```

## 附录 B：徽章展示规则

| 徽章 | 持仓门槛 | 图标 | 颜色 |
|------|---------|------|------|
| 新芽 | ≥100 coins | 🌱 | 绿色 |
| 共鸣者 | ≥500 coins | ⚡ | 蓝色 |
| Vibe Master | ≥2000 coins | 🔥 | 橙色 |
| 创始人 | ≥5000 coins | 🏔️ | 金色 |

徽章显示在用户名旁边。创始成员额外显示 `#007` 编号。

## 附录 C：shadcn/ui 需要安装的组件

```bash
npx shadcn@latest add button card input tabs dialog toast
npx shadcn@latest add dropdown-menu avatar badge separator
npx shadcn@latest add textarea select scroll-area skeleton
npx shadcn@latest add tooltip popover sheet
```