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
    res.status(200).json(rentals);
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

// Actualizar un alquiler
export const updateRental: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rentalId = Number(id);
    const { customer_name, start_date, end_date, products } = req.body;

    // Buscar el alquiler existente con sus productos
    const rental = await Rental.findByPk(rentalId, {
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: ['quantity'] },
        },
      ],
    });

    if (!rental) {
      res.status(404).json({ message: 'Alquiler no encontrado' });
      return;
    }

    // Actualizar datos básicos del alquiler
    if (customer_name) rental.customer_name = customer_name;
    if (start_date) rental.start_date = moment(start_date).toDate();
    if (end_date) rental.end_date = moment(end_date).toDate();

    // Procesar cambios en productos si se proporcionan
    if (products && Array.isArray(products)) {
      // Obtener productos actuales del alquiler
      const currentProducts = await RentalProduct.findAll({
        where: { rental_id: rentalId },
      });

      // Crear un mapa de productos actuales para fácil acceso
      const currentProductMap = new Map(
        currentProducts.map(cp => [cp.product_id, cp.quantity])
      );

      // Procesar cada producto en la actualización
      for (const item of products) {
        const { product_id, quantity } = item;
        const product = await Product.findByPk(product_id);

        if (!product) {
          throw new Error(`Producto con ID ${product_id} no encontrado`);
        }

        const currentQuantity = currentProductMap.get(product_id) || 0;
        const quantityDifference = quantity - currentQuantity;

        // Verificar si hay suficiente stock disponible
        if (quantityDifference > 0 && product.available_quantity < quantityDifference) {
          throw new Error(`No hay suficiente stock disponible para el producto ${product.name}`);
        }

        // Actualizar la cantidad en RentalProduct
        if (currentQuantity > 0) {
          // Actualizar cantidad existente
          await RentalProduct.update(
            { quantity },
            { where: { rental_id: rentalId, product_id } }
          );
        } else {
          // Crear nueva relación
          await RentalProduct.create({
            rental_id: rentalId,
            product_id,
            quantity,
          });
        }

        // Ajustar el inventario
        product.available_quantity -= quantityDifference;
        await product.save();
      }

      // Eliminar productos que ya no están en la lista
      const newProductIds = products.map(p => p.product_id);
      const productsToRemove = currentProducts.filter(
        cp => !newProductIds.includes(cp.product_id)
      );

      for (const productToRemove of productsToRemove) {
        const product = await Product.findByPk(productToRemove.product_id);
        if (product) {
          // Devolver la cantidad al inventario
          product.available_quantity += productToRemove.quantity;
          await product.save();
        }
        await RentalProduct.destroy({
          where: {
            rental_id: rentalId,
            product_id: productToRemove.product_id,
          },
        });
      }
    }

    // Guardar los cambios del alquiler
    await rental.save();

    // Obtener el alquiler actualizado con sus productos
    const updatedRental = await Rental.findByPk(rentalId, {
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: ['quantity'] },
        },
      ],
    });

    res.status(200).json({
      message: 'Alquiler actualizado exitosamente',
      rental: updatedRental,
    });
  } catch (error) {
    next(error);
  }
};