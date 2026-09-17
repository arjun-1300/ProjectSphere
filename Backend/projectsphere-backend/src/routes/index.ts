import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import healthRoutes from '../modules/health/health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import profileRoutes from '../modules/profile/profile.routes.js';
import projectRoutes from '../modules/project/project.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import commentRoutes from '../modules/comment/comment.routes.js';
import notificationRoutes from '../modules/notification/notification.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import reportRoutes from '../modules/report/report.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import aiRoutes from '../modules/ai/ai.routes.js';
import { discoverRouter, searchRouter } from '../modules/discovery/discovery.routes.js';
import { openApiSpec } from '../config/swagger.js';

/**
 * Root API router. Every module mounts its own sub-router here, keeping this
 * file a single readable table of contents for the API surface.
 */
const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/profiles', profileRoutes);
router.use('/projects', projectRoutes);
router.use('/users', usersRoutes);
router.use('/comments', commentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/discover', discoverRouter);
router.use('/search', searchRouter);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);

// API documentation (interactive Swagger UI + raw OpenAPI spec).
router.get('/docs.json', (_req, res) => {
  res.json(openApiSpec);
});
router.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: 'ProjectSphere API Docs' }));

export default router;
