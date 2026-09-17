import { PrismaClient, Role, AuthProvider, ProjectStatus, ProjectDifficulty } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed script — realistic demo data so the API is immediately explorable.
 *   • 5 users (1 admin, 4 developers), all email-verified
 *   • Categories + technologies
 *   • 15 published projects spread across authors
 *   • Tags, likes, bookmarks, follows, comments
 *
 * Run with: npm run prisma:seed
 * Default password for every seeded user: Password123!
 */

const DEFAULT_PASSWORD = 'Password123!';

const USERS = [
  { email: 'admin@projectsphere.dev', username: 'admin', name: 'Site Admin', role: Role.ADMIN, headline: 'Platform Administrator' },
  { email: 'midhu@projectsphere.dev', username: 'midhu', name: 'Midhuvarsan', role: Role.DEVELOPER, headline: 'Full-Stack Java & Node Developer' },
  { email: 'aisha@projectsphere.dev', username: 'aisha', name: 'Aisha Khan', role: Role.DEVELOPER, headline: 'Frontend Engineer • React & TypeScript' },
  { email: 'leo@projectsphere.dev', username: 'leo', name: 'Leo Martins', role: Role.DEVELOPER, headline: 'ML Engineer • Python & PyTorch' },
  { email: 'sara@projectsphere.dev', username: 'sara', name: 'Sara Okafor', role: Role.RECRUITER, headline: 'Tech Recruiter @ NovaLabs' },
];

const CATEGORIES = [
  { name: 'Web Application', slug: 'web-application' },
  { name: 'Mobile App', slug: 'mobile-app' },
  { name: 'AI / Machine Learning', slug: 'ai-ml' },
  { name: 'Developer Tools', slug: 'developer-tools' },
  { name: 'API / Backend', slug: 'api-backend' },
];

const TECHNOLOGIES = [
  'React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Prisma',
  'Spring Boot', 'Java', 'Python', 'PyTorch', 'Docker', 'Redis',
  'Next.js', 'TailwindCSS', 'GraphQL',
];

