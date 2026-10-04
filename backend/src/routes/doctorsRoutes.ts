import { Router } from 'express';
import { getDoctors } from '../controllers/doctorsController';

const router = Router();

router.get('/', getDoctors);

export default router;