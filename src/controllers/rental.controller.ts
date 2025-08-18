import { RequestHandler, Request } from 'express';
import { Rental, Product, RentalProduct, User } from '../models';
import moment from 'moment';
import PDFDocument from 'pdfkit';
import Client from '../models/client.model';
import { Op, Transaction, fn, col, literal } from 'sequelize';
import sequelize from '../config/db.config';
import { getOrCreateClientId } from './client.controller';
import { getProductAvailabilityInDateRange } from '../helpers/availability.helper';

interface AuthRequest extends Request {
  user?: any;
}

export interface ProductWithRental extends Product {
  available_quantity: number;
  rental_product: {
    quantity_rented: number;
    quantity_returned: number;
  };
}

export interface RentalWithProducts extends Rental {
  products: Array<Product & {
    rental_product: {
      quantity_rented: number;
      quantity_returned: number;
    };
  }>;
  client: Client;
  creator: User;
}

// Crear un nuevo alquiler
export const createRental: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const { client_id, start_date, end_date, date_returned, notes, return_notes, products, is_delivery_by_us, delivery_price, discount } = req.body.rental;
    const { name, phone, dni } = req.body.client;

    // Validar datos
    if (!start_date || !end_date || !products || !Array.isArray(products) || !name || !phone || !dni) {
      res.status(400).json({ message: 'Datos incompletos o inválidos' });
      return;
    }

    // Obtener el usuario autenticado
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }

    // Sele asigna cliente a la renta
    const client_id_to_use = await getOrCreateClientId({ client_id, name, phone, dni });

    // Crear el alquiler
    const rental = await Rental.create({
      client_id: client_id_to_use,
      start_date: moment(start_date).toDate(),
      end_date: moment(end_date).toDate(),
      date_returned: moment(date_returned).toDate(),
      notes,
      return_notes,
      status: 'pending_return',
      is_delivery_by_us,
      delivery_price,
      created_by: userId,
      discount,
    });

    // Procesar los productos
    for (const item of products) {
      const { product_id, quantity_rented, quantity_returned } = item;

      // Buscar el producto
      const product = await Product.findByPk(product_id);
      if (!product) {
        throw new Error(`No hay suficiente stock para el producto con ID ${product_id}`);
      }

      // Crear la relación en RentalProduct
      await RentalProduct.create({
        rental_id: rental.id,
        product_id,
        quantity_rented,
        quantity_returned,
      });

      await product.save();
    }

    // Obtener el alquiler con sus productos y cliente asociados
    const rentalWithProducts = await Rental.findByPk(rental.id, {
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: ['quantity_rented', 'quantity_returned'], as: 'rental_product' },
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'dni', 'name', 'phone'],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username'], // Solo incluir información básica del creador
        }
      ],
    });

    res.status(201).json({ message: 'Alquiler creado exitosamente', rental: rentalWithProducts });
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
          through: { attributes: ['quantity_rented', 'quantity_returned'], as: 'rental_product' }, // Incluir la cantidad de cada producto en el alquiler
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username'], // Solo incluir información básica del creador
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'dni', 'name', 'phone'], // Incluir información básica del cliente
        },
      ],
      order: [
        ['status', 'DESC'],
        ['end_date', 'ASC']
      ]
    });

    res.status(200).json(rentals);
  } catch (error) {
    console.error('Error al obtener alquileres:', error);
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
          through: {
            attributes: ['quantity_rented', 'quantity_returned'],
            as: 'rental_product'
          },
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username'],
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'dni', 'name', 'phone'],
        }
      ],
    });

    if (!rental) {
      res.status(404).json({ message: 'Alquiler no encontrado' });
      return;
    }

    // Transformar los datos
    const rentalData = rental.toJSON() as RentalWithProducts;
    // Calcular available_quantity para cada producto
    for (const product of rentalData.products as ProductWithRental[]) {
      const available = await getProductAvailabilityInDateRange(
        product.id,
        rental.start_date,
        rental.end_date
      );
      product.available_quantity = available;
    }

    res.status(200).json({ rental: rentalData });
  } catch (error) {
    next(error);
  }
};

