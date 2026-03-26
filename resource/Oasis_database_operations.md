# Oasis 数据库关键操作 & 查询实例

本文档包含所有关键业务操作的 SQL 示例和事务模式。

---

## 目录

1. [用户相关操作](#用户相关操作)
2. [投币与经济操作](#投币与经济操作)
3. [Feed 查询](#feed-查询)
4. [圈子与社区](#圈子与社区)
5. [内容发布与管理](#内容发布与管理)
6. [数据分析查询](#数据分析查询)
7. [后端集成示例](#后端集成示例)

---

## 用户相关操作

### 1. 用户注册

```sql
-- 原子操作：注册用户、创建资料、初始化余额

BEGIN TRANSACTION;

-- 1. 创建用户账户
INSERT INTO users (username, email, password_hash, status)
VALUES ('newuser', 'newuser@example.com', '$2b$10$hashed_password', 'active')
RETURNING id AS user_id;

-- 2. 创建用户资料
INSERT INTO user_profiles (user_id, display_name)
VALUES ('user_uuid_here', 'New User');

-- 3. 初始化余额（初始 100 coins）
INSERT INTO user_balances (user_id, balance, total_earned)
VALUES ('user_uuid_here', 100, 100);

-- 4. 记录初始化币来源
INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, description)
VALUES (NULL, 'user_uuid_here', 100, 'initial_balance', '新用户初始余额');

COMMIT;
```

### 2. 获取用户个人主页信息

```sql
-- 一条 SQL 查询用户的完整信息
SELECT 
  u.id,
  u.username,
  u.founder_number,
  up.display_name,
  up.bio,
  up.avatar_url,
  ub.balance,
  ub.total_earned,
  ub.total_spent,
  up.follower_count,
  up.following_count,
  up.post_count,
  ARRAY_AGG(
    CASE WHEN ubadge.status = 'active' THEN ubadge.badge_type END
  ) FILTER (WHERE ubadge.status = 'active') as active_badges
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_balances ub ON u.id = ub.user_id
LEFT JOIN user_badges ubadge ON u.id = ubadge.user_id
WHERE u.username = 'targetuser'
GROUP BY u.id, u.username, u.founder_number, up.display_name, up.bio, up.avatar_url, 
         ub.balance, ub.total_earned, ub.total_spent, up.follower_count, up.following_count, up.post_count;
```

### 3. 查询用户的活动历史

```sql
-- 用户赚取 coins 的历史
SELECT 
  ct.id,
  ct.amount,
  ct.transaction_type,
  ct.description,
  ct.created_at,
  CASE 
    WHEN ct.related_post_id IS NOT NULL THEN (SELECT title FROM posts WHERE id = ct.related_post_id LIMIT 1)
    ELSE NULL
  END as related_content
FROM coin_transactions ct
WHERE ct.to_user_id = 'user_id_here'
  AND ct.created_at > NOW() - INTERVAL '30 days'
ORDER BY ct.created_at DESC
LIMIT 50;

-- 用户支出 coins 的历史
SELECT 
  ct.id,
  ct.amount,
  ct.transaction_type,
  ct.created_at
FROM coin_transactions ct
WHERE ct.from_user_id = 'user_id_here'
  AND ct.created_at > NOW() - INTERVAL '30 days'
ORDER BY ct.created_at DESC;
```

### 4. 检查用户是否有某个徽章

```sql
SELECT badge_type, status, acquired_at
FROM user_badges
WHERE user_id = 'user_id' AND badge_type = 'resonator' AND status = 'active'
LIMIT 1;

-- 返回结果：
-- 如果有记录，说明用户拥有该徽章
-- 如果没有记录，说明用户不拥有或徽章已失效
```

---

## 投币与经济操作

### 1. 投币的完整事务（最关键操作）

```sql
-- 使用存储过程（推荐）
SELECT * FROM vote_on_content(
  p_voter_id := 'voter_uuid',
  p_post_id := 'post_uuid',
  p_amount := 10,
  p_vote_type := 'agree'
);

-- 返回值：
-- (success boolean, message text, new_balance bigint)
-- 例子：(true, '投币成功', 90)
```

**或者手动写事务（如果需要自定义逻辑）：**

```sql
BEGIN TRANSACTION;

-- Step 1: 加锁并检查余额
SELECT balance INTO voter_balance FROM user_balances 
WHERE user_id = 'voter_id' FOR UPDATE;

IF voter_balance < 10 THEN
  ROLLBACK;
  RAISE EXCEPTION '余额不足';
END IF;

-- Step 2: 获取作者 ID
SELECT author_id INTO author_id FROM posts WHERE id = 'post_id';

IF author_id = 'voter_id' THEN
  ROLLBACK;
  RAISE EXCEPTION '不能给自己的内容投币';
END IF;

-- Step 3: 扣除投票者的币
UPDATE user_balances 
SET balance = balance - 10,
    total_spent = total_spent + 10,
    updated_at = NOW()
WHERE user_id = 'voter_id';

-- Step 4: 给作者加币（80%）
UPDATE user_balances 
SET balance = balance + 8,
    total_earned = total_earned + 8,
    updated_at = NOW()
WHERE user_id = author_id;

-- Step 5: 记录投票
INSERT INTO votes (voter_id, post_id, amount, vote_type)
VALUES ('voter_id', 'post_id', 10, 'agree')
RETURNING id INTO vote_id;

-- Step 6: 记录币流转（投票者 → 作者）
INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, related_vote_id, description)
VALUES ('voter_id', author_id, 8, 'vote_received', vote_id, '投币');

-- Step 7: 记录销毁税
INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, related_vote_id, description)
VALUES ('voter_id', NULL, 2, 'transaction_fee_burned', vote_id, '平台销毁税');

COMMIT;
```

### 2. 检查用户是否已经对某条内容投过票

```sql
SELECT * FROM votes
WHERE voter_id = 'user_id' 
  AND post_id = 'post_id'
LIMIT 1;

-- 如果返回 1 行，说明已投过票，不能重复投票
-- 如果返回 0 行，说明还没投过
```

### 3. 获取某条帖子的投票统计

```sql
SELECT 
  COUNT(*) as total_vote_count,
  COUNT(DISTINCT voter_id) as unique_voter_count,
  SUM(amount) as total_vote_amount,
  AVG(amount) as avg_vote_amount,
  MAX(amount) as max_single_vote,
  COUNT(CASE WHEN vote_type = 'agree' THEN 1 END) as agree_count,
  COUNT(CASE WHEN vote_type = 'disagree' THEN 1 END) as disagree_count
FROM votes
WHERE post_id = 'post_id';
```

### 4. 每日发币（定时任务）

```sql
-- 使用存储过程（推荐）
SELECT * FROM distribute_daily_coins(20);

-- 返回：(success, message, users_affected, total_coins)
-- 例：(true, '每日发币完成', 1000, 20000)
```

**或手动执行：**

```sql
BEGIN TRANSACTION;

-- 1. 更新所有活跃用户的余额
UPDATE user_balances 
SET balance = balance + 20,
    total_earned = total_earned + 20,
    updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users WHERE status = 'active'
);

-- 2. 为每个用户记录交易
INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, description)
SELECT NULL, id, 20, 'daily_distribution', '系统每日发币'
FROM users
WHERE status = 'active';

-- 3. 记录本次发币汇总
INSERT INTO coin_distribution (
  distribution_date, 
  total_users_distributed_to, 
  total_coins_distributed, 
  status
) VALUES (
  CURRENT_DATE,
  (SELECT COUNT(*) FROM users WHERE status = 'active'),
  (SELECT COUNT(*) * 20 FROM users WHERE status = 'active'),
  'completed'
);

COMMIT;
```

### 5. 奖励用户（发帖奖励、评论奖励等）

```sql
-- 发帖奖励（作者获得 5 coins）
INSERT INTO coin_transactions (
  from_user_id, to_user_id, amount, transaction_type, related_post_id, description
) VALUES (
  NULL, 'author_id', 5, 'post_reward', 'post_id', '发帖奖励'
);

-- 同时更新用户余额
UPDATE user_balances 
SET balance = balance + 5,
    total_earned = total_earned + 5,
    updated_at = NOW()
WHERE user_id = 'author_id';

-- 评论奖励（评论者获得 2 coins）
INSERT INTO coin_transactions (
  from_user_id, to_user_id, amount, transaction_type, related_comment_id, description
) VALUES (
  NULL, 'commenter_id', 2, 'comment_reward', 'comment_id', '评论奖励'
);

UPDATE user_balances 
SET balance = balance + 2,
    total_earned = total_earned + 2,
    updated_at = NOW()
WHERE user_id = 'commenter_id';
```

---

## Feed 查询

### 1. 热度流（按温度排序）

```sql
-- 最简单的版本：直接用 post_metrics
SELECT 
  p.id,
  p.author_id,
  p.title,
  p.content,
  p.created_at,
  p.view_count,
  pm.temperature,
  pm.agree_vote_count,
  pm.agree_vote_amount,
  u.username,
  up.avatar_url,
  up.display_name
FROM posts p
JOIN post_metrics pm ON p.id = pm.post_id
JOIN users u ON p.author_id = u.id
JOIN user_profiles up ON u.id = up.user_id
WHERE p.status = 'published'
  AND p.created_at > NOW() - INTERVAL '7 days'
ORDER BY pm.temperature DESC
LIMIT 20;

-- 或者使用视图
SELECT * FROM hot_posts_view
LIMIT 20;
```

### 2. 关注流（用户关注的人的帖子）

```sql
SELECT 
  p.id,
  p.author_id,
  p.title,
  p.content,
  p.created_at,
  u.username,
  up.avatar_url,
  up.display_name
FROM posts p
JOIN users u ON p.author_id = u.id
JOIN user_profiles up ON u.id = up.user_id
WHERE p.status = 'published'
  AND p.author_id IN (
    -- 用户关注的人
    SELECT following_id FROM follows WHERE follower_id = 'current_user_id'
    UNION
    -- 用户加入的圈子中的帖子
    SELECT DISTINCT p2.author_id FROM posts p2
    WHERE p2.circle_id IN (
      SELECT circle_id FROM circle_members WHERE user_id = 'current_user_id'
    )
  )
ORDER BY p.created_at DESC
LIMIT 20;
```

### 3. 新鲜流（最新发布的内容）

```sql
SELECT 
  p.id,
  p.author_id,
  p.title,
  p.content,
  p.created_at,
  u.username,
  up.avatar_url,
  up.display_name,
  up.follower_count,
  p.view_count
FROM posts p
JOIN users u ON p.author_id = u.id
JOIN user_profiles up ON u.id = up.user_id
WHERE p.status = 'published'
ORDER BY p.created_at DESC
LIMIT 20;
```

### 4. 某个 Circle 内的帖子

```sql
SELECT 
  p.id,
  p.author_id,
  p.title,
  p.content,
  p.created_at,
  p.view_count,
  p.vote_count,
  u.username,
  up.avatar_url
FROM posts p
JOIN users u ON p.author_id = u.id
JOIN user_profiles up ON u.id = up.user_id
WHERE p.circle_id = 'circle_id'
  AND p.status = 'published'
ORDER BY p.created_at DESC
LIMIT 30;
```

### 5. 某个 Tag 相关的帖子

```sql
SELECT 
  p.id,
  p.author_id,
  p.title,
  p.created_at,
  u.username,
  up.avatar_url,
  t.name as tag_name
FROM posts p
JOIN post_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
JOIN users u ON p.author_id = u.id
JOIN user_profiles up ON u.id = up.user_id
WHERE t.slug = 'vibe-coding'
  AND p.status = 'published'
ORDER BY p.created_at DESC
LIMIT 30;
```

### 6. 搜索（标题或内容）

```sql
-- 使用全文搜索（需要配置 PostgreSQL 全文索引）
SELECT 
  p.id,
  p.title,
  p.author_id,
  u.username,
  ts_rank(to_tsvector('chinese', p.title || ' ' || p.content), 
          plainto_tsquery('chinese', 'vibe coding')) as rank
FROM posts p
JOIN users u ON p.author_id = u.id
WHERE to_tsvector('chinese', p.title || ' ' || p.content) 
      @@ plainto_tsquery('chinese', 'vibe coding')
  AND p.status = 'published'
ORDER BY rank DESC
LIMIT 30;
```

---

## 圈子与社区

### 1. 创建圈子

```sql
BEGIN TRANSACTION;

-- 1. 创建圈子
INSERT INTO circles (name, slug, description, creator_id, visibility, join_type)
VALUES ('AI Builders', 'ai-builders', 'A community for AI enthusiasts', 'creator_id', 'public', 'free')
RETURNING id INTO circle_id;

-- 2. 自动添加创建者为成员（creator 角色）
INSERT INTO circle_members (circle_id, user_id, role)
VALUES (circle_id, 'creator_id', 'creator');

-- 3. 更新圈子计数
UPDATE circles SET member_count = 1 WHERE id = circle_id;

COMMIT;
```

### 2. 用户加入圈子

```sql
BEGIN TRANSACTION;

-- 1. 检查圈子是否存在
SELECT id INTO circle_id FROM circles WHERE id = 'circle_id';

-- 2. 检查用户是否已经是成员
SELECT COUNT(*) INTO existing_count FROM circle_members 
WHERE circle_id = 'circle_id' AND user_id = 'user_id';

IF existing_count > 0 THEN
  ROLLBACK;
  RAISE EXCEPTION '用户已经是圈子成员';
END IF;

-- 3. 检查是否需要付费加入
SELECT join_type, join_cost_coins INTO join_type_val, cost_val FROM circles 
WHERE id = 'circle_id';

IF join_type_val = 'paid' THEN
  -- 检查用户余额
  SELECT balance INTO user_balance FROM user_balances WHERE user_id = 'user_id';
  IF user_balance < cost_val THEN
    ROLLBACK;
    RAISE EXCEPTION '余额不足';
  END IF;
  
  -- 扣费
  UPDATE user_balances SET balance = balance - cost_val WHERE user_id = 'user_id';
  
  -- 记录交易
  INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, related_circle_id)
  VALUES ('user_id', (SELECT creator_id FROM circles WHERE id = 'circle_id'), cost_val, 'circle_join_fee', 'circle_id');
END IF;

-- 4. 添加成员
INSERT INTO circle_members (circle_id, user_id, role)
VALUES ('circle_id', 'user_id', 'member');

-- 5. 更新圈子成员数
UPDATE circles SET member_count = member_count + 1 WHERE id = 'circle_id';

COMMIT;
```

### 3. 查看圈子的成员列表

```sql
SELECT 
  u.id,
  u.username,
  up.avatar_url,
  up.display_name,
  cm.role,
  cm.joined_at
FROM circle_members cm
JOIN users u ON cm.user_id = u.id
JOIN user_profiles up ON u.id = up.user_id
WHERE cm.circle_id = 'circle_id'
ORDER BY CASE WHEN cm.role = 'creator' THEN 0 WHEN cm.role = 'admin' THEN 1 WHEN cm.role = 'moderator' THEN 2 ELSE 3 END,
         cm.joined_at DESC;
```

### 4. 获取用户加入的所有圈子

```sql
SELECT 
  c.id,
  c.name,
  c.slug,
  c.description,
  c.icon_url,
  cm.role,
  cm.joined_at
FROM circle_members cm
JOIN circles c ON cm.circle_id = c.id
WHERE cm.user_id = 'user_id'
ORDER BY cm.joined_at DESC;
```

---

## 内容发布与管理

### 1. 发布帖子

```sql
BEGIN TRANSACTION;

-- 1. 创建帖子
INSERT INTO posts (
  author_id, title, content, circle_id, status
) VALUES (
  'author_id', 'My Amazing Vibe Coding Journey', 'This is the content...', NULL, 'published'
)
RETURNING id INTO post_id;

-- 2. 初始化帖子指标
INSERT INTO post_metrics (post_id)
VALUES (post_id);

-- 3. 添加标签（可以有多个）
INSERT INTO post_tags (post_id, tag_id)
SELECT post_id, id FROM tags WHERE slug IN ('vibe-coding', 'ai-tools');

-- 4. 更新圈子的帖子计数（如果属于某个圈子）
-- UPDATE circles SET post_count = post_count + 1 WHERE id = 'circle_id';

-- 5. 更新用户的帖子计数
UPDATE user_profiles SET post_count = post_count + 1 WHERE user_id = 'author_id';

-- 6. 奖励发帖
INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, related_post_id, description)
VALUES (NULL, 'author_id', 5, 'post_reward', post_id, '发帖奖励');

UPDATE user_balances 
SET balance = balance + 5, total_earned = total_earned + 5
WHERE user_id = 'author_id';

COMMIT;
```

### 2. 发表评论

```sql
BEGIN TRANSACTION;

-- 1. 创建评论
INSERT INTO comments (post_id, author_id, content)
VALUES ('post_id', 'commenter_id', 'Great content!')
RETURNING id INTO comment_id;

-- 2. 更新帖子的评论计数
UPDATE posts SET comment_count = comment_count + 1 WHERE id = 'post_id';

-- 3. 奖励评论
INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, related_comment_id, description)
VALUES (NULL, 'commenter_id', 2, 'comment_reward', comment_id, '评论奖励');

UPDATE user_balances 
SET balance = balance + 2, total_earned = total_earned + 2
WHERE user_id = 'commenter_id';

-- 4. 创建通知（通知帖子作者有新评论）
INSERT INTO notifications (user_id, notification_type, related_user_id, related_post_id, title, body)
VALUES ('post_author_id', 'comment_on_post', 'commenter_id', 'post_id', 'New comment', 'Someone commented on your post');

COMMIT;
```

### 3. 删除帖子

```sql
-- 软删除（标记为 deleted，不真正删除）
UPDATE posts SET status = 'deleted', updated_at = NOW() WHERE id = 'post_id';

-- 更新用户的帖子计数
UPDATE user_profiles SET post_count = GREATEST(0, post_count - 1) WHERE user_id = 'author_id';

-- 注意：已经赚取的 coins 不会收回，已投的票也不会回滚
```

---

## 数据分析查询

### 1. 用户活跃度排行

```sql
SELECT 
  u.id,
  u.username,
  up.display_name,
  up.follower_count,
  up.post_count,
  COUNT(DISTINCT v.id) as vote_given_count,
  COUNT(DISTINCT c.id) as comment_count,
  ub.balance,
  ub.total_earned
FROM users u
JOIN user_profiles up ON u.id = up.user_id
JOIN user_balances ub ON u.id = ub.user_id
LEFT JOIN votes v ON u.id = v.voter_id AND v.created_at > NOW() - INTERVAL '7 days'
LEFT JOIN comments c ON u.id = c.author_id AND c.created_at > NOW() - INTERVAL '7 days'
WHERE u.status = 'active'
GROUP BY u.id, u.username, up.display_name, up.follower_count, up.post_count, ub.balance, ub.total_earned
ORDER BY vote_given_count DESC
LIMIT 50;
```

### 2. 币流转统计

```sql
-- 每天的币流转总额
SELECT 
  DATE(created_at) as date,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  COUNT(DISTINCT from_user_id) as unique_senders,
  COUNT(DISTINCT to_user_id) as unique_receivers
FROM coin_transactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 不同交易类型的统计
SELECT 
  transaction_type,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM coin_transactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY transaction_type
ORDER BY total_amount DESC;
```

### 3. 帖子热度统计

```sql
-- 最热门的 50 篇帖子（7 天内）
SELECT 
  p.id,
  p.title,
  p.author_id,
  u.username,
  p.created_at,
  pm.temperature,
  pm.agree_vote_count,
  pm.agree_vote_amount,
  pm.view_count,
  pm.comment_count,
  (pm.agree_vote_count + pm.comment_count)::FLOAT / pm.impression_count as engagement_rate
FROM posts p
JOIN post_metrics pm ON p.id = pm.post_id
JOIN users u ON p.author_id = u.id
WHERE p.created_at > NOW() - INTERVAL '7 days'
  AND p.status = 'published'
ORDER BY pm.temperature DESC
LIMIT 50;
```

### 4. 用户余额分布

```sql
SELECT 
  CASE 
    WHEN balance < 50 THEN '0-50'
    WHEN balance < 100 THEN '50-100'
    WHEN balance < 500 THEN '100-500'
    WHEN balance < 2000 THEN '500-2000'
    ELSE '2000+'
  END as balance_range,
  COUNT(*) as user_count,
  AVG(balance) as avg_balance,
  MIN(balance) as min_balance,
  MAX(balance) as max_balance
FROM user_balances
GROUP BY balance_range
ORDER BY user_count DESC;
```

### 5. 徽章分布

```sql
SELECT 
  badge_type,
  COUNT(*) as holder_count,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count
FROM user_badges
GROUP BY badge_type
ORDER BY holder_count DESC;
```

---

## 后端集成示例

### Express.js 后端伪代码

```javascript
// POST /api/posts/:postId/vote
app.post('/api/posts/:postId/vote', authMiddleware, async (req, res) => {
  const { voterId } = req.user;
  const { postId } = req.params;
  const { amount, voteType = 'agree' } = req.body;
  
  try {
    // 调用 PostgreSQL 存储过程
    const result = await pool.query(
      'SELECT * FROM vote_on_content($1, $2, NULL, NULL, $3, $4)',
      [voterId, postId, amount, voteType]
    );
    
    if (result.rows[0].success) {
      res.json({
        success: true,
        message: result.rows[0].message,
        newBalance: result.rows[0].new_balance
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.rows[0].message
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/posts/trending
app.get('/api/posts/trending', async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  
  const result = await pool.query(`
    SELECT * FROM hot_posts_view
    OFFSET $1 LIMIT $2
  `, [offset, limit]);
  
  res.json(result.rows);
});

// GET /api/users/:username
app.get('/api/users/:username', async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM user_status_view WHERE username = $1
  `, [req.params.username]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(result.rows[0]);
});

// POST /api/posts
app.post('/api/posts', authMiddleware, async (req, res) => {
  const { authorId } = req.user;
  const { title, content, tags, circleId } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 创建帖子
    const postResult = await client.query(
      'INSERT INTO posts (author_id, title, content, circle_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [authorId, title, content, circleId]
    );
    const postId = postResult.rows[0].id;
    
    // 初始化指标
    await client.query('INSERT INTO post_metrics (post_id) VALUES ($1)', [postId]);
    
    // 添加标签
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await client.query(
          'INSERT INTO post_tags (post_id, tag_id) SELECT $1, id FROM tags WHERE slug = $2',
          [postId, tag]
        );
      }
    }
    
    // 奖励发帖
    await client.query(
      'INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, related_post_id) VALUES (NULL, $1, 5, $2, $3)',
      [authorId, 'post_reward', postId]
    );
    await client.query(
      'UPDATE user_balances SET balance = balance + 5 WHERE user_id = $1',
      [authorId]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({ id: postId, message: 'Post created' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Cron job: 每天 00:00 发币
const cron = require('node-cron');
cron.schedule('0 0 * * *', async () => {
  try {
    const result = await pool.query('SELECT * FROM distribute_daily_coins(20)');
    console.log('Daily coin distribution:', result.rows[0]);
  } catch (error) {
    console.error('Daily distribution failed:', error);
  }
});
```

---

## 查询优化提示

1. **always use indexes**: 所有频繁查询的字段都有索引，充分利用它们
2. **use EXPLAIN**: 复杂查询前先用 EXPLAIN ANALYZE 检查执行计划
3. **batch operations**: 大量写操作时，用批量 INSERT 而不是逐条 INSERT
4. **cache frequently accessed data**: 考虑在应用层缓存热门帖子、用户资料等
5. **periodic materialization**: 定期更新 post_metrics 和物化视图

---

## 常见问题排查

**Q: 为什么投币失败？**
A: 检查以下几点：
- 余额是否足够 `SELECT balance FROM user_balances WHERE user_id = ?`
- 是否已经投过票 `SELECT * FROM votes WHERE voter_id = ? AND post_id = ?`
- 帖子是否存在且已发布 `SELECT status FROM posts WHERE id = ?`
- 是否在给自己的内容投币 `SELECT author_id FROM posts WHERE id = ?`

**Q: 为什么用户的徽章变成 inactive？**
A: 用户的余额降低到徽章要求以下。检查 user_badges 表的 status 和 required_balance。

**Q: 为什么温度计算不准确？**
A: 可能 post_metrics 没有及时更新。可以手动更新：
```sql
UPDATE post_metrics 
SET agree_vote_count = (SELECT COUNT(*) FROM votes WHERE post_id = ? AND vote_type = 'agree')
WHERE post_id = ?;
```