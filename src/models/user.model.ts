import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config';

// Interfaz para los atributos del modelo
interface UserAttributes {
  id: number;
  name: string;
  username: string; // Cambiamos username por username
  password: string;
}

// Interfaz para los atributos opcionales al crear un usuario
interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

// Definición del modelo
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public name!: string;
  public username!: string; // Cambiamos username por username
  public password!: string;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER, // Eliminamos UNSIGNED
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Aseguramos que el nombre de usuario sea único
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'users',
  }
);

export default User;