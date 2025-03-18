import { RequestHandler } from 'express';
import { Rental, Product, RentalProduct } from '../models';
import moment from 'moment';

// Crear un nuevo alquiler
export const createRental: RequestHandler = async (req, res, next) => {
  try {
    const { customer_name, start_date, end_date, products } = req.body;

    // Validar datos
    if (!customer_name || !start_date || !end_date || !products || !Array.isArray(products)) {
      res.status(400).json({ message: 'Datos incompletos o inválidos' });
      return;
    }

    // Crear el alquiler
    const rental = await Rental.create({
      customer_name,
      start_date: moment(start_date).toDate(),
      end_date: moment(end_date).toDate(),
      status: 'pending',
    });

    // Procesar los productos
    for (const item of products) {
      const { product_id, quantity } = item;

      // Buscar el producto
      const product = await Product.findByPk(product_id);
      if (!product || product.available_quantity < quantity) {
        throw new Error(`No hay suficiente stock para el producto con ID ${product_id}`);
      }

      // Crear la relación en RentalProduct
      await RentalProduct.create({
        rental_id: rental.id,
        product_id,
        quantity,
      });

      // Actualizar el inventario
      product.available_quantity -= quantity;
      await product.save();
    }

    res.status(201).json({ message: 'Alquiler creado exitosamente', rental });
  } catch (error) {
    next(error); // Manejar errores globalmente
  }
};

// Obtener todos los alquileres
export const getRentals: RequestHandler = async (_req, res, next) => {
  try {
    const rentals = await Rental.findAll({
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: ['quantity'] }, // Incluir la cantidad de cada producto en el alquiler
        },
      ],
    });
    res.status(200).json({ rentals });
  } catch (error) {
    next(error);
  }
};

// Obtener un alquiler por ID
export const getRentalById: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rental = await Rental.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: ['quantity'] }, // Incluir la cantidad de cada producto en el alquiler
        },
      ],
    });

    if (!rental) {
      res.status(404).json({ message: 'Alquiler no encontrado' });
      return;
    }

    res.status(200).json({ rental });
  } catch (error) {
    next(error);
  }
};

// Completar un alquiler (devolver productos)
export const completeRental: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Buscar el alquiler e incluir los productos asociados
    const rental = await Rental.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: ['quantity'] }, // Incluir la cantidad de cada producto en el alquiler
        },
      ],
    });

    if (!rental) {
      res.status(404).json({ message: 'Alquiler no encontrado' });
      return;
    }

    // Verificar si hay productos asociados
    if (!rental.products || rental.products.length === 0) {
      res.status(400).json({ message: 'No hay productos asociados al alquiler' });
      return;
    }

    // Devolver los productos al inventario
    for (const product of rental.products) {
      const rentalProduct = await RentalProduct.findOne({
        where: { rental_id: rental.id, product_id: product.id },
      });

      if (rentalProduct) {
        // Actualizar la cantidad disponible del producto
        product.available_quantity += rentalProduct.quantity;
        await product.save();
      }
    }

    // Marcar el alquiler como completado
    rental.status = 'completed';
    await rental.save();

    res.status(200).json({ message: 'Alquiler completado exitosamente', rental });
  } catch (error) {
    next(error);
  }
};