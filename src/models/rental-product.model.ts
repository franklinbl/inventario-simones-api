import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config';

interface RentalProductAttributes {
  id: number;
  rental_id: number;
  product_id: number;
  quantity_rented: number;
  quantity_returned: number;
}

interface RentalProductCreationAttributes extends Optional<RentalProductAttributes, 'id'> {}

class RentalProduct extends Model<RentalProductAttributes, RentalProductCreationAttributes> implements RentalProductAttributes {
  public id!: number;
  public rental_id!: number;
  public product_id!: number;
  public quantity_rented!: number;
  public quantity_returned!: number;
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
      allowNull: false,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity_rented: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity_returned: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'rental_products',
  }
);

export default RentalProduct;