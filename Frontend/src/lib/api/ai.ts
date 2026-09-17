import { http, unwrap } from './client';
import type { ApiResponse } from './types';

export const aiApi = {
  summarize: (text: string) => unwrap<{ summary: string }>(http.post<ApiResponse<{ summary: string }>>('/ai/summarize', { text })),
  improveDescription: (text: string) => unwrap<{ improved: string; changes: string[] }>(http.post<ApiResponse<{ improved: string; changes: string[] }>>('/ai/improve-description', { text })),
  suggestTags: (text: string) => unwrap<{ tags: string[] }>(http.post<ApiResponse<{ tags: string[] }>>('/ai/suggest-tags', { text })),
  generateReadme: (p: { title: string; description: string; technologies?: string[]; features?: string[]; installation?: string }) =>
    unwrap<{ readme: string }>(http.post<ApiResponse<{ readme: string }>>('/ai/generate-readme', p)),
  interviewQuestions: (p: { technologies?: string[]; challenges?: string }) =>
    unwrap<{ questions: { question: string; answer: string }[] }>(http.post<ApiResponse<{ questions: { question: string; answer: string }[] }>>('/ai/interview-questions', p)),
  seoSuggestions: (p: { title: string; description: string }) =>
    unwrap<{ seoTitle: string; metaDescription: string; keywords: string[]; suggestions: string[] }>(http.post<ApiResponse<{ seoTitle: string; metaDescription: string; keywords: string[]; suggestions: string[] }>>('/ai/seo-suggestions', p)),
};
