import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 8080),

  databaseUrl: requiredEnv("DATABASE_URL"),

  gcpProjectId: requiredEnv("GCP_PROJECT_ID"),
  gcpRegion: process.env.GCP_REGION ?? "us-central1",
  gcsBucketName: requiredEnv("GCS_BUCKET_NAME"),

  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",

  workerSecret: requiredEnv("WORKER_SECRET"),
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}