import { Router } from 'express';
import { cancelConsultation, createConsultation, getConsultations } from '../controllers/consultationsController';

const router = Router();

router.get('/', getConsultations);
router.post('/', createConsultation);
router.patch('/:id/cancel', cancelConsultation);

export default router;