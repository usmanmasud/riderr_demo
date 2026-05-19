require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/ussd',       require('./routes/ussd'));
app.use('/deliveries', require('./routes/deliveries'));
app.use('/riders',     require('./routes/riders'));
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => console.log(`RiderR backend running on port ${PORT}`));
});
