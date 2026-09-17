import { Router } from 'express';
import { healthController } from './health.controller.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(healthController.check));

export default router;
