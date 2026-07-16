import { Router } from 'express';
import multer from 'multer';
import { parseBankStatement } from '../lib/statementParser';

const router = Router();

// Store file in memory so we can pass the buffer directly to our parser
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('statement'), async (req, res) => {
  console.log("IMPORT ROUTE HIT");
  try {
    console.log('[Import API] Request received');
    console.log('[Import API] Method:', req.method);
    console.log('[Import API] Content-Type:', req.headers['content-type']);

    if (!req.file) {
      
      console.log('[Import API] No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log("FILE EXISTS:", !!req.file);

    console.log('[Import API] File name:', req.file.originalname);
    console.log('[Import API] MIME type:', req.file.mimetype);
    console.log('[Import API] File size:', req.file.size);

    const { buffer, mimetype } = req.file;

    console.log('[Import API] Starting parseBankStatement...');
    const result = await parseBankStatement(buffer, mimetype);
    console.log('[Import API] Parse complete. Transactions:', result.length);

    // FIX: 'result' is already the array of transactions. Wrap it correctly for the frontend.
    res.status(200).json({
      transactions: result,
    });
  } catch (error) {
    console.error('[Import API Error]:', error);
    res.status(500).json({ error: 'Failed to parse bank statement' });
  }
});

export default router;