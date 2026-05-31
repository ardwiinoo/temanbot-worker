import { Storage } from "@google-cloud/storage";

import { config } from "../config";

export const storage = new Storage({
  projectId: config.gcpProjectId,
});

export const bucket = storage.bucket(config.gcsBucketName);

export async function downloadBufferFromGCS(objectPath: string) {
  const file = bucket.file(objectPath);
  const [buffer] = await file.download();

  return buffer;
}

export async function uploadTextToGCS(input: {
  objectPath: string;
  text: string;
}) {
  const file = bucket.file(input.objectPath);

  await file.save(input.text, {
    resumable: false,
    contentType: "text/plain; charset=utf-8",
    metadata: {
      cacheControl: "private, max-age=0, no-cache",
    },
  });

  return {
    objectPath: input.objectPath,
    gsUri: `gs://${config.gcsBucketName}/${input.objectPath}`,
  };
}

export function buildCvExtractedTextPath(params: {
  workspaceId?: string | null;
  guestToken?: string | null;
  threadId: string;
}) {
  if (params.workspaceId) {
    return `workspaces/${params.workspaceId}/cv-threads/${params.threadId}/extracted/text.txt`;
  }

  if (params.guestToken) {
    return `guests/${params.guestToken}/cv-threads/${params.threadId}/extracted/text.txt`;
  }

  throw new Error("workspaceId or guestToken is required");
}