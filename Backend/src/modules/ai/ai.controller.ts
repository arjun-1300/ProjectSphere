import type { Request, Response } from 'express';
import { aiService } from './ai.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export const aiController = {
  async summarize(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await aiService.summarize(req.body.text), 'Summary generated');
  },
  async improveDescription(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await aiService.improveDescription(req.body.text), 'Description improved');
  },
  async suggestTags(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await aiService.suggestTags(req.body.text), 'Tags suggested');
  },
  async generateReadme(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await aiService.generateReadme(req.body), 'README generated');
  },
  async interviewQuestions(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await aiService.interviewQuestions(req.body), 'Interview questions generated');
  },
  async seoSuggestions(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await aiService.seoSuggestions(req.body), 'SEO suggestions generated');
  },
};
