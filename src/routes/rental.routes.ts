import { Router } from 'express';
import {
  createRental,
  getRentals,
  getRentalById,
  completeRental,
  updateRental,
  generateRentalPDF,
} from '../controllers/rental.controller';

const router = Router();

// Rutas para alquileres
router.post('/', createRental); // Crear un nuevo alquiler
router.get('/', getRentals); // Obtener todos los alquileres
router.get('/:id', getRentalById); // Obtener un alquiler por ID
router.put('/:id', updateRental); // Completar un alquiler
router.post('/:id/complete', completeRental); // Completar un alquiler
router.get('/:id/invoice', generateRentalPDF);

export default router;