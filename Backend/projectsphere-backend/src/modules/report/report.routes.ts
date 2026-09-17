import type { Request, Response } from 'express';
import { Router } from 'express';
import { reportService } from './report.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { HttpStatus } from '../../shared/errors/errorCodes.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { createReportSchema } from './report.schema.js';

export const reportController = {
  async reportProject(req: Request, res: Response): Promise<void> {
    const result = await reportService.reportProject(
      req.user!.sub,
      req.params.slug,
      req.body.reason,
      req.body.details,
    );
    sendSuccess(res, result, 'Report submitted. Thank you for helping keep the platform safe.', HttpStatus.CREATED);
  },

  async reportComment(req: Request, res: Response): Promise<void> {
    const result = await reportService.reportComment(
      req.user!.sub,
      req.params.id,
      req.body.reason,
      req.body.details,
    );
    sendSuccess(res, result, 'Report submitted.', HttpStatus.CREATED);
  },
};

const router = Router();
router.post(
  '/projects/:slug',
  authenticate,
  validate({ body: createReportSchema }),
  asyncHandler(reportController.reportProject),
);
router.post(
  '/comments/:id',
  authenticate,
  validate({ body: createReportSchema }),
  asyncHandler(reportController.reportComment),
);

export default router;
