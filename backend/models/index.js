const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['admin', 'customer'], default: 'customer' },
  phone:    { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const RiderSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  phone:    { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  totalDeliveries: { type: Number, default: 0 },
  rating:          { type: Number, default: 5.0, min: 1, max: 5 },
}, { timestamps: true });

const DeliverySchema = new mongoose.Schema({
  trackingCode:    { type: String, required: true, unique: true, uppercase: true },
  customerName:    { type: String, required: true, trim: true },
  customerPhone:   { type: String, required: true },
  pickupAddress:   { type: String, required: true, trim: true },
  deliveryAddress: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_transit', 'delivered', 'failed', 'cancelled'],
    default: 'pending',
  },
  otp:          { type: String },
  rider:        { type: mongoose.Schema.Types.ObjectId, ref: 'Rider', default: null },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes:        { type: String, trim: true },
  statusHistory: [{
    status:    { type: String },
    timestamp: { type: Date, default: Date.now },
    note:      { type: String },
  }],
}, { timestamps: true });

// Auto-push status history on status change
DeliverySchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({ status: this.status });
  }
  next();
});

const User     = mongoose.model('User', UserSchema);
const Rider    = mongoose.model('Rider', RiderSchema);
const Delivery = mongoose.model('Delivery', DeliverySchema);

module.exports = { User, Rider, Delivery };
