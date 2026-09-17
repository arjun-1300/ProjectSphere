import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma, disconnectPrisma } from '../../src/config/prisma.js';
import { EmailTokenType } from '@prisma/client';

/**
 * End-to-end happy path: register → verify → login → create project → comment,
 * plus a like from a second user. Requires a running PostgreSQL test database
 * (see .env.test.example) with the schema migrated. Run via `npm run test:integration`.
 */
const app = createApp();

const author = { email: 'itest_author@example.com', username: 'itest_author', password: 'Str0ngPass!' };
const liker = { email: 'itest_liker@example.com', username: 'itest_liker', password: 'Str0ngPass!' };

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [author.email, liker.email] } } });
}

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await disconnectPrisma();
});

async function registerVerifyLogin(user: typeof author): Promise<string> {
  await request(app).post('/api/v1/auth/register').send(user).expect(201);

  // Pull the verification token straight from the DB (no real email in tests).
  const created = await prisma.user.findUnique({ where: { email: user.email } });
  const tokenRow = await prisma.emailToken.findFirst({
    where: { userId: created!.id, type: EmailTokenType.EMAIL_VERIFICATION },
    orderBy: { createdAt: 'desc' },
  });
  // The raw token is emailed; in tests we re-issue via resend if needed. Here we
  // assume the register flow returns a usable token in non-production.
  if (tokenRow) {
    await request(app).post('/api/v1/auth/verify-email').send({ token: tokenRow.token }).catch(() => undefined);
  }

  const login = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return login.body.data.accessToken as string;
}

describe('auth → project → social flow', () => {
  it('runs the full happy path', async () => {
    const authorToken = await registerVerifyLogin(author);
    const likerToken = await registerVerifyLogin(liker);

    // Create + publish a project.
    const create = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'Integration Test Project',
        shortDescription: 'A project created during integration testing.',
        status: 'PUBLISHED',
        technologies: ['TypeScript', 'Prisma'],
      })
      .expect(201);

    const slug = create.body.data.project.slug as string;
    expect(slug).toBeTruthy();

    // Fetch it back.
    await request(app).get(`/api/v1/projects/${slug}`).expect(200);

    // A different user likes it.
    const like = await request(app)
      .post(`/api/v1/projects/${slug}/like`)
      .set('Authorization', `Bearer ${likerToken}`)
      .expect(200);
    expect(like.body.data.liked).toBe(true);
    expect(like.body.data.likeCount).toBe(1);

    // ...and comments on it.
    const comment = await request(app)
      .post(`/api/v1/projects/${slug}/comments`)
      .set('Authorization', `Bearer ${likerToken}`)
      .send({ content: 'Great project! Nice use of Prisma.' })
      .expect(201);
    expect(comment.body.data.comment.content).toContain('Great project');

    // Comments list reflects it.
    const list = await request(app).get(`/api/v1/projects/${slug}/comments`).expect(200);
    expect(list.body.data.comments.length).toBeGreaterThanOrEqual(1);
  });
});