// Completar un alquiler (devolver productos)
export const completeRental: RequestHandler = async (req, res, next) => {
  let transaction: Transaction | undefined;

  try {
    const { id, date_returned, return_notes, products: productsDto, status } = req.body;

    // Validación inicial
    if (!id || !status || !Array.isArray(productsDto)) {
      res.status(400).json({
        message: 'Faltan datos requeridos: id, status o products',
      });
      return;
    }

    if (!['completed', 'with_issues'].includes(status)) {
      res.status(400).json({
        message: 'El campo "status" debe ser "completed" o "with_issues"',
      });
      return;
    }

    transaction = await sequelize.transaction();

    // Cargar la renta con todas las relaciones necesarias
    const rental = await Rental.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'products',
          through: {
            attributes: ['quantity_rented', 'quantity_returned'], as: 'rental_product',
          },
        },
        {
          model: Client,
          as: 'client',
        },
        {
          model: User,
          as: 'creator',
        },
      ],
      transaction,
    });

    if (!rental) {
      await transaction.rollback();
      res.status(404).json({ message: 'Alquiler no encontrado' });
      return;
    }

    if (!rental.products || rental.products.length === 0) {
      await transaction.rollback();
      res.status(400).json({ message: 'No hay productos asociados al alquiler' });
      return;
    }

    // Procesar cada producto
    for (const dto of productsDto) {
      const product = rental.products.find(p => p.id === dto.product_id) as ProductWithRental;
      if (!product) {
        await transaction.rollback();
        res.status(400).json({
          message: `El producto con ID ${dto.product_id} no pertenece a esta renta.`,
        });
        return;
      }

      const rentalProduct = await RentalProduct.findOne({
        where: { rental_id: id, product_id: dto.product_id },
        transaction,
        lock: true,
      });

      if (!rentalProduct) {
        await transaction.rollback();
        res.status(400).json({
          message: `Relación producto-renta no encontrada para producto ${dto.product_id}`,
        });
        return;
      }

      const { quantity_rented, quantity_returned: previousReturned } = rentalProduct;
      const { quantity_returned } = dto;

      if (quantity_returned > quantity_rented) {
        await transaction.rollback();
        res.status(400).json({
          message: `No se pueden devolver ${quantity_returned} unidades de "${product.name}". Solo se alquilaron ${quantity_rented}.`,
        });
        return;
      }

      // Calcular diferencia neta
      const diff = quantity_returned - previousReturned;

      if (diff !== 0) {
        await product.save({ transaction });
      }

      // Actualizar en la relación
      rentalProduct.quantity_returned = quantity_returned;
      await rentalProduct.save({ transaction });

      const rentalProductInMemory = product.rental_product;
      if (rentalProductInMemory) {
        rentalProductInMemory.quantity_returned = quantity_returned;
      }
    }

    // Actualizar estado de la renta
    rental.date_returned = date_returned || new Date();
    rental.return_notes = return_notes;
    rental.status = status === 'completed' ? 'pending_return' : 'with_issues';

    await rental.save({ transaction });

    // Confirmar transacción
    await transaction.commit();

    // Devolver el objeto ya cargado y actualizado (sin consulta extra)
    const rentalResponse = rental.toJSON(); // Asegura un objeto plano con todas las relaciones

    res.status(200).json({
      message: 'Alquiler completado y productos devueltos al inventario',
      rental: rentalResponse,
    });

  } catch (error) {
    console.log(error);
    if (transaction) {
      await transaction.rollback();
    }
    next(error);
  }
};

