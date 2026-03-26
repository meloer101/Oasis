# Oasis 数据库 Schema 设计文档

## 目录
1. [设计原则](#设计原则)
2. [核心实体与关系](#核心实体与关系)
3. [数据表详解](#数据表详解)
4. [索引策略](#索引策略)
5. [触发器与计算](#触发器与计算)
6. [货币流动完整示例](#货币流动完整示例)

---

## 设计原则

### 1. **原子性与数据一致性**
- 所有涉及 Agreecoin 的操作必须是原子的（全成功或全失败）
- 使用 PostgreSQL 的事务和约束来保证数据完整性
- 防止双花、重复投票、超额消费

### 2. **审计与追踪**
- 所有的币流转都有记录（CoinTransaction）
- 所有的行为都有时间戳（created_at, updated_at）
- 便于未来的数据分析、风险检测、争议解决

### 3. **灵活性与扩展**
- 不预设死的分类或状态
- 用 ENUM 和状态字段支持业务规则的演进
- 为未来的"质疑币"、"反对币"等机制预留空间

### 4. **查询性能**
- 合理的索引设计，避免全表扫描
- 温度计算可以在数据库层用视图 + 物化视图优化
- 关键路径（投币、获取 Feed）的查询都在 50ms 以内

---

## 核心实体与关系

```
┌─────────────────────────────────────────────────────────────┐
│                     用户域                                   │
├─────────────────────────────────────────────────────────────┤
│  users                  用户账户基本信息                       │
│  user_profiles          用户扩展资料（简介、头像等）            │
│  user_balances          用户的 Agreecoin 账户                │
│  user_badges            用户徽章与持仓绑定                     │
│  follows                用户关注关系                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   内容与社区域                               │
├─────────────────────────────────────────────────────────────┤
│  posts                  帖子                                 │
│  comments               评论                                 │
│  replies                回复                                 │
│  tags                   标签（去中心化）                      │
│  post_tags              帖子-标签关联                         │
│  circles                圈子（有主社区）                      │
│  circle_members         圈子成员与权限                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   经济与投票域                               │
├─────────────────────────────────────────────────────────────┤
│  votes                  投票记录                             │
│  coin_transactions      所有币流转记录                       │
│  coin_distribution      系统每日发币记录                     │
│  post_metrics           帖子的展现 & 投票统计（冗余优化）      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   通知与日志域                               │
├─────────────────────────────────────────────────────────────┤
│  notifications          通知（投币、评论、被关注等）           │
│  audit_logs             系统审计日志（可选，生产环境建议）      │
└─────────────────────────────────────────────────────────────┘
```

---

## 数据表详解

### 用户域

#### 1. **users** - 用户账户表
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 认证信息
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- 身份信息
  status VARCHAR(20) DEFAULT 'active',  -- active | suspended | deleted
  founder_number INT UNIQUE,              -- 创始成员编号，仅限前 100 个
  founder_number_assigned_at TIMESTAMP,   -- 编号分配时间
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);
```

**设计考虑：**
- `founder_number`：限制前 100 个用户获得编号，形成稀缺性和可传播性
- `status`：支持账户的多种状态（活跃、冻结、删除等）
- 不在这里存储 Agreecoin 余额，余额独立在 `user_balances` 表中

---

#### 2. **user_profiles** - 用户扩展资料表
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- 基本信息
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url VARCHAR(500),
  
  -- 社交信息
  twitter_handle VARCHAR(100),
  personal_website VARCHAR(500),
  
  -- 统计（冗余，用于快速显示）
  follower_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  post_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

#### 3. **user_balances** - 用户 Agreecoin 账户表
```sql
CREATE TABLE user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- 核心余额字段
  balance BIGINT DEFAULT 0,              -- 当前可用余额
  
  -- 统计信息（可选，用于分析）
  total_earned BIGINT DEFAULT 0,         -- 生涯总赚取
  total_spent BIGINT DEFAULT 0,          -- 生涯总支出
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 约束：余额不能为负
  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);
```

**设计考虑：**
- `balance` 是 BIGINT（64 位整数），支持大量交易
- 分离 users 和 user_balances，便于未来添加多币种或多账户支持
- 所有修改都通过 CoinTransaction 记录，user_balances 是冗余缓存（为性能考虑）

---

#### 4. **user_badges** - 用户徽章表
```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 徽章类型
  badge_type VARCHAR(50) NOT NULL,  -- 'newcomer' | 'resonator' | 'vibe_master' | 'founder' | 'circle_creator'
  
  -- 持仓要求与状态
  required_balance BIGINT NOT NULL,  -- 需要持有的最少币数（比如 500）
  acquired_at TIMESTAMP,             -- 首次获得时间
  status VARCHAR(20) DEFAULT 'active', -- active | inactive（因为币不足了）
  
  -- 徽章的额外权益（可选）
  expires_at TIMESTAMP,              -- 如果需要定期续费，可以设置过期时间
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 每个用户每种徽章只能有一个
  UNIQUE(user_id, badge_type)
);
```

**徽章类型参考：**
```
newcomer (新芽)        - 持仓 >= 100 coins
resonator (共鸣者)     - 持仓 >= 500 coins，连续活跃满 14 天
vibe_master (Vibe大师) - 持仓 >= 2000 coins
founder (创始人)       - 拥有 founder_number，持仓 >= 5000 coins
circle_creator (圈子创建者) - 创建过圈子
```

---

#### 5. **follows** - 用户关注表
```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 防止重复关注
  UNIQUE(follower_id, following_id),
  -- 防止自己关注自己
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);
```

---

### 内容与社区域

#### 6. **posts** - 帖子表
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 作者与内容
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  
  -- 媒体（可以有多张图片或链接）
  image_urls TEXT[],  -- PostgreSQL 数组，存储 URL 列表
  external_url VARCHAR(500),  -- 外部链接
  
  -- 所属圈子（可选，NULL 表示发表在公共平台）
  circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
  
  -- 状态管理
  status VARCHAR(20) DEFAULT 'published',  -- published | deleted | hidden
  
  -- 统计字段（冗余，用于快速查询）
  view_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  vote_count INT DEFAULT 0,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 索引：查询热门帖子、用户帖子
  INDEX idx_author_created (author_id, created_at),
  INDEX idx_circle_created (circle_id, created_at),
  INDEX idx_created (created_at)
);
```

**设计考虑：**
- 不在 posts 表中存储 temperature，而是通过视图实时或物化计算
- `image_urls` 用 PostgreSQL 数组类型，便于存储多张图片
- `circle_id` 可以为 NULL，表示帖子发表在公共平台（不属于任何 Circle）

---

#### 7. **comments** - 评论表
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联关系
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 内容
  content TEXT NOT NULL,
  image_urls TEXT[],
  
  -- 统计
  vote_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  
  -- 状态
  status VARCHAR(20) DEFAULT 'published',  -- published | deleted
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_post_created (post_id, created_at),
  INDEX idx_author (author_id)
);
```

---

#### 8. **replies** - 回复表（评论的回复）
```sql
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联关系
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reply_to_id UUID REFERENCES replies(id) ON DELETE CASCADE,  -- 支持嵌套回复
  
  -- 内容
  content TEXT NOT NULL,
  
  -- 统计
  vote_count INT DEFAULT 0,
  
  -- 状态
  status VARCHAR(20) DEFAULT 'published',  -- published | deleted
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_comment (comment_id),
  INDEX idx_author (author_id)
);
```

---

#### 9. **tags** - 标签表（去中心化）
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 标签信息
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly 版本
  description TEXT,
  
  -- 统计（冗余）
  post_count INT DEFAULT 0,
  follower_count INT DEFAULT 0,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_name (name),
  INDEX idx_slug (slug)
);
```

