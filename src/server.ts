import "dotenv/config";
import Fastify from "fastify";
import { z } from "zod";

import { config } from "./config";
import { processCvThread } from "./cv/process-cv-thread";

const app = Fastify({
  logger: true,
});

const processCvBodySchema = z.object({
  thread_id: z.string().uuid(),
});

app.get("/health", async () => {
  return {
    status: "ok",
    service: "temanbot-worker",
  };
});

app.post("/process-cv", async (request, reply) => {
  const authorization = request.headers.authorization;
  const expected = `Bearer ${config.workerSecret}`;

  if (authorization !== expected) {
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