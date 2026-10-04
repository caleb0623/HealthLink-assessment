import type { RequestHandler } from 'express';
import { getPatientForSession, loginPatient, logoutPatient } from '../services/authService';

function getToken(request: Parameters<RequestHandler>[0]): string {
  const authorization = request.header('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
}

export const login: RequestHandler = async (request, response, next) => {
  const { username, password } = request.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    response.status(400).json({ message: 'Enter your patient ID and password.' });
    return;
  }

  try {
    const session = await loginPatient(username.trim().toLowerCase(), password);
    if (!session) {
      response.status(401).json({ message: 'Patient ID or password is incorrect.' });
      return;
    }
    response.json(session);
  } catch (error) {
    next(error);
  }
};

export const currentPatient: RequestHandler = async (request, response, next) => {
  try {
    const patient = await getPatientForSession(getToken(request));
    if (!patient) {
      response.status(401).json({ message: 'Please sign in to continue.' });
      return;
    }
    response.json(patient);
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = (request, response) => {
  logoutPatient(getToken(request));
  response.status(204).end();
};