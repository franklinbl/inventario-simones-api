import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config';

interface RentalProductAttributes {
  rental_id: number;
  product_id: number;
  quantity: number;
}

class RentalProduct extends Model<RentalProductAttributes> implements RentalProductAttributes {
  public rental_id!: number;
  public product_id!: number;
  public quantity!: number;
}

RentalProduct.init(
  {
    rental_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'rental_products',
  }
);

export default RentalProduct;