**设计考虑：**
- 标签是"无主的公共资源"，任何人都可以使用
- `slug` 用于 URL，比如 `/tags/vibe-coding`
- 任何人都可以"关注"某个标签（用 follow_tags 表实现，类似 follows）

---

#### 10. **post_tags** - 帖子-标签关联表
```sql
CREATE TABLE post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 每条帖子每个标签只能关联一次
  UNIQUE(post_id, tag_id),
  
  INDEX idx_post (post_id),
  INDEX idx_tag (tag_id)
);
```

---

#### 11. **circles** - 圈子表（有主社区）
```sql
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly
  description TEXT,
  icon_url VARCHAR(500),
  
  -- 创建者（"占山者"）
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 圈子设置
  visibility VARCHAR(20) DEFAULT 'public',  -- public | private | invite_only
  
  -- 加入规则
  join_type VARCHAR(50) DEFAULT 'free',  -- free | paid | invite
  join_cost_coins INT DEFAULT 0,  -- 如果 join_type = 'paid'，需要多少 coins
  
  -- 统计（冗余）
  member_count INT DEFAULT 1,  -- 初始包括创建者
  post_count INT DEFAULT 0,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_creator (creator_id),
  INDEX idx_slug (slug)
);
```

**设计考虑：**
- Circle 是"有主社区"，creator_id 就是圈子主人，拥有管理权
- `join_cost_coins`：支持付费加入（虽然 v1 不一定用，但预留）
- `visibility`：支持不同的隐私级别

