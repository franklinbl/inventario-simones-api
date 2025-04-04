import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config';
import { Role } from './role.model';

// Interfaz para los atributos del modelo
interface UserAttributes {
  id: number;
  name: string;
  username: string; // Cambiamos username por username
  password: string;
  roleId: number;
}

// Interfaz para los atributos opcionales al crear un usuario
interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

// Definición del modelo
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public name!: string;
  public username!: string; // Cambiamos username por username
  public password!: string;
  public roleId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public role?: Role;
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
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Role,
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
  }
);

// Definir la relación entre User y Role
User.belongsTo(Role, { as: 'role', foreignKey: 'roleId' });
Role.hasMany(User, { as: 'users', foreignKey: 'roleId' });

export default User;