import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';

// Crear la aplicación Express
const app = express();

// Middlewares
app.use(cors()); // Habilita CORS
app.use(express.json()); // Parsea JSON en las solicitudes

// Rutas
app.use('/api/auth', authRoutes);

export default app;