import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import inventoryRoutes from './routes/inventory.routes';
import rentalRoutes from './routes/rental.routes';
import dashboardRoutes from './routes/dashboard.routes';
import clientRoutes from './routes/client.routes';
import { authenticateToken } from './middleware/auth.middleware';

// Crear la aplicación Express
const app = express();

// Middlewares
app.use(cors({
  exposedHeaders: ['Content-Disposition']
})); // Habilita CORS
app.use(express.json()); // Parsea JSON en las solicitudes

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/rental', authenticateToken, rentalRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/client', authenticateToken, clientRoutes);

export default app;