import type { RequestHandler } from 'express';
import { listDoctors } from '../services/doctorService';

export const getDoctors: RequestHandler = async (_request, response, next) => {
  try {
    response.json(await listDoctors());
  } catch (error) {
    next(error);
  }
};