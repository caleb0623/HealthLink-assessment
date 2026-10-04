import type { RequestHandler } from 'express';
import { getPatientForSession } from '../services/authService';

export const requirePatientSession: RequestHandler = async (request, response, next) => {
  const authorization = request.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!token || !await getPatientForSession(token)) {
    response.status(401).json({ message: 'Please sign in to continue.' });
    return;
  }

  next();
};