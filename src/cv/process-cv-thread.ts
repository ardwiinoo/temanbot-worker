import { eq } from "drizzle-orm";

import { parseCvProfile } from "../ai/gemini";
import { db } from "../db/client";
import { cvProfiles, cvRecommendations, cvThreads } from "../db/schema";
import {
  buildCvExtractedTextPath,
  downloadBufferFromGCS,
  uploadTextToGCS,
} from "../storage/gcs";
import { extractTextFromPdfBuffer, getCvTextForAi } from "./extract-text";
import { buildCvRecommendations } from "./recommendations";

export async function processCvThread(threadId: string) {
  const [thread] = await db
    .select()
    .from(cvThreads)
    .where(eq(cvThreads.id, threadId))
    .limit(1);

  if (!thread) {
    throw new Error("CV thread not found");
  }

  if (!thread.rawFilePath) {
    throw new Error("CV thread raw_file_path is empty");
  }

  await db
    .update(cvThreads)
    .set({
      status: "processing",
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(cvThreads.id, threadId));

  try {
    const rawBuffer = await downloadBufferFromGCS(thread.rawFilePath);

    const extracted = await extractTextFromPdfBuffer(rawBuffer);

    const extractedTextPath = buildCvExtractedTextPath({
      workspaceId: thread.workspaceId,
      guestToken: thread.guestToken,
      threadId,
    });

    await uploadTextToGCS({
      objectPath: extractedTextPath,
      text: extracted.cleanText,
    });

    const cvTextForAi = getCvTextForAi(extracted.cleanText);

    const profile = await parseCvProfile(cvTextForAi);
    const recommendations = await buildCvRecommendations(profile);

    await db.transaction(async (tx) => {
        await tx
            .insert(cvProfiles)
            .values({
            cvThreadId: threadId,
            fullName: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            location: profile.location,
            professionalTitle: profile.professional_title,
            summary: profile.summary,
            skills: profile.skills,
            experiences: profile.experiences,
            educations: profile.educations,
            projects: profile.projects,
            certifications: profile.certifications,
            languages: profile.languages,
            rawProfileJson: profile,
            })
            .onConflictDoUpdate({
            target: cvProfiles.cvThreadId,
            set: {
                fullName: profile.full_name,
                email: profile.email,
                phone: profile.phone,
                location: profile.location,
                professionalTitle: profile.professional_title,
                summary: profile.summary,
                skills: profile.skills,
                experiences: profile.experiences,
                educations: profile.educations,
                projects: profile.projects,
                certifications: profile.certifications,
                languages: profile.languages,
                rawProfileJson: profile,
                updatedAt: new Date(),
            },
            });

        await tx
            .delete(cvRecommendations)
            .where(eq(cvRecommendations.cvThreadId, threadId));

        const recommendationRows = [
            {
            cvThreadId: threadId,
            type: "job_role" as const,
            title: "Recommended Job Roles",
            content: "AI-generated job role recommendations based on this CV.",
            dataJson: recommendations.recommended_roles,
            },
            {
            cvThreadId: threadId,
            type: "skill_gap" as const,
            title: "Skill Gaps",
            content: "AI-generated skill gap analysis based on this CV.",
            dataJson: recommendations.skill_gaps,
            },
            {
            cvThreadId: threadId,
            type: "cv_improvement" as const,
            title: "CV Improvement Suggestions",
            content: "AI-generated suggestions to improve this CV.",
            dataJson: recommendations.cv_improvements,
            },
        ];

        await tx.insert(cvRecommendations).values(recommendationRows);

        await tx
            .update(cvThreads)
            .set({
            status: "ready",
            extractedTextPath,
            extractedTextCharCount: extracted.charCount,
            processedAt: new Date(),
            errorMessage: null,
            updatedAt: new Date(),
            })
            .where(eq(cvThreads.id, threadId));
        });

    return {
      threadId,
      status: "ready" as const,
      extractedTextPath,
      extractedTextCharCount: extracted.charCount,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process CV thread";

    await db
      .update(cvThreads)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(cvThreads.id, threadId));

    throw error;
  }
}