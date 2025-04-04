import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import inventoryRoutes from './routes/inventory.routes';
import rentalRoutes from './routes/rental.routes';
import initAdmin from './scripts/init-admin';

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

// Inicializar el administrador
initAdmin().then(() => {
  console.log('Inicialización completada');
}).catch(error => {
  console.error('Error durante la inicialización:', error);
});

export default app;