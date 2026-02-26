const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/babies', require('./routes/babies'));
app.use('/api/babies/:babyId/weights', require('./routes/weights'));

const { babyInviteRouter, publicInviteRouter } = require('./routes/invites');
app.use('/api/babies/:babyId/invites', babyInviteRouter);
app.use('/api/invites', publicInviteRouter);

// Serve built React app in production
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Baby Tracker server running on port ${PORT}`);
});
