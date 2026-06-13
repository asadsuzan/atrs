import { Router } from 'express';
import * as UserController from '../controllers/UserController';

// Mounted behind requireAuth + requireAdmin in index.ts
const router = Router();

router.get('/', UserController.listUsers);
router.patch('/:id/approve', UserController.approveUser);
router.patch('/:id/suspend', UserController.suspendUser);
router.patch('/:id/reactivate', UserController.reactivateUser);
router.patch('/:id/role', UserController.setUserRole);
router.post('/:id/reassign', UserController.reassignOwnership);
router.delete('/:id', UserController.deleteUser);

export default router;
