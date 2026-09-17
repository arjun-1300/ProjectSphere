import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

/**
 * OpenAPI 3 definition for the entire ProjectSphere API. Built as a single
 * self-contained definition object (no file scanning) and served as interactive
 * docs at `${API_PREFIX}/docs` with the raw spec at `${API_PREFIX}/docs.json`.
 *
 * Small helpers below keep the ~75 operations DRY: response refs, security,
 * path params, and common query params.
 */

// ---- helpers ---------------------------------------------------------------
const ok = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } },
});
const err = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
});
const secured = [{ bearerAuth: [] }];

const pathParam = (name: string, description?: string) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
  ...(description ? { description } : {}),
});
const queryParam = (name: string, type: string, extra: Record<string, unknown> = {}) => ({
  name,
  in: 'query',
  required: false,
  schema: { type, ...extra },
});

const cursorParams = [queryParam('cursor', 'string'), queryParam('limit', 'integer', { minimum: 1, maximum: 50 })];
const pageParams = [
  queryParam('page', 'integer', { minimum: 1 }),
  queryParam('pageSize', 'integer', { minimum: 1, maximum: 100 }),
];
const jsonBody = (schema: Record<string, unknown>) => ({
  required: true,
  content: { 'application/json': { schema } },
});
const multipartBody = (field: string, description: string) => ({
  required: true,
  content: {
    'multipart/form-data': {
      schema: { type: 'object', properties: { [field]: { type: 'string', format: 'binary', description } } },
    },
  },
});

const REPORT_REASONS = ['SPAM', 'FAKE', 'ABUSE', 'COPYRIGHT', 'INAPPROPRIATE'];
const ROLES = ['ADMIN', 'DEVELOPER', 'RECRUITER'];
const reportBody = jsonBody({
  type: 'object',
  required: ['reason'],
  properties: { reason: { type: 'string', enum: REPORT_REASONS }, details: { type: 'string' } },
});

