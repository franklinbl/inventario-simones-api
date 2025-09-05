import { Product, Rental, User } from "../models";
import Client from "../models/client.model";


// Interfaz para los datos que usará el PDF
export interface PDFRentalData {
  rentalId: number;
  client: {
    name: string;
    dni: string;
    phone: string;
  };
  dates: {
    start: Date;
    end: Date;
  };
  isDeliveryByUs: boolean;
  deliveryPrice: number;
  discount: number;
  notes: string | null;
  createdBy: string;
  products: Array<{
    code: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    final: number;
  };
}

// Función para obtener el alquiler con todas las relaciones
export const getRentalDataForPDF = async (id: number): Promise<Rental | null> => {
  return await Rental.findByPk(id, {
    include: [
      {
        model: Product,
        as: 'products',
        attributes: ['id', 'code', 'name', 'price'],
        through: { attributes: ['quantity_rented'], as: 'rental_product' },
      },
      {
        model: Client,
        as: 'client',
        attributes: ['id', 'name', 'dni', 'phone'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
    ],
  });
};

// Función para transformar el alquiler en datos para el PDF
export const transformRentalToPDFData = (rental: Rental): PDFRentalData => {
  // Calcular productos reales
  if (!rental.products) {
    throw new Error('No hay productos en el alquiler');
  }
  const products = rental.products.map((p: any) => {
    const price = typeof p.price === 'string' ? parseFloat(p.price) : p.price;
    const quantity = p.rental_product.quantity_rented;
    const total = price * quantity;

    return {
      code: p.code,
      name: p.name,
      quantity,
      price,
      total,
    };
  });

  // Añadir transporte como producto si aplica
  if (rental.is_delivery_by_us && rental.delivery_price > 0) {
    const deliveryPrice = parseFloat(rental.delivery_price as any) || 0;
    const transportProduct = {
      code: '', // sin código
      name: 'Transporte',
      quantity: 1,
      price: deliveryPrice,
      total: deliveryPrice,
    };

    // Insertar al inicio del arreglo
    products.unshift(transportProduct);
  }

  const subtotal = products.reduce((sum, p) => sum + p.total, 0);
  const discountAmount = subtotal * (rental.discount / 100);
  const finalTotal = subtotal - discountAmount;

  return {
    rentalId: rental.id,
    client: {
      name: rental?.client?.name || '',
      dni: rental?.client?.dni || '',
      phone: rental?.client?.phone || '',
    },
    dates: {
      start: rental.start_date,
      end: rental.end_date,
    },
    isDeliveryByUs: rental.is_delivery_by_us,
    deliveryPrice: rental.is_delivery_by_us ? parseFloat(rental.delivery_price as any) || 0 : 0,
    discount: rental.discount,
    notes: rental.notes || 'Sin observaciones.',
    createdBy: rental.creator.name,
    products,
    totals: {
      subtotal,
      discount: discountAmount,
      final: finalTotal,
    },
  };
};