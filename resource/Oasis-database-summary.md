# Oasis 数据库完整汇总与可视化

## 1. 数据库架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OASIS DATABASE                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│     🧑 用户域 (Users)      │
├──────────────────────────┤
│ users                    │  主账户表
│ user_profiles            │  扩展资料
│ user_balances            │  Agreecoin 余额
│ user_badges              │  徽章系统
│ follows                  │  关注关系
└──────────────────────────┘
         ↓
┌──────────────────────────┐
│   📝 内容域 (Content)      │
├──────────────────────────┤
│ posts                    │  帖子
│ comments                 │  评论
│ replies                  │  回复
│ tags                     │  标签（去中心化）
│ post_tags                │  帖子-标签关联
│ circles                  │  圈子（有主）
│ circle_members           │  圈子成员
│ follow_tags              │  用户标签关注
└──────────────────────────┘
         ↓
┌──────────────────────────┐
│   💰 经济域 (Economy)      │
├──────────────────────────┤
│ votes                    │  投票记录
│ coin_transactions        │  币流转（审计）
│ coin_distribution        │  每日发币记录
│ post_metrics             │  帖子指标（优化）
└──────────────────────────┘
         ↓
┌──────────────────────────┐
│  🔔 通知域 (Notifications) │
├──────────────────────────┤
│ notifications            │  用户通知
└──────────────────────────┘
```

---

## 2. 完整的 ER 图

```
                              USERS (核心)
                              ▲
                 ┌────────────┼────────────┐
                 │            │            │
         USER_PROFILES  USER_BALANCES  USER_BADGES
         (扩展资料)      (余额账户)      (徽章系统)
                 │            │            │
                 └────────────┼────────────┘
                              │
                              ├─── FOLLOWS (关注)
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
       POSTS               COMMENTS              REPLIES
       (帖子)              (评论)                (回复)
         │                    │                    │
         ├─── TAGS ◄──── POST_TAGS ─────────────┤
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
       VOTES (投票)     CIRCLES (圈子)   NOTIFICATIONS
       (最关键)         (社区)            (通知)
         │                    │
    COIN_TRANSACTIONS   CIRCLE_MEMBERS
    (币流转-审计)       (成员权限)
         │
    POST_METRICS
    (性能优化)
         │
    COIN_DISTRIBUTION
    (发币记录)
