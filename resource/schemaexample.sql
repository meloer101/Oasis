-- ============================================================================
-- Oasis 数据库 Schema - PostgreSQL
-- 可直接在 Supabase 或 PostgreSQL 执行
-- ============================================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 用于全文搜索

-- ============================================================================
-- 1. 用户域表
-- ============================================================================

-- 用户账户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 认证信息
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- 身份信息
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  founder_number INT UNIQUE CHECK (founder_number IS NULL OR founder_number >= 1 AND founder_number <= 100),
  founder_number_assigned_at TIMESTAMP,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  
  -- 索引
  CONSTRAINT email_valid CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created ON users(created_at DESC);

-- 用户资料表
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
  
  -- 统计（冗余字段，用于快速显示）
  follower_count INT DEFAULT 0 CHECK (follower_count >= 0),
  following_count INT DEFAULT 0 CHECK (following_count >= 0),
  post_count INT DEFAULT 0 CHECK (post_count >= 0),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);

-- 用户余额表（Agreecoin 账户）
CREATE TABLE user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- 核心余额
  balance BIGINT DEFAULT 0 CHECK (balance >= 0),
  
  -- 生涯统计
  total_earned BIGINT DEFAULT 0 CHECK (total_earned >= 0),
  total_spent BIGINT DEFAULT 0 CHECK (total_spent >= 0),
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_balances_user ON user_balances(user_id);
CREATE INDEX idx_user_balances_balance ON user_balances(balance DESC);

-- 用户徽章表
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 徽章类型
  badge_type VARCHAR(50) NOT NULL CHECK (badge_type IN ('newcomer', 'resonator', 'vibe_master', 'founder', 'circle_creator')),
  
  -- 持仓要求与状态
  required_balance BIGINT NOT NULL CHECK (required_balance > 0),
  acquired_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- 过期时间（可选）
  expires_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 每个用户每种徽章只能有一个
  UNIQUE(user_id, badge_type)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_type ON user_badges(badge_type);
CREATE INDEX idx_user_badges_status ON user_badges(status);

-- 用户关注表
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 防止重复和自己关注自己
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================================
-- 2. 内容与社区域表
-- ============================================================================

-- 帖子表
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 作者与内容
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  
  -- 媒体
  image_urls TEXT[],
  external_url VARCHAR(500),
  
  -- 所属圈子（可选）
  circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
  
  -- 状态
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'deleted', 'hidden')),
  
  -- 统计（冗余，用于快速查询）
  view_count INT DEFAULT 0 CHECK (view_count >= 0),
  comment_count INT DEFAULT 0 CHECK (comment_count >= 0),
  vote_count INT DEFAULT 0 CHECK (vote_count >= 0),
  impression_count INT DEFAULT 0 CHECK (impression_count >= 0),
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_title_gin ON posts USING GIN(to_tsvector('chinese', title));
CREATE INDEX idx_posts_content_gin ON posts USING GIN(to_tsvector('chinese', content));

-- 圈子表（必须在帖子之后定义，因为帖子有外键指向它）
-- 先这样定义，然后后面添加约束
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  
  -- 创建者
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 圈子设置
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
  
  -- 加入规则
  join_type VARCHAR(50) DEFAULT 'free' CHECK (join_type IN ('free', 'paid', 'invite')),
  join_cost_coins INT DEFAULT 0 CHECK (join_cost_coins >= 0),
  
  -- 统计
  member_count INT DEFAULT 1 CHECK (member_count >= 1),
  post_count INT DEFAULT 0 CHECK (post_count >= 0),
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_circles_creator ON circles(creator_id);
CREATE INDEX idx_circles_slug ON circles(slug);
CREATE INDEX idx_circles_visibility ON circles(visibility);

-- 为 posts 添加外键约束
ALTER TABLE posts ADD CONSTRAINT fk_posts_circle_id FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE SET NULL;

