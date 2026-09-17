import { generateJson } from './gemini.client.js';

/**
 * Each method builds a focused prompt that instructs Gemini to return JSON in a
 * specific shape, then parses it. The JSON contract lives in the prompt AND in
 * the return type, so the frontend gets predictable structured data every time.
 */
export const aiService = {
  summarize(text: string) {
    const prompt = `You are a technical writer. Summarize the following software project description in 2-3 concise sentences suitable for a project card. Return JSON: { "summary": string }.\n\nDESCRIPTION:\n${text}`;
    return generateJson<{ summary: string }>(prompt);
  },

  improveDescription(text: string) {
    const prompt = `You are an expert technical editor. Improve the grammar, clarity, and professional tone of the following project description WITHOUT inventing new facts. Return JSON: { "improved": string, "changes": string[] } where "changes" briefly lists what you changed.\n\nDESCRIPTION:\n${text}`;
    return generateJson<{ improved: string; changes: string[] }>(prompt, 0.3);
  },

  suggestTags(text: string) {
    const prompt = `Analyze the following project description and suggest relevant technology and topic tags (lowercase, single words or short hyphenated phrases). Return JSON: { "tags": string[] } with at most 12 tags.\n\nDESCRIPTION:\n${text}`;
    return generateJson<{ tags: string[] }>(prompt, 0.2);
  },

  generateReadme(input: {
    title: string;
    description: string;
    technologies: string[];
    features?: string[];
    installation?: string;
  }) {
    const prompt = `Generate a professional GitHub README in Markdown for this project. Include sections: title, overview, features, tech stack, installation, and usage. Use the provided data and do not invent unrelated features. Return JSON: { "readme": string } where "readme" is the full Markdown document.\n\nPROJECT DATA:\n${JSON.stringify(input, null, 2)}`;
    return generateJson<{ readme: string }>(prompt, 0.4);
  },

  interviewQuestions(input: { technologies?: string[]; challenges?: string }) {
    const prompt = `You are a senior engineer preparing a candidate for a technical interview about a project they built. Based on the technologies and challenges below, generate 6-8 likely interview questions with concise model answers. Return JSON: { "questions": [{ "question": string, "answer": string }] }.\n\nTECHNOLOGIES: ${JSON.stringify(input.technologies ?? [])}\nCHALLENGES: ${input.challenges ?? 'N/A'}`;
    return generateJson<{ questions: Array<{ question: string; answer: string }> }>(prompt, 0.5);
  },

  seoSuggestions(input: { title: string; description: string }) {
    const prompt = `You are an SEO specialist. For the following project page, suggest an optimized SEO title (<=60 chars), a meta description (<=155 chars), relevant keywords, and 3-5 concrete improvement suggestions. Return JSON: { "seoTitle": string, "metaDescription": string, "keywords": string[], "suggestions": string[] }.\n\nTITLE: ${input.title}\nDESCRIPTION: ${input.description}`;
    return generateJson<{
      seoTitle: string;
      metaDescription: string;
      keywords: string[];
      suggestions: string[];
    }>(prompt, 0.3);
  },
};
