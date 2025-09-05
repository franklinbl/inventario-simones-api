import { RequestHandler, Request } from 'express';
import { Rental, Product, RentalProduct, User } from '../models';
import moment from 'moment';
import PDFDocument from 'pdfkit';
import Client from '../models/client.model';
import { Transaction } from 'sequelize';
import sequelize from '../config/db.config';
import { getOrCreateClientId } from './client.controller';
import { getPagination } from '../helpers/pagination';
import { ProductWithAvailability, ProductWithRental } from './product.controller';
import { getRentalDataForPDF, transformRentalToPDFData } from '../service/pdf.service';
import { drawClientSection } from '../utils/pdf-templates/draw-client';
import { drawHeader } from '../utils/pdf-templates/draw-header';
import { drawProductsTable } from '../utils/pdf-templates/draw-products';
import { drawFooter } from '../utils/pdf-templates/draw-footer';
import { createLayout } from '../utils/pdf-layout';
import { Cursor } from '../utils/pdf-layout';

interface AuthRequest extends Request {
  user?: any;
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

    // Obtener datos del alquiler
    const rental = await getRentalDataForPDF(rentalId);
    if (!rental) {
      res.status(404).json({ message: 'Alquiler no encontrado' });
      return;
    }

    // Transformar datos para el PDF
    const pdfData = transformRentalToPDFData(rental);

    // Crear el documento PDF
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=alquiler-${rentalId}.pdf`);
    doc.pipe(res);

    // Configurar layout y cursor
    const layout = createLayout(doc.page.width);
    const cursor = new Cursor(layout.margin); // Empieza en el margen superior

    // Dibujar secciones
    drawHeader(doc, pdfData, layout, cursor);
    drawClientSection(doc, pdfData, layout, cursor);
    drawProductsTable(doc, pdfData, layout, cursor);
    drawFooter(doc, pdfData, layout, cursor);

    // Finalizar PDF
    doc.end();

  } catch (error) {
    console.error('Error al generar PDF:', error);
    next(error);
  }
};