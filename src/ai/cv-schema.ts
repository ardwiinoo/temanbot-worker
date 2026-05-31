import { z } from "zod";

export const cvProfileSchema = z.object({
  full_name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  professional_title: z.string().nullable(),
  summary: z.string(),

  skills: z.array(z.string()).default([]),

  experiences: z
    .array(
      z.object({
        company: z.string().nullable(),
        role: z.string().nullable(),
        start_date: z.string().nullable(),
        end_date: z.string().nullable(),
        description: z.string(),
        skills_used: z.array(z.string()).default([]),
      }),
    )
    .default([]),

  educations: z
    .array(
      z.object({
        institution: z.string().nullable(),
        degree: z.string().nullable(),
        field: z.string().nullable(),
        start_year: z.string().nullable(),
        end_year: z.string().nullable(),
      }),
    )
    .default([]),

  projects: z
    .array(
      z.object({
        name: z.string().nullable(),
        description: z.string(),
        skills_used: z.array(z.string()).default([]),
      }),
    )
    .default([]),

  certifications: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),

  seniority_signal: z.enum(["intern", "junior", "mid", "senior", "unknown"]),
  target_roles: z.array(z.string()).default([]),
  search_keywords: z.array(z.string()).default([]),
});

export type CvProfile = z.infer<typeof cvProfileSchema>;

export const cvRecommendationSchema = z.object({
  recommended_roles: z
    .array(
      z.object({
        role: z.string(),
        match_score: z.number().min(0).max(100),
        reason: z.string(),
        matched_skills: z.array(z.string()).default([]),
        missing_skills: z.array(z.string()).default([]),
        search_keywords: z.array(z.string()).default([]),
      }),
    )
    .default([]),

  skill_gaps: z
    .array(
      z.object({
        skill: z.string(),
        priority: z.enum(["low", "medium", "high"]),
        reason: z.string(),
        learning_suggestion: z.string(),
      }),
    )
    .default([]),

  cv_improvements: z
    .array(
      z.object({
        area: z.string(),
        suggestion: z.string(),
      }),
    )
    .default([]),
});

export type CvRecommendation = z.infer<typeof cvRecommendationSchema>;