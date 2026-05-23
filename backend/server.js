require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connect } = require('./models/db');

const app = express();

app.use(cors());
app.use((req, res, next) => { res.setHeader('Bypass-Tunnel-Reminder', 'true'); next(); });
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Rate limiting — stricter on auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests, please try again later.' } });
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });

app.use('/auth', authLimiter, require('./routes/auth'));
app.use('/ussd', require('./routes/ussd'));
app.use('/deliveries', generalLimiter, require('./routes/deliveries'));
app.use('/riders', generalLimiter, require('./routes/riders'));
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;

connect()
  .then(() => app.listen(PORT, () => console.log(`RiderR backend running on port ${PORT}`)))
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