-- 评论表
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联关系
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 内容
  content TEXT NOT NULL,
  image_urls TEXT[],
  
  -- 统计
  vote_count INT DEFAULT 0 CHECK (vote_count >= 0),
  reply_count INT DEFAULT 0 CHECK (reply_count >= 0),
  
  -- 状态
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'deleted')),
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_post_created ON comments(post_id, created_at DESC);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_status ON comments(status);

-- 回复表（评论的回复）
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联关系
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reply_to_id UUID REFERENCES replies(id) ON DELETE CASCADE,
  
  -- 内容
  content TEXT NOT NULL,
  
  -- 统计
  vote_count INT DEFAULT 0 CHECK (vote_count >= 0),
  
  -- 状态
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'deleted')),
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_replies_comment ON replies(comment_id);
CREATE INDEX idx_replies_author ON replies(author_id);
CREATE INDEX idx_replies_reply_to ON replies(reply_to_id);

-- 标签表（去中心化）
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 标签信息
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  
  -- 统计
  post_count INT DEFAULT 0 CHECK (post_count >= 0),
  follower_count INT DEFAULT 0 CHECK (follower_count >= 0),
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_slug ON tags(slug);

-- 帖子-标签关联表
CREATE TABLE post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(post_id, tag_id)
);

CREATE INDEX idx_post_tags_post ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag ON post_tags(tag_id);

-- 圈子成员表
CREATE TABLE circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 成员角色
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin', 'creator')),
  
  -- 时间戳
  joined_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(circle_id, user_id)
);

CREATE INDEX idx_circle_members_circle ON circle_members(circle_id);
CREATE INDEX idx_circle_members_user ON circle_members(user_id);
CREATE INDEX idx_circle_members_role ON circle_members(role);

-- 用户标签关注表（用户可以关注感兴趣的标签）
CREATE TABLE follow_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, tag_id)
);

CREATE INDEX idx_follow_tags_user ON follow_tags(user_id);
CREATE INDEX idx_follow_tags_tag ON follow_tags(tag_id);

-- ============================================================================
-- 3. 经济与投票域表
-- ============================================================================

-- 投票记录表
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 投票人
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 投票目标（只能投票一个）
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
  
  -- 投票数据
  amount BIGINT NOT NULL CHECK (amount > 0),
  vote_type VARCHAR(50) DEFAULT 'agree' CHECK (vote_type IN ('agree', 'disagree')),
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 约束：只能投票一个目标
  CONSTRAINT vote_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NULL AND reply_id IS NOT NULL)
  ),
  
  -- 防止重复投票
  UNIQUE(voter_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'),
                   COALESCE(comment_id, '00000000-0000-0000-0000-000000000000'),
                   COALESCE(reply_id, '00000000-0000-0000-0000-000000000000'))
);

CREATE INDEX idx_votes_voter ON votes(voter_id);
CREATE INDEX idx_votes_post ON votes(post_id);
CREATE INDEX idx_votes_comment ON votes(comment_id);
CREATE INDEX idx_votes_reply ON votes(reply_id);
CREATE INDEX idx_votes_created ON votes(created_at DESC);

-- 币交易记录表（核心审计日志）
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 交易双方
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 交易金额
  amount BIGINT NOT NULL CHECK (amount > 0),
  
  -- 交易类型
  transaction_type VARCHAR(100) NOT NULL,
  
  -- 关联的业务对象
  related_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  related_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  related_vote_id UUID REFERENCES votes(id) ON DELETE SET NULL,
  related_circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
  
  -- 备注
  description TEXT,
  
  -- 状态
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'reversed')),
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coin_transactions_from ON coin_transactions(from_user_id, created_at DESC);
CREATE INDEX idx_coin_transactions_to ON coin_transactions(to_user_id, created_at DESC);
CREATE INDEX idx_coin_transactions_type ON coin_transactions(transaction_type, created_at DESC);
CREATE INDEX idx_coin_transactions_created ON coin_transactions(created_at DESC);
CREATE INDEX idx_coin_transactions_status ON coin_transactions(status);

