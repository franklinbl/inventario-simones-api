import Client from '../models/client.model';
import { RequestHandler } from 'express';
import { Rental } from '../models';
import { Sequelize, Op } from 'sequelize';

// Obtener todos los clientes
export const getClients: RequestHandler = async (_req, res, next) => {
  try {
    const clients = await Client.findAll({
      attributes: {
        include: [
          [Sequelize.fn('COUNT', Sequelize.col('rentals.id')), 'rentalCount']
        ]
      },
      include: [
        {
          model: Rental,
          as: 'rentals',
          attributes: [], // No traemos los datos de las rentas, solo contamos
        }
      ],
      group: ['Client.id']
    });
    res.status(200).json(clients);
  } catch (error) {
    next(error);
  }
};

// Obtener un cliente por DNI
export const getClientByDni: RequestHandler = async (_req, res, next) => {
  try {
    const client = await Client.findOne({
      where: { dni: _req.params.dni }
    });

    res.status(200).json(client);

  } catch (error) {
    next(error);
  }
};

// Actualizar un cliente
export const updateClient: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, dni } = req.body;

    // Validar datos requeridos
    if (!name || !phone || !dni) {
      res.status(400).json({ message: 'Datos incompletos. Nombre, teléfono y cédula son requeridos' });
      return;
    }

    // Buscar el cliente
    const client = await Client.findByPk(id);
    if (!client) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }

    // Verificar si la cédula ya existe en otro cliente (excluyendo el actual)
    const existingClientWithDni = await Client.findOne({
      where: {
        dni,
        id: { [Op.ne]: id } // Excluir el cliente actual
      }
    });

    if (existingClientWithDni) {
      res.status(400).json({ message: 'Ya existe un cliente con esa cédula' });
      return;
    }

    // Actualizar el cliente
    await client.update({
      name,
      phone,
      dni
    });

    res.status(200).json({
      message: 'Cliente actualizado exitosamente',
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        dni: client.dni
      }
    });

  } catch (error) {
    next(error);
  }
};