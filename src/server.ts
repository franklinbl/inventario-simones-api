import app from './app';
import sequelize from './config/db.config';

// Sincronizar la base de datos y arrancar el servidor
const PORT = process.env.PORT;

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});