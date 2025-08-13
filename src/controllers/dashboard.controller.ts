import { Rental } from '../models';
import { RequestHandler } from 'express';
import moment from 'moment';
import { Op } from 'sequelize';

// Obtener todos los roles
export const infoDashboard: RequestHandler = async (_req, res, next) => {
  try {
    // 1. Contar alquileres pendientes
    const pendingRentals = await Rental.count({
      where: { status: 'pending_return' }
    });

    // 2. Contar eventos del mes actual
    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();

    const monthlyEvents = await Rental.count({
      where: {
        start_date: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      }
    });

    res.status(200).json({
      pendingRentals,
      monthlyEvents
    });
  } catch (error) {
    next(error);
  }
};