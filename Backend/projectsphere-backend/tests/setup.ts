// Runs before each test file's imports, so config/env validation passes when a
// module under test (e.g. jwt) reads process.env.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/projectsphere_test?schema=public';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_at_least_32_characters_long';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_at_least_32_characters_long';
process.env.SMTP_HOST = process.env.SMTP_HOST ?? 'localhost';
process.env.SMTP_PORT = process.env.SMTP_PORT ?? '587';
process.env.SMTP_USER = process.env.SMTP_USER ?? 'test';
process.env.SMTP_PASS = process.env.SMTP_PASS ?? 'test';
process.env.MAIL_FROM_EMAIL = process.env.MAIL_FROM_EMAIL ?? 'no-reply@projectsphere.test';
