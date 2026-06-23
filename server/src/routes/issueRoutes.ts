import { Router } from 'express';
import * as IssueController from '../controllers/IssueController';
import { validate } from '../middlewares/validate';
import { createIssueSchema, updateIssueSchema } from '../schemas/issue.schema';
import { idParamSchema } from '../schemas/common.schema';

const router = Router();

router.post('/', validate(createIssueSchema), IssueController.createIssue);
router.get('/', IssueController.getIssues);
router.get('/:id', validate(idParamSchema), IssueController.getIssueById);
router.patch('/:id', validate(updateIssueSchema), IssueController.updateIssue);
router.delete('/:id', validate(idParamSchema), IssueController.deleteIssue);

export default router;
