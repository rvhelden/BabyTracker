import express, { json } from 'express';
import cors from 'cors';
import { join } from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import babiesRouter from './routes/babies.js';
import weightsRouter from './routes/weights.js';
import { babyInviteRouter, publicInviteRouter } from './routes/invites.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(json());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/babies', babiesRouter);
app.use('/api/babies/:babyId/weights', weightsRouter);
app.use('/api/babies/:babyId/invites', babyInviteRouter);
app.use('/api/invites', publicInviteRouter);

// Serve built React app in production
const clientBuild = join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(join(clientBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Baby Tracker server running on port ${PORT}`);
});
