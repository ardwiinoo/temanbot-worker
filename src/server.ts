import "dotenv/config";
import Fastify from "fastify";
import { z } from "zod";

import { config } from "./config";
import { processCvThread } from "./cv/process-cv-thread";
import { processApplicationKit } from "./cv/process-application-kit";

const app = Fastify({
  logger: true,
});

const processCvBodySchema = z.object({
  thread_id: z.string().uuid(),
});

const generateApplicationKitBodySchema = z.object({
  application_kit_id: z.string().uuid(),
});

app.get("/health", async () => {
  return {
    status: "ok",
    service: "temanbot-worker",
  };
});

function getWorkerSecretFromRequest(request: any) {
  const authorization = request.headers.authorization;

  if (authorization?.startsWith("Bearer ")) {
    return authorization.replace("Bearer ", "").trim();
  }

  const headerSecret = request.headers["x-worker-secret"];

  if (Array.isArray(headerSecret)) {
    return headerSecret[0];
  }

  return headerSecret;
}

app.post("/process-cv", async (request, reply) => {
    const incomingSecret = getWorkerSecretFromRequest(request);
    if (incomingSecret !== config.workerSecret) {
        return reply.status(401).send({
            message: "Unauthorized",
        });
    }

  const body = processCvBodySchema.parse(request.body);

  const result = await processCvThread(body.thread_id);

  return {
    data: result,
  };
});

app.post("/generate-application-kit", async (request, reply) => {
  const incomingSecret = getWorkerSecretFromRequest(request);

  if (incomingSecret !== config.workerSecret) {
    return reply.status(401).send({
      message: "Unauthorized",
    });
  }

  const body = generateApplicationKitBodySchema.parse(request.body);

  const result = await processApplicationKit(body.application_kit_id);

  return {
    data: result,
  };
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);

  return reply.status(500).send({
    message: error instanceof Error ? error.message : "Internal server error",
  });
});

app.listen({ port: config.port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});