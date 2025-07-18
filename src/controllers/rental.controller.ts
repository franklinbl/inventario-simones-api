import { RequestHandler, Request } from 'express';
import { Rental, Product, RentalProduct } from '../models';
import moment from 'moment';
import PDFDocument from 'pdfkit';

interface AuthRequest extends Request {
  user?: any;
}

// Crear un nuevo alquiler
export const createRental: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const { client_id, start_date, end_date, notes, products, is_delivery_by_us, delivery_price, discount } = req.body;

    // Validar datos
    if (!client_id || !start_date || !end_date || !products || !Array.isArray(products)) {
      res.status(400).json({ message: 'Datos incompletos o inválidos' });
      return;
    }

    // Obtener el usuario autenticado
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }

    // Crear el alquiler
    const rental = await Rental.create({
      client_id,
      start_date: moment(start_date).toDate(),
      end_date: moment(end_date).toDate(),
      notes,
      status: 'pending',
      is_delivery_by_us,
      delivery_price,
      created_by: userId,
      discount,
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

    // Obtener el alquiler con sus productos asociados
    const rentalWithProducts = await Rental.findByPk(rental.id, {
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: ['quantity'] },
        },
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
          through: { attributes: ['quantity'] }, // Incluir la cantidad de cada producto en el alquiler
        },
        {
          model: require('../models/user.model').User,
          as: 'creator',
          attributes: ['id', 'name', 'username'], // Solo incluir información básica del creador
        },
      ],
      order: [
        ['status', 'DESC'],
        ['end_date', 'ASC']
      ]
    });

    // Transformar los datos para incluir el nombre del creador en created_by
    const rentalsWithCreatorName = rentals.map(rental => {
      const rentalData = rental.toJSON() as Rental;
      if (rentalData.creator) {
        rentalData.created_by = rentalData.creator.name;
      }
      return rentalData;
    });

    res.status(200).json(rentalsWithCreatorName);
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
        {
          model: require('../models/user.model').User,
          as: 'creator',
          attributes: ['id', 'name', 'username'], // Solo incluir información básica del creador
        },
      ],
    });

    if (!rental) {
      res.status(404).json({ message: 'Alquiler no encontrado' });
      return;
    }

    // Transformar los datos para incluir el nombre del creador en created_by
    const rentalData = rental.toJSON() as Rental;
    if (rentalData.creator) {
      rentalData.created_by = rentalData.creator.name;
    }

    res.status(200).json({ rental: rentalData });
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
    const { client_id, start_date, end_date, notes, products, is_delivery_by_us, delivery_price, discount } = req.body;

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
    if (client_id) rental.client_id = client_id;
    if (notes) rental.notes = notes;
    if (start_date) rental.start_date = moment(start_date).toDate();
    if (end_date) rental.end_date = moment(end_date).toDate();
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
          through: { attributes: ['quantity'] },
        },
        {
          model: require('../models/user.model').User,
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
        const quantity = (product as any).RentalProduct.quantity;
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