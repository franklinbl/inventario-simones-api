import { Router } from 'express';
import { login, register, getRoles, getUsers } from '../controllers/auth.controller';
import { checkRole } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas
router.post('/login', login);
router.get('/roles', getRoles);

// Rutas protegidas
router.post('/register', checkRole(['Administrador']), register);
router.get('/users', checkRole(['Administrador']), getUsers);

export default router;