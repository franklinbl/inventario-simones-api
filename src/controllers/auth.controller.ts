import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Role } from '../models';
import { RequestHandler } from 'express';
import { JWT_SECRET } from '../config/db.config';
import { getPagination } from '../helpers/pagination';

// Registrar un nuevo usuario (solo administradores)
export const register: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { name, username, password, role_id } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      res.status(400).json({ message: 'El usuario ya existe' });
      return;
    }

    // Verificar si el rol existe
    const role = await Role.findByPk(role_id);
    if (!role) {
      res.status(400).json({ message: 'Rol no válido' });
      return;
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario
    const newUser = await User.create({
      name,
      username,
      password: hashedPassword,
      role_id,
    });

    // Obtener el usuario con su rol
    const userWithRole = await User.findByPk(newUser.id, { include: ['role'] });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: userWithRole,
    });
  } catch (error) {
    next(error);
  }
};

// Iniciar sesión
export const login: RequestHandler = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Buscar al usuario con su rol
    const user = await User.findOne({
      where: { username },
      include: ['role'],
    });

    if (!user) {
      res.status(400).json({ message: 'Credenciales inválidas' });
      return;
    }

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: 'Credenciales inválidas' });
      return;
    }

    // Generar Access token (vida corta)
    const accessToken = jwt.sign({ id: user.id }, JWT_SECRET!, { expiresIn: '1m' });

    // GGenerar Refresh token (vida larga)
    const refreshTokenValue = jwt.sign({ id: user.id }, JWT_SECRET!, { expiresIn: '7d' });
    const timeRefreshToken = 7 * 24 * 60 * 60 * 1000; // 7 días

    // Guardar refresh en cookie (no en BD)
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: true,       // true en producción con HTTPS
      sameSite: 'none',   // necesario si front y back están en dominios distintos
      maxAge: timeRefreshToken
    });

    // Responder con accessToken y datos de usuario
    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken: RequestHandler = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    res.status(401).json({ message: 'No refresh token' });
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET!) as any;
    const newAccessToken = jwt.sign({ id: payload.id }, JWT_SECRET!, { expiresIn: '15m' });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: 'Invalid or expired refresh token' });
    return
  }
};

export const logout: RequestHandler = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });

  res.json({ message: 'Logout exitoso' });
};

// Obtener todos los roles
export const getRoles: RequestHandler = async (_req, res, next) => {
  try {
    const roles = await Role.findAll();
    res.status(200).json({ roles });
  } catch (error) {
    next(error);
  }
};

// Obtener todos los usuarios (solo administradores)
export const getUsers: RequestHandler = async (req, res, next) => {
  try {
    // 1. Obtener datos de paginación desde el query
    const { page, limit, offset } = getPagination(req.query);

    // 2. Obtener usuarios con paginación
    const { count, rows: users } = await User.findAndCountAll({
      include: ['role'],
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    // 3. Calcular datos de paginación
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      message: 'Usuarios obtenidos exitosamente',
      users,
      pagination: {
        total: count,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};