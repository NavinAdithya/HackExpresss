const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    tripA: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    tripB: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    userA: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userB: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Individual dimension scores (0–100)
    routeScore: { type: Number, required: true },
    timeScore: { type: Number, required: true },
    budgetScore: { type: Number, required: true },
    capacityScore: { type: Number, required: true },

    // Final composite score
    finalScore: { type: Number, required: true },

    // Gemini explanation
    explanation: { type: String, default: '' },

    // Status
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

matchSchema.index({ tripA: 1, tripB: 1 }, { unique: true });

module.exports = mongoose.model('Match', matchSchema);
