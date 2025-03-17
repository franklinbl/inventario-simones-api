import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import inventaryRoutes from './routes/inventory.routes';

// Crear la aplicación Express
const app = express();

// Middlewares
app.use(cors()); // Habilita CORS
app.use(express.json()); // Parsea JSON en las solicitudes

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventaryRoutes);

export default app;