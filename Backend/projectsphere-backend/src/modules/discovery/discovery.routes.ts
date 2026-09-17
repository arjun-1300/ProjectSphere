import { Router } from 'express';
import { discoveryController } from './discovery.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  searchQuerySchema,
  autocompleteQuerySchema,
  feedQuerySchema,
  cursorFeedQuerySchema,
} from './discovery.schema.js';

// /discover/*
export const discoverRouter = Router();
discoverRouter.get('/trending', validate({ query: feedQuerySchema }), asyncHandler(discoveryController.trending));
discoverRouter.get('/featured', validate({ query: feedQuerySchema }), asyncHandler(discoveryController.featured));
discoverRouter.get('/newest', validate({ query: cursorFeedQuerySchema }), asyncHandler(discoveryController.newest));
discoverRouter.get(
  '/recommended',
  optionalAuth,
  validate({ query: cursorFeedQuerySchema }),
  asyncHandler(discoveryController.recommended),
);

// /search/*
export const searchRouter = Router();
searchRouter.get('/', optionalAuth, validate({ query: searchQuerySchema }), asyncHandler(discoveryController.search));
searchRouter.get(
  '/autocomplete',
  validate({ query: autocompleteQuerySchema }),
  asyncHandler(discoveryController.autocomplete),
);
searchRouter.get('/popular', asyncHandler(discoveryController.popularSearches));
searchRouter.get('/recent', authenticate, asyncHandler(discoveryController.recentSearches));
