import cors from 'cors';
import express from 'express';
import authRoutes from './routes/authRoutes';
import consultationsRoutes from './routes/consultationsRoutes';
import doctorsRoutes from './routes/doctorsRoutes';
import { requirePatientSession } from './middleware/requirePatientSession';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/doctors', requirePatientSession, doctorsRoutes);
app.use('/api/consultations', requirePatientSession, consultationsRoutes);

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ message: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  console.log(`HealthLink API listening on http://localhost:${port}`);
});