import Client from '../models/client.model';
import { RequestHandler } from 'express';

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