---

#### 12. **circle_members** - 圈子成员表
```sql
CREATE TABLE circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 成员角色（创建者、版主、普通成员）
  role VARCHAR(50) DEFAULT 'member',  -- member | moderator | admin | creator
  
  -- 时间戳
  joined_at TIMESTAMP DEFAULT NOW(),
  
  -- 每个用户在每个圈子只能是一个成员记录
  UNIQUE(circle_id, user_id),
  
  INDEX idx_circle (circle_id),
  INDEX idx_user (user_id)
);
```

**设计考虑：**
- creator 的 role 自动设为 'creator'（在创建圈子时）
- moderator：可以删除内容、管理成员
- admin：可以修改圈子设置（但不是创建者）
- member：普通成员

---

### 经济与投票域

#### 13. **votes** - 投票记录表
```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 投票人与被投票人
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 投票目标（可能是帖子、评论、回复）
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
  
  -- 投票数量与类型
  amount BIGINT NOT NULL,              -- 投了多少 coins
  vote_type VARCHAR(50) DEFAULT 'agree',  -- agree | disagree (预留)
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 约束：只能投票一个目标，不能同时投票给帖子和评论
  CONSTRAINT vote_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NULL AND reply_id IS NOT NULL)
  ),
  
  -- 防止重复投票：同一个人对同一个目标只能投一次
  UNIQUE(voter_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'),
                   COALESCE(comment_id, '00000000-0000-0000-0000-000000000000'),
                   COALESCE(reply_id, '00000000-0000-0000-0000-000000000000')),
  
  INDEX idx_voter (voter_id),
  INDEX idx_post (post_id),
  INDEX idx_comment (comment_id),
  INDEX idx_reply (reply_id)
);
```

**设计考虑：**
- 一个人对同一个内容只能投一次（UNIQUE 约束）
- 投票不能删除（这是审计记录），所以没有 status 字段
- `vote_type` 预留给未来的"反对币"机制

---

#### 14. **coin_transactions** - 所有币流转记录表（核心审计日志）
```sql
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 交易双方
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- 来源（可能是 NULL 表示系统发币）
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 接收者
  
  -- 交易金额
  amount BIGINT NOT NULL,
  
  -- 交易类型（用于分类和审计）
  transaction_type VARCHAR(50) NOT NULL,  -- 'daily_distribution' | 'post_reward' | 'comment_reward' | 'vote_spent' | 'vote_received' | 'circle_join' | ...
  
  -- 关联的业务对象
  related_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  related_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  related_vote_id UUID REFERENCES votes(id) ON DELETE SET NULL,
  related_circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
  
  -- 备注（便于调试和审计）
  description TEXT,
  
  -- 状态（普通交易都是 completed，可能预留 pending 给未来的异步操作）
  status VARCHAR(20) DEFAULT 'completed',  -- completed | pending | failed | reversed
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_from_user (from_user_id),
  INDEX idx_to_user (to_user_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_created (created_at)
);
```

**交易类型详解：**
```
daily_distribution        - 系统每日发币（from_user_id = NULL）
post_reward              - 发帖奖励（from_user_id = NULL）
comment_reward           - 评论奖励（from_user_id = NULL）
login_streak_reward      - 连续登录奖励（from_user_id = NULL）
vote_spent               - 用户投币（from_user_id = voter，to_user_id = post_author）
vote_received            - 作者获得投币（反向记录，便于统计）
circle_creation_reward   - 创建圈子奖励（from_user_id = NULL）
circle_join_fee          - 加入圈子（from_user_id = user，to_user_id = circle_creator）
badge_revoke             - 徽章失效时的币扣除（如果有相关规则）
transaction_fee_burned   - 平台销毁税（from_user_id = user，to_user_id = NULL）
```

**设计考虑：**
- 所有币流转都有记录，便于完整的审计和数据分析
- `from_user_id = NULL` 表示系统发币（不是用户之间的转账）
- `status` 支持事务的多种状态，便于处理失败和回滚

---

