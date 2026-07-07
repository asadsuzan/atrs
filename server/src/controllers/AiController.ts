import { Request, Response } from 'express';
import { suggestTitles, suggestDescription } from '../services/ai/AiService';

/**
 * POST /api/ai/suggest
 *
 * Shared endpoint for every form's AI assist. `task` selects title vs
 * description; `context` is the form's structured data. Provider/model failures
 * come back as 502 with an actionable message (so the UI can toast it) rather
 * than a generic 500.
 */
export const suggest = async (req: Request, res: Response) => {
  const { task, entity, context = {}, title } = req.body;
  try {
    if (task === 'title') {
      const titles = await suggestTitles(entity, context);
      return res.status(200).json({ titles });
    }
    const description = await suggestDescription(entity, context, title);
    return res.status(200).json({ description });
  } catch (err: any) {
    return res.status(502).json({ message: err?.message || 'AI request failed' });
  }
};