-- 系统每日发币记录表
CREATE TABLE coin_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 发币日期
  distribution_date DATE NOT NULL UNIQUE,
  
  -- 统计
  total_users_distributed_to INT,
  total_coins_distributed BIGINT,
  
  -- 执行情况
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'failed')),
  error_message TEXT,
  
  -- 时间戳
  executed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coin_distribution_date ON coin_distribution(distribution_date DESC);

-- 帖子指标表（冗余，用于性能优化）
CREATE TABLE post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  
  -- 曝光与浏览
  view_count INT DEFAULT 0 CHECK (view_count >= 0),
  impression_count INT DEFAULT 0 CHECK (impression_count >= 0),
  
  -- 投票统计
  agree_vote_count INT DEFAULT 0 CHECK (agree_vote_count >= 0),
  agree_vote_amount BIGINT DEFAULT 0 CHECK (agree_vote_amount >= 0),
  disagree_vote_count INT DEFAULT 0 CHECK (disagree_vote_count >= 0),
  disagree_vote_amount BIGINT DEFAULT 0 CHECK (disagree_vote_amount >= 0),
  
  -- 互动
  comment_count INT DEFAULT 0 CHECK (comment_count >= 0),
  engagement_rate FLOAT DEFAULT 0 CHECK (engagement_rate >= 0 AND engagement_rate <= 1),
  
  -- 温度
  temperature FLOAT DEFAULT 0 CHECK (temperature >= 0),
  
  -- 时间戳
  calculated_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_post_metrics_temperature ON post_metrics(temperature DESC);
CREATE INDEX idx_post_metrics_updated ON post_metrics(updated_at DESC);

-- ============================================================================
-- 4. 通知域表
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 接收人
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 通知类型
  notification_type VARCHAR(50) NOT NULL,
  
  -- 通知来源
  related_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  related_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  related_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  
  -- 内容
  title VARCHAR(200),
  body TEXT,
  
  -- 状态
  is_read BOOLEAN DEFAULT FALSE,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================================
-- 5. 触发器与函数
-- ============================================================================

-- 5.1 自动更新帖子的 comment_count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF OLD.status = 'published' AND NEW.status = 'deleted' THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

-- 5.2 自动更新帖子的 vote_count 和指标
CREATE OR REPLACE FUNCTION update_post_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新投票计数
  IF NEW.post_id IS NOT NULL THEN
    UPDATE posts SET vote_count = vote_count + 1 WHERE id = NEW.post_id;
    
    -- 同时更新 post_metrics
    UPDATE post_metrics 
    SET agree_vote_count = agree_vote_count + 1,
        agree_vote_amount = agree_vote_amount + NEW.amount
    WHERE post_id = NEW.post_id AND NEW.vote_type = 'agree';
  END IF;
  
  -- 更新评论的投票
  IF NEW.comment_id IS NOT NULL THEN
    UPDATE comments SET vote_count = vote_count + 1 WHERE id = NEW.comment_id;
  END IF;
  
  -- 更新回复的投票
  IF NEW.reply_id IS NOT NULL THEN
    UPDATE replies SET vote_count = vote_count + 1 WHERE id = NEW.reply_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_vote_count
AFTER INSERT ON votes
FOR EACH ROW
EXECUTE FUNCTION update_post_vote_count();

-- 5.3 自动更新用户的粉丝数和关注数
CREATE OR REPLACE FUNCTION update_user_follow_count()
RETURNS TRIGGER AS $$
BEGIN
  -- 增加被关注者的粉丝数
  UPDATE user_profiles SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
  -- 增加关注者的关注数
  UPDATE user_profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_follow_count
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION update_user_follow_count();

-- 5.4 删除关注时，减少粉丝数和关注数
CREATE OR REPLACE FUNCTION decrease_user_follow_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = OLD.following_id;
  UPDATE user_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = OLD.follower_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrease_user_follow_count
AFTER DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION decrease_user_follow_count();

