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