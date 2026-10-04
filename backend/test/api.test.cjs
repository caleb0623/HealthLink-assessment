const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { PrismaClient } = require('@prisma/client');

const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
const prisma = new PrismaClient();
const testReason = `HealthLink integration test ${Date.now()}`;
let token;

function authHeaders() {
  return { Authorization: `Bearer ${token}` };
}

function nextDateForDays(days, hour, minute = 0) {
  const now = new Date();
  const candidate = new Date();
  candidate.setHours(hour, minute, 0, 0);

  while (candidate <= now || !days.includes(candidate.getDay())) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate;
}

before(async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'jordan', password: '123' })
  });

  assert.equal(response.status, 200, 'seeded demo login should work; run npm run db:setup first');
  const session = await response.json();
  token = session.token;
  assert.equal(session.patient.username, 'jordan');
});

after(async () => {
  await prisma.consultation.deleteMany({ where: { reason: testReason } });
  if (token) {
    await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: authHeaders()
    });
  }
  await prisma.$disconnect();
});

test('rejects unauthenticated access to patient data', async () => {
  const response = await fetch(`${baseUrl}/api/doctors`);
  assert.equal(response.status, 401);
});

test('seeds two doctors in every specialty with weekly availability', async () => {
  const response = await fetch(`${baseUrl}/api/doctors`, { headers: authHeaders() });
  assert.equal(response.status, 200);

  const doctors = await response.json();
  assert.equal(doctors.length, 8);
  assert.deepEqual(doctors.map((doctor) => doctor.id), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(doctors.every((doctor) => doctor.availability.startsWith('Every ')));

  const specialtyCounts = doctors.reduce((counts, doctor) => {
    counts.set(doctor.specialty, (counts.get(doctor.specialty) ?? 0) + 1);
    return counts;
  }, new Map());

  assert.deepEqual([...specialtyCounts.values()], [2, 2, 2, 2]);
});

test('seeded consultations include Scheduled and Completed statuses', async () => {
  const response = await fetch(`${baseUrl}/api/consultations`, { headers: authHeaders() });
  assert.equal(response.status, 200);

  const consultations = await response.json();
  const statuses = new Set(consultations.map((consultation) => consultation.status));
  assert.ok(statuses.has('Scheduled'));
  assert.ok(statuses.has('Completed'));
});

test('rejects bookings outside the doctors weekly days and working hours', async () => {
  const unavailableTimes = [
    nextDateForDays([6], 11),
    nextDateForDays([2, 3, 4, 5], 15)
  ];

  for (const preferredTime of unavailableTimes) {
    const response = await fetch(`${baseUrl}/api/consultations`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: 3,
        consultationType: 'Video',
        preferredTime: preferredTime.toISOString(),
        reason: testReason
      })
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /Every Tuesday to Friday, 10:00 AM - 2:00 PM/);
  }
});

test('booking stores an authenticated consultation and returns its status', async () => {
  const response = await fetch(`${baseUrl}/api/consultations`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctorId: 3,
      consultationType: 'Video',
      preferredTime: nextDateForDays([2, 3, 4, 5], 11).toISOString(),
      reason: testReason
    })
  });

  assert.equal(response.status, 201);
  const booking = await response.json();
  assert.equal(booking.status, 'Scheduled');
  assert.equal(booking.reason, testReason);

  const saved = await prisma.consultation.findUnique({ where: { id: booking.id } });
  assert.ok(saved, 'booking should be stored in SQLite');
  assert.equal(saved.doctorId, 3);

  const cancellation = await fetch(`${baseUrl}/api/consultations/${booking.id}/cancel`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  assert.equal(cancellation.status, 200);
  assert.equal((await cancellation.json()).status, 'Cancelled');

  const consultations = await (await fetch(`${baseUrl}/api/consultations`, { headers: authHeaders() })).json();
  const completed = consultations.find((consultation) => consultation.status === 'Completed');
  const invalidCancellation = await fetch(`${baseUrl}/api/consultations/${completed.id}/cancel`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  assert.equal(invalidCancellation.status, 409);
});