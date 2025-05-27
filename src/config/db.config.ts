import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuración de la conexión a PostgreSQL
// const sequelize = new Sequelize(
//   process.env.DB_NAME!,
//   process.env.DB_USER!,
//   process.env.DB_PASSWORD!,
//   {
//     host: process.env.DB_HOST!,
//     port: parseInt(process.env.DB_PORT!),
//     dialect: 'postgres',
//     logging: false, // Desactiva los logs de Sequelize
//   }
// );

let sequelize: Sequelize;

const databaseUrl = process.env.DATABASE_URL;

console.log(databaseUrl);

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
  });
} else {
  // Usamos variables individuales en desarrollo
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD || "";
  const dbHost = process.env.DB_HOST;
  const dbPort = parseInt(process.env.DB_PORT || '5432');

  if (!dbName || !dbUser || !dbHost) {
    throw new Error('Faltan variables de entorno para la base de datos en desarrollo');
  }

  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: false,
  });
}

// Exportar la variable JWT_SECRET
export const JWT_SECRET = process.env.JWT_SECRET;

export default sequelize;