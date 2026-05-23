require('dotenv').config();
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const { connect } = require('./models/db');

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

app.set('io', io);

io.on('connection', socket => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use((req, res, next) => { res.setHeader('Bypass-Tunnel-Reminder', 'true'); next(); });
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const authLimiter    = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,  message: { error: 'Too many requests, please try again later.' } });
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });

app.use('/auth',       authLimiter,    require('./routes/auth'));
app.use('/ussd',                       require('./routes/ussd'));
app.use('/deliveries', generalLimiter, require('./routes/deliveries'));
app.use('/riders',     generalLimiter, require('./routes/riders'));
app.use('/users',      generalLimiter, require('./routes/users'));
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;

connect()
  .then(() => server.listen(PORT, () => console.log(`RiderR backend running on port ${PORT}`)))
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
