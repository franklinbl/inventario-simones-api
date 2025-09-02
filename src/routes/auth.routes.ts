import { Router } from 'express';
import { login, register, getRoles, getUsers, refreshToken, logout, resetPassword } from '../controllers/auth.controller';
import { authenticateToken, checkRole } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas
router.post('/login', login);
router.post('/refreshToken', refreshToken);
router.post('/logout', logout);

// Rutas protegidas
router.post('/register', authenticateToken, checkRole(['Administrador']), register);
router.post('/resetPassword', authenticateToken, checkRole(['Administrador']), resetPassword);
router.get('/roles', authenticateToken, getRoles);
router.get('/users',authenticateToken, checkRole(['Administrador']), getUsers);

export default router;