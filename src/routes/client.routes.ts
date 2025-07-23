import { Router } from 'express';
import { getClientByDni } from '../controllers/client.controller';

const router = Router();

// Rutas públicas
router.get('/:dni/dni', getClientByDni);

export default router;