import { RequestHandler, Request } from 'express';
import { Rental, Product, RentalProduct, User } from '../models';
import moment from 'moment';
import PDFDocument, { end } from 'pdfkit';
import Client from '../models/client.model';
import { Op, Transaction, fn, col, literal } from 'sequelize';
import sequelize from '../config/db.config';
import { getOrCreateClientId } from './client.controller';
import { getPagination } from '../helpers/pagination';

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

interface ProductWithAvailability extends Product {
  available_quantity: number;
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
export const getRentals: RequestHandler = async (req, res, next) => {
  try {
    // 1. Obtener datos de paginación desde el query
    const { page, limit, offset } = getPagination(req.query);

    // 2. Obtener usuarios con paginación
    const { count, rows: rentals } = await Rental.findAndCountAll({
      distinct: true,
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
      ],
      limit,
      offset,
    });

    // 3. Calcular datos de paginación
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      message: 'Rentas obtenidos exitosamente',
      rentals,
      pagination: {
        total: count,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    });
  } catch (error) {
    console.error('Error al obtener rentas:', error);
    next(error);
  }
};

// Obtener un alquiler por ID
export const getRentalById: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rentalId = Number(id);

    // 1. Obtener la renta básica (sin disponibilidad)
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

    // 2. Extraer fechas y productos
    const { start_date, end_date } = rental;
    const productIds = rental.products?.map(p => p.id) || [];

    // 3. Obtener productos con disponibilidad en el rango de la renta
    const productsWithAvailability = await Product.scope({
      method: ['withAvailability', start_date, end_date]
    }).findAll({
      where: { id: productIds },
      subQuery: false,
      raw: true
    }) as unknown as ProductWithAvailability[];

    // 4. Crear un mapa para fácil acceso
    const availabilityMap = new Map(
      productsWithAvailability.map(p => [p.id, p.available_quantity])
    );

    // 5. Transformar los productos de la renta para incluir `available_quantity`
    const rentalData = rental.toJSON() as RentalWithProducts;

    rentalData.products = rentalData.products.map((product: any) => ({
      ...product,
      available_quantity: availabilityMap.get(product.id) || 0
    }));

    res.status(200).json({ rental: rentalData });

  } catch (error) {
    console.error('Error en getRentalById:', error);
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
    rental.status = status;

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
    const { client_id, start_date, end_date, date_returned, notes, return_notes, products, is_delivery_by_us, delivery_price, discount} = req.body.rental;
    const { name, phone, dni } = req.body.client;

    // Buscar la renta existente
    const rental = await Rental.findByPk(rentalId, {
      include: [
        { model: Product, as: 'products', through: { attributes: ['quantity_rented', 'quantity_returned'], as: 'rental_product' } },
      ],
    });

    if (!rental) {
      res.status(404).json({ message: 'Alquiler no encontrado' })
      return;
    };

    // Obtener o crear cliente
    const client_id_to_use = await getOrCreateClientId({ client_id, name, phone, dni });
    if (client_id_to_use) rental.client_id = client_id_to_use;

    // Actualizar datos básicos del alquiler
    if (notes) rental.notes = notes;
    if (return_notes) rental.return_notes = return_notes;
    if (start_date) rental.start_date = moment(start_date).toDate();
    if (end_date) rental.end_date = moment(end_date).toDate();
    if (date_returned) rental.date_returned = moment(date_returned).toDate();
    if (is_delivery_by_us !== undefined) rental.is_delivery_by_us = is_delivery_by_us;
    if (delivery_price !== undefined) rental.delivery_price = delivery_price;
    if (discount !== undefined) rental.discount = discount;

    // Procesar productos si se proporcionan
    if (products && Array.isArray(products)) {
      // Obtener productos actuales del alquiler
      const currentProducts = await RentalProduct.findAll({ where: { rental_id: rentalId } });
      const currentProductMap = new Map(currentProducts.map(cp => [cp.product_id, cp]));

      // Traer todos los productos de la actualización con disponibilidad
      const productIds = products.map(p => p.product_id);
      const availableProducts = await Product.scope({
        method: ['withAvailability', rental.start_date, rental.end_date],
      }).findAll({
        where: { id: productIds }
      });

      // Validar y actualizar productos
      for (const item of products) {
        const { product_id, quantity_rented, quantity_returned } = item;
        const product = availableProducts.find(p => p.id === product_id);
        if (!product) throw new Error(`Producto con ID ${product_id} no encontrado`);

        const currentQuantityInRental = currentProductMap.get(product_id)?.quantity_rented || 0;
        const netNewQuantity = Math.max(0, quantity_rented - currentQuantityInRental);

        // Validación de stock con available_quantity del scope
        const availableQuantity = (product as any).available_quantity as number;
        if (netNewQuantity > availableQuantity) {
          throw new Error(`No hay suficiente stock disponible para el producto ${product.name} entre ${rental.start_date} y ${rental.end_date}.`);
        }

        // Actualizar o crear RentalProduct
        if (currentProductMap.has(product_id)) {
          await RentalProduct.update(
            { quantity_rented, quantity_returned },
            { where: { rental_id: rentalId, product_id } }
          );
        } else {
          await RentalProduct.create({ rental_id: rentalId, product_id, quantity_rented, quantity_returned });
        }
      }

      // Eliminar productos que ya no están
      const newProductIds = products.map(p => p.product_id);
      for (const cp of currentProducts) {
        if (!newProductIds.includes(cp.product_id)) {
          await RentalProduct.destroy({ where: { rental_id: rentalId, product_id: cp.product_id } });
        }
      }
    }

    // Guardar cambios del alquiler
    await rental.save();

    //  Traer alquiler actualizado con productos y relaciones
    const updatedRental = await Rental.findByPk(rentalId, {
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: ['quantity_rented', 'quantity_returned'], as: 'rental_product' },
        },
        { model: User, as: 'creator', attributes: ['id', 'name', 'username'] },
        { model: Client, as: 'client', attributes: ['id', 'dni', 'name', 'phone'] },
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