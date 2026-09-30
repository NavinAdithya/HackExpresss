const mongoose = require('mongoose');

const CATEGORIES = ['COLLEGE', 'OFFICE', 'ROUTE', 'ORGANIZATION', 'OTHER'];

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, enum: CATEGORIES, default: 'OTHER', index: true },
    description: { type: String, default: '', maxlength: 240 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Denormalised, recomputed on join/leave so list reads stay O(1).
    memberCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Community', communitySchema);
module.exports.CATEGORIES = CATEGORIES;
