import type { CvProfile } from "./cv-schema";

export function buildCvProfilePrompt(cvText: string) {
  return `
You are an expert CV parser.

Extract the candidate profile from the CV text below.

Rules:
- Only use information explicitly present in the CV.
- Do not invent companies, dates, education, certifications, or skills.
- If a field is unknown, return null or an empty array.
- Normalize common skill names, for example "PostgreSQL", "React", "Next.js", "Go", "Docker".
- For target_roles, infer reasonable roles based on the CV, but keep them grounded in the candidate's experience and skills.
- For search_keywords, produce job-search-friendly keywords based on the candidate profile.

CV TEXT:
${cvText}
`.trim();
}

export function buildCvRecommendationPrompt(profile: CvProfile) {
  return `
You are a career advisor.

Given this structured CV profile, generate job role recommendations, skill gaps, and CV improvement suggestions.

Rules:
- Be realistic and practical.
- Do not recommend roles unrelated to the candidate profile.
- Match score must be 0-100.
- Missing skills should be relevant to the recommended role.
- Use concise explanations.
- Focus on actionable next steps.

CV PROFILE JSON:
${JSON.stringify(profile, null, 2)}
`.trim();
}

export function buildCvChatPrompt(input: {
  profile: CvProfile | unknown;
  recommendations: unknown[];
  recentMessages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  question: string;
}) {
  return `
You are a career assistant helping the user understand their CV.

Rules:
- Answer based on the CV profile and recommendations provided.
- Do not invent work experience, education, certifications, or achievements.
- If information is not available in the CV, say that it is not shown in the CV.
- Be practical and specific.
- If the user asks for career advice, explain the reasoning using their skills and experience.
- If the user asks to improve CV text, provide a clearer rewritten version.
- Keep the answer concise but helpful.

CV PROFILE:
${JSON.stringify(input.profile, null, 2)}

CV RECOMMENDATIONS:
${JSON.stringify(input.recommendations, null, 2)}

RECENT CHAT:
${JSON.stringify(input.recentMessages, null, 2)}

USER QUESTION:
${input.question}
`.trim();
}