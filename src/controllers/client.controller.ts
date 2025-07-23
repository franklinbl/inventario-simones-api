import Client from '../models/client.model';
import { RequestHandler } from 'express';
import { Rental } from '../models';
import { Sequelize } from 'sequelize';

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