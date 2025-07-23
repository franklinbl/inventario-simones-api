import { Router } from 'express';
import { getClientByDni, getClients } from '../controllers/client.controller';

const router = Router();

// Rutas públicas
router.get('/', getClients);
router.get('/:dni/dni', getClientByDni);

export default router;