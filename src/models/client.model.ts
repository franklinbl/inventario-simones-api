import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config';

interface ClientAttributes {
  id: number;
  dni: string;
  name: string;
  phone: string;
}

interface ClientCreationAttributes extends Optional<ClientAttributes, 'id'> {}

class Client extends Model<ClientAttributes, ClientCreationAttributes> implements ClientAttributes {
  public id!: number;
  public dni!: string;
  public name!: string;
  public phone!: string;
}

Client.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    dni: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  },
  {
    sequelize,
    tableName: 'clients',
  }
);

export default Client;