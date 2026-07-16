// DELETED — This file is intentionally empty.
// All API requests are now handled by api/index.ts which wraps the
// authenticated Express app. This file must be deleted from the repository.
//
// DO NOT add any handler here. The vercel.json routes all /api/* to api/index.ts.
export default function handler(_req: any, res: any) {
  return res.status(410).json({ error: "This endpoint has been permanently removed." });
}
