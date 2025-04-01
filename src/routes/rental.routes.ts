import express from 'express';
import {
  createRental,
  getRentals,
  getRentalById,
  completeRental,
  updateRental,
} from '../controllers/rental.controller';

const router = express.Router();

// Rutas para alquileres
router.post('/', createRental); // Crear un nuevo alquiler
router.get('/', getRentals); // Obtener todos los alquileres
router.get('/:id', getRentalById); // Obtener un alquiler por ID
router.put('/:id/complete', completeRental); // Completar un alquiler
router.put('/:id', updateRental); // Completar un alquiler

export default router;