import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/inventory.controller';

const router = express.Router();

// Rutas para el inventario
router.post('/products', createProduct); // Crear un nuevo producto
router.get('/products', getProducts); // Obtener todos los productos
router.get('/products/:id', getProductById); // Obtener un producto por ID
router.put('/products/:id', updateProduct); // Actualizar un producto
router.delete('/products/:id', deleteProduct); // Eliminar un producto

export default router;