// Actualizar un alquiler
export const updateRental: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rentalId = Number(id);
    const { client_id, start_date, end_date, date_returned, notes, return_notes, products, is_delivery_by_us, delivery_price, discount } = req.body.rental;
    const { name, phone, dni } = req.body.client;

    // Buscar el alquiler existente con sus productos
    const rental = await Rental.findByPk(rentalId, {
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: ['quantity_rented', 'quantity_returned'], as: 'rental_product' },
        },
      ],
    });

    if (!rental) {
      res.status(404).json({ message: 'Alquiler no encontrado' });
      return;
    }

    // Se le asigna cliente a la
    const client_id_to_use = await getOrCreateClientId({ client_id, name, phone, dni });

    // Actualizar datos básicos del alquiler
    if (client_id_to_use) rental.client_id = client_id_to_use;
    if (notes) rental.notes = notes;
    if (return_notes) rental.return_notes = return_notes;
    if (start_date) rental.start_date = moment(start_date).toDate();
    if (end_date) rental.end_date = moment(end_date).toDate();
    if (date_returned) rental.end_date = moment(date_returned).toDate();
    if (is_delivery_by_us) rental.is_delivery_by_us = is_delivery_by_us;
    if (delivery_price) rental.delivery_price = delivery_price;
    if (discount) rental.discount = discount;

    // Procesar cambios en productos si se proporcionan
    if (products && Array.isArray(products)) {
      // Obtener productos actuales del alquiler
      const currentProducts = await RentalProduct.findAll({
        where: { rental_id: rentalId },
      });

      // Crear un mapa de productos actuales para fácil acceso
      const currentProductMap = new Map(
        currentProducts.map(cp => [cp.product_id, cp.quantity_rented])
      );

      // Procesar cada producto en la actualización
      for (const item of products) {
        const { product_id, quantity_rented, quantity_returned } = item;
        const product = await Product.findByPk(product_id);

        if (!product) {
          throw new Error(`Producto con ID ${product_id} no encontrado`);
        }

        const currentQuantity = currentProductMap.get(product_id) || 0;
        const quantityDifference = quantity_rented - currentQuantity;

        // ✅ Validación con disponibilidad dinámica
        const availableInDates = await getProductAvailabilityInDateRange(
          product_id,
          rental.start_date,
          rental.end_date
        );

        const currentQuantityInRental = currentProductMap.get(product_id) || 0;
        const netNewQuantity = Math.max(0, quantity_rented - currentQuantityInRental);

        if (netNewQuantity > availableInDates) {
          throw new Error(`No hay suficiente stock disponible para el producto ${product.name} entre ${rental.start_date} y ${rental.end_date}.`);
        }

        // Actualizar o crear la relación
        if (currentQuantity > 0) {
          await RentalProduct.update(
            { quantity_rented },
            { where: { rental_id: rentalId, product_id } }
          );
        } else {
          await RentalProduct.create({
            rental_id: rentalId,
            product_id,
            quantity_rented,
            quantity_returned
          });
        }
      }

      // Eliminar productos que ya no están en la lista
      const newProductIds = products.map(p => p.product_id);
      const productsToRemove = currentProducts.filter(
        cp => !newProductIds.includes(cp.product_id)
      );

      for (const productToRemove of productsToRemove) {
        const product = await Product.findByPk(productToRemove.product_id);
        if (product) {
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
          through: { attributes: ['quantity_rented', 'quantity_returned'], as: 'rental_product' },
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username'], // Solo incluir información básica del creador
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'dni', 'name', 'phone'], // Incluir información básica del cliente
        },
      ],
    });

    res.status(200).json({
      message: 'Alquiler actualizado exitosamente',
      rental: updatedRental,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// Generar PDF de un alquiler
export const generateRentalPDF: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rentalId = Number(id);

    // Buscar el alquiler con sus productos y creador
    const rental = await Rental.findByPk(rentalId, {
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: ['quantity_rented', 'quantity_returned'], as: 'rental_product' },
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username'],
        },
      ],
    });

    if (!rental) {
      res.status(404).json({ message: 'Alquiler no encontrado' });
      return;
    }

    // Transformar los datos para incluir el nombre del creador
    const rentalData = rental.toJSON() as any;
    if (rentalData.creator) {
      rentalData.created_by = rentalData.creator.name;
    }

    // Crear el documento PDF
    const doc = new PDFDocument();

    // Configurar headers de respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=alquiler-${rentalData.client_name}-${moment(rentalData.start_date).format('DD-MM-YYYY')}.pdf`
    );

    // Pipe el PDF directamente a la respuesta
    doc.pipe(res);

    // Configurar el documento
    doc.fontSize(20).text('Detalles del Alquiler', { align: 'center' });
    doc.moveDown();

    // Información del cliente
    doc.fontSize(12).text('Información del Cliente:', { underline: true });
    doc.fontSize(10).text(`Nombre: ${rentalData.client_name}`);
    doc.fontSize(10).text(`Teléfono: ${rentalData.client_phone}`);
    doc.text(`Fecha de inicio: ${moment(rentalData.start_date).format('DD/MM/YYYY')}`);
    doc.text(`Fecha de fin: ${moment(rentalData.end_date).format('DD/MM/YYYY')}`);
    doc.text(`Estado: ${rentalData.status}`);
    doc.text(`Creado por: ${rentalData.created_by}`);
    doc.moveDown();

    // Tabla de productos
    doc.fontSize(12).text('Productos Alquilados:', { underline: true });
    doc.moveDown();

    // Encabezados de la tabla
    const startX = 50;
    let currentY = doc.y;

    doc.fontSize(10);
    doc.text('Producto', startX, currentY);
    doc.text('Cantidad', startX + 200, currentY);
    doc.text('Precio Unitario', startX + 300, currentY);
    doc.text('Subtotal', startX + 400, currentY);
    doc.moveDown();

    // Línea separadora
    currentY = doc.y;
    doc.moveTo(startX, currentY)
       .lineTo(startX + 500, currentY)
       .stroke();
    doc.moveDown();

    // Datos de productos
    let total = 0;
    if (!rentalData.products || rentalData.products.length === 0) {
      doc.text('No hay productos en este alquiler', startX, doc.y);
      doc.moveDown();
    } else {
      for (const product of rentalData.products) {
        currentY = doc.y;
        const quantity = (product as any).rental_product.quantity_rented;
        const price = (product as any).price;
        const subtotal = quantity * price;

        doc.text(product.name, startX, currentY);
        doc.text(quantity.toString(), startX + 200, currentY);
        doc.text(price, startX + 300, currentY);
        doc.text(`$${subtotal.toFixed(2)}`, startX + 400, currentY);
        doc.moveDown();

        total += subtotal;
      }
    }

    // Línea separadora final
    currentY = doc.y;
    doc.moveTo(startX, currentY)
       .lineTo(startX + 500, currentY)
       .stroke();
    doc.moveDown();

    // Aplicar descuento si existe
    let finalTotal = total;
    if (rentalData.discount && Number(rentalData.discount) > 0) {
      const discountPercentage = Number(rentalData.discount);
      const discountAmount = total * (discountPercentage / 100);
      finalTotal = total - discountAmount;

      doc.moveDown();
      doc.fontSize(12).text('Descuento:', { underline: true });
      doc.fontSize(10).text(`Porcentaje de descuento: ${discountPercentage}%`);
      doc.text(`Monto de descuento: $${discountAmount.toFixed(2)}`);
      doc.text(`Subtotal con descuento: $${finalTotal.toFixed(2)}`);
      doc.moveDown();
    }

    // Total sin flete
    doc.fontSize(12).text(`Total: $${finalTotal.toFixed(2)}`, startX + 300, doc.y);

    // Información de entrega
    if (rentalData.is_delivery_by_us && rentalData.delivery_price && Number(rentalData.delivery_price) > 0) {
      const deliveryPrice = Number(rentalData.delivery_price);
      doc.moveDown();
      doc.fontSize(12).text('Información de Entrega:', { underline: true });
      doc.fontSize(10).text(`Entrega a cargo de la empresa: Sí`);
      doc.text(`Costo de flete: $${deliveryPrice.toFixed(2)}`);
      doc.moveDown();

      // Total final con flete
      const totalWithDelivery = finalTotal + deliveryPrice;
      doc.fontSize(14).text(`Total final: $${totalWithDelivery.toFixed(2)}`, startX + 300, doc.y);
    }

    // Finalizar el PDF
    doc.end();
  } catch (error) {
    next(error);
  }
};