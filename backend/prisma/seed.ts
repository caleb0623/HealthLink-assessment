import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

const doctorProfiles = [
  { specialty: 'Family medicine', availability: 'Every Monday & Thursday, 9:00 AM - 1:00 PM', color: 'mint' },
  { specialty: 'Family medicine', availability: 'Every Tuesday & Friday, 1:00 PM - 5:00 PM', color: 'mint' },
  { specialty: 'Cardiology', availability: 'Every Tuesday to Friday, 10:00 AM - 2:00 PM', color: 'blue' },
  { specialty: 'Cardiology', availability: 'Every Monday & Thursday, 2:00 PM - 6:00 PM', color: 'blue' },
  { specialty: 'Dermatology', availability: 'Every Wednesday & Saturday, 8:00 AM - 12:00 PM', color: 'peach' },
  { specialty: 'Dermatology', availability: 'Every Tuesday & Thursday, 2:00 PM - 6:00 PM', color: 'peach' },
  { specialty: 'Mental wellness', availability: 'Every Monday, Wednesday & Friday, 1:00 PM - 5:00 PM', color: 'lavender' },
  { specialty: 'Mental wellness', availability: 'Every Tuesday & Thursday, 9:00 AM - 1:00 PM', color: 'lavender' }
];

async function seed(): Promise<void> {
  const { faker } = await import('@faker-js/faker');
  const doctors = doctorProfiles.map((profile, index) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      id: index + 1,
      name: `Dr. ${firstName} ${lastName}`,
      specialty: profile.specialty,
      availability: profile.availability,
      initials: `${firstName[0]}${lastName[0]}`,
      color: profile.color
    };
  });

  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync('123', passwordSalt, 64).toString('hex');

  await prisma.patient.upsert({
    where: { username: 'jordan' },
    create: {
      username: 'jordan',
      fullName: 'Jordan Davis',
      passwordSalt,
      passwordHash
    },
    update: {
      fullName: 'Jordan Davis',
      passwordSalt,
      passwordHash
    }
  });

  for (const doctor of doctors) {
    await prisma.doctor.upsert({
      where: { id: doctor.id },
      create: doctor,
      update: doctor
    });
  }

  await prisma.consultation.upsert({
    where: { id: 'seed-consultation-upcoming' },
    create: {
      id: 'seed-consultation-upcoming',
      doctorId: 1,
      consultationType: 'Video',
      preferredTime: new Date(Date.now() + 86_400_000),
      reason: 'Follow-up on seasonal allergies',
      status: 'Scheduled'
    },
    update: { preferredTime: new Date(Date.now() + 86_400_000) }
  });

  await prisma.consultation.upsert({
    where: { id: 'seed-consultation-completed' },
    create: {
      id: 'seed-consultation-completed',
      doctorId: 7,
      consultationType: 'Chat',
      preferredTime: new Date(Date.now() - 7 * 86_400_000),
      reason: 'Discussing sleep and energy',
      status: 'Completed'
    },
    update: {
      doctorId: 7,
      consultationType: 'Chat',
      preferredTime: new Date(Date.now() - 7 * 86_400_000),
      reason: 'Discussing sleep and energy',
      status: 'Completed'
    }
  });
}

seed()
  .then(() => console.log('Seed data is ready.'))
  .catch((error: unknown) => {
    console.error('Could not seed the database.', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());