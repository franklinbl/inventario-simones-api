import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config';
import Product from './product.model';
import Client from './client.model';

interface RentalAttributes {
  id: number;
  client_id: number;
  notes: string;
  return_notes: string;
  start_date: Date;
  end_date: Date;
  date_returned: Date;
  status: string;
  is_delivery_by_us: boolean;
  delivery_price: number;
  discount: number;
  created_by: number;
}

interface RentalCreationAttributes extends Optional<RentalAttributes, 'id'> {}

class Rental extends Model<RentalAttributes, RentalCreationAttributes> implements RentalAttributes {
  public id!: number;
  public client_id!: number;
  public notes!: string;
  public return_notes!: string;
  public start_date!: Date;
  public end_date!: Date;
  public date_returned!: Date;
  public status!: string;
  public is_delivery_by_us!: boolean;
  public delivery_price!: number;
  public discount!: number;
  public created_by!: number;

  public products?: Product[];
  public creator?: any; // Para la relación con User
  public client?: Client; // Relación con Client
}

Rental.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clients',
        key: 'id',
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    return_notes: {
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
    date_returned: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('completed', 'with_issues', 'pending_return'),
      defaultValue: 'pending_return',
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
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'rentals',
  }
);

export default Rental;