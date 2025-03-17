import { Request, Response, NextFunction } from 'express';
import Product from '../models/product.model';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

// Crear un nuevo producto
export const createProduct: AsyncHandler = async (req, res, next) => {
  try {
    const { name, description, total_quantity } = req.body;

    // Validar que se proporcionen los datos necesarios
    if (!name || !total_quantity) {
      return res.status(400).json({ message: 'Nombre y cantidad total son requeridos' });
    }

    // Crear el producto en la base de datos
    const newProduct = await Product.create({
      name,
      description,
      total_quantity,
      available_quantity: total_quantity, // La cantidad disponible es igual a la total al inicio
    });

    res.status(201).json({ message: 'Producto creado exitosamente', product: newProduct });
  } catch (error) {
    next(error);
  }
};

// Obtener todos los productos
export const getProducts: AsyncHandler = async (_req, res, next) => {
  try {
    const products = await Product.findAll();
    res.status(200).json({ products });
  } catch (error) {
    next(error);
  }
};

// Obtener un producto por ID
export const getProductById: AsyncHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Buscar el producto por ID
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
};

// Actualizar un producto
export const updateProduct: AsyncHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, total_quantity } = req.body;

    // Buscar el producto por ID
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Actualizar los campos del producto
    product.name = name || product.name;
    product.description = description || product.description;
    product.total_quantity = total_quantity || product.total_quantity;
    product.available_quantity =
      total_quantity !== undefined ? total_quantity - (product.total_quantity - product.available_quantity) : product.available_quantity;

    await product.save();

    res.status(200).json({ message: 'Producto actualizado exitosamente', product });
  } catch (error) {
    next(error);
  }
};

// Eliminar un producto
export const deleteProduct: AsyncHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Buscar el producto por ID
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Eliminar el producto
    await product.destroy();

    res.status(200).json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};