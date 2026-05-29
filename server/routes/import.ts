import { Router } from 'express';
import multer from 'multer';
import { parseBankStatement } from '../lib/statementParser';

const router = Router();

// Store file in memory so we can pass the buffer directly to our parser
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('statement'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { buffer, mimetype } = req.file;
    
    // FIX: parseBankStatement only takes 2 arguments!
    const result = await parseBankStatement(buffer, mimetype);

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