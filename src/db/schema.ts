import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const cvThreadStatusEnum = pgEnum("cv_thread_status", [
  "processing",
  "ready",
  "failed",
]);

export const cvRecommendationTypeEnum = pgEnum("cv_recommendation_type", [
  "job_role",
  "skill_gap",
  "course",
  "cv_improvement",
]);

export const cvThreads = pgTable("cv_threads", {
  id: uuid("id").defaultRandom().primaryKey(),

  workspaceId: uuid("workspace_id"),
  userId: uuid("user_id"),

  title: text("title").notNull(),
  status: cvThreadStatusEnum("status").notNull(),

  isGuest: boolean("is_guest").notNull(),
  guestToken: text("guest_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),

  originalFilename: text("original_filename"),
  fileType: text("file_type"),
  fileSize: bigint("file_size", { mode: "number" }),

  rawFilePath: text("raw_file_path"),
  extractedTextPath: text("extracted_text_path"),
  extractedTextCharCount: integer("extracted_text_char_count"),

  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow(),
updatedAt: timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow(),
});

export const cvProfiles = pgTable("cv_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),

  cvThreadId: uuid("cv_thread_id").notNull(),

  fullName: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  professionalTitle: text("professional_title"),
  summary: text("summary"),

  skills: jsonb("skills").$type<string[]>().default([]),
  experiences: jsonb("experiences")
    .$type<
      Array<{
        company?: string | null;
        role?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        description?: string;
        skills_used?: string[];
      }>
    >()
    .default([]),

  educations: jsonb("educations")
    .$type<
      Array<{
        institution?: string | null;
        degree?: string | null;
        field?: string | null;
        start_year?: string | null;
        end_year?: string | null;
      }>
    >()
    .default([]),

  projects: jsonb("projects")
    .$type<
      Array<{
        name?: string | null;
        description?: string;
        skills_used?: string[];
      }>
    >()
    .default([]),

  certifications: jsonb("certifications").$type<string[]>().default([]),
  languages: jsonb("languages").$type<string[]>().default([]),

  rawProfileJson: jsonb("raw_profile_json").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cvRecommendations = pgTable("cv_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),

  cvThreadId: uuid("cv_thread_id").notNull(),

  type: cvRecommendationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  dataJson: jsonb("data_json"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});