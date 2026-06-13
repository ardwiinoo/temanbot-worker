import { GoogleGenAI, Type } from "@google/genai";

import {
  cvProfileSchema,
  cvRecommendationSchema,
  type CvProfile,
  type CvRecommendation,
} from "./cv-schema";
import {
  buildCvChatPrompt,
  buildCvProfilePrompt,
  buildCvRecommendationPrompt,
} from "./prompts";
import { config } from "../config";
import z from "zod";

const ai = new GoogleGenAI({
  vertexai: true,
  project: config.gcpProjectId,
  location: config.gcpRegion,
});

const model = config.geminiModel;

const cvProfileResponseSchema = {
  type: Type.OBJECT,
  properties: {
    full_name: { type: Type.STRING, nullable: true },
    email: { type: Type.STRING, nullable: true },
    phone: { type: Type.STRING, nullable: true },
    location: { type: Type.STRING, nullable: true },
    professional_title: { type: Type.STRING, nullable: true },
    summary: { type: Type.STRING },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    experiences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING, nullable: true },
          role: { type: Type.STRING, nullable: true },
          start_date: { type: Type.STRING, nullable: true },
          end_date: { type: Type.STRING, nullable: true },
          description: { type: Type.STRING },
          skills_used: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          "company",
          "role",
          "start_date",
          "end_date",
          "description",
          "skills_used",
        ],
      },
    },
    educations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING, nullable: true },
          degree: { type: Type.STRING, nullable: true },
          field: { type: Type.STRING, nullable: true },
          start_year: { type: Type.STRING, nullable: true },
          end_year: { type: Type.STRING, nullable: true },
        },
        required: ["institution", "degree", "field", "start_year", "end_year"],
      },
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, nullable: true },
          description: { type: Type.STRING },
          skills_used: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["name", "description", "skills_used"],
      },
    },
    certifications: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    languages: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    seniority_signal: {
      type: Type.STRING,
      enum: ["intern", "junior", "mid", "senior", "unknown"],
    },
    target_roles: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    search_keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    "full_name",
    "email",
    "phone",
    "location",
    "professional_title",
    "summary",
    "skills",
    "experiences",
    "educations",
    "projects",
    "certifications",
    "languages",
    "seniority_signal",
    "target_roles",
    "search_keywords",
  ],
};

const cvRecommendationResponseSchema = {
  type: Type.OBJECT,
  properties: {
    recommended_roles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          match_score: { type: Type.NUMBER },
          reason: { type: Type.STRING },
          matched_skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          missing_skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          search_keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          "role",
          "match_score",
          "reason",
          "matched_skills",
          "missing_skills",
          "search_keywords",
        ],
      },
    },
    skill_gaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING },
          priority: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
          },
          reason: { type: Type.STRING },
          learning_suggestion: { type: Type.STRING },
        },
        required: ["skill", "priority", "reason", "learning_suggestion"],
      },
    },
    cv_improvements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          area: { type: Type.STRING },
          suggestion: { type: Type.STRING },
        },
        required: ["area", "suggestion"],
      },
    },
  },
  required: ["recommended_roles", "skill_gaps", "cv_improvements"],
};

