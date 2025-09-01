import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/db.config';
import { User } from '../models/user.model';

interface AuthRequest extends Request {
  user?: User;
}

declare module 'express' {
  interface Request {
    user?: User;
  }
}


export const authenticateToken: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Token no proporcionado' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET!) as { id: number };
    const user = await User.findByPk(decoded.id, { include: ['role'] });

    if (!user) {
      res.status(401).json({ message: 'Usuario no encontrado' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalido' });
  }
};

export const checkRole = (allowedRoles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role.name)) {
      res.status(403).json({ message: 'No tienes permiso para realizar esta acción' });
      return;
    }

    next();
  };
};
