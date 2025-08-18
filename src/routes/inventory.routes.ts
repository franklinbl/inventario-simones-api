import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getAvailableProducts,
} from '../controllers/inventory.controller';
import { checkRole } from '../middleware/auth.middleware';

const router = express.Router();

// Rutas para el inventario
router.post('/products', checkRole(['Administrador']), createProduct); // Crear un nuevo producto
router.get('/products', getProducts); // Obtener todos los productos
router.get('/products/available', getAvailableProducts); // Buscar productos con su disponibilidad
router.get('/products/:id', getProductById); // Obtener un producto por ID
router.put('/products/:id', checkRole(['Administrador']),  updateProduct); // Actualizar un producto
router.delete('/products/:id', checkRole(['Administrador']),  deleteProduct); // Eliminar un producto)

export default router;