// ---- definition ------------------------------------------------------------
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'ProjectSphere API',
    version: '1.0.0',
    description:
      'Developer portfolio & project-discovery platform. Module-based Node/Express/TypeScript backend on Prisma + PostgreSQL. Every response uses the envelope { success, message, data, errors, meta? }. Send the access token as Authorization: Bearer <token>; the refresh token is an httpOnly cookie.',
    contact: { name: 'ProjectSphere' },
    license: { name: 'MIT' },
  },
  servers: [{ url: env.API_PREFIX, description: 'API v1' }],
  tags: [
    { name: 'Health', description: 'Liveness & readiness' },
    { name: 'Auth', description: 'Registration, login, tokens, email, OAuth' },
    { name: 'Profiles', description: 'Public profiles & self-service' },
    { name: 'Projects', description: 'Project CRUD, status, media' },
    { name: 'Discovery', description: 'Search, trending, feeds' },
    { name: 'Social', description: 'Likes, bookmarks, follows' },
    { name: 'Comments', description: 'Comments & single-level replies' },
    { name: 'Notifications', description: 'In-app notifications & prefs' },
    { name: 'Analytics', description: 'Event tracking & dashboards' },
    { name: 'Reports', description: 'User-submitted content reports' },
    { name: 'Admin', description: 'Admin-only management (ADMIN role)' },
    { name: 'AI', description: 'Gemini-powered helpers (rate-limited)' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { nullable: true },
          errors: { nullable: true, example: null },
          meta: { type: 'object', nullable: true },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          data: { nullable: true, example: null },
          errors: { type: 'object', example: { code: 'BAD_REQUEST' } },
        },
      },
      CursorMeta: {
        type: 'object',
        properties: {
          nextCursor: { type: 'string', nullable: true },
          hasMore: { type: 'boolean' },
          count: { type: 'integer' },
        },
      },
      PageMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasMore: { type: 'boolean' },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          slug: { type: 'string' },
          shortDescription: { type: 'string' },
          detailedDescription: { type: 'string', nullable: true },
          difficulty: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
          isFeatured: { type: 'boolean' },
          isHidden: { type: 'boolean' },
          viewCount: { type: 'integer' },
          likeCount: { type: 'integer' },
          bookmarkCount: { type: 'integer' },
          commentCount: { type: 'integer' },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
          parentId: { type: 'string', nullable: true },
          mentionedUserIds: { type: 'array', items: { type: 'string' } },
          editedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Report: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          targetType: { type: 'string', enum: ['PROJECT', 'COMMENT'] },
          targetId: { type: 'string' },
          reason: { type: 'string', enum: REPORT_REASONS },
          status: { type: 'string', enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'] },
          adminNotes: { type: 'string', nullable: true },
        },
      },
    },
  },
  paths: {
    // ------------------------------------------------------------ Health
    '/health': { get: { tags: ['Health'], summary: 'Liveness + DB ping', responses: { 200: ok('Service healthy (DB status in data)') } } },

    // ------------------------------------------------------------ Auth
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Create an account', description: 'Rate-limited (5/15min per IP). Sends a verification email.',
        requestBody: jsonBody({
          type: 'object', required: ['email', 'username', 'password'],
          properties: { email: { type: 'string', format: 'email' }, username: { type: 'string', minLength: 3 }, password: { type: 'string', format: 'password', minLength: 8 }, name: { type: 'string' } },
        }),
        responses: { 201: ok('Account created'), 409: err('Email/username already taken'), 422: err('Validation failed'), 429: err('Rate limited') },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Log in', description: 'Returns an access token in the body and sets the httpOnly refresh cookie. Rate-limited (5/15min per IP).',
        requestBody: jsonBody({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string', format: 'password' }, rememberMe: { type: 'boolean' } } }),
        responses: { 200: ok('Logged in'), 401: err('Invalid credentials'), 403: err('Email not verified / banned'), 429: err('Rate limited') },
      },
    },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Rotate refresh token', description: 'Reads the refresh cookie, rotates it, and returns a new access token. Detects token reuse.', responses: { 200: ok('New access token'), 401: err('Missing/invalid/reused token') } } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Log out', description: 'Revokes the current refresh token and clears the cookie.', responses: { 200: ok('Logged out') } } },
    '/auth/verify-email': { post: { tags: ['Auth'], summary: 'Verify email', requestBody: jsonBody({ type: 'object', required: ['token'], properties: { token: { type: 'string' } } }), responses: { 200: ok('Email verified'), 400: err('Invalid/expired token') } } },
    '/auth/resend-verification': { post: { tags: ['Auth'], summary: 'Resend verification email', description: 'Rate-limited (1/60s).', requestBody: jsonBody({ type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } }), responses: { 200: ok('Sent if account exists'), 429: err('Rate limited') } } },
    '/auth/forgot-password': { post: { tags: ['Auth'], summary: 'Request a password reset', requestBody: jsonBody({ type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } }), responses: { 200: ok('Sent if account exists'), 429: err('Rate limited') } } },
    '/auth/reset-password': { post: { tags: ['Auth'], summary: 'Reset password with token', requestBody: jsonBody({ type: 'object', required: ['token', 'password'], properties: { token: { type: 'string' }, password: { type: 'string', format: 'password', minLength: 8 } } }), responses: { 200: ok('Password reset'), 400: err('Invalid/expired token') } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: secured, responses: { 200: ok('Current user'), 401: err('Unauthorized') } } },
    '/auth/google': { get: { tags: ['Auth'], summary: 'Start Google OAuth', description: 'Redirects to Google. Not callable from Swagger UI.', responses: { 302: { description: 'Redirect to Google' } } } },
    '/auth/google/callback': { get: { tags: ['Auth'], summary: 'Google OAuth callback', responses: { 302: { description: 'Redirect back to client' } } } },
    '/auth/github': { get: { tags: ['Auth'], summary: 'Start GitHub OAuth', responses: { 302: { description: 'Redirect to GitHub' } } } },
    '/auth/github/callback': { get: { tags: ['Auth'], summary: 'GitHub OAuth callback', responses: { 302: { description: 'Redirect back to client' } } } },

    // ------------------------------------------------------------ Profiles
    '/profiles/{username}': {
      get: { tags: ['Profiles'], summary: 'Get a public profile', description: 'Owner (when authenticated) also sees email; increments a deduplicated view counter for non-owners.', parameters: [pathParam('username')], responses: { 200: ok('Profile with counts & isFollowing'), 404: err('Not found') } },
    },
    '/profiles/me': {
      put: { tags: ['Profiles'], summary: 'Update own profile', security: secured, requestBody: jsonBody({ type: 'object', properties: { name: { type: 'string' }, headline: { type: 'string' }, bio: { type: 'string' }, location: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } }, githubUrl: { type: 'string' }, linkedinUrl: { type: 'string' }, openToWork: { type: 'boolean' } } }), responses: { 200: ok('Updated (recomputes completion %)'), 401: err('Unauthorized') } },
      delete: { tags: ['Profiles'], summary: 'Delete own account (soft)', security: secured, responses: { 200: ok('Account deleted') } },
    },
    '/profiles/me/avatar': { patch: { tags: ['Profiles'], summary: 'Upload avatar', security: secured, requestBody: multipartBody('image', 'Image file (jpeg/png/webp/gif, max 5MB)'), responses: { 200: ok('Avatar updated'), 400: err('Bad file / not configured') } } },
    '/profiles/me/cover': { patch: { tags: ['Profiles'], summary: 'Upload cover image', security: secured, requestBody: multipartBody('image', 'Image file (max 5MB)'), responses: { 200: ok('Cover updated') } } },
    '/profiles/me/resume': { patch: { tags: ['Profiles'], summary: 'Upload resume PDF', security: secured, requestBody: multipartBody('resume', 'PDF file (max 10MB)'), responses: { 200: ok('Resume updated') } } },

    // ------------------------------------------------------------ Projects
    '/projects': {
      post: {
        tags: ['Projects'], summary: 'Create a project', security: secured,
        requestBody: jsonBody({
          type: 'object', required: ['title', 'shortDescription'],
          properties: {
            title: { type: 'string', minLength: 3 }, shortDescription: { type: 'string', minLength: 10 }, detailedDescription: { type: 'string' },
            demoVideoUrl: { type: 'string', description: 'YouTube or Vimeo URL' }, liveUrl: { type: 'string' }, githubUrl: { type: 'string' },
            difficulty: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] }, status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
            isOpenSource: { type: 'boolean' }, categoryId: { type: 'string' },
            technologies: { type: 'array', items: { type: 'string' } }, tags: { type: 'array', items: { type: 'string' } },
          },
        }),
        responses: { 201: ok('Created'), 401: err('Unauthorized'), 422: err('Validation failed') },
      },
    },
    '/projects/{slug}': {
      get: { tags: ['Projects'], summary: 'Get project by slug', description: 'Includes author, category, technologies, tags, images, and the viewer relationship (like/bookmark/follow).', parameters: [pathParam('slug')], responses: { 200: ok('Project + viewerRelationship'), 404: err('Not found / hidden') } },
      put: { tags: ['Projects'], summary: 'Update project (owner)', security: secured, parameters: [pathParam('slug')], requestBody: jsonBody({ type: 'object', properties: { title: { type: 'string' }, shortDescription: { type: 'string' }, status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }, technologies: { type: 'array', items: { type: 'string' } } } }), responses: { 200: ok('Updated'), 403: err('Not the owner'), 404: err('Not found') } },
      delete: { tags: ['Projects'], summary: 'Delete project (owner, soft)', security: secured, parameters: [pathParam('slug')], responses: { 200: ok('Deleted'), 403: err('Not the owner') } },
    },
    '/projects/{slug}/status': { patch: { tags: ['Projects'], summary: 'Change status', security: secured, parameters: [pathParam('slug')], requestBody: jsonBody({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] } } }), responses: { 200: ok('Status changed'), 403: err('Not the owner') } } },
    '/projects/{slug}/duplicate': { post: { tags: ['Projects'], summary: 'Duplicate as a new draft', security: secured, parameters: [pathParam('slug')], responses: { 201: ok('Duplicated'), 403: err('Not the owner') } } },
    '/projects/{slug}/cover': { post: { tags: ['Projects'], summary: 'Upload cover image', security: secured, parameters: [pathParam('slug')], requestBody: multipartBody('image', 'Image file (max 5MB)'), responses: { 200: ok('Cover set') } } },
    '/projects/{slug}/architecture': { post: { tags: ['Projects'], summary: 'Upload architecture diagram', security: secured, parameters: [pathParam('slug')], requestBody: multipartBody('image', 'Image file (max 5MB)'), responses: { 200: ok('Diagram set') } } },
    '/projects/{slug}/gallery': { post: { tags: ['Projects'], summary: 'Add gallery images', security: secured, parameters: [pathParam('slug')], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { images: { type: 'array', items: { type: 'string', format: 'binary' } } } } } } }, responses: { 201: ok('Images added') } } },
    '/projects/{slug}/gallery/reorder': { patch: { tags: ['Projects'], summary: 'Reorder gallery', security: secured, parameters: [pathParam('slug')], requestBody: jsonBody({ type: 'object', required: ['order'], properties: { order: { type: 'array', items: { type: 'string' }, description: 'Image ids in the desired order' } } }), responses: { 200: ok('Reordered') } } },
    '/projects/{slug}/gallery/{imageId}': { delete: { tags: ['Projects'], summary: 'Delete a gallery image', security: secured, parameters: [pathParam('slug'), pathParam('imageId')], responses: { 200: ok('Deleted') } } },
    '/projects/{slug}/like': { post: { tags: ['Social'], summary: 'Toggle like', security: secured, parameters: [pathParam('slug')], responses: { 200: ok('{ liked, likeCount }'), 400: err('Cannot like own project') } } },
    '/projects/{slug}/bookmark': { post: { tags: ['Social'], summary: 'Toggle bookmark', security: secured, parameters: [pathParam('slug')], responses: { 200: ok('{ bookmarked, bookmarkCount }') } } },
    '/projects/{slug}/comments': {
      get: { tags: ['Comments'], summary: 'List comments (cursor)', parameters: [pathParam('slug'), ...cursorParams], responses: { 200: ok('Comments + replies') } },
      post: { tags: ['Comments'], summary: 'Add a comment', security: secured, parameters: [pathParam('slug')], requestBody: jsonBody({ type: 'object', required: ['content'], properties: { content: { type: 'string', maxLength: 2000 } } }), responses: { 201: ok('Comment added') } },
    },

    // ------------------------------------------------------------ Users (glue)
    '/users/{username}/projects': { get: { tags: ['Projects'], summary: 'A user projects', description: 'Owner also sees drafts via ?status=.', parameters: [pathParam('username'), queryParam('status', 'string', { enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }), ...cursorParams], responses: { 200: ok('Projects') } } },
    '/users/{username}/follow': { post: { tags: ['Social'], summary: 'Toggle follow', security: secured, parameters: [pathParam('username')], responses: { 200: ok('{ following, followerCount }'), 400: err('Cannot follow yourself') } } },
    '/users/{username}/followers': { get: { tags: ['Social'], summary: 'List followers (cursor)', parameters: [pathParam('username'), ...cursorParams], responses: { 200: ok('Followers') } } },
    '/users/{username}/following': { get: { tags: ['Social'], summary: 'List following (cursor)', parameters: [pathParam('username'), ...cursorParams], responses: { 200: ok('Following') } } },

    // ------------------------------------------------------------ Comments
    '/comments/{id}/replies': { post: { tags: ['Comments'], summary: 'Reply to a comment', security: secured, parameters: [pathParam('id')], requestBody: jsonBody({ type: 'object', required: ['content'], properties: { content: { type: 'string' } } }), responses: { 201: ok('Reply added'), 400: err('Replies are single-level') } } },
    '/comments/{id}': {
      put: { tags: ['Comments'], summary: 'Edit a comment (15-min window)', security: secured, parameters: [pathParam('id')], requestBody: jsonBody({ type: 'object', required: ['content'], properties: { content: { type: 'string' } } }), responses: { 200: ok('Updated'), 400: err('Edit window passed'), 403: err('Not the author') } },
      delete: { tags: ['Comments'], summary: 'Delete a comment', description: 'Allowed for the comment author, the project owner, or an admin.', security: secured, parameters: [pathParam('id')], responses: { 200: ok('Deleted'), 403: err('Not allowed') } },
    },

    // ------------------------------------------------------------ Discovery
    '/discover/trending': { get: { tags: ['Discovery'], summary: 'Trending projects', description: 'Score = likes*5 + views*1 + bookmarks*3 - age_days*2.', parameters: pageParams, responses: { 200: ok('Trending') } } },
    '/discover/featured': { get: { tags: ['Discovery'], summary: 'Featured projects', parameters: pageParams, responses: { 200: ok('Featured') } } },
    '/discover/newest': { get: { tags: ['Discovery'], summary: 'Newest projects (cursor)', parameters: cursorParams, responses: { 200: ok('Newest') } } },
    '/discover/recommended': { get: { tags: ['Discovery'], summary: 'Recommended for you', description: 'Overlaps the viewer skills & liked tags; falls back to trending when anonymous.', security: secured, parameters: cursorParams, responses: { 200: ok('Recommended') } } },
    '/search': {
      get: {
        tags: ['Discovery'], summary: 'Full-text search',
        parameters: [
          queryParam('q', 'string', {}), queryParam('category', 'string'), queryParam('difficulty', 'string', { enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] }),
          queryParam('tech', 'string'), queryParam('openSource', 'boolean'),
          queryParam('sort', 'string', { enum: ['relevance', 'newest', 'most_viewed', 'most_liked', 'recently_updated'] }), ...pageParams,
        ],
        responses: { 200: ok('Results (PageMeta)'), 422: err('Missing query') },
      },
    },
    '/search/autocomplete': { get: { tags: ['Discovery'], summary: 'Title autocomplete (top 5)', parameters: [queryParam('q', 'string', {})], responses: { 200: ok('Suggestions'), 422: err('Missing query') } } },
    '/search/popular': { get: { tags: ['Discovery'], summary: 'Popular searches (global)', responses: { 200: ok('Popular terms') } } },
    '/search/recent': { get: { tags: ['Discovery'], summary: 'Recent searches (per user)', security: secured, responses: { 200: ok('Recent terms'), 401: err('Unauthorized') } } },

    // ------------------------------------------------------------ Notifications
    '/notifications': { get: { tags: ['Notifications'], summary: 'List notifications (cursor)', description: 'Unread count in meta; LIKE notifications aggregated at read time.', security: secured, parameters: [...cursorParams, queryParam('unreadOnly', 'boolean')], responses: { 200: ok('Notifications') } } },
    '/notifications/read-all': { patch: { tags: ['Notifications'], summary: 'Mark all as read', security: secured, responses: { 200: ok('Marked') } } },
    '/notifications/preferences': {
      get: { tags: ['Notifications'], summary: 'Get email prefs', security: secured, responses: { 200: ok('Preferences') } },
      put: { tags: ['Notifications'], summary: 'Update email prefs', security: secured, requestBody: jsonBody({ type: 'object', properties: { LIKE: { type: 'boolean' }, COMMENT: { type: 'boolean' }, REPLY: { type: 'boolean' }, FOLLOW: { type: 'boolean' }, FEATURED: { type: 'boolean' }, ADMIN_MESSAGE: { type: 'boolean' } } }), responses: { 200: ok('Updated') } },
    },
    '/notifications/{id}/read': { patch: { tags: ['Notifications'], summary: 'Mark one as read', security: secured, parameters: [pathParam('id')], responses: { 200: ok('Marked') } } },
    '/notifications/{id}': { delete: { tags: ['Notifications'], summary: 'Delete a notification', security: secured, parameters: [pathParam('id')], responses: { 200: ok('Deleted') } } },

    // ------------------------------------------------------------ Analytics
    '/analytics/track': { post: { tags: ['Analytics'], summary: 'Track an event', description: 'Deduplicated per visitor per day (by IP or user id).', requestBody: jsonBody({ type: 'object', required: ['type', 'slug'], properties: { type: { type: 'string', enum: ['PROJECT_VIEW', 'DEMO_CLICK', 'GITHUB_CLICK'] }, slug: { type: 'string' } } }), responses: { 200: ok('{ counted }') } } },
    '/analytics/projects/{slug}': { get: { tags: ['Analytics'], summary: 'Project analytics (owner)', security: secured, parameters: [pathParam('slug'), queryParam('from', 'string', { format: 'date' }), queryParam('to', 'string', { format: 'date' })], responses: { 200: ok('Views, unique, CTRs, daily series'), 403: err('Not the owner') } } },
    '/analytics/dashboard': { get: { tags: ['Analytics'], summary: 'Developer dashboard', security: secured, responses: { 200: ok('Totals, top project, 7-day growth') } } },

    // ------------------------------------------------------------ Reports
    '/reports/projects/{slug}': { post: { tags: ['Reports'], summary: 'Report a project', security: secured, parameters: [pathParam('slug')], requestBody: reportBody, responses: { 201: ok('Reported (auto-hides at 3+ reports)'), 400: err('Cannot report own project'), 409: err('Already reported') } } },
    '/reports/comments/{id}': { post: { tags: ['Reports'], summary: 'Report a comment', security: secured, parameters: [pathParam('id')], requestBody: reportBody, responses: { 201: ok('Reported'), 409: err('Already reported') } } },

    // ------------------------------------------------------------ Admin
    '/admin/dashboard': { get: { tags: ['Admin'], summary: 'Dashboard stats', security: secured, responses: { 200: ok('Totals, growth %, daily series'), 403: err('Forbidden') } } },
    '/admin/audit': { get: { tags: ['Admin'], summary: 'Audit log', security: secured, parameters: pageParams, responses: { 200: ok('Audit entries'), 403: err('Forbidden') } } },
    '/admin/users': { get: { tags: ['Admin'], summary: 'List users', security: secured, parameters: [queryParam('q', 'string'), queryParam('role', 'string', { enum: ROLES }), queryParam('banned', 'boolean'), ...pageParams], responses: { 200: ok('Users'), 403: err('Forbidden') } } },
    '/admin/users/{id}/ban': { patch: { tags: ['Admin'], summary: 'Ban / unban user', security: secured, parameters: [pathParam('id')], requestBody: jsonBody({ type: 'object', required: ['banned'], properties: { banned: { type: 'boolean' } } }), responses: { 200: ok('Updated'), 400: err('Cannot ban yourself') } } },
    '/admin/users/{id}/role': { patch: { tags: ['Admin'], summary: 'Change role', security: secured, parameters: [pathParam('id')], requestBody: jsonBody({ type: 'object', required: ['role'], properties: { role: { type: 'string', enum: ROLES } } }), responses: { 200: ok('Updated') } } },
    '/admin/users/{id}': { delete: { tags: ['Admin'], summary: 'Delete user (soft)', security: secured, parameters: [pathParam('id')], responses: { 200: ok('Deleted') } } },
    '/admin/projects': { get: { tags: ['Admin'], summary: 'List projects', security: secured, parameters: [queryParam('q', 'string'), queryParam('status', 'string', { enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }), queryParam('hidden', 'boolean'), ...pageParams], responses: { 200: ok('Projects') } } },
    '/admin/projects/{id}/feature': { patch: { tags: ['Admin'], summary: 'Feature / unfeature', security: secured, parameters: [pathParam('id')], requestBody: jsonBody({ type: 'object', required: ['featured'], properties: { featured: { type: 'boolean' } } }), responses: { 200: ok('Updated') } } },
    '/admin/projects/{id}': { delete: { tags: ['Admin'], summary: 'Delete project (soft)', security: secured, parameters: [pathParam('id')], responses: { 200: ok('Deleted') } } },
    '/admin/reports': { get: { tags: ['Admin'], summary: 'List reports', security: secured, parameters: [queryParam('status', 'string', { enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'] }), queryParam('type', 'string', { enum: REPORT_REASONS }), queryParam('targetType', 'string', { enum: ['PROJECT', 'COMMENT'] }), ...pageParams], responses: { 200: ok('Reports (enriched with target)') } } },
    '/admin/reports/{id}': { patch: { tags: ['Admin'], summary: 'Resolve / dismiss report', security: secured, parameters: [pathParam('id')], requestBody: jsonBody({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['REVIEWED', 'RESOLVED', 'DISMISSED'] }, adminNotes: { type: 'string' }, action: { type: 'string', enum: ['NONE', 'HIDE_PROJECT', 'UNHIDE_PROJECT', 'DELETE_PROJECT', 'DELETE_COMMENT'] } } }), responses: { 200: ok('Report updated') } } },
    '/admin/categories': {
      get: { tags: ['Admin'], summary: 'List categories', security: secured, responses: { 200: ok('Categories') } },
      post: { tags: ['Admin'], summary: 'Create category', security: secured, requestBody: jsonBody({ type: 'object', required: ['name'], properties: { name: { type: 'string' }, slug: { type: 'string' }, description: { type: 'string' } } }), responses: { 201: ok('Created') } },
    },
    '/admin/categories/{id}': {
      put: { tags: ['Admin'], summary: 'Update category', security: secured, parameters: [pathParam('id')], requestBody: jsonBody({ type: 'object', properties: { name: { type: 'string' }, slug: { type: 'string' }, description: { type: 'string' } } }), responses: { 200: ok('Updated') } },
      delete: { tags: ['Admin'], summary: 'Delete category', security: secured, parameters: [pathParam('id')], responses: { 200: ok('Deleted') } },
    },
    '/admin/technologies': {
      get: { tags: ['Admin'], summary: 'List technologies', security: secured, responses: { 200: ok('Technologies') } },
      post: { tags: ['Admin'], summary: 'Create technology', security: secured, requestBody: jsonBody({ type: 'object', required: ['name'], properties: { name: { type: 'string' }, slug: { type: 'string' }, iconUrl: { type: 'string' } } }), responses: { 201: ok('Created') } },
    },
    '/admin/technologies/merge': { post: { tags: ['Admin'], summary: 'Merge duplicate technologies', description: 'Moves all project links from source to target, then deletes source.', security: secured, requestBody: jsonBody({ type: 'object', required: ['sourceId', 'targetId'], properties: { sourceId: { type: 'string' }, targetId: { type: 'string' } } }), responses: { 200: ok('Merged'), 400: err('Cannot merge into itself') } } },
    '/admin/technologies/{id}': {
      put: { tags: ['Admin'], summary: 'Update technology', security: secured, parameters: [pathParam('id')], requestBody: jsonBody({ type: 'object', properties: { name: { type: 'string' }, slug: { type: 'string' }, iconUrl: { type: 'string' } } }), responses: { 200: ok('Updated') } },
      delete: { tags: ['Admin'], summary: 'Delete technology', security: secured, parameters: [pathParam('id')], responses: { 200: ok('Deleted') } },
    },

    // ------------------------------------------------------------ AI
    '/ai/summarize': { post: { tags: ['AI'], summary: 'Summarize a description', security: secured, requestBody: jsonBody({ type: 'object', required: ['text'], properties: { text: { type: 'string', minLength: 20 } } }), responses: { 200: ok('{ summary }'), 400: err('AI not configured'), 429: err('AI quota exceeded') } } },
    '/ai/improve-description': { post: { tags: ['AI'], summary: 'Improve grammar/clarity/tone', security: secured, requestBody: jsonBody({ type: 'object', required: ['text'], properties: { text: { type: 'string', minLength: 20 } } }), responses: { 200: ok('{ improved, changes }'), 429: err('AI quota exceeded') } } },
    '/ai/suggest-tags': { post: { tags: ['AI'], summary: 'Suggest technology tags', security: secured, requestBody: jsonBody({ type: 'object', required: ['text'], properties: { text: { type: 'string', minLength: 20 } } }), responses: { 200: ok('{ tags }') } } },
    '/ai/generate-readme': { post: { tags: ['AI'], summary: 'Generate a README', security: secured, requestBody: jsonBody({ type: 'object', required: ['title', 'description'], properties: { title: { type: 'string' }, description: { type: 'string' }, technologies: { type: 'array', items: { type: 'string' } }, features: { type: 'array', items: { type: 'string' } }, installation: { type: 'string' } } }), responses: { 200: ok('{ readme }') } } },
    '/ai/interview-questions': { post: { tags: ['AI'], summary: 'Generate interview questions', security: secured, requestBody: jsonBody({ type: 'object', properties: { technologies: { type: 'array', items: { type: 'string' } }, challenges: { type: 'string' } } }), responses: { 200: ok('{ questions }'), 422: err('Provide technologies and/or challenges') } } },
    '/ai/seo-suggestions': { post: { tags: ['AI'], summary: 'SEO optimization suggestions', security: secured, requestBody: jsonBody({ type: 'object', required: ['title', 'description'], properties: { title: { type: 'string' }, description: { type: 'string' } } }), responses: { 200: ok('{ seoTitle, metaDescription, keywords, suggestions }') } } },
  },
};

export const openApiSpec = swaggerJsdoc({ definition, apis: [] });
