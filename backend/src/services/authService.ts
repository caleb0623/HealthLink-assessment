import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { prisma } from '../lib/prisma';

interface PatientProfile {
  id: number;
  username: string;
  fullName: string;
}

const sessions = new Map<string, number>();

export async function loginPatient(username: string, password: string) {
  const patient = await prisma.patient.findUnique({ where: { username } });
  if (!patient) {
    return null;
  }

  const submittedHash = scryptSync(password, patient.passwordSalt, 64);
  const storedHash = Buffer.from(patient.passwordHash, 'hex');
  if (submittedHash.length !== storedHash.length || !timingSafeEqual(submittedHash, storedHash)) {
    return null;
  }

  const token = randomBytes(32).toString('hex');
  sessions.set(token, patient.id);
  return { token, patient: toProfile(patient) };
}

export async function getPatientForSession(token: string): Promise<PatientProfile | null> {
  const patientId = sessions.get(token);
  if (!patientId) {
    return null;
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, username: true, fullName: true }
  });
  return patient;
}

export function logoutPatient(token: string): void {
  sessions.delete(token);
}

function toProfile(patient: PatientProfile): PatientProfile {
  return { id: patient.id, username: patient.username, fullName: patient.fullName };
}