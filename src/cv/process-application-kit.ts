import { eq } from "drizzle-orm";

import { generateApplicationKit } from "../ai/gemini";
import { db } from "../db/client";
import {
  applicationKitDocuments,
  applicationKits,
  cvProfiles,
  cvRecommendations,
} from "../db/schema";
import { sha256 } from "../utils/hash";

type ApplicationDocumentDraft = {
  type: "ats_cv" | "cover_letter" | "recruiter_message" | "interview_notes";
  title: string;
  contentMarkdown: string;
};

export async function processApplicationKit(applicationKitId: string) {
  const [kit] = await db
    .select()
    .from(applicationKits)
    .where(eq(applicationKits.id, applicationKitId))
    .limit(1);

  if (!kit) {
    throw new Error("Application Kit not found");
  }

  await db
    .update(applicationKits)
    .set({
      status: "processing",
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(applicationKits.id, applicationKitId));

  try {
    const [profile] = await db
      .select()
      .from(cvProfiles)
      .where(eq(cvProfiles.cvThreadId, kit.cvThreadId))
      .limit(1);

    if (!profile) {
      throw new Error("CV profile not found");
    }

    const recommendations = await db
      .select()
      .from(cvRecommendations)
      .where(eq(cvRecommendations.cvThreadId, kit.cvThreadId));

    const generation = await generateApplicationKit({
      cvProfile: profile.rawProfileJson ?? {
        fullName: profile.fullName,
        professionalTitle: profile.professionalTitle,
        summary: profile.summary,
        skills: profile.skills,
        experiences: profile.experiences,
        educations: profile.educations,
        projects: profile.projects,
        certifications: profile.certifications,
        languages: profile.languages,
      },
      recommendations: recommendations.map((item) => ({
        type: item.type,
        title: item.title,
        data: item.dataJson,
      })),
      jobTitle: kit.jobTitle,
      companyName: kit.companyName,
      jobDescription: kit.jobDescription,
    });

    const drafts: ApplicationDocumentDraft[] = [
      {
        type: "ats_cv",
        title: generation.documents.ats_cv.title,
        contentMarkdown: generation.documents.ats_cv.content_markdown,
      },
      {
        type: "cover_letter",
        title: generation.documents.cover_letter.title,
        contentMarkdown: generation.documents.cover_letter.content_markdown,
      },
      {
        type: "recruiter_message",
        title: generation.documents.recruiter_message.title,
        contentMarkdown: generation.documents.recruiter_message.content_markdown,
      },
      {
        type: "interview_notes",
        title: generation.documents.interview_notes.title,
        contentMarkdown: generation.documents.interview_notes.content_markdown,
      },
    ];

    await db.transaction(async (tx) => {
      await tx
        .delete(applicationKitDocuments)
        .where(eq(applicationKitDocuments.applicationKitId, applicationKitId));

      await tx.insert(applicationKitDocuments).values(
        drafts.map((draft) => {
          const contentHtml = markdownToBasicHtml(draft.contentMarkdown);
          const contentText = markdownToPlainText(draft.contentMarkdown);
          const contentHash = sha256(contentHtml);

          return {
            applicationKitId,
            type: draft.type,
            title: draft.title,
            contentJson: markdownToBasicTiptapJson(draft.contentMarkdown),
            contentHtml,
            contentText,
            contentHash,
          };
        }),
      );

      await tx
        .update(applicationKits)
        .set({
          status: "ready",
          matchScore: Math.round(generation.match_report.match_score),
          matchReportJson: generation.match_report,
          errorMessage: null,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(applicationKits.id, applicationKitId));
    });

    return {
      applicationKitId,
      status: "ready" as const,
      documentCount: drafts.length,
      matchScore: Math.round(generation.match_report.match_score),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate Application Kit";

    await db
      .update(applicationKits)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(applicationKits.id, applicationKitId));

    throw error;
  }
}

function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function markdownToBasicHtml(markdown: string) {
  const lines = markdown.split("\n");
  const html: string[] = [];

  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;

    html.push(
      `<ul>${listItems
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("")}</ul>`,
    );

    listItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushList();
      html.push(`<h3>${escapeHtml(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      html.push(`<h2>${escapeHtml(line.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }

    if (line.startsWith("# ")) {
      flushList();
      html.push(`<h1>${escapeHtml(line.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }

    flushList();
    html.push(`<p>${escapeHtml(line)}</p>`);
  }

  flushList();

  return html.join("");
}

function markdownToBasicTiptapJson(markdown: string) {
  const lines = markdown.split("\n");
  const content: unknown[] = [];

  let bulletItems: string[] = [];

  function flushBulletList() {
    if (bulletItems.length === 0) return;

    content.push({
      type: "bulletList",
      content: bulletItems.map((item) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: item ? [{ type: "text", text: item }] : [],
          },
        ],
      })),
    });

    bulletItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushBulletList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushBulletList();
      content.push({
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: line.replace(/^###\s+/, "") }],
      });
      continue;
    }

    if (line.startsWith("## ")) {
      flushBulletList();
      content.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: line.replace(/^##\s+/, "") }],
      });
      continue;
    }

    if (line.startsWith("# ")) {
      flushBulletList();
      content.push({
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: line.replace(/^#\s+/, "") }],
      });
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      bulletItems.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }

    flushBulletList();
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    });
  }

  flushBulletList();

  return {
    type: "doc",
    content,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}