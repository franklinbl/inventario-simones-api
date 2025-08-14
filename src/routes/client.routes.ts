import { Router } from 'express';
import { getClientByDni, getClients, updateClient } from '../controllers/client.controller';
import { checkRole } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas
router.get('/', checkRole(['Administrador']), getClients);
router.get('/:dni/dni', checkRole(['Administrador']), getClientByDni);
router.put('/:id', checkRole(['Administrador']), updateClient); // Actualizar un alquiler

export default router;