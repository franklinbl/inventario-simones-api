import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config';

interface ClientAttributes {
  id: number;
  client_name: string;
  client_phone: string;
  created_by: number;
}

interface ClientCreationAttributes extends Optional<ClientAttributes, 'id'> {}

class Client extends Model<ClientAttributes, ClientCreationAttributes> implements ClientAttributes {
  public id!: number;
  public client_name!: string;
  public client_phone!: string;
  public created_by!: number;
}

Client.init(
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
    tableName: 'clients',
  }
);

export default Client;