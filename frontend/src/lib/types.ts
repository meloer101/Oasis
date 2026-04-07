// ==============================
// USERS
// ==============================

export type BadgeType = 'newcomer' | 'resonator' | 'vibe_master' | 'founder'

export interface Author {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

export interface UserBadge {
  id: string
  badgeType: BadgeType
  isActive: boolean
  earnedAt: string
}

export interface User {
  id: string
  username: string
  email: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  founderNumber: number | null
  createdAt: string
  balance?: { balance: number; totalEarned: number; totalSpent: number }
  badges?: UserBadge[]
}

// ==============================
// POSTS
// ==============================

export type PostCategory = 'idea' | 'tech' | 'else'

export interface Post {
  id: string
  title: string
  content?: string
  contentType: 'markdown' | 'link' | 'image' | 'rich'
  category: PostCategory
  linkUrl: string | null
  imageUrl: string | null
  circleId: string | null
  circle?: { id: string; name: string } | null
  visibility: 'public' | 'circle_only'
  viewCount: number
  commentCount: number
  voterCount: number
  totalVoteAmount: number
  disagreeVoteAmount: number
  temperature: string
  tags: string[]
  userVoteType: 'agree' | 'disagree' | null
  createdAt: string
  updatedAt?: string
  author: Author
}

export interface Comment {
  id: string
  content: string
  parentId: string | null
  createdAt: string
  updatedAt?: string
  status?: 'published' | 'removed'
  author: Author
}

export type FeedType = 'hot' | 'fresh' | 'follow'

// ==============================
// WALLET
// ==============================

export interface WalletInfo {
  balance: number
  totalEarned: number
  totalSpent: number
  currentBadge: BadgeType | null
  nextBadgeThreshold: number | null
  badges: string[]
  loginStreak: number
}

export interface Transaction {
  id: string
  amount: number
  transactionType: string
  fromUserId: string | null
  toUserId: string | null
  relatedPostId: string | null
  note: string | null
  createdAt: string
  isCredit: boolean
  displayAmount: number
}

// ==============================
// CIRCLES
// ==============================

export interface Circle {
  id: string
  name: string
  slug: string
  description: string | null
  avatarUrl: string | null
  visibility: string
  joinFee: number
  memberCount: number
  postCount: number
  createdAt: string
  isMember?: boolean
  memberRole?: string | null
  creator: Author
}

// ==============================
// TAGS
// ==============================

export interface Tag {
  id: string
  name: string
  postCount: number
}

// ==============================
// NOTIFICATIONS
// ==============================

export interface Notification {
  id: string
  type: string
  content: string | null
  isRead: boolean
  relatedPostId: string | null
  relatedCommentId: string | null
  relatedCircleId: string | null
  createdAt: string
  actor: Author | null
}
