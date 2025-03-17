import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config';

interface RentalAttributes {
  id: number;
  customer_name: string;
  start_date: Date;
  end_date: Date;
  status: string;
}

class Rental extends Model<RentalAttributes> implements RentalAttributes {
  public id!: number;
  public customer_name!: string;
  public start_date!: Date;
  public end_date!: Date;
  public status!: string;
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