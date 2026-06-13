/**
 * Unified Vercel Serverless Entry Point
 *
 * This single catch-all function wraps the Express app (which has requireRole()
 * middleware on all protected routes) via serverless-http. This ensures that
 * Vercel deployments use the SAME authenticated Express routes as Netlify and
 * localhost — eliminating the legacy unauthenticated api/transactions/ handlers.
 *
 * All /api/* requests are routed here via vercel.json rewrites.
 */
import serverless from "serverless-http";
import { createServer } from "../server/index";

const app = createServer();
const handler = serverless(app);

export default handler;