#### 15. **coin_distribution** - 系统每日发币记录表（可选，用于统计）
```sql
CREATE TABLE coin_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 发币日期
  distribution_date DATE NOT NULL,
  
  -- 本次发币的统计
  total_users_distributed_to INT,
  total_coins_distributed BIGINT,
  
  -- 执行情况
  status VARCHAR(20) DEFAULT 'completed',  -- completed | partial | failed
  error_message TEXT,
  
  -- 时间戳
  executed_at TIMESTAMP DEFAULT NOW()
);
```

**使用场景：**
- 每晚执行一次系统发币，记录这一次发币的汇总信息
- 便于监控发币是否正常执行

---

#### 16. **post_metrics** - 帖子指标表（可选，冗余优化）
```sql
CREATE TABLE post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  
  -- 浏览和曝光
  view_count INT DEFAULT 0,
  impression_count INT DEFAULT 0,  -- 被展示在 Feed 上的次数
  
  -- 投票统计
  agree_vote_count INT DEFAULT 0,
  agree_vote_amount BIGINT DEFAULT 0,
  disagree_vote_count INT DEFAULT 0,
  disagree_vote_amount BIGINT DEFAULT 0,
  
  -- 互动
  comment_count INT DEFAULT 0,
  engagement_rate FLOAT DEFAULT 0,  -- (vote_count + comment_count) / impression_count
  
  -- 温度（计算后的值）
  temperature FLOAT DEFAULT 0,  -- 实时或定期计算
  
  -- 时间戳
  calculated_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**为什么需要这个表：**
- 温度计算会频繁发生，如果每次都从 votes 和 posts 重新计算，性能会很差
- 这个表可以每 5 分钟更新一次（通过定时任务或触发器）
- 查询 Feed 时直接从这里读温度，快速高效

---

### 通知与日志域

#### 17. **notifications** - 通知表（可选，v1 可以先不做）
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 通知类型
  notification_type VARCHAR(50) NOT NULL,  -- 'vote_received' | 'comment_on_post' | 'reply_on_comment' | 'followed' | ...
  
  -- 通知来源
  related_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  related_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  related_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  
  -- 通知内容
  title VARCHAR(200),
  body TEXT,
  
  -- 状态
  is_read BOOLEAN DEFAULT FALSE,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at)
);
```

---

## 索引策略

### 核心索引（必须）

```sql
-- 用户表
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_founder_number ON users(founder_number);

-- 帖子表
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_circle_created ON posts(circle_id, created_at DESC);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_status ON posts(status);

-- 投票表
CREATE INDEX idx_votes_voter_created ON votes(voter_id, created_at DESC);
CREATE INDEX idx_votes_post_id ON votes(post_id);
CREATE INDEX idx_votes_comment_id ON votes(comment_id);

-- 币流转
CREATE INDEX idx_coin_transactions_from ON coin_transactions(from_user_id, created_at DESC);
CREATE INDEX idx_coin_transactions_to ON coin_transactions(to_user_id, created_at DESC);
CREATE INDEX idx_coin_transactions_type_created ON coin_transactions(transaction_type, created_at DESC);

-- 关注
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- 圈子
CREATE INDEX idx_circle_members_circle ON circle_members(circle_id);
CREATE INDEX idx_circle_members_user ON circle_members(user_id);
```

### 查询优化索引（热路径）

```sql
-- 获取用户的 Feed（热度流）
CREATE INDEX idx_posts_created_status ON posts(created_at DESC, status);

-- 获取 Circle 内的帖子
CREATE INDEX idx_posts_circle_created_status ON posts(circle_id, created_at DESC, status);

-- 计算帖子温度（需要快速统计投票）
CREATE INDEX idx_votes_post_amount_created ON votes(post_id, amount, created_at DESC);

-- 用户关注的人的帖子
CREATE INDEX idx_follows_follower_following ON follows(follower_id, following_id);

-- 标签检索
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_post_tags_post_tag ON post_tags(post_id, tag_id);
```

---

## 触发器与计算

### 1. **自动更新统计字段（帖子的 view_count, comment_count 等）**

```sql
-- 新增评论时，自动更新帖子的 comment_count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();
```

### 2. **投票后自动更新帖子的 vote_count**

```sql
CREATE OR REPLACE FUNCTION update_post_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    UPDATE posts SET vote_count = vote_count + 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_vote_count
AFTER INSERT ON votes
FOR EACH ROW
EXECUTE FUNCTION update_post_vote_count();
```

