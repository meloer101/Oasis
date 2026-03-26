# Oasis 数据库设计决策与权衡分析

这份文档解释了 Schema 设计中的**关键决策**和**背后的思考**。

---

## 目录

1. [数据库系统选择](#数据库系统选择)
2. [表结构设计决策](#表结构设计决策)
3. [冗余字段的权衡](#冗余字段的权衡)
4. [原子性与事务处理](#原子性与事务处理)
5. [索引与性能权衡](#索引与性能权衡)
6. [可扩展性考虑](#可扩展性考虑)
7. [常见误区与解答](#常见误区与解答)

---

## 数据库系统选择

### 为什么选择 PostgreSQL？

**对比选项：**

| 维度 | PostgreSQL | MySQL | MongoDB | Firebase |
|------|-----------|-------|---------|----------|
| **关系复杂性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| **事务支持** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| **JSON 支持** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **全文搜索** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ |
| **扩展性** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **成本** | 低 | 低 | 低 | 高 |
| **可控性** | 高 | 高 | 高 | 低 |

**Oasis 为什么需要 PostgreSQL：**

1. **强关系特性**
   - 用户→帖子→评论→投票：多层级关系
   - 圈子成员权限管理：复杂的权限矩阵
   - 币流转追踪：需要完整的 ACID 事务

2. **必须的 ACID 事务**
   ```
   投币操作必须是：
   - Atomic（原子性）：全成功或全失败
   - Consistent（一致性）：余额必须正确
   - Isolated（隔离性）：无并发冲突
   - Durable（持久性）：写入即可恢复
   
   MongoDB 的事务支持不够强（虽然有，但不如 PostgreSQL）
   Firebase 完全没有事务概念
   ```

3. **窗口函数与聚合查询**
   ```sql
   -- PostgreSQL 的强大之处：一条 SQL 实现复杂的排名
   SELECT 
     p.id, p.title,
     ROW_NUMBER() OVER (ORDER BY temperature DESC) as rank,
     RANK() OVER (PARTITION BY circle_id ORDER BY temperature DESC) as circle_rank
   FROM posts p;
   
   -- MongoDB 需要多步聚合，性能差
   ```

4. **存储过程与触发器**
   ```sql
   -- 自动化业务逻辑，减少应用层复杂度
   CREATE TRIGGER auto_update_counts AFTER INSERT ON votes ...
   ```

**结论：** PostgreSQL 是 Oasis 的最佳选择。Supabase 托管 PostgreSQL 也降低了运维成本。

---

## 表结构设计决策

### 1. 为什么要分离 users 和 user_profiles？

**方案对比：**

```sql
-- ❌ 方案 A：单表（反面教材）
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(50),
  email VARCHAR(100),
  password_hash VARCHAR(255),
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url VARCHAR(500),
  follower_count INT,
  following_count INT,
  post_count INT,
  ... 还有很多字段
);
-- 问题：
-- 1. 每次查用户时都要加载所有资料，性能低
-- 2. 无法灵活扩展（比如添加"背景图"）
// 3. 牵一发动全身，修改困难
```

```sql
-- ✅ 方案 B：分离（推荐）
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(50),
  email VARCHAR(100),
  password_hash VARCHAR(255),
  status VARCHAR(20)
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id),
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url VARCHAR(500),
  ...
);
-- 优点：
// 1. 认证时只查 users，快速
// 2. 资料更新不影响认证表
// 3. 可以延迟加载资料（优化首屏加载）
```

**权衡分析：**

| 维度 | 单表 | 分离 |
|------|------|------|
| **查询简单度** | 高 | 中 |
| **性能** | 低 | 高 |
| **扩展性** | 低 | 高 |
| **数据一致性** | 高 | 高 |
| **JOIN 成本** | 无 | 1 次 JOIN |

**结论：** 虽然多一个 JOIN，但性能收益更大。这是**规模化设计**的关键。

---

### 2. 为什么投票要支持多个目标（post/comment/reply）？

**方案对比：**

```sql
-- ❌ 方案 A：三个不同的表
CREATE TABLE post_votes (...);
CREATE TABLE comment_votes (...);
CREATE TABLE reply_votes (...);
-- 问题：代码重复，维护复杂

-- ✅ 方案 B：单表 + CONSTRAINT 约束
CREATE TABLE votes (
  id UUID PRIMARY KEY,
  voter_id UUID,
  post_id UUID,
  comment_id UUID,
  reply_id UUID,
  amount BIGINT,
  CONSTRAINT vote_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NULL AND reply_id IS NOT NULL)
  )
);
```

**为什么这样设计：**

1. **查询统一**：所有投票都在一个表里
   ```sql
   SELECT * FROM votes WHERE voter_id = ? ORDER BY created_at DESC;
   ```

2. **业务逻辑统一**：防重复、原子操作都用同一个存储过程
   ```sql
   SELECT * FROM vote_on_content(voter_id, post_id, comment_id, reply_id, amount);
   ```

3. **性能**：虽然有 NULL 列，但节省了 3 个表 + 联合索引的开销

**权衡：** 稍微多一些 NULL 列，换来代码简洁性和性能。

---

### 3. 为什么需要 coin_transactions 表？

**方案对比：**

```sql
-- ❌ 方案 A：只用 user_balances
CREATE TABLE user_balances (
  user_id UUID,
  balance BIGINT
);
-- 假设 Alice 投 10 coins 给 Bob
UPDATE user_balances SET balance = balance - 10 WHERE user_id = Alice;
UPDATE user_balances SET balance = balance + 8 WHERE user_id = Bob;
-- 问题：
// 1. 无法追溯历史，不知道钱从哪来的
// 2. 无法审计，钱凭空消失的话无法检测
// 3. 无法分析用户行为（赚取来源、支出去向）
```

```sql
-- ✅ 方案 B：分离 + 审计日志
CREATE TABLE user_balances (
  user_id UUID,
  balance BIGINT  -- 缓存，快速读取
);

CREATE TABLE coin_transactions (
  id UUID,
  from_user_id UUID,
  to_user_id UUID,
  amount BIGINT,
  transaction_type VARCHAR,  -- 'daily_distribution', 'vote_received' 等
  related_post_id UUID,      -- 关联的业务对象
  created_at TIMESTAMP
);
```

**为什么是必须的：**

1. **审计合规**：所有币流转都有不可篡改的记录
   ```sql
   -- 查 Bob 为什么有 8 coins
   SELECT * FROM coin_transactions WHERE to_user_id = Bob ORDER BY created_at DESC;
   -- 结果：投票获得、发帖奖励、日常发币等
   ```

2. **风险检测**：可以识别异常行为
   ```sql
   -- 检测刷币行为
   SELECT voter_id, COUNT(*) FROM votes 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY voter_id HAVING COUNT(*) > 100;
   ```

3. **数据分析**：理解用户行为
   ```sql
   -- 分析收入来源
   SELECT transaction_type, SUM(amount) as total
   FROM coin_transactions
   GROUP BY transaction_type;
   ```

4. **故障恢复**：如果 user_balances 数据损坏，可以从交易记录重建
   ```sql
   -- 重建用户余额
   SELECT to_user_id, 
          SUM(amount) as total_earned
   FROM coin_transactions
   GROUP BY to_user_id;
   ```

**结论：** coin_transactions 不是可选的，而是**业务的核心**。它的重要性不亚于 user_balances。

---

## 冗余字段的权衡

### 哪些字段是冗余的？为什么冗余？

**冗余字段清单：**

```
冗余字段                    存储位置1         存储位置2              为什么冗余
─────────────────────────────────────────────────────────────────
post.view_count            posts             post_metrics           快速读取，不用 COUNT(*)
post.comment_count         posts             post_metrics           快速读取
post.vote_count            posts             post_metrics           快速读取
post.impression_count      posts             post_metrics           Feed 推荐计数

user_profile.follower_count user_profiles    (COUNT from follows)    快速显示粉丝数
user_profile.following_count user_profiles   (COUNT from follows)    快速显示关注数

circle.member_count        circles           circle_members         快速显示成员数

post_metrics.*             post_metrics      (SUM/COUNT from votes) 温度计算缓存
```

### 冗余字段的更新策略

**方案对比：**

| 方案 | 更新时机 | 成本 | 准确度 | 适用场景 |
|------|---------|------|--------|---------|
| **即时更新** | 每次操作后立即 | 高（每次 +1 SQL） | 100% | 关键字段（余额） |
| **触发器更新** | 依赖 SQL 触发器 | 中 | 100% | 计数字段（评论数） |
| **异步更新** | 后台定时任务 | 低 | 95% | 分析数据（温度） |
| **缓存更新** | 应用层缓存 | 低 | 90% | 非关键数据（粉丝数） |

**Oasis 的策略：**

```sql
-- 关键字段（余额）：即时更新 + 事务保证
UPDATE user_balances SET balance = balance - 10 WHERE user_id = ? FOR UPDATE;

-- 计数字段（评论数）：触发器自动更新
CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

-- 温度值：异步定期计算（可以 5 分钟更新一次）
UPDATE post_metrics SET temperature = (...公式...) WHERE updated_at < NOW() - INTERVAL '5 minutes';

-- 粉丝数：可以从 follows 表直接计算，但冗余存储以加快 Feed 显示
-- 每小时同步一次即可
```

**权衡总结：**

| 优点 | 缺点 | 应对方案 |
|------|------|--------|
| 性能快 | 数据可能不一致 | 关键数据 100% 保证，非关键可接受 99% |
| 减少 COUNT(*) | 存储增加 | 现代硬件廉价，数据库花 2GB 换 Query 快 10 倍值得 |
| 简化查询 | 维护成本 | 用触发器自动化，写清楚代码注释 |

---

## 原子性与事务处理

### 为什么投币操作这么复杂？

**场景：** Alice 投 10 coins 给 Bob

**❌ 错误的实现（会导致数据不一致）：**

```javascript
// 应用层顺序操作（危险！）
await updateBalance(alice, -10);  // 成功
await updateBalance(bob, +8);     // 失败（网络错误）
// 结果：Alice 亏了 10 coins，Bob 什么都没得到！
```

**✅ 正确的实现（数据库层事务）：**

```sql
BEGIN TRANSACTION;
  UPDATE user_balances SET balance = balance - 10 WHERE user_id = Alice FOR UPDATE;
  UPDATE user_balances SET balance = balance + 8 WHERE user_id = Bob;
  INSERT INTO votes (voter_id, post_id, amount) VALUES (...);
  INSERT INTO coin_transactions (...);
  INSERT INTO coin_transactions (...);  -- 销毁税
COMMIT;  -- 全部成功或全部失败（ROLLBACK）
```

**关键点：**

1. **FOR UPDATE**：锁定 Alice 的行，防止其他事务并发修改
2. **BEGIN...COMMIT**：整个操作原子性
3. **ROLLBACK**：任何一步失败，全部回滚

**为什么需要 3 条 INSERT？**

```
投币 10 coins：
  Alice 花出 10 coins
  Bob 获得 8 coins（80%）
  系统销毁 2 coins（20%）
  
三个不同的交易类型，分别记录：
1. vote_received     - 描述 Bob 获得了 8 coins
2. transaction_fee_burned - 描述系统销毁了 2 coins
3. votes 表 - 描述投票本身
```

**并发问题示例：**

```
时间 | Alice      | Bob       | 说明
-----|-----------|-----------|-------------
T1  | balance 100| balance 50| 初始状态
T2  | T1 开始投票 |          | Alice 锁定，查询 balance
T3  |           | 投 5 coins | Bob 更新自己的 balance（不冲突）
T4  | 更新 -10   | 成功      | Alice 扣币成功
T5  | 更新 +8    |           | Bob 收币成功
T6  | COMMIT     |           | 全部提交

结果：完全一致，无数据丢失或重复
```

---

## 索引与性能权衡

### 为什么这么多索引？会不会太慢？

**索引成本分析：**

```
写入操作（INSERT/UPDATE/DELETE）
├─ 更新表数据本身：1ms
├─ 更新主键索引：+1ms
├─ 更新其他索引：+0.5ms（每个）
└─ 总成本：3-5ms

读取操作（SELECT）
├─ 无索引全表扫描：100ms（100万行）
├─ 使用索引：1-5ms（O(log N)）
└─ 总收益：100 倍性能提升
```

**权衡分析：**

如果一条查询影响 1000 次读操作，但只有 1 次写操作：
```
不加索引：1000 × 100ms = 100 秒
加索引：  1000 × 1ms + 1 × 5ms = 1 秒
收益：   99 秒 快 100 倍！
```

**Oasis 的索引策略：**

```
优先级 1：热路径必须有索引
  idx_votes_post              投币检查重复（必须快）
  idx_posts_created           获取最新帖子
  idx_user_balances_user      查询余额

优先级 2：常用查询有索引
  idx_posts_author_created    用户主页
  idx_comments_post_created   评论列表

优先级 3：可选索引
  idx_posts_title_gin         搜索（影响不大）
  idx_notifications_*         通知（不是核心）
```

**避免过度索引：**

```sql
-- ❌ 坏例子：太多列组合索引
CREATE INDEX idx_posts_author_status_created ON posts(author_id, status, created_at);
CREATE INDEX idx_posts_status_author_created ON posts(status, author_id, created_at);
CREATE INDEX idx_posts_created_author_status ON posts(created_at, author_id, status);
-- 这样就过度了，维护困难，占用空间

-- ✅ 好做法：根据查询模式索引
-- 如果主要查询是：WHERE author_id = ? AND status = 'published' ORDER BY created_at
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC) 
WHERE status = 'published';
```

---

## 可扩展性考虑

### 未来可能的扩展与预留

**预留的设计空间：**

```sql
-- 1. 质疑币（v2 功能）
ALTER TABLE votes ADD COLUMN vote_type VARCHAR(20);
-- 从 'agree' 扩展到 'agree' | 'disagree' | 'neutral'

-- 2. 多币种支持
CREATE TABLE currencies (
  id UUID PRIMARY KEY,
  code VARCHAR(10),  -- 'agreecoin', 'vibe_token'
  exchange_rate DECIMAL
);

CREATE TABLE user_multi_balances (
  user_id UUID,
  currency_id UUID,
  balance BIGINT
);

-- 3. 用户等级系统
CREATE TABLE user_levels (
  user_id UUID,
  level INT,  -- 1-10
  experience INT,
  next_level_exp INT
);

-- 4. 内容版本历史（审视变更）
CREATE TABLE post_revisions (
  id UUID,
  post_id UUID,
  content TEXT,
  revised_by UUID,
  revised_at TIMESTAMP
);

-- 5. 高级权限管理
CREATE TABLE permissions (
  role VARCHAR(50),
  action VARCHAR(50),
  resource VARCHAR(50)
);

-- 6. 商城/兑换系统
CREATE TABLE shop_items (
  id UUID,
  name VARCHAR(100),
  price_coins BIGINT,
  inventory INT
);

CREATE TABLE purchases (
  id UUID,
  user_id UUID,
  item_id UUID,
  purchased_at TIMESTAMP
);
```

**现有设计对这些扩展的支持度：**

```
功能                支持程度  原因
────────────────────────────────────────
质疑币              ⭐⭐⭐⭐⭐ vote_type ENUM 已预留
多币种              ⭐⭐⭐    coin_transactions 架构可扩展
用户等级            ⭐⭐⭐⭐⭐ 可独立新表，不影响现有
内容版本            ⭐⭐⭐    需新表，post 设计允许
权限管理            ⭐⭐⭐⭐   circle_members.role 已预留
商城系统            ⭐⭐⭐    coin_transactions 可承载
```

---

## 常见误区与解答

### Q: 为什么不用 Redis 缓存？

**误区：** Redis 能加快所有查询

**现实：**

```
缓存的需求：
1. 频繁读取，不经常变化的数据 ✓（适合缓存）
   - 帖子内容、用户资料
   
2. 必须强一致的数据 ✗（不适合缓存）
   - 用户余额（必须每次都正确）
   - 投票记录（防重复）
   - 交易记录（审计）

Oasis 设计：
- 帖子内容：可缓存（1 小时失效）
- 用户余额：直接查数据库（无缓存，保证准确）
- 投票记录：直接查数据库（防重复）
```

**结论：** 不是"缓存多快"，而是"什么时候该缓存"。

---

### Q: 为什么不用 NoSQL（MongoDB/DynamoDB）？

**对比：**

```
Oasis 的数据特点：

数据特点                        需要 SQL | 需要 NoSQL
────────────────────────────────────────────────────
关系复杂（多表 JOIN）           ✓
事务性强（ACID）               ✓
聚合查询（GROUP BY）           ✓        ✓
灵活的查询（WHERE）            ✓
海量数据（>100GB）             ✓        ✓
并发写多（>1000 ops/s）        ✓        ✓
实时性强                       ✓        ✓

Oasis 的关键需求是「关系复杂 + 事务强」，
这是 SQL 的优势，NoSQL 的劣势。
```

---

### Q: view_count 的更新会不会很慢？

**误区：** 每次页面加载都要更新 view_count

**正确做法：**

```javascript
// 方案 A：错误（每次都更新数据库）
app.get('/posts/:id', async (req, res) => {
  // 用户请求帖子
  const post = await db.query('SELECT * FROM posts WHERE id = ?');
  // 增加浏览
  await db.query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?');
  res.json(post);
});
// 问题：1000 个用户 = 1000 次 UPDATE，数据库压力大

// 方案 B：正确（缓存后批量更新）
app.get('/posts/:id', async (req, res) => {
  const post = await db.query('SELECT * FROM posts WHERE id = ?');
  
  // 只在应用层缓存中记录
  redis.incr(`post:${id}:views`);  // 非常快（内存）
  
  res.json(post);
});

// 后台定时任务（每 5 分钟）：
setInterval(async () => {
  const views = await redis.getAll('post:*:views');
  for (const [key, count] of Object.entries(views)) {
    const postId = key.split(':')[1];
    // 批量更新（一条 SQL 更新多个）
    await db.query(
      'UPDATE posts SET view_count = view_count + ? WHERE id = ?',
      [count, postId]
    );
  }
  await redis.del('post:*:views');
}, 5 * 60 * 1000);
```

**结论：** view_count 不是实时的，但对用户无影响。宁可不准确，也要保证性能。

---

### Q: 为什么用 UUID 而不是自增 ID？

**对比：**

```
维度           自增 ID       UUID
──────────────────────────────────
可预测性       高（危险）    低（安全）
分布式友好     低           高
碰撞概率       0%           10^-36（忽略不计）
存储空间       4 字节       16 字节
可读性         高           低

例：用户 ID = 5
黑客可以推测：
  - 大概有 4 个其他用户
  - 逐个尝试 /api/users/1, /api/users/2, ... 爬取所有用户
  
用 UUID 可以避免这个问题
```

**结论：** UUID 多占 4 倍空间，但安全性提升不可估价。

---

### Q: 温度计算为什么这么复杂？

**Oasis 的温度公式：**

```
温度 = (投票者数 / 展示数) × 浏览量 × 1000
```

**为什么每一项都有：**

```
(投票者数 / 展示数)：
  - 同一条帖子，A 被看 100 次，3 人投票 = 3%
              B 被看 10 次，2 人投票 = 20%
  - B 的"共鸣度"更高，应该排更前
  - 这就是"质量"而不是"热度"
  
× 浏览量：
  - 一个帖子被看越多，说明越被重视
  - 纯粹的"热度"信号
  
× 1000：
  - 让数字更容易阅读（不然都是 0.003 这样的小数）
```

**为什么不能只看投票数：**

```
❌ 只看投票数：
   新帖：1 投票 vs 老帖：100 投票
   老帖永远赢，新东西没机会
   
✓ 看共鸣度 + 浏览量：
   新帖：10人看，5人投 = 50% vs 
   老帖：1000人看，100人投 = 10%
   新帖排前面（因为真正引发共鸣）
```

---

## 最终设计原则总结

```
1. ACID 优先于性能
   - 投币操作：保证每一个 coins 都有记录
   - 宁可慢 10 倍，也不能丢 1 个 coin

2. 审计优先于隐私
   - 所有币流转都要有记录
   - 未来有争议，可以回查完整历史

3. 冗余优先于查询简洁
   - 多存 view_count，多存温度值
   - 换来千倍的查询速度提升值得

4. 触发器优先于应用逻辑
   - 自动更新计数（不依赖应用层记得更新）
   - 数据库保证数据一致性

5. 约束优先于文档
   - 用 CONSTRAINT 和 TRIGGER 强制执行规则
   - 不要靠"开发者记得"来维护数据完整性

6. 扩展优先于 100% 优化
   - 预留 vote_type, transaction_type 等字段
   - 3 个月后的需求，6 个月前就想到
```

---

## 部署前最后检查

```sql
-- ✅ 所有表都有 created_at 和 updated_at
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name IN ('created_at', 'updated_at')
ORDER BY table_name;

-- ✅ 所有 balance/amount 字段都有 CHECK 约束
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'CHECK' AND table_schema = 'public';

-- ✅ 所有外键都有 ON DELETE 策略
SELECT constraint_name, table_name, table_schema
FROM information_schema.referential_constraints
WHERE constraint_schema = 'public';

-- ✅ 所有关键列都有索引
EXPLAIN (ANALYZE) 
SELECT * FROM posts WHERE author_id = 'xxx' ORDER BY created_at DESC;
-- 应该显示 Index Scan，而非 Seq Scan
```

---

## 一句话总结

> Oasis 的 Schema 设计不追求"单个查询最快"，而是追求"整个系统最稳定"。
> 多花一点存储空间，多加一些约束，换来完整的审计日志、强一致的数据、
> 和未来 10 年的可扩展性。这就是生产级数据库的样子。