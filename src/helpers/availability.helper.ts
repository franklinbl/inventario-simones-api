import { Op } from "sequelize";
import { Product, Rental, RentalProduct } from "../models";


export const getProductAvailabilityInDateRange = async (
  productId: number,
  startDate: Date,
  endDate: Date
): Promise<number> => {
  const product = await Product.findByPk(productId);
  if (!product) throw new Error(`Producto con ID ${productId} no encontrado`);

  const totalQuantity = product.total_quantity;

  // Usar findAll con include para hacer el JOIN
  const rentedRecords = await RentalProduct.findAll({
    where: { product_id: productId },
    include: [
      {
        model: Rental,
        as: 'rental',
        where: {
          start_date: { [Op.lte]: endDate },
          end_date: { [Op.gte]: startDate },
          status: { [Op.in]: ['pending_return', 'completed', 'with_issues'] }
        }
      }
    ]
  });

  // Sumar manualmente
  const rentedSum = rentedRecords.reduce((sum, record) => sum + record.quantity_rented, 0);

  return totalQuantity - rentedSum;
};