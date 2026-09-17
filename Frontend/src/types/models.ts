// Domain types mirroring the ProjectSphere API responses. Kept practical rather
// than exhaustive — enough to make the UI type-safe against the real contracts.

export type Role = 'ADMIN' | 'DEVELOPER' | 'RECRUITER';
export type ProjectStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type ReportReason = 'SPAM' | 'FAKE' | 'ABUSE' | 'COPYRIGHT' | 'INAPPROPRIATE';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

export interface AuthUser {
  id: string;
  email?: string;
  username: string;
  role: Role;
  isEmailVerified?: boolean;
}

export interface ProfileMini {
  name: string | null;
  avatarUrl: string | null;
  headline?: string | null;
}

export interface Author {
  id: string;
  username: string;
  profile: ProfileMini | null;
}

export interface Technology {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface ProjectImage {
  id: string;
  url: string;
  type: 'COVER' | 'GALLERY' | 'ARCHITECTURE';
  position: number;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  detailedDescription?: string | null;
  demoVideoUrl?: string | null;
  liveUrl?: string | null;
  githubUrl?: string | null;
  difficulty: Difficulty;
  status: ProjectStatus;
  isFeatured: boolean;
  isHidden: boolean;
  isOpenSource?: boolean;
  viewCount: number;
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  trendingScore?: number;
  publishedAt?: string | null;
  createdAt?: string;
  author?: Author;
  category?: Category | null;
  technologies?: { technology: Technology }[];
  tags?: { tag: { id: string; name: string; slug: string } }[];
  images?: ProjectImage[];
}

export interface ViewerRelationship {
  isLiked: boolean;
  isBookmarked: boolean;
  isFollowingAuthor: boolean;
}

export interface CommentAuthor {
  id: string;
  username: string;
  profile: ProfileMini | null;
}

export interface Comment {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  editedAt: string | null;
  author: CommentAuthor;
  replies?: Comment[];
}

export interface Profile {
  name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  skills: string[];
  experience: string | null;
  education: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  resumeUrl: string | null;
  portfolioWebsite: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  openToWork: boolean;
  completionPercentage: number;
  profileViews: number;
}

export interface ProfileResponse {
  user: { id: string; username: string; role: Role; memberSince: string; email?: string };
  profile: Profile;
  counts: { projectCount: number; followerCount: number; followingCount: number };
  isOwner: boolean;
  isFollowing: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'REPLY' | 'FOLLOW' | 'FEATURED' | 'ADMIN_MESSAGE';
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
  aggregatedCount?: number;
  actor?: { id: string; username: string; profile: ProfileMini | null } | null;
}

export interface DailyPoint {
  date: string;
  count: number;
}

export interface DeveloperDashboard {
  totals: {
    projects: number;
    totalViews: number;
    totalLikes: number;
    totalBookmarks: number;
    totalComments: number;
    followers: number;
  };
  topProject: { slug: string; title: string; viewCount: number; likeCount: number } | null;
  growth: { last7Days: number; previous7Days: number; growthPct: number };
  dailyViews: DailyPoint[];
}

// ---- Admin ----
export interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  role: Role;
  isBanned: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  profile: ProfileMini | null;
  _count: { projects: number };
}

export interface AdminDashboard {
  totals: { totalUsers: number; totalProjects: number; publishedProjects: number; pendingReports: number; totalComments: number };
  growth: { usersPct: number; projectsPct: number };
  series: { signups: DailyPoint[]; projects: DailyPoint[] };
}

export interface ReportRow {
  id: string;
  targetType: 'PROJECT' | 'COMMENT';
  targetId: string;
  reason: ReportReason;
  status: ReportStatus;
  details: string | null;
  adminNotes: string | null;
  createdAt: string;
  reporter: { id: string; username: string };
  target?: { slug?: string; title?: string; content?: string; isHidden?: boolean } | null;
}
