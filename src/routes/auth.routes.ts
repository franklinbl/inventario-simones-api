import express from 'express';
import { login, register } from '../controllers/auth.controller';

const router = express.Router();

// Rutas de autenticación
router.post('/register', register);
router.post('/login', login);

export default router;