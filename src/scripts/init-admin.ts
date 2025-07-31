import { User, Role } from '../models';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const initAdmin = async () => {
  try {
    // No sincronizamos aquí, ya se hace en server.ts
    console.log('Inicializando roles y administrador...');

    // Crear roles si no existen
    const roles = [
      {
        name: 'Administrador',
        description: 'Tiene acceso a todas las funcionalidades'
      },
      {
        name: 'Empleado',
        description: 'Puede ver información pero no puede crear, editar ni listar usuarios'
      }
    ];

    for (const role of roles) {
      const existingRole = await Role.findOne({ where: { name: role.name } });
      if (!existingRole) {
        await Role.create(role);
      }
    }

    // Verificar y crear usuario administrador
    const existingAdmin = await User.findOne({
      where: { username: process.env.ADMIN_USERNAME },
      include: ['role']
    });

    if (!existingAdmin) {
      if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
        throw new Error('ADMIN_USERNAME y ADMIN_PASSWORD deben estar definidos en el archivo .env');
      }

      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await User.create({
        name: process.env.ADMIN_NAME || 'Default',
        username: process.env.ADMIN_USERNAME,
        password: hashedPassword,
        role_id: 1 // ID del rol de administrador
      });
    }
  } catch (error) {
    console.error('Error al inicializar el administrador:', error);
  }
};

export default initAdmin;