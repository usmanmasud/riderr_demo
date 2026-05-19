const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Rider = sequelize.define('Rider', {
  name:  { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false, unique: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
});

const Delivery = sequelize.define('Delivery', {
  trackingCode:    { type: DataTypes.STRING, allowNull: false, unique: true },
  customerName:    { type: DataTypes.STRING, allowNull: false },
  customerPhone:   { type: DataTypes.STRING, allowNull: false },
  pickupAddress:   { type: DataTypes.STRING, allowNull: false },
  deliveryAddress: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'in_transit', 'delivered', 'failed'),
    defaultValue: 'pending',
  },
  otp: { type: DataTypes.STRING },
});

Rider.hasMany(Delivery, { foreignKey: 'riderId' });
Delivery.belongsTo(Rider, { foreignKey: 'riderId' });

module.exports = { Rider, Delivery, sequelize };