### 3. **更新用户的粉丝数/关注数**

```sql
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  -- 增加被关注者的 follower_count
  UPDATE user_profiles SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
  -- 增加关注者的 following_count
  UPDATE user_profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follower_count
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION update_follower_count();
```

### 4. **自动检查徽章有效性（当用户余额降低时）**

```sql
CREATE OR REPLACE FUNCTION check_badge_validity()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果用户的余额低于某个徽章的要求，设置该徽章为 inactive
  UPDATE user_badges
  SET status = 'inactive'
  WHERE user_id = NEW.user_id
    AND required_balance > NEW.balance
    AND status = 'active';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_badge_validity
AFTER UPDATE ON user_balances
FOR EACH ROW
WHEN (OLD.balance > NEW.balance)  -- 只在余额降低时检查
EXECUTE FUNCTION check_badge_validity();
```

---

## 视图定义

### 1. **温度计算视图**

```sql
CREATE VIEW post_temperature_view AS
SELECT 
  p.id,
  p.author_id,
  p.title,
  p.created_at,
  COUNT(DISTINCT v.voter_id) as agree_vote_count,
  SUM(v.amount) as agree_vote_amount,
  p.view_count,
  p.impression_count,
  -- 温度公式：(投票数 / 曝光数) * 浏览量 * 1000
  CASE 
    WHEN p.impression_count = 0 THEN 0
    ELSE (CAST(COUNT(DISTINCT v.voter_id) AS FLOAT) / p.impression_count) * p.view_count * 1000
  END as temperature
FROM posts p
LEFT JOIN votes v ON p.id = v.post_id AND v.vote_type = 'agree'
WHERE p.status = 'published'
GROUP BY p.id, p.author_id, p.title, p.created_at, p.view_count, p.impression_count;
```

### 2. **用户余额与徽章视图**

```sql
CREATE VIEW user_status_view AS
SELECT 
  u.id,
  u.username,
  ub.balance,
  ARRAY_AGG(ub.badge_type) FILTER (WHERE ub.status = 'active') as active_badges,
  u.founder_number,
  up.follower_count,
  up.following_count,
  up.post_count
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
LEFT JOIN user_badges ub ON u.id = ub.user_id
LEFT JOIN user_profiles up ON u.id = up.user_id
GROUP BY u.id, u.username, ub.balance, up.follower_count, up.following_count, up.post_count;
```

### 3. **热门帖子视图（Hot Posts）**

```sql
CREATE VIEW hot_posts_view AS
SELECT 
  p.id,
  p.author_id,
  p.title,
  p.created_at,
  p.view_count,
  COUNT(DISTINCT v.voter_id) as vote_count,
  SUM(v.amount) as total_vote_amount,
  (CAST(COUNT(DISTINCT v.voter_id) AS FLOAT) / NULLIF(p.impression_count, 0)) * p.view_count * 1000 as temperature,
  u.username,
  up.avatar_url
FROM posts p
LEFT JOIN votes v ON p.id = v.post_id AND v.vote_type = 'agree'
LEFT JOIN users u ON p.author_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE p.status = 'published'
  AND p.created_at > NOW() - INTERVAL '7 days'
GROUP BY p.id, p.author_id, p.title, p.created_at, p.view_count, p.impression_count, u.username, up.avatar_url
ORDER BY temperature DESC;
```

---

## 货币流动完整示例

### 场景 1：用户投币支持帖子

**流程：**
1. 用户 Alice 看到帖子 P1（作者 Bob）
2. Alice 投 10 coins 给帖子
3. 系统处理：
   - Alice 的 balance 减少 10（检查余额 >= 10）
   - 创建 vote 记录
   - Bob 的 balance 增加 8（20% 销毁）
   - 销毁 2 coins（平台销毁税）
   - 记录 3 条 coin_transaction

