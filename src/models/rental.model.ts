import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config';
import Product from './product.model';

interface RentalAttributes {
  id: number;
  customer_name: string;
  start_date: Date;
  end_date: Date;
  status: string;
}

interface RentalCreationAttributes extends Optional<RentalAttributes, 'id'> {}

class Rental extends Model<RentalAttributes, RentalCreationAttributes> implements RentalAttributes {
  public id!: number;
  public customer_name!: string;
  public start_date!: Date;
  public end_date!: Date;
  public status!: string;

  public products?: Product[];
}

Rental.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
    },
  },
  {
    sequelize,
    tableName: 'rentals',
  }
);

export default Rental;