export interface Author {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

export interface Post {
  id: string
  title: string
  content?: string
  contentType: 'markdown' | 'link' | 'image'
  linkUrl: string | null
  imageUrl: string | null
  viewCount: number
  commentCount: number
  voterCount: number
  totalVoteAmount: number
  temperature: string
  createdAt: string
  updatedAt?: string
  author: Author
}

export interface Comment {
  id: string
  content: string
  parentId: string | null
  createdAt: string
  author: Author
}

export type FeedType = 'hot' | 'fresh' | 'follow'
