const mongoose = require('mongoose');

const RiderSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  phone:    { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const DeliverySchema = new mongoose.Schema({
  trackingCode:    { type: String, required: true, unique: true },
  customerName:    { type: String, required: true },
  customerPhone:   { type: String, required: true },
  pickupAddress:   { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_transit', 'delivered', 'failed'],
    default: 'pending',
  },
  otp:    { type: String },
  rider:  { type: mongoose.Schema.Types.ObjectId, ref: 'Rider', default: null },
}, { timestamps: true });

const Rider    = mongoose.model('Rider', RiderSchema);
const Delivery = mongoose.model('Delivery', DeliverySchema);

module.exports = { Rider, Delivery };