export async function parseCvProfile(cvText: string): Promise<CvProfile> {
  const response = await ai.models.generateContent({
    model,
    contents: buildCvProfilePrompt(cvText),
    config: {
      responseMimeType: "application/json",
      responseSchema: cvProfileResponseSchema,
      temperature: 0.2,
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned empty CV profile response");
  }

  const parsed = JSON.parse(text);
  return cvProfileSchema.parse(parsed);
}

export async function generateCvRecommendation(
  profile: CvProfile,
): Promise<CvRecommendation> {
  const response = await ai.models.generateContent({
    model,
    contents: buildCvRecommendationPrompt(profile),
    config: {
      responseMimeType: "application/json",
      responseSchema: cvRecommendationResponseSchema,
      temperature: 0.3,
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned empty recommendation response");
  }

  const parsed = JSON.parse(text);
  return cvRecommendationSchema.parse(parsed);
}

export const applicationKitGenerationSchema = z.object({
  match_report: z.object({
    match_score: z.number().min(0).max(100),
    summary: z.string(),
    matched_skills: z.array(z.string()),
    missing_skills: z.array(z.string()),
    ats_keywords: z.array(z.string()),
    risks: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
  documents: z.object({
    ats_cv: z.object({
      title: z.string(),
      content_markdown: z.string(),
    }),
    cover_letter: z.object({
      title: z.string(),
      content_markdown: z.string(),
    }),
    recruiter_message: z.object({
      title: z.string(),
      content_markdown: z.string(),
    }),
    interview_notes: z.object({
      title: z.string(),
      content_markdown: z.string(),
    }),
  }),
});

export type ApplicationKitGeneration = z.infer<
  typeof applicationKitGenerationSchema
>;

type GenerateApplicationKitInput = {
  cvProfile: unknown;
  recommendations: Array<{
    type: string;
    title: string;
    data: unknown;
  }>;
  jobTitle: string | null;
  companyName: string | null;
  jobDescription: string;
};

const applicationKitResponseSchema = {
  type: Type.OBJECT,
  properties: {
    match_report: {
      type: Type.OBJECT,
      properties: {
        match_score: {
          type: Type.NUMBER,
        },
        summary: {
          type: Type.STRING,
        },
        matched_skills: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        missing_skills: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        ats_keywords: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        risks: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        recommendations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        "match_score",
        "summary",
        "matched_skills",
        "missing_skills",
        "ats_keywords",
        "risks",
        "recommendations",
      ],
    },
    documents: {
      type: Type.OBJECT,
      properties: {
        ats_cv: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content_markdown: { type: Type.STRING },
          },
          required: ["title", "content_markdown"],
        },
        cover_letter: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content_markdown: { type: Type.STRING },
          },
          required: ["title", "content_markdown"],
        },
        recruiter_message: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content_markdown: { type: Type.STRING },
          },
          required: ["title", "content_markdown"],
        },
        interview_notes: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content_markdown: { type: Type.STRING },
          },
          required: ["title", "content_markdown"],
        },
      },
      required: [
        "ats_cv",
        "cover_letter",
        "recruiter_message",
        "interview_notes",
      ],
    },
  },
  required: ["match_report", "documents"],
};

export async function generateApplicationKit(
  input: GenerateApplicationKitInput,
): Promise<ApplicationKitGeneration> {
  const response = await ai.models.generateContent({
    model,
    contents: buildApplicationKitPrompt(input),
    config: {
      responseMimeType: "application/json",
      responseSchema: applicationKitResponseSchema,
      temperature: 0.35,
      maxOutputTokens: 8192,
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned empty Application Kit response");
  }

  const parsed = JSON.parse(text);

  return applicationKitGenerationSchema.parse(parsed);
}

function buildApplicationKitPrompt(input: GenerateApplicationKitInput) {
  return `
You are TemanBot, an AI career assistant.

Your task:
Generate a tailored Application Kit based on:
1. The candidate's parsed CV profile
2. Existing CV recommendations
3. The target job description

The Application Kit must help the candidate apply to this specific job.

Return ONLY valid JSON following the response schema.

Important rules:
- Be truthful. Do not invent work experience, companies, education, certifications, or achievements.
- You may reframe and improve wording, but do not fabricate facts.
- If exact metrics are not available, do not create fake numbers.
- Write in professional English.
- Make the ATS CV concise, structured, and recruiter-friendly.
- Optimize for ATS keywords from the job description.
- Cover letter should be specific to the role and company if company name is provided.
- Recruiter message should be short, casual-professional, and ready to send.
- Interview notes should help the candidate prepare based on CV vs JD gaps.

Target job:
Job title: ${input.jobTitle ?? "Not provided"}
Company: ${input.companyName ?? "Not provided"}

Job description:
${input.jobDescription}

Candidate CV profile JSON:
${JSON.stringify(input.cvProfile, null, 2)}

Existing CV recommendations JSON:
${JSON.stringify(input.recommendations, null, 2)}

Generate:
1. match_report:
   - match_score from 0 to 100
   - summary
   - matched_skills
   - missing_skills
   - ats_keywords
   - risks
   - recommendations

2. documents:
   - ats_cv:
     Markdown ATS CV draft tailored to the job.
     Include sections:
     # Candidate Name
     Professional Summary
     Core Skills
     Professional Experience
     Projects
     Education
     Certifications
     Additional Notes if needed

   - cover_letter:
     Markdown cover letter tailored to the job.

   - recruiter_message:
     Short markdown message for LinkedIn/email.

   - interview_notes:
     Markdown notes with likely interview questions and how candidate should prepare.
`;
}