```

---

## 3. 表关系速查表

| 表名 | 主键 | 外键 | 作用 | 行数估计 |
|------|------|------|------|---------|
| **users** | id (UUID) | - | 用户账户 | ~10K |
| **user_profiles** | id | user_id → users | 用户资料 | ~10K |
| **user_balances** | id | user_id → users | 余额账户 | ~10K |
| **user_badges** | id | user_id → users | 徽章持仓 | ~50K |
| **follows** | id | follower_id, following_id → users | 关注关系 | ~100K |
| **posts** | id | author_id → users, circle_id → circles | 帖子 | ~100K |
| **comments** | id | post_id → posts, author_id → users | 评论 | ~500K |
| **replies** | id | comment_id → comments, author_id → users | 回复 | ~1M |
| **tags** | id | - | 标签 | ~1K |
| **post_tags** | id | post_id → posts, tag_id → tags | 帖子-标签 | ~500K |
| **circles** | id | creator_id → users | 圈子 | ~1K |
| **circle_members** | id | circle_id → circles, user_id → users | 圈子成员 | ~50K |
| **follow_tags** | id | user_id → users, tag_id → tags | 关注标签 | ~100K |
| **votes** | id | voter_id → users, post/comment/reply_id | 投票 | ~1M |
| **coin_transactions** | id | from_user_id, to_user_id → users | 币流转 | ~10M |
| **coin_distribution** | id | - | 发币记录 | ~365 |
| **post_metrics** | id | post_id → posts | 帖子指标 | ~100K |
| **notifications** | id | user_id, related_user_id, post/comment_id | 通知 | ~1M |

---

## 4. 字段完整映射表

### 用户表

```
┌─ users
├─ id (UUID) ........................ 用户唯一标识
├─ username (VARCHAR 50) ............ 用户名（唯一，用于登录）
├─ email (VARCHAR 100) ............. 邮箱（唯一）
├─ password_hash (VARCHAR 255) ...... 密码哈希（bcrypt）
├─ status (VARCHAR 20) ............. 账户状态：active|suspended|deleted
├─ founder_number (INT) ............ 创始成员编号（1-100，NULL=非创始成员）
├─ founder_number_assigned_at (TS) . 编号分配时间
├─ created_at (TS) ................. 账户创建时间
├─ updated_at (TS) ................. 最后修改时间
└─ last_login_at (TS) .............. 最后登录时间
```

### 用户资料表

```
┌─ user_profiles
├─ id (UUID) ........................ 资料记录 ID
├─ user_id (UUID, FK) .............. 关联用户
├─ display_name (VARCHAR 100) ...... 显示名称（可不同于 username）
├─ bio (TEXT) ....................... 个人简介
├─ avatar_url (VARCHAR 500) ........ 头像 URL
├─ twitter_handle (VARCHAR 100) ... Twitter 账号（用于社交引流）
├─ personal_website (VARCHAR 500) . 个人网站
├─ follower_count (INT) ............ 粉丝数（冗余，快速读取）
├─ following_count (INT) ........... 关注数
├─ post_count (INT) ................ 发帖数
├─ created_at (TS) ................. 创建时间
└─ updated_at (TS) ................. 更新时间
```

### 用户余额表

```
┌─ user_balances
├─ id (UUID) ........................ 余额账户 ID
├─ user_id (UUID, FK, UNIQUE) ...... 关联用户（1:1 关系）
├─ balance (BIGINT) ................ 当前可用余额（>= 0）
├─ total_earned (BIGINT) ........... 生涯总赚取
├─ total_spent (BIGINT) ............ 生涯总支出
├─ created_at (TS) ................. 账户创建时间
└─ updated_at (TS) ................. 最后修改时间
```

### 帖子表

```
┌─ posts
├─ id (UUID) ........................ 帖子 ID
├─ author_id (UUID, FK) ............ 作者 ID
├─ title (VARCHAR 500) ............. 帖子标题
├─ content (TEXT) .................. 帖子内容
├─ image_urls (TEXT[]) ............. 图片 URL 数组（支持多张）
├─ external_url (VARCHAR 500) ...... 外部链接
├─ circle_id (UUID, FK) ............ 所属圈子 ID（NULL = 公开帖）
├─ status (VARCHAR 20) ............. 状态：published|deleted|hidden
├─ view_count (INT) ................ 浏览数（冗余）
├─ comment_count (INT) ............. 评论数（冗余）
├─ vote_count (INT) ................ 投票数（冗余）
├─ impression_count (INT) .......... 在 Feed 上展示次数
├─ created_at (TS) ................. 发布时间
└─ updated_at (TS) ................. 更新时间
```

### 投票表

```
┌─ votes
├─ id (UUID) ........................ 投票记录 ID
├─ voter_id (UUID, FK) ............. 投票人 ID
├─ post_id (UUID, FK) .............. 如果投给帖子
├─ comment_id (UUID, FK) ........... 如果投给评论
├─ reply_id (UUID, FK) ............. 如果投给回复
├─ amount (BIGINT) ................. 投票金额（coins）
├─ vote_type (VARCHAR 50) .......... 投票类型：agree|disagree
└─ created_at (TS) ................. 投票时间
```

**约束：**
- 只能投票一个目标（post/comment/reply 中只有一个不是 NULL）
- 防止重复投票：UNIQUE(voter_id, post_id, comment_id, reply_id)
- voter_id ≠ post.author_id（防止自投）

### 币交易表（最关键的审计日志）

```
┌─ coin_transactions
├─ id (UUID) ........................ 交易 ID
├─ from_user_id (UUID, FK) ......... 来源用户（NULL = 系统发币）
├─ to_user_id (UUID, FK) ........... 接收用户
├─ amount (BIGINT) ................. 交易金额
├─ transaction_type (VARCHAR 100) .. 交易类型（见下表）
├─ related_post_id (UUID, FK) ...... 关联帖子 ID
├─ related_comment_id (UUID, FK) .. 关联评论 ID
├─ related_vote_id (UUID, FK) ...... 关联投票 ID
├─ related_circle_id (UUID, FK) ... 关联圈子 ID
├─ description (TEXT) .............. 交易描述（便于调试）
├─ status (VARCHAR 20) ............. 交易状态：completed|pending|failed|reversed
└─ created_at (TS) ................. 交易时间
```

### 圈子表

```
┌─ circles
├─ id (UUID) ........................ 圈子 ID
├─ name (VARCHAR 100) .............. 圈子名称
├─ slug (VARCHAR 100, UNIQUE) ...... URL 友好的标识符
├─ description (TEXT) .............. 圈子描述
├─ icon_url (VARCHAR 500) .......... 圈子图标
├─ creator_id (UUID, FK) ........... 创建者（圈主）
├─ visibility (VARCHAR 20) ......... 可见性：public|private|invite_only
├─ join_type (VARCHAR 50) .......... 加入方式：free|paid|invite
├─ join_cost_coins (INT) ........... 加入费用（coins）
├─ member_count (INT) .............. 成员数（冗余）
├─ post_count (INT) ................ 圈内帖数
├─ created_at (TS) ................. 创建时间
└─ updated_at (TS) ................. 更新时间
```

### 徽章表

```
┌─ user_badges
├─ id (UUID) ........................ 徽章记录 ID
├─ user_id (UUID, FK) .............. 用户 ID
├─ badge_type (VARCHAR 50) ......... 徽章类型（见下表）
├─ required_balance (BIGINT) ....... 持仓要求
├─ acquired_at (TS) ................ 首次获得时间
├─ status (VARCHAR 20) ............. 状态：active|inactive
├─ expires_at (TS) ................. 过期时间（可选）
├─ created_at (TS) ................. 创建时间
└─ updated_at (TS) ................. 更新时间

