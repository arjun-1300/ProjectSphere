import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  userListQuerySchema,
  banUserSchema,
  changeRoleSchema,
  projectAdminListQuerySchema,
  featureProjectSchema,
  reportListQuerySchema,
  resolveReportSchema,
  createCategorySchema,
  updateCategorySchema,
  createTechnologySchema,
  updateTechnologySchema,
  mergeTechnologySchema,
} from './admin.schema.js';

const router = Router();

// Gate the entire admin surface behind authentication + ADMIN role.
router.use(authenticate, authorize('ADMIN'));

// Dashboard & audit
router.get('/dashboard', asyncHandler(adminController.dashboard));
router.get('/audit', asyncHandler(adminController.auditLog));

// Users
router.get('/users', validate({ query: userListQuerySchema }), asyncHandler(adminController.listUsers));
router.patch('/users/:id/ban', validate({ body: banUserSchema }), asyncHandler(adminController.banUser));
router.patch('/users/:id/role', validate({ body: changeRoleSchema }), asyncHandler(adminController.changeRole));
router.delete('/users/:id', asyncHandler(adminController.deleteUser));

// Projects
router.get('/projects', validate({ query: projectAdminListQuerySchema }), asyncHandler(adminController.listProjects));
router.patch('/projects/:id/feature', validate({ body: featureProjectSchema }), asyncHandler(adminController.featureProject));
router.delete('/projects/:id', asyncHandler(adminController.deleteProject));

// Reports
router.get('/reports', validate({ query: reportListQuerySchema }), asyncHandler(adminController.listReports));
router.patch('/reports/:id', validate({ body: resolveReportSchema }), asyncHandler(adminController.resolveReport));

// Categories (CRUD)
router.get('/categories', asyncHandler(adminController.listCategories));
router.post('/categories', validate({ body: createCategorySchema }), asyncHandler(adminController.createCategory));
router.put('/categories/:id', validate({ body: updateCategorySchema }), asyncHandler(adminController.updateCategory));
router.delete('/categories/:id', asyncHandler(adminController.deleteCategory));

// Technologies (CRUD + merge)
router.get('/technologies', asyncHandler(adminController.listTechnologies));
router.post('/technologies', validate({ body: createTechnologySchema }), asyncHandler(adminController.createTechnology));
router.post('/technologies/merge', validate({ body: mergeTechnologySchema }), asyncHandler(adminController.mergeTechnologies));
router.put('/technologies/:id', validate({ body: updateTechnologySchema }), asyncHandler(adminController.updateTechnology));
router.delete('/technologies/:id', asyncHandler(adminController.deleteTechnology));

export default router;
