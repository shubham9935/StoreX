const express = require('express');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  const statusCode = err.status || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  return res.status(statusCode).json({ message });
});

module.exports = app;
