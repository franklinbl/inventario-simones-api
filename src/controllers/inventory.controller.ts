import { Request, Response, NextFunction } from 'express';
import Product from '../models/product.model';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

// Crear un nuevo producto
export const createProduct: AsyncHandler = async (req, res, next) => {
  try {
    const { code, name, description, total_quantity, price } = req.body;

    // Validar que se proporcionen los datos necesarios
    if (!name || !total_quantity) {
      return res.status(400).json({ message: 'Nombre y cantidad total son requeridos' });
    }

    // Crear el producto en la base de datos
    const newProduct = await Product.create({
      code,
      name,
      description,
      total_quantity,
      price
    });

    res.status(201).json({ message: 'Producto creado exitosamente', product: newProduct });
  } catch (error) {
    next(error);
  }
};

// Obtener todos los productos
export const getProducts: AsyncHandler = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    if (limit) {
      const offset = (page - 1) * limit;
      const { count, rows: products } = await Product.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      const totalPages = Math.ceil(count / limit);

      res.status(200).json({
        products,
        pagination: {
          total: count,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    } else {
      const products = await Product.findAll({
        order: [['createdAt', 'DESC']]
      });

      res.status(200).json({
        products,
        pagination: {
          total: products.length,
          totalPages: 1,
          currentPage: 1,
          limit: products.length,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });
    }
  } catch (error) {
    console.log(error);
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
    const { code, name, description, total_quantity, price } = req.body;

    // Buscar el producto por ID
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Actualizar los campos del producto
    product.code = code || product.code;
    product.name = name || product.name;
    product.description = description || product.description;
    product.total_quantity = total_quantity || product.total_quantity;
    product.price =  price || product.price;

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