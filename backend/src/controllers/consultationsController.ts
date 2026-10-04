import type { RequestHandler } from 'express';
import { findDoctorById, isWithinAvailability } from '../services/doctorService';
import { cancelScheduledConsultation, createConsultation as saveConsultation, listConsultations } from '../services/consultationService';

type ConsultationRecord = Awaited<ReturnType<typeof listConsultations>>[number];

function toResponse(consultation: ConsultationRecord) {
  return {
    id: consultation.id,
    doctorId: consultation.doctorId,
    doctorName: consultation.doctor.name,
    consultationType: consultation.consultationType,
    preferredTime: consultation.preferredTime.toISOString(),
    reason: consultation.reason,
    status: consultation.status
  };
}

export const getConsultations: RequestHandler = async (_request, response, next) => {
  try {
    const consultations = await listConsultations();
    response.json(consultations.map(toResponse));
  } catch (error) {
    next(error);
  }
};

export const createConsultation: RequestHandler = async (request, response, next) => {
  const body = request.body as {
    doctorId?: unknown;
    consultationType?: unknown;
    preferredTime?: unknown;
    reason?: unknown;
  };

  if (typeof body?.doctorId !== 'number' || !Number.isInteger(body.doctorId) || body.doctorId < 1 || !['Chat', 'Video'].includes(String(body.consultationType))) {
    response.status(400).json({ message: 'Choose a valid doctor and consultation type.' });
    return;
  }

  if (typeof body.preferredTime !== 'string') {
    response.status(400).json({ message: 'Choose a valid time in the future.' });
    return;
  }

  const preferredTime = new Date(body.preferredTime);
  if (Number.isNaN(preferredTime.getTime()) || preferredTime.getTime() <= Date.now()) {
    response.status(400).json({ message: 'Choose a valid time in the future.' });
    return;
  }

  if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 500) {
    response.status(400).json({ message: 'Reason for visit must be between 1 and 500 characters.' });
    return;
  }

  try {
    const doctor = await findDoctorById(body.doctorId);
    if (!doctor) {
      response.status(400).json({ message: 'Choose a valid doctor and consultation type.' });
      return;
    }

    if (!isWithinAvailability(doctor.availability, preferredTime)) {
      response.status(400).json({ message: `This doctor is available ${doctor.availability}. Choose a time within those hours.` });
      return;
    }

    const consultation = await saveConsultation({
      doctorId: doctor.id,
      consultationType: body.consultationType as 'Chat' | 'Video',
      preferredTime,
      reason: body.reason.trim()
    });

    response.status(201).json(toResponse(consultation));
  } catch (error) {
    next(error);
  }
};

export const cancelConsultation: RequestHandler = async (request, response, next) => {
  const id = request.params['id'];
  if (typeof id !== 'string' || !id) {
    response.status(400).json({ message: 'A consultation ID is required.' });
    return;
  }

  try {
    const result = await cancelScheduledConsultation(id);
    if (result.kind === 'not-found') {
      response.status(404).json({ message: 'Consultation not found.' });
      return;
    }
    if (result.kind === 'not-scheduled') {
      response.status(409).json({ message: 'Only scheduled consultations can be cancelled.' });
      return;
    }
    response.json(toResponse(result.consultation));
  } catch (error) {
    next(error);
  }
};