约束：UNIQUE(user_id, badge_type)
```

---

## 5. 交易类型完整列表

```
交易类型                    流向              备注
─────────────────────────────────────────────────────────────
daily_distribution         NULL → user       系统每日发币
post_reward                NULL → user       发帖奖励（+5 coins）
comment_reward             NULL → user       评论奖励（+2 coins）
login_streak_reward        NULL → user       连续登录奖励（+5 coins）
vote_spent                 user → NULL       用户投币支出
vote_received              voter → author    作者获得投币（80%）
transaction_fee_burned     user → NULL       平台销毁税（20%）
circle_creation_reward     NULL → user       创建圈子奖励
circle_join_fee            joiner → creator  加入圈子费用
badge_revoke               user → NULL       徽章失效扣款（如有）
```

---

## 6. 徽章系统完整定义

```
徽章类型        持仓要求    获得条件                   权益
─────────────────────────────────────────────────────────────
newcomer        100 coins   注册后自动获得              基础身份标识
resonator       500 coins   坚持 14 天活跃 + 持仓        • 优先推荐
                                                      • 参与圈子管理投票
vibe_master     2000 coins  活跃用户 + 高质量内容贡献    • 创建 Circle
                                                      • 见习版主
founder         5000 coins  前 100 个用户 + 持仓维持    • 创建人专属权益
                                                      • 品牌合作优先
circle_creator  -           创建过圈子即获得           • 圈子治理权

所有徽章都是「持仓型」：余额 < 要求时自动 inactive
```

---

## 7. 索引策略速查

### 必须有的索引

```sql
-- 用户认证与查询
idx_users_username                  O(1) 用户名查询
idx_users_email                     O(1) 邮箱查询

-- 帖子查询（热路径）
idx_posts_author_created            帖子按作者 + 时间排序
idx_posts_created                   最新帖子查询
idx_posts_circle_created            圈子内帖子查询
idx_posts_status                    已发布帖子过滤

-- 投票查询
idx_votes_post                      某帖子的投票
idx_votes_voter                     用户投过的票
idx_votes_created                   最新投票排序

-- 币流转审计
idx_coin_transactions_from          用户支出记录
idx_coin_transactions_to            用户收入记录
idx_coin_transactions_type_created  按类型 + 时间查询
```

### 性能优化索引

```sql
-- 全文搜索
idx_posts_title_gin                 帖子标题搜索（GIN）
idx_posts_content_gin               帖子内容搜索（GIN）

-- 统计与分析
idx_post_metrics_temperature        温度排序（热度流）
idx_user_balances_balance           余额排序（富豪榜）
idx_notifications_user_read         未读通知过滤
```

---

## 8. 关键的存储过程速查

```
函数名                              参数                    返回值
──────────────────────────────────────────────────────────────
vote_on_content()                  voter_id, post_id        success, message, new_balance
                                   amount, vote_type

distribute_daily_coins()            amount_per_user          success, message, users_affected, total_coins

award_badge()                       user_id, badge_type      success, message

check_badge_validity()              TRIGGER: 自动调用        -（自动 inactive）

update_post_vote_count()            TRIGGER: 自动调用        -（自动更新计数）

