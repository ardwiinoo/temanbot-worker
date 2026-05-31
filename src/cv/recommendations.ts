import { generateCvRecommendation } from "../ai/gemini";
import type { CvProfile, CvRecommendation } from "../ai/cv-schema";

export async function buildCvRecommendations(
  profile: CvProfile,
): Promise<CvRecommendation> {
  const recommendation = await generateCvRecommendation(profile);

  return {
    recommended_roles: recommendation.recommended_roles.slice(0, 5),
    skill_gaps: recommendation.skill_gaps.slice(0, 8),
    cv_improvements: recommendation.cv_improvements.slice(0, 8),
  };
}