const mongoose = require('mongoose');

const score10 = { type: Number, min: 1, max: 10, validate: Number.isInteger };

const ratingSchema = new mongoose.Schema(
  {
    rater: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ratedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },

    // One shared journey = one Match, but each participant owns a Trip document.
    // journeyId is the canonical journey key so a rater can't rate the same journey via both trips.
    journeyId: { type: String, default: undefined },

    // Legacy 1–5 star value (kept so the existing 0–100 safety score keeps working).
    // New ratings derive it from `overall`.
    rating: { type: Number, required: true, min: 1, max: 5 },

    // Behavioural trust parameters (1–10). Absent on legacy star-only ratings.
    reliability: score10,
    safety: score10,
    respect: score10,
    routeCommitment: score10,
    communication: score10,
    overall: { type: Number, min: 1, max: 10 }, // mean of the five, 1 decimal

    comment: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

// One rating per rater per trip document (legacy guarantee)
ratingSchema.index({ rater: 1, trip: 1 }, { unique: true });
// One rating per rater per shared journey (new guarantee; only for docs that carry a journeyId)
ratingSchema.index(
  { rater: 1, journeyId: 1 },
  { unique: true, partialFilterExpression: { journeyId: { $type: 'string' } } }
);
// Received-ratings lookup for trust aggregation
ratingSchema.index({ ratedUser: 1, createdAt: -1 });

module.exports = mongoose.model('Rating', ratingSchema);
