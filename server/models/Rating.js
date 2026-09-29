const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    rater: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ratedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

// One rating per rater per trip
ratingSchema.index({ rater: 1, trip: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
