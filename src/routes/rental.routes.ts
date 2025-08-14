import { Router } from 'express';
import {
  createRental,
  getRentals,
  getRentalById,
  completeRental,
  updateRental,
  generateRentalPDF,
} from '../controllers/rental.controller';
import { checkRole } from '../middleware/auth.middleware';

const router = Router();

// Rutas para alquileres
router.post('/', checkRole(['Administrador']),  createRental); // Crear un nuevo alquiler
router.post('/complete-rental', checkRole(['Administrador']),  completeRental); // Completar un alquiler
router.get('/', getRentals); // Obtener todos los alquileres
router.get('/:id', getRentalById); // Obtener un alquiler por ID
router.put('/:id', checkRole(['Administrador']),  updateRental); // Actualizar un alquiler
router.get('/:id/invoice', generateRentalPDF);

export default router;