increment_post_impression()         post_id                  -（增加展示计数）
```

---

## 9. 视图速查

```
视图名称                    用途                        使用场景
──────────────────────────────────────────────────────────────
post_temperature_view       计算帖子温度                Feed 热度排序
user_status_view            用户完整信息                用户资料页
hot_posts_view              最热门帖子                  热点推荐
circle_overview_view        圈子统计信息                圈子列表
```

---

## 10. 核心业务流程的 SQL 代码片段

### 完整投币流程（最关键）

```sql
-- 第 1 步：验证并扣币
BEGIN TRANSACTION;
  SELECT balance INTO voter_balance 
  FROM user_balances 
  WHERE user_id = 'voter_id' 
  FOR UPDATE;  -- 关键：加锁防止并发
  
  IF voter_balance < 10 THEN RAISE EXCEPTION '余额不足'; END IF;
  
-- 第 2 步：获取作者并检查
  SELECT author_id INTO author_id FROM posts WHERE id = 'post_id';
  IF author_id = 'voter_id' THEN RAISE EXCEPTION '自投不允许'; END IF;

-- 第 3 步：执行转账（80% 给作者，20% 销毁）
  UPDATE user_balances SET balance = balance - 10 WHERE user_id = 'voter_id';
  UPDATE user_balances SET balance = balance + 8 WHERE user_id = author_id;

-- 第 4 步：记录投票与交易（不可篡改）
  INSERT INTO votes (...) VALUES (...);
  INSERT INTO coin_transactions (...) VALUES (...);  -- 作者收益
  INSERT INTO coin_transactions (...) VALUES (...);  -- 销毁税

COMMIT;  -- 全部成功或全部失败
```

---

## 11. 数据库大小与性能估算

### 存储空间估算（1 年后）

```
表名                    行数        单行大小    总大小
────────────────────────────────────────────────────
users                   ~100K       200B        20MB
posts                   ~1M         1KB         1GB
comments                ~10M        500B        5GB
votes                   ~100M       200B        20GB
coin_transactions       ~365M       300B        110GB
replies                 ~50M        300B        15GB
notifications           ~10M        400B        4GB

总计约：155GB（仅数据部分）
+ 索引：约 50GB
+ 日志与预留：约 100GB
────────────────────────────────────────────
实际磁盘用量：~300GB（1 年，1M DAU 规模）
```

### 查询性能目标

```
操作类型              目标 RT    说明
──────────────────────────────────────
Feed 查询            < 100ms    LIMIT 20，有索引
热度排序            < 50ms     使用 post_metrics
投币                < 200ms    事务操作
用户资料            < 30ms     简单 SELECT
搜索                < 500ms    全文搜索，可接受
```

---

## 12. 部署检查清单

在生产环境前执行：

```sql
-- ✅ 检查所有表都创建了
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';  -- 应该返回 17+

-- ✅ 检查所有索引都建立了
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';

-- ✅ 验证外键约束
SELECT * FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY';

-- ✅ 检查触发器
SELECT * FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- ✅ 验证数据完整性
SELECT COUNT(*) FROM user_balances;  -- 应该 = COUNT(*) FROM users

-- ✅ 启用行级安全（可选，生产推荐）
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

-- ✅ 备份策略
-- 设置自动备份（Supabase 有内置备份）
-- 本地备份命令：pg_dump -U user -d oasis > oasis_backup.sql
```

---

## 13. 快速参考：常见查询

```sql
-- 查用户余额
SELECT balance FROM user_balances WHERE user_id = ?;

-- 检查是否已投票
SELECT COUNT(*) FROM votes 
WHERE voter_id = ? AND post_id = ? AND vote_type = 'agree';

-- 获取帖子温度
SELECT temperature FROM post_metrics WHERE post_id = ?;

-- 统计用户赚取
SELECT SUM(amount) FROM coin_transactions 
WHERE to_user_id = ? AND created_at > NOW() - INTERVAL '7 days';

-- 获取用户徽章
SELECT badge_type FROM user_badges 
WHERE user_id = ? AND status = 'active';

-- 热门帖子
SELECT * FROM hot_posts_view LIMIT 20;
```

---

## 总结

✅ **完整的 17 张表**，覆盖所有业务需求
✅ **原子事务设计**，防止币流转的任何不一致
✅ **审计日志**，所有币操作都可追溯
✅ **性能优化**，必要的冗余字段与索引
✅ **可扩展设计**，预留未来的"质疑币"、商城等功能
✅ **生产就绪**，触发器、存储过程、视图都已完整实现

**下一步：**
1. 在 Supabase 中执行 SQL schema
2. 配置自动备份策略
3. 使用提供的存储过程和查询实现后端 API
4. 按需要调整参数（发币额度、徽章门槛等）