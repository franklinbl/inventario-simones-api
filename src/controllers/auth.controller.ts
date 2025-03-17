import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import { Request, Response, NextFunction } from 'express';
import { JWT_SECRET } from '../config/db.config';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

// Registrar un nuevo usuario
export const register: AsyncRequestHandler = async (req, res, next) => {
  try {
    const { name, username, password } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario
    const newUser = await User.create({ name, username, password: hashedPassword });

    return res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
    next(error); // Manejar errores globalmente
  }
};

// Iniciar sesión
export const login: AsyncRequestHandler = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Buscar al usuario
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign({ id: user.id }, JWT_SECRET!, { expiresIn: '1h' });

    return res.json({ token });
  } catch (error) {
    next(error); // Manejar errores globalmente
  }
};