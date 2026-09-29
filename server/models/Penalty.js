const mongoose = require('mongoose');

const penaltySchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: ['NO_SHOW', 'LATE_CANCEL'],
      required: true,
    },
    amount: { type: Number, required: true }, // Penalty charged to rider
    compensation: { type: Number, required: true }, // Amount compensated to driver
    timestamp: { type: Date, default: Date.now },
    // MOCKED FOR DEMO: Payment collection is simulated
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COLLECTED', 'WAIVED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Penalty', penaltySchema);
