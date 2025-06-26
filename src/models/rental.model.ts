import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config';
import Product from './product.model';

interface RentalAttributes {
  id: number;
  client_name: string;
  client_phone: string;
  notes: string;
  start_date: Date;
  end_date: Date;
  status: string;
  is_delivery_by_us: boolean;
  delivery_price: number;
}

interface RentalCreationAttributes extends Optional<RentalAttributes, 'id'> {}

class Rental extends Model<RentalAttributes, RentalCreationAttributes> implements RentalAttributes {
  public id!: number;
  public client_name!: string;
  public client_phone!: string;
  public notes!: string;
  public start_date!: Date;
  public end_date!: Date;
  public status!: string;
  public is_delivery_by_us!: boolean;
  public delivery_price!: number;

  public products?: Product[];
}

Rental.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    client_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    client_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    is_delivery_by_us: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    delivery_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'rentals',
  }
);

export default Rental;