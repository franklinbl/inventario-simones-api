import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuración de la conexión a PostgreSQL
const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASSWORD!,
  {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!),
    dialect: 'postgres',
    logging: false, // Desactiva los logs de Sequelize
  }
);

// Exportar la variable JWT_SECRET
export const JWT_SECRET = process.env.JWT_SECRET;

export default sequelize;