const mongoose = require('mongoose');

const communityMemberSchema = new mongoose.Schema(
  {
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

communityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('CommunityMember', communityMemberSchema);
