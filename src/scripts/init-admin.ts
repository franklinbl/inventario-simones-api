import { User, Role } from '../models';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import sequelize from '../config/db.config';

dotenv.config();

const initAdmin = async () => {
  try {
    // Sincronizar la base de datos
    console.log('Sincronizando base de datos...');
    await sequelize.sync({ force: false }); // force: false para no eliminar datos existentes

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
        console.log(`Creando rol de ${role.name}...`);
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

      console.log('Creando usuario administrador...');
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await User.create({
        name: process.env.ADMIN_NAME || 'Administrador',
        username: process.env.ADMIN_USERNAME,
        password: hashedPassword,
        roleId: 1 // ID del rol de administrador
      });
      console.log('Usuario administrador creado exitosamente');
    } else {
      console.log('El usuario administrador ya existe');
    }
  } catch (error) {
    console.error('Error al inicializar el administrador:', error);
  }
};

export default initAdmin;