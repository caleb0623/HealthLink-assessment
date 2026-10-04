import { Router } from 'express';
import { currentPatient, login, logout } from '../controllers/authController';
import { requirePatientSession } from '../middleware/requirePatientSession';

const router = Router();

router.post('/login', login);
router.get('/me', requirePatientSession, currentPatient);
router.post('/logout', requirePatientSession, logout);

export default router;