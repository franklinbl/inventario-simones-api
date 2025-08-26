import { Request, Response, NextFunction } from 'express';
import Product from '../models/product.model';
import { col, fn, literal, Op } from 'sequelize';
import { Rental, RentalProduct } from '../models';
import { parseAndValidateDateRange } from '../helpers/date-range';
import { getPagination, getPagingData } from '../helpers/pagination';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

interface AvailableProductsQuery {
  start_date?: string;
  end_date?: string;
  term?: string;
  page?: string;
  limit?: string;
}

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
    // 1. Obtener datos de paginación
    const { page, limit, offset } = getPagination(req.query);

    // 2. Hacer la consulta con Sequelize
    const data = await Product.findAndCountAll({
      limit,
      offset,
      order: [[col('name'), 'ASC']],
    });

    // 3. Formatear la respuesta con el helper
    const response = getPagingData(data, page, limit);

    res.status(200).json(response);

  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const getAvailableProducts: AsyncHandler = async (
  req: Request<{}, any, any, AvailableProductsQuery>,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1) Validación de fechas con helper
    const { start_date, end_date, term } = req.query;
    const range = parseAndValidateDateRange(start_date, end_date);
    if (range.error) return res.status(400).json({ message: range.error });
    const { start, end, startStr, endStr } = range.ok!;

    // 2) Paginación (page/limit desde query)
    const { page, limit, offset } = getPagination(req.query as Record<string, unknown>, {
      page: 1, limit: 10, maxLimit: 100,
    });

    // 3) Filtro de búsqueda
    const where: any = {};
    if (term && term.trim()) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${term.trim()}%` } },
        { code: { [Op.iLike]: `%${term.trim()}%` } },
      ];
    }

    // 4) Consulta principal con disponibilidad y LEFT JOINs
    const statuses = ['pending_return', 'with_issues'];
    const products = await Product.scope({
      method: ['withAvailability', startStr, endStr, statuses],
    }).findAll({
      where,
      order: [['name', 'ASC']],
      limit,
      offset,
      subQuery: false,
      logging: console.log,
    });


    // 5) Conteo total (coincide con el "where" del producto)
    //    Nota: como usamos LEFT JOIN, el count puede hacerse sin includes.
    const total = await Product.count({ where });
    const totalPages = Math.ceil(total / limit);

    // 6) Respuesta
    res.status(200).json({
      message: 'Productos disponibles obtenidos exitosamente',
      products,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      date_range: { start: startStr, end: endStr },
    });
  } catch (error) {
    console.error('Error en getAvailableProducts:', error);
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