const PROJECT_SEEDS = [
  { title: 'AgroFinance — AI Credit Platform', category: 'api-backend', difficulty: ProjectDifficulty.ADVANCED, tech: ['Spring Boot', 'Java', 'PostgreSQL', 'Redis'], tags: ['fintech', 'ai', 'agriculture'] },
  { title: 'ProjectSphere', category: 'web-application', difficulty: ProjectDifficulty.ADVANCED, tech: ['Node.js', 'Express', 'TypeScript', 'Prisma', 'PostgreSQL'], tags: ['portfolio', 'social'] },
  { title: 'DevBoard — Kanban for Teams', category: 'web-application', difficulty: ProjectDifficulty.INTERMEDIATE, tech: ['React', 'TypeScript', 'Node.js'], tags: ['productivity'] },
  { title: 'SnapNote', category: 'mobile-app', difficulty: ProjectDifficulty.BEGINNER, tech: ['React', 'TypeScript'], tags: ['notes', 'mobile'] },
  { title: 'VisionSort — Image Classifier', category: 'ai-ml', difficulty: ProjectDifficulty.ADVANCED, tech: ['Python', 'PyTorch', 'Docker'], tags: ['computer-vision', 'ml'] },
  { title: 'QueryLens — SQL Explainer', category: 'developer-tools', difficulty: ProjectDifficulty.INTERMEDIATE, tech: ['Node.js', 'TypeScript', 'PostgreSQL'], tags: ['database', 'devtools'] },
  { title: 'PixelForge — Design System', category: 'developer-tools', difficulty: ProjectDifficulty.INTERMEDIATE, tech: ['React', 'TailwindCSS', 'TypeScript'], tags: ['design', 'ui'] },
  { title: 'GraphMart — E-commerce API', category: 'api-backend', difficulty: ProjectDifficulty.ADVANCED, tech: ['Node.js', 'GraphQL', 'PostgreSQL'], tags: ['ecommerce', 'graphql'] },
  { title: 'MoodMeter — Sentiment API', category: 'ai-ml', difficulty: ProjectDifficulty.INTERMEDIATE, tech: ['Python', 'Docker'], tags: ['nlp', 'ml'] },
  { title: 'NextShop Storefront', category: 'web-application', difficulty: ProjectDifficulty.INTERMEDIATE, tech: ['Next.js', 'React', 'TailwindCSS'], tags: ['ecommerce'] },
  { title: 'CacheFlow — Rate Limiter', category: 'developer-tools', difficulty: ProjectDifficulty.ADVANCED, tech: ['Node.js', 'Redis', 'TypeScript'], tags: ['infra', 'performance'] },
  { title: 'FitTrack', category: 'mobile-app', difficulty: ProjectDifficulty.BEGINNER, tech: ['React', 'TypeScript'], tags: ['health', 'mobile'] },
  { title: 'DocuMind — PDF Q&A', category: 'ai-ml', difficulty: ProjectDifficulty.ADVANCED, tech: ['Python', 'PyTorch', 'Docker'], tags: ['rag', 'llm'] },
  { title: 'AuthKit — Drop-in Auth', category: 'api-backend', difficulty: ProjectDifficulty.INTERMEDIATE, tech: ['Node.js', 'Express', 'Prisma'], tags: ['auth', 'security'] },
  { title: 'ChartPilot — Analytics UI', category: 'web-application', difficulty: ProjectDifficulty.INTERMEDIATE, tech: ['React', 'TypeScript', 'TailwindCSS'], tags: ['dataviz', 'dashboard'] },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Clean slate (order matters for FKs; most cascade, but be explicit).
  await prisma.analyticsEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.projectTag.deleteMany();
  await prisma.projectTechnology.deleteMany();
  await prisma.projectImage.deleteMany();
  await prisma.project.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.technology.deleteMany();
  await prisma.category.deleteMany();
  await prisma.emailToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // Users + profiles
  const users = [];
  for (const u of USERS) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        username: u.username,
        passwordHash,
        role: u.role,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        profile: {
          create: {
            name: u.name,
            headline: u.headline,
            bio: `Hi, I'm ${u.name}. This is a seeded demo profile for ProjectSphere.`,
            location: 'Remote',
            skills: ['TypeScript', 'Node.js', 'React'],
            openToWork: u.role === Role.DEVELOPER,
            completionPercentage: 70,
          },
        },
      },
    });
    users.push(user);
  }
  console.log(`   ✓ ${users.length} users`);

  // Categories
  const categoryMap = new Map<string, string>();
  for (const c of CATEGORIES) {
    const cat = await prisma.category.create({ data: c });
    categoryMap.set(c.slug, cat.id);
  }

  // Technologies
  const techMap = new Map<string, string>();
  for (const name of TECHNOLOGIES) {
    const tech = await prisma.technology.create({ data: { name, slug: slugify(name) } });
    techMap.set(name, tech.id);
  }
  console.log(`   ✓ ${categoryMap.size} categories, ${techMap.size} technologies`);

  // Tags (collected from project seeds)
  const tagMap = new Map<string, string>();
  const allTags = [...new Set(PROJECT_SEEDS.flatMap((p) => p.tags))];
  for (const name of allTags) {
    const tag = await prisma.tag.create({ data: { name, slug: slugify(name) } });
    tagMap.set(name, tag.id);
  }

  // Projects (round-robin authors among the developers)
  const devs = users.filter((u) => u.role === Role.DEVELOPER);
  const projects = [];
  for (let i = 0; i < PROJECT_SEEDS.length; i++) {
    const seed = PROJECT_SEEDS[i];
    const author = devs[i % devs.length];
    const project = await prisma.project.create({
      data: {
        authorId: author.id,
        title: seed.title,
        slug: slugify(seed.title),
        shortDescription: `${seed.title} — a portfolio project showcasing ${seed.tech.slice(0, 2).join(' + ')}.`,
        detailedDescription: `## Overview\n\n${seed.title} demonstrates end-to-end engineering: clean architecture, tests, and a polished UX. Built with ${seed.tech.join(', ')}.`,
        problemStatement: 'Users needed a faster, cleaner way to accomplish this task.',
        solution: 'A well-architected solution with a focus on performance and DX.',
        difficulty: seed.difficulty,
        status: ProjectStatus.PUBLISHED,
        isFeatured: i < 3,
        isOpenSource: i % 2 === 0,
        githubUrl: `https://github.com/example/${slugify(seed.title)}`,
        publishedAt: new Date(Date.now() - i * 86_400_000),
        categoryId: categoryMap.get(seed.category) ?? null,
        viewCount: Math.floor(Math.random() * 500),
        technologies: {
          create: seed.tech.map((t) => ({ technologyId: techMap.get(t)! })).filter((x) => x.technologyId),
        },
        tags: {
          create: seed.tags.map((t) => ({ tagId: tagMap.get(t)! })).filter((x) => x.tagId),
        },
      },
    });
    projects.push(project);
  }
  console.log(`   ✓ ${projects.length} projects`);

  // Likes, bookmarks, comments, follows
  let likeCount = 0;
  let commentCount = 0;
  for (const project of projects) {
    for (const user of users) {
      if (user.id === project.authorId) continue;
      if (Math.random() > 0.5) {
        await prisma.like.create({ data: { userId: user.id, projectId: project.id } });
        likeCount++;
      }
      if (Math.random() > 0.7) {
        await prisma.bookmark.create({ data: { userId: user.id, projectId: project.id } });
      }
      if (Math.random() > 0.6) {
        await prisma.comment.create({
          data: {
            projectId: project.id,
            authorId: user.id,
            content: 'Really clean implementation — love the architecture decisions here!',
          },
        });
        commentCount++;
      }
    }
    // keep denormalized counters consistent with seeded rows
    const [likes, comments, bookmarks] = await Promise.all([
      prisma.like.count({ where: { projectId: project.id } }),
      prisma.comment.count({ where: { projectId: project.id } }),
      prisma.bookmark.count({ where: { projectId: project.id } }),
    ]);
    await prisma.project.update({
      where: { id: project.id },
      data: { likeCount: likes, commentCount: comments, bookmarkCount: bookmarks },
    });
  }

  // Demo reports so the admin moderation queue isn't empty.
  const reportables = await prisma.project.findMany({ take: 4, orderBy: { createdAt: 'asc' } });
  const reporters = [devs[1], devs[2]].filter(Boolean);
  let reportCount = 0;
  const reasons = ['SPAM', 'INAPPROPRIATE', 'COPYRIGHT'] as const;
  for (const proj of reportables) {
    for (const reporter of reporters) {
      if (proj.authorId === reporter.id) continue;
      await prisma.report.create({
        data: {
          reporterId: reporter.id,
          targetType: 'PROJECT',
          targetId: proj.id,
          reason: reasons[reportCount % reasons.length],
          details: 'Flagged during seed for moderation-panel demo.',
          status: 'PENDING',
        },
      });
      reportCount++;
      break; // one report per project is enough for the demo
    }
  }

  // Follow graph: everyone follows the first developer.
  const hub = devs[0];
  for (const user of users) {
    if (user.id === hub.id) continue;
    await prisma.follow.create({ data: { followerId: user.id, followingId: hub.id } });
  }

  console.log(`   ✓ ${likeCount} likes, ${commentCount} comments, ${reportCount} reports, follows created`);
  console.log('✅ Seed complete.');
  console.log(`\n   Login with any user, e.g. midhu@projectsphere.dev / ${DEFAULT_PASSWORD}\n`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
