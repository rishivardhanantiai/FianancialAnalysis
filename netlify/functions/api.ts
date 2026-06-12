import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import serverless from "serverless-http";
import { createServer } from "../../server/index";

// Initialise Express once at cold-start
const app = createServer();
const serverlessHandler = serverless(app);

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Netlify's redirect splat strips the /api prefix.
  // Restore it so Express routes (registered as /api/...) match correctly.
  if (event.path && !event.path.startsWith("/api")) {
    event.path = "/api" + event.path;
  }

  console.log(`[api] ${event.httpMethod} ${event.path}`);

  try {
    // @ts-ignore – serverless-http typings don't perfectly align with Netlify event
    const response = await serverlessHandler(event, context);
    return response as any;
  } catch (err) {
    console.error("[api] Unhandled error in handler:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error", detail: String(err) }),
    };
  }
};
