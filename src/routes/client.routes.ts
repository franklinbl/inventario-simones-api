import { Router } from 'express';
import { getClientByDni, getClients, updateClient } from '../controllers/client.controller';
import { checkRole } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas
router.get('/', getClients);
router.get('/:dni/dni', getClientByDni);
router.put('/:id', updateClient); // Actualizar un alquiler

export default router;