**SQL 伪代码：**
```sql
BEGIN TRANSACTION;

-- 1. 检查投票者余额
SELECT balance FROM user_balances WHERE user_id = 'alice_id' FOR UPDATE;
-- 结果：100 coins，足够

-- 2. 扣除投票者的币
UPDATE user_balances SET balance = balance - 10 WHERE user_id = 'alice_id';

-- 3. 记录投票
INSERT INTO votes (voter_id, post_id, amount, vote_type) 
VALUES ('alice_id', 'p1_id', 10, 'agree');

-- 4. 计算分配
-- 投票者花出：10 coins
-- 作者获得：8 coins（80%）
-- 平台销毁：2 coins（20%）

-- 5. 给作者加币
UPDATE user_balances SET balance = balance + 8 WHERE user_id = 'bob_id';

-- 6. 记录币流转
INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, related_vote_id, description)
VALUES ('alice_id', 'bob_id', 8, 'vote_received', 'vote_id', 'Alice 投 10 coins，Bob 获得 8');

INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, related_vote_id, description)
VALUES ('alice_id', NULL, 2, 'transaction_fee_burned', 'vote_id', '平台销毁 2 coins');

-- 7. 更新帖子统计
UPDATE posts SET vote_count = vote_count + 1 WHERE id = 'p1_id';
-- （触发器自动执行）

COMMIT;
```

---

### 场景 2：系统每日发币

**流程：**
1. 系统定时任务（每天 00:00）
2. 为所有活跃用户发放 20 coins
3. 记录这次发币事件

**SQL 伪代码：**
```sql
BEGIN TRANSACTION;

-- 1. 为所有活跃用户发币
UPDATE user_balances 
SET balance = balance + 20
WHERE user_id IN (
  SELECT id FROM users WHERE status = 'active'
);

-- 2. 为每个用户记录交易
INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, description)
SELECT NULL, id, 20, 'daily_distribution', '每日发币'
FROM users
WHERE status = 'active';

-- 3. 记录发币汇总
INSERT INTO coin_distribution (distribution_date, total_users_distributed_to, total_coins_distributed, status)
VALUES (CURRENT_DATE, (SELECT COUNT(*) FROM users WHERE status = 'active'), 
        (SELECT COUNT(*) FROM users WHERE status = 'active') * 20, 'completed');

COMMIT;
```

---

### 场景 3：用户获得徽章（首次达到门槛）

**流程：**
1. 用户 Alice 通过投币和日常活动，余额达到 500 coins
2. 系统检测并颁发"共鸣者"徽章
3. 徽章与持仓绑定，如果余额降低到 500 以下，徽章自动失效

**SQL：**
```sql
-- 检查用户是否应该获得徽章
-- （可以通过定时任务或 Trigger 实现）

-- 当余额 >= 500 时，颁发或激活徽章
INSERT INTO user_badges (user_id, badge_type, required_balance, acquired_at, status)
VALUES ('alice_id', 'resonator', 500, NOW(), 'active')
ON CONFLICT (user_id, badge_type) 
DO UPDATE SET status = 'active';

-- 如果余额降低到 500 以下，徽章自动失效
-- （通过 trigger check_badge_validity 实现）
```

---

## 补充说明

### 为什么分离 users 和 user_balances？
- **灵活性**：未来可能支持多币种、多账户
- **安全性**：余额修改的所有操作都可以被审计
- **性能**：用户认证不需要每次都加载余额数据

### 为什么用 UUID 而不是自增 ID？
- **分布式友好**：支持多个数据库实例并行写
- **安全性**：不暴露真实的数据量（比如用户数）
- **隐私**：ID 不可预测

### 为什么 coin_transactions 不直接修改 user_balances？
- **审计**：所有修改都有记录，便于追踪和争议解决
- **原子性**：transaction 要么全成功，要么全失败，不会出现"扣币但没记录"的情况
- **数据分析**：可以分析币的流向、用户的活动等

### post_metrics 什么时候更新？
- **实时更新**：每次投票后立即更新（通过 Trigger）
- **定期重新计算**：每 5 分钟运行一次定时任务，重新计算 temperature

### 如何防止重复投票？
```sql
-- UNIQUE 约束确保一个用户对同一条内容只能投一次
UNIQUE(voter_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'), ...)

-- 应用层检查：投票前查询是否已经投过
SELECT * FROM votes 
WHERE voter_id = ? AND post_id = ? AND vote_type = 'agree';
```

---

## 扩展建议（v2 及以后）

1. **质疑币**：添加 disagree_vote_type，计算争议指数
2. **用户举报**：添加 reports 表，记录举报和处理
3. **内容审核**：添加 moderation_status 字段
4. **分析数据**：定期生成 analytics 表，存储聚合数据
5. **消息系统**：添加 messages 表，支持用户私信
6. **帖子草稿**：添加 post_drafts 表，支持未发布的草稿
7. **收藏/书签**：添加 bookmarks 表，用户可以收藏帖子
8. **权限管理**：细化 Circle 权限，支持更复杂的治理