import app from './app';
import sequelize from './config/db.config';
import './models/index';
import initAdmin from './scripts/init-admin';

// Sincronizar la base de datos y arrancar el servidor
const PORT = process.env.PORT;

sequelize.sync().then(async () => {
  console.log('Base de datos sincronizada');

  // Inicializar el administrador después de la sincronización
  if (process.env.isProduction === 'false') {
    try {
      await initAdmin();
      console.log('Inicialización del administrador completada');
    } catch (error) {
      console.error('Error durante la inicialización del administrador:', error);
    }
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});