-- 5.5 当用户余额降低时，检查徽章有效性
CREATE OR REPLACE FUNCTION check_badge_validity()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果余额低于徽章要求，设置为 inactive
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
WHEN (OLD.balance > NEW.balance)
EXECUTE FUNCTION check_badge_validity();

-- 5.6 自动更新帖子的 impression_count（当帖子被展示在 Feed 上时）
-- 注意：这个需要从应用层调用，或者通过定时任务更新
CREATE OR REPLACE FUNCTION increment_post_impression(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET impression_count = impression_count + 1 WHERE id = post_id;
  UPDATE post_metrics SET impression_count = impression_count + 1 WHERE post_id = post_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. 存储过程与原子操作
-- ============================================================================

-- 6.1 投币的原子操作
CREATE OR REPLACE FUNCTION vote_on_content(
  p_voter_id UUID,
  p_post_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_reply_id UUID DEFAULT NULL,
  p_amount BIGINT,
  p_vote_type VARCHAR DEFAULT 'agree'
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_balance BIGINT) AS $$
DECLARE
  v_voter_balance BIGINT;
  v_author_id UUID;
  v_author_receive BIGINT;
  v_burn_amount BIGINT;
  v_vote_id UUID;
BEGIN
  -- 开始事务
  BEGIN
    -- 1. 锁定投票者的余额（防止并发问题）
    SELECT balance INTO v_voter_balance 
    FROM user_balances 
    WHERE user_id = p_voter_id 
    FOR UPDATE;
    
    -- 2. 检查余额是否足够
    IF v_voter_balance < p_amount THEN
      RETURN QUERY SELECT FALSE, '余额不足'::TEXT, v_voter_balance;
      RETURN;
    END IF;
    
    -- 3. 确定投票目标和作者
    IF p_post_id IS NOT NULL THEN
      SELECT author_id INTO v_author_id FROM posts WHERE id = p_post_id;
    ELSIF p_comment_id IS NOT NULL THEN
      SELECT author_id INTO v_author_id FROM comments WHERE id = p_comment_id;
    ELSIF p_reply_id IS NOT NULL THEN
      SELECT author_id INTO v_author_id FROM replies WHERE id = p_reply_id;
    ELSE
      RETURN QUERY SELECT FALSE, '投票目标不明确'::TEXT, v_voter_balance;
      RETURN;
    END IF;
    
    -- 4. 防止自投
    IF v_author_id = p_voter_id THEN
      RETURN QUERY SELECT FALSE, '不能给自己的内容投币'::TEXT, v_voter_balance;
      RETURN;
    END IF;
    
    -- 5. 计算分配（20% 销毁税）
    v_burn_amount := (p_amount::NUMERIC * 0.2)::BIGINT;
    v_author_receive := p_amount - v_burn_amount;
    
    -- 6. 扣除投票者的币
    UPDATE user_balances 
    SET balance = balance - p_amount,
        total_spent = total_spent + p_amount,
        updated_at = NOW()
    WHERE user_id = p_voter_id;
    
    -- 7. 给作者加币
    UPDATE user_balances 
    SET balance = balance + v_author_receive,
        total_earned = total_earned + v_author_receive,
        updated_at = NOW()
    WHERE user_id = v_author_id;
    
    -- 8. 记录投票
    INSERT INTO votes (voter_id, post_id, comment_id, reply_id, amount, vote_type)
    VALUES (p_voter_id, p_post_id, p_comment_id, p_reply_id, p_amount, p_vote_type)
    RETURNING id INTO v_vote_id;
    
    -- 9. 记录币流转（投票者支出）
    INSERT INTO coin_transactions (
      from_user_id, to_user_id, amount, transaction_type, 
      related_post_id, related_comment_id, related_reply_id, related_vote_id,
      description
    ) VALUES (
      p_voter_id, v_author_id, v_author_receive, 'vote_received',
      p_post_id, p_comment_id, p_reply_id, v_vote_id,
      '用户 ' || p_voter_id || ' 投 ' || p_amount || ' coins'
    );
    
    -- 10. 记录币流转（平台销毁）
    IF v_burn_amount > 0 THEN
      INSERT INTO coin_transactions (
        from_user_id, to_user_id, amount, transaction_type,
        related_vote_id,
        description
      ) VALUES (
        p_voter_id, NULL, v_burn_amount, 'transaction_fee_burned',
        v_vote_id,
        '平台销毁 ' || v_burn_amount || ' coins'
      );
    END IF;
    
    -- 11. 返回成功
    SELECT balance INTO v_voter_balance FROM user_balances WHERE user_id = p_voter_id;
    RETURN QUERY SELECT TRUE, '投币成功'::TEXT, v_voter_balance;
    
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, '已经投过票了'::TEXT, v_voter_balance;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT, v_voter_balance;
  END;
END;
$$ LANGUAGE plpgsql;

-- 6.2 系统每日发币
CREATE OR REPLACE FUNCTION distribute_daily_coins(p_amount_per_user BIGINT DEFAULT 20)
RETURNS TABLE(success BOOLEAN, message TEXT, users_affected INT, total_coins BIGINT) AS $$
DECLARE
  v_count INT;
  v_total BIGINT;
BEGIN
  BEGIN
    -- 1. 计算活跃用户数
    SELECT COUNT(*) INTO v_count 
    FROM users 
    WHERE status = 'active';
    
    -- 2. 计算总币数
    v_total := v_count * p_amount_per_user;
    
    -- 3. 为所有活跃用户发币
    UPDATE user_balances 
    SET balance = balance + p_amount_per_user,
        total_earned = total_earned + p_amount_per_user,
        updated_at = NOW()
    WHERE user_id IN (
      SELECT id FROM users WHERE status = 'active'
    );
    
    -- 4. 为每个用户记录交易
    INSERT INTO coin_transactions (from_user_id, to_user_id, amount, transaction_type, description)
    SELECT NULL, id, p_amount_per_user, 'daily_distribution', '系统每日发币'
    FROM users
    WHERE status = 'active';
    
    -- 5. 记录发币汇总
    INSERT INTO coin_distribution (distribution_date, total_users_distributed_to, total_coins_distributed, status)
    VALUES (CURRENT_DATE, v_count, v_total, 'completed');
    
    RETURN QUERY SELECT TRUE, '每日发币完成'::TEXT, v_count, v_total;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT, 0, 0;
  END;
END;
$$ LANGUAGE plpgsql;

-- 6.3 颁发或撤销徽章
CREATE OR REPLACE FUNCTION award_badge(
  p_user_id UUID,
  p_badge_type VARCHAR
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
BEGIN
  BEGIN
    INSERT INTO user_badges (user_id, badge_type, required_balance, acquired_at, status)
    VALUES (p_user_id, p_badge_type, 
      CASE p_badge_type
        WHEN 'newcomer' THEN 100
        WHEN 'resonator' THEN 500
        WHEN 'vibe_master' THEN 2000
        WHEN 'founder' THEN 5000
        ELSE 0
      END,
      NOW(), 'active')
    ON CONFLICT (user_id, badge_type) 
    DO UPDATE SET status = 'active', updated_at = NOW();
    
    RETURN QUERY SELECT TRUE, '徽章颁发成功'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. 视图定义
-- ============================================================================

-- 7.1 帖子温度计算视图
CREATE OR REPLACE VIEW post_temperature_view AS
SELECT 
  p.id,
  p.author_id,
  p.title,
  p.created_at,
  p.view_count,
  p.impression_count,
  COUNT(DISTINCT CASE WHEN v.vote_type = 'agree' THEN v.voter_id END)::INT as agree_vote_count,
  SUM(CASE WHEN v.vote_type = 'agree' THEN v.amount ELSE 0 END)::BIGINT as agree_vote_amount,
  COUNT(DISTINCT CASE WHEN v.vote_type = 'disagree' THEN v.voter_id END)::INT as disagree_vote_count,
  CASE 
    WHEN p.impression_count = 0 THEN 0
    ELSE (CAST(COUNT(DISTINCT v.voter_id) AS FLOAT) / p.impression_count) * p.view_count * 1000
  END as temperature
FROM posts p
LEFT JOIN votes v ON p.id = v.post_id
WHERE p.status = 'published'
GROUP BY p.id, p.author_id, p.title, p.created_at, p.view_count, p.impression_count;

-- 7.2 用户状态综合视图
CREATE OR REPLACE VIEW user_status_view AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.status,
  u.founder_number,
  ub.balance,
  ub.total_earned,
  ub.total_spent,
  up.display_name,
  up.avatar_url,
  up.follower_count,
  up.following_count,
  up.post_count,
  ARRAY_AGG(
    CASE WHEN ubadge.status = 'active' THEN ubadge.badge_type END
  ) FILTER (WHERE ubadge.status = 'active') as active_badges
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_badges ubadge ON u.id = ubadge.user_id
GROUP BY u.id, u.username, u.email, u.status, u.founder_number, ub.balance, ub.total_earned, ub.total_spent, 
         up.display_name, up.avatar_url, up.follower_count, up.following_count, up.post_count;

-- 7.3 热门帖子视图
CREATE OR REPLACE VIEW hot_posts_view AS
SELECT 
  p.id,
  p.author_id,
  p.title,
  p.created_at,
  p.view_count,
  p.impression_count,
  COUNT(DISTINCT v.voter_id) as vote_count,
  SUM(v.amount) as total_vote_amount,
  CASE 
    WHEN p.impression_count = 0 THEN 0
    ELSE (CAST(COUNT(DISTINCT v.voter_id) AS FLOAT) / p.impression_count) * p.view_count * 1000
  END as temperature,
  u.username,
  up.avatar_url,
  up.display_name
FROM posts p
LEFT JOIN votes v ON p.id = v.post_id AND v.vote_type = 'agree'
LEFT JOIN users u ON p.author_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE p.status = 'published'
  AND p.created_at > NOW() - INTERVAL '7 days'
GROUP BY p.id, p.author_id, p.title, p.created_at, p.view_count, p.impression_count, u.username, up.avatar_url, up.display_name
ORDER BY temperature DESC;

-- 7.4 圈子概览视图
CREATE OR REPLACE VIEW circle_overview_view AS
SELECT 
  c.id,
  c.name,
  c.slug,
  c.description,
  c.creator_id,
  u.username as creator_username,
  up.avatar_url as creator_avatar,
  c.member_count,
  c.post_count,
  COUNT(DISTINCT cm.user_id) as actual_member_count
FROM circles c
LEFT JOIN users u ON c.creator_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN circle_members cm ON c.id = cm.circle_id
GROUP BY c.id, c.name, c.slug, c.description, c.creator_id, u.username, up.avatar_url, c.member_count, c.post_count;

-- ============================================================================
-- 8. 初始化数据（可选）
-- ============================================================================

-- 创建初始用户（用于测试）
-- DO $$ 
-- DECLARE 
--   test_user_id UUID;
-- BEGIN
--   -- 创建测试用户
--   INSERT INTO users (username, email, password_hash, status)
--   VALUES ('testuser', 'test@example.com', 'hashed_password_here', 'active')
--   RETURNING id INTO test_user_id;
--   
--   -- 为用户创建资料
--   INSERT INTO user_profiles (user_id, display_name)
--   VALUES (test_user_id, 'Test User');
--   
--   -- 初始化用户余额
--   INSERT INTO user_balances (user_id, balance)
--   VALUES (test_user_id, 100);
-- END $$;

-- ============================================================================
-- 完成！
-- ============================================================================
-- 以上 schema 包含了所有必要的表、索引、触发器和存储过程
-- 可以直接在 Supabase PostgreSQL 数据库中执行
-- ============================================================================