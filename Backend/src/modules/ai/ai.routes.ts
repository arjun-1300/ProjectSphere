import { Router } from 'express';
import { aiController } from './ai.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { aiLimiter } from '../../middleware/rateLimiters.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  summarizeSchema,
  improveDescriptionSchema,
  suggestTagsSchema,
  generateReadmeSchema,
  interviewQuestionsSchema,
  seoSuggestionsSchema,
} from './ai.schema.js';

const router = Router();

// All AI endpoints require auth and share a per-user hourly quota.
router.use(authenticate, aiLimiter);

router.post('/summarize', validate({ body: summarizeSchema }), asyncHandler(aiController.summarize));
router.post('/improve-description', validate({ body: improveDescriptionSchema }), asyncHandler(aiController.improveDescription));
router.post('/suggest-tags', validate({ body: suggestTagsSchema }), asyncHandler(aiController.suggestTags));
router.post('/generate-readme', validate({ body: generateReadmeSchema }), asyncHandler(aiController.generateReadme));
router.post('/interview-questions', validate({ body: interviewQuestionsSchema }), asyncHandler(aiController.interviewQuestions));
router.post('/seo-suggestions', validate({ body: seoSuggestionsSchema }), asyncHandler(aiController.seoSuggestions));

export default router;
