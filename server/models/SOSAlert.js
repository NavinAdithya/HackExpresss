const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED', 'FALSE_ALARM'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

sosAlertSchema.index({ 'location': '2dsphere' });

module.exports = mongoose.model('SOSAlert', sosAlertSchema);
