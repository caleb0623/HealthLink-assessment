import { prisma } from '../lib/prisma';

const consultationInclude = { doctor: { select: { name: true } } } as const;

export function listConsultations() {
  return prisma.consultation.findMany({
    orderBy: { preferredTime: 'desc' },
    include: consultationInclude
  });
}

export function createConsultation(consultation: {
  doctorId: number;
  consultationType: 'Chat' | 'Video';
  preferredTime: Date;
  reason: string;
}) {
  return prisma.consultation.create({
    data: { ...consultation, status: 'Scheduled' },
    include: consultationInclude
  });
}

export async function cancelScheduledConsultation(id: string) {
  const consultation = await prisma.consultation.findUnique({ where: { id } });
  if (!consultation) return { kind: 'not-found' as const };
  if (consultation.status !== 'Scheduled') return { kind: 'not-scheduled' as const };

  const cancelled = await prisma.consultation.update({
    where: { id },
    data: { status: 'Cancelled' },
    include: consultationInclude
  });
  return { kind: 'cancelled' as const, consultation: cancelled };
}