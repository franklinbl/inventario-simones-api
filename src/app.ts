import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import inventoryRoutes from './routes/inventory.routes';
import rentalRoutes from './routes/rental.routes';
import initAdmin from './scripts/init-admin';
import dashboardRoutes from './routes/dashboard.routes';

// Crear la aplicación Express
const app = express();

// Middlewares
app.use(cors({
  exposedHeaders: ['Content-Disposition']
})); // Habilita CORS
app.use(express.json()); // Parsea JSON en las solicitudes

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Inicializar el administrador
if (process.env.isProduction === 'false') {
  initAdmin().then(() => {
    console.log('Inicialización completada');
  }).catch(error => {
    console.error('Error durante la inicialización:', error);
  });
}

export default app;