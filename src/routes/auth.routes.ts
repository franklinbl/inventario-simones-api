import { Router } from 'express';
import { login, register, getRoles, getUsers, refreshToken, logout } from '../controllers/auth.controller';
import { authenticateToken, checkRole } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas
router.post('/login', login);
router.post('/refreshToken', refreshToken);
router.post('/logout', logout);
router.get('/roles', getRoles);

// Rutas protegidas
router.post('/register', authenticateToken, checkRole(['Administrador']), register);
router.get('/users',authenticateToken, checkRole(['Administrador']), getUsers);

export default router;