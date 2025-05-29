import { Router } from 'express';
import { infoDashboard } from '../controllers/dashboard.controller';

const router = Router();

// Rutas públicas
router.get('/', infoDashboard);

export default router;