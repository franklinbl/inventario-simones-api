import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config';

interface RentalProductAttributes {
  id: number;
  rental_id: number;
  product_id: number;
  quantity: number;
}

interface RentalProductCreationAttributes extends Optional<RentalProductAttributes, 'id'> {}

class RentalProduct extends Model<RentalProductAttributes, RentalProductCreationAttributes> implements RentalProductAttributes {
  public id!: number;
  public rental_id!: number;
  public product_id!: number;
  public quantity!: number;
}

RentalProduct.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
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