const express = require('express');
const router = express.Router();
const { Delivery, Rider } = require('../models');
const { sendSMS } = require('../sms');
const { v4: uuidv4 } = require('uuid');

function normalizePhone(phone) {
  phone = phone.replace(/\s+/g, '');
  if (phone.startsWith('0')) return '+234' + phone.slice(1);
  if (phone.startsWith('234')) return '+' + phone;
  return phone;
}

function generateTracking() { return 'RDR-' + uuidv4().slice(0, 6).toUpperCase(); }
function generateOTP()      { return Math.floor(1000 + Math.random() * 9000).toString(); }

router.post('/', async (req, res) => {
  const { phoneNumber, text } = req.body;
  const phone = normalizePhone(phoneNumber || '');
  const parts = (text || '').split('*');
  let response = '';

  try {
    // ── MAIN MENU ────────────────────────────────────────────────────────
    if (text === '') {
      response = `CON Welcome to RiderR Logistics\n1. I am a Customer\n2. I am a Rider`;

    // ════════════════════════════════════════════════════════════════════
    // CUSTOMER FLOW  (parts[0] === '1')
    // ════════════════════════════════════════════════════════════════════
    } else if (parts[0] === '1') {

      if (parts.length === 1) {
        response = `CON Customer Menu\n1. Book a Delivery\n2. Track my Delivery\n3. Cancel a Delivery`;

      // ── 1.1 BOOK DELIVERY ──────────────────────────────────────────────
      } else if (parts[1] === '1') {
        if (parts.length === 2) {
          response = 'CON Enter your full name:';
        } else if (parts.length === 3) {
          response = 'CON Enter pickup address:';
        } else if (parts.length === 4) {
          response = 'CON Enter delivery address:';
        } else if (parts.length === 5) {
          const [, , name, pickup, destination] = parts;
          const trackingCode = generateTracking();
          const otp = generateOTP();

          await Delivery.create({
            trackingCode, otp,
            customerName: name,
            customerPhone: phone,
            pickupAddress: pickup,
            deliveryAddress: destination,
          });

          await sendSMS(phone,
            `Hi ${name}, your delivery is booked!\nTracking: ${trackingCode}\nOTP (give to rider on delivery): ${otp}`
          );

          response = `END Booking confirmed!\nTracking Code: ${trackingCode}\nOTP: ${otp}\nAn SMS has been sent to your number.`;
        }

      // ── 1.2 TRACK DELIVERY ─────────────────────────────────────────────
      } else if (parts[1] === '2') {
        if (parts.length === 2) {
          response = 'CON Enter your tracking code:';
        } else if (parts.length === 3) {
          const delivery = await Delivery.findOne({ trackingCode: parts[2].toUpperCase() })
            .populate('rider', 'name phone');
          if (!delivery) return res.send('END Tracking code not found.');

          const riderInfo = delivery.rider
            ? `\nRider: ${delivery.rider.name} (${delivery.rider.phone})`
            : '\nRider: Not yet assigned';

          response = `END Delivery: ${delivery.trackingCode}\nStatus: ${delivery.status.replace('_', ' ').toUpperCase()}\nFrom: ${delivery.pickupAddress}\nTo: ${delivery.deliveryAddress}${riderInfo}`;
        }

      // ── 1.3 CANCEL DELIVERY ────────────────────────────────────────────
      } else if (parts[1] === '3') {
        if (parts.length === 2) {
          response = 'CON Enter tracking code to cancel:';
        } else if (parts.length === 3) {
          const delivery = await Delivery.findOne({
            trackingCode: parts[2].toUpperCase(),
            customerPhone: phone,
          });
          if (!delivery) return res.send('END Delivery not found or does not belong to your number.');
          if (['delivered', 'cancelled', 'in_transit'].includes(delivery.status)) {
            return res.send(`END Cannot cancel a delivery with status: ${delivery.status}.`);
          }
          response = `CON Cancel delivery ${delivery.trackingCode}?\nStatus: ${delivery.status}\n1. Yes, cancel it\n2. No, go back`;
        } else if (parts.length === 4) {
          if (parts[3] === '1') {
            const delivery = await Delivery.findOne({ trackingCode: parts[2].toUpperCase(), customerPhone: phone });
            if (!delivery) return res.send('END Delivery not found.');
            delivery.status = 'cancelled';
            await delivery.save();
            await sendSMS(phone, `Your delivery ${delivery.trackingCode} has been cancelled.`);
            response = `END Delivery ${delivery.trackingCode} has been cancelled.`;
          } else {
            response = 'END Cancellation aborted.';
          }
        }

      } else {
        response = 'END Invalid option.';
      }

    // ════════════════════════════════════════════════════════════════════
    // RIDER FLOW  (parts[0] === '2')
    // ════════════════════════════════════════════════════════════════════
    } else if (parts[0] === '2') {

      if (parts.length === 1) {
        const rider = await Rider.findOne({ phone });
        if (!rider) return res.send('END Your number is not registered as a rider. Contact admin.');
        response = `CON Rider Menu — ${rider.name}\n1. View My Active Deliveries\n2. Accept a Job\n3. Mark as Picked Up\n4. Confirm Delivery (OTP)\n5. Report Issue`;

      // ── 2.1 VIEW ACTIVE DELIVERIES ─────────────────────────────────────
      } else if (parts[1] === '1') {
        const rider = await Rider.findOne({ phone });
        if (!rider) return res.send('END Not registered as a rider.');
        const jobs = await Delivery.find({ rider: rider._id, status: { $in: ['accepted', 'in_transit'] } }).limit(5);
        if (!jobs.length) return res.send('END You have no active deliveries.');
        const list = jobs.map((d, i) => `${i + 1}. ${d.trackingCode} [${d.status.replace('_', ' ')}]`).join('\n');
        response = `END Your active deliveries:\n${list}`;

      // ── 2.2 ACCEPT A JOB ───────────────────────────────────────────────
      } else if (parts[1] === '2') {
        if (parts.length === 2) {
          const pending = await Delivery.find({ status: 'pending', rider: null }).limit(5);
          if (!pending.length) return res.send('END No pending jobs available right now.');
          const list = pending.map((d, i) => `${i + 1}. ${d.trackingCode}\n   To: ${d.deliveryAddress}`).join('\n');
          response = `CON Available Jobs:\n${list}\nEnter job number to accept:`;

        } else if (parts.length === 3) {
          const pending = await Delivery.find({ status: 'pending', rider: null }).limit(5);
          const selected = pending[parseInt(parts[2]) - 1];
          if (!selected) return res.send('END Invalid selection.');

          const rider = await Rider.findOne({ phone });
          if (!rider) return res.send('END Not registered as a rider.');

          selected.rider = rider._id;
          selected.status = 'accepted';
          await selected.save();

          await sendSMS(selected.customerPhone,
            `Your delivery ${selected.trackingCode} has been accepted by rider ${rider.name} (${rider.phone}). They are heading to pick it up!`
          );

          response = `END Job ${selected.trackingCode} accepted!\nPickup: ${selected.pickupAddress}\nDeliver to: ${selected.deliveryAddress}\nCustomer OTP will be needed on delivery.`;
        }

      // ── 2.3 MARK IN TRANSIT ────────────────────────────────────────────
      } else if (parts[1] === '3') {
        if (parts.length === 2) {
          response = 'CON Enter tracking code to mark as picked up:';
        } else if (parts.length === 3) {
          const rider = await Rider.findOne({ phone });
          if (!rider) return res.send('END Not registered as a rider.');
          const delivery = await Delivery.findOne({ trackingCode: parts[2].toUpperCase(), rider: rider._id });
          if (!delivery) return res.send('END Delivery not found or not assigned to you.');
          if (delivery.status !== 'accepted') return res.send(`END Delivery is already ${delivery.status}.`);
          delivery.status = 'in_transit';
          await delivery.save();
          await sendSMS(delivery.customerPhone,
            `Your package ${delivery.trackingCode} has been picked up and is now IN TRANSIT. Rider: ${rider.name} (${rider.phone})`
          );
          response = `END ${delivery.trackingCode} marked as In Transit!\nCustomer has been notified.`;
        }

      // ── 2.4 CONFIRM DELIVERY ───────────────────────────────────────────
      } else if (parts[1] === '4') {
        if (parts.length === 2) {
          response = 'CON Enter tracking code:';
        } else if (parts.length === 3) {
          const delivery = await Delivery.findOne({ trackingCode: parts[2].toUpperCase() });
          if (!delivery) return res.send('END Tracking code not found.');
          if (delivery.status === 'delivered') return res.send('END This delivery is already confirmed.');
          response = `CON Delivery: ${delivery.trackingCode}\nTo: ${delivery.deliveryAddress}\nEnter customer OTP to confirm:`;
        } else if (parts.length === 4) {
          const delivery = await Delivery.findOne({ trackingCode: parts[2].toUpperCase() });
          if (!delivery) return res.send('END Delivery not found.');
          if (delivery.otp !== parts[3]) return res.send('END Wrong OTP. Delivery not confirmed.');

          delivery.status = 'delivered';
          await delivery.save();

          // Increment rider's total deliveries
          await Rider.findByIdAndUpdate(delivery.rider, { $inc: { totalDeliveries: 1 } });

          await sendSMS(delivery.customerPhone,
            `Your package ${delivery.trackingCode} has been delivered successfully! Thank you for using RiderR.`
          );

          response = `END Delivery ${delivery.trackingCode} confirmed!\nGreat job! Your stats have been updated.`;
        }

      // ── 2.5 REPORT ISSUE ───────────────────────────────────────────────
      } else if (parts[1] === '5') {
        if (parts.length === 2) {
          response = `CON Select issue type:\n1. Cannot locate address\n2. Customer not available\n3. Package damaged\n4. Security concern`;
        } else if (parts.length === 3) {
          response = 'CON Enter tracking code for this issue:';
        } else if (parts.length === 4) {
          const issues = ['Cannot locate address', 'Customer not available', 'Package damaged', 'Security concern'];
          const issue = issues[parseInt(parts[2]) - 1] || 'Unknown issue';
          const delivery = await Delivery.findOne({ trackingCode: parts[3].toUpperCase() });
          if (!delivery) return res.send('END Tracking code not found.');

          delivery.status = 'failed';
          delivery.statusHistory.push({ status: 'failed', note: issue });
          await delivery.save();

          await sendSMS(delivery.customerPhone,
            `Issue with your delivery ${delivery.trackingCode}: "${issue}". Our support team will contact you shortly.`
          );

          response = `END Issue reported for ${delivery.trackingCode}.\nReason: ${issue}\nSupport will follow up.`;
        }

      } else {
        response = 'END Invalid option.';
      }

    } else {
      response = 'END Invalid option. Please try again.';
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (err) {
    console.error('USSD error:', err);
    res.set('Content-Type', 'text/plain');
    res.send('END Something went wrong. Please try again.');
  }
});

module.exports = router;
