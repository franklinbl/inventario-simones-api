import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/inventory.controller';
import { authenticateToken, checkRole } from '../middleware/auth.middleware';
import { getAvailableProducts } from '../controllers/rental.controller';

const router = express.Router();

// Rutas para el inventario
router.post('/products', authenticateToken, checkRole(['Administrador']), createProduct); // Crear un nuevo producto
router.get('/products', authenticateToken, getProducts); // Obtener todos los productos
router.get('/products/available', getAvailableProducts); // Buscar productos con su disponibilidad
router.get('/products/:id', authenticateToken, getProductById); // Obtener un producto por ID
router.put('/products/:id', authenticateToken, checkRole(['Administrador']),  updateProduct); // Actualizar un producto
router.delete('/products/:id', authenticateToken, checkRole(['Administrador']),  deleteProduct); // Eliminar un producto)

export default router;