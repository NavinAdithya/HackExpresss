/**
 * Community service — membership lookups, ranking context for the matcher,
 * and the "who is going my way with seats" view for a community.
 *
 * Communities are mobility groups (colleges, offices, regular routes…), not a social feed:
 * the only things a community surfaces are commuters, seats, routes and trust.
 */

const Community = require('../models/Community');
const CommunityMember = require('../models/CommunityMember');
const User = require('../models/User');
const { toTrustLite, getBehaviorTrust } = require('./behavior-trust');

const slugify = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/→|->/g, ' to ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/** Recompute the denormalised member count. */
async function refreshMemberCount(communityId) {
  const memberCount = await CommunityMember.countDocuments({ communityId });
  const community = await Community.findById(communityId);
  if (community) {
    community.memberCount = memberCount;
    await community.save();
  }
  return memberCount;
}

/** { userId: [{id,name,category}] } for a set of users (two queries, regardless of size). */
async function getCommunitiesForUsers(userIds) {
  const ids = [...new Set(userIds.map(String))];
  if (ids.length === 0) return {};
  const memberships = await CommunityMember.find({ userId: { $in: ids } });
  const communityIds = [...new Set(memberships.map((m) => String(m.communityId)))];
  const communities = communityIds.length
    ? await Community.find({ _id: { $in: communityIds } })
    : [];
  const byId = {};
  communities.forEach((c) => {
    byId[String(c._id)] = { id: String(c._id), name: c.name, category: c.category };
  });

  const out = {};
  ids.forEach((id) => { out[id] = []; });
  memberships.forEach((m) => {
    const c = byId[String(m.communityId)];
    if (c) out[String(m.userId)].push(c);
  });
  return out;
}

/**
 * Ranking context consumed by matching-engine.applyRankingSignals.
 * Uses the cached User.behaviorTrust — no rating scans.
 */
async function buildRankingContext(searcherId, candidateUsers) {
  // One-time cache fill for users who have never been summarised (reads stay O(1) afterwards).
  await Promise.all(candidateUsers.map(async (u) => {
    if (!u.behaviorTrust) u.behaviorTrust = await getBehaviorTrust(u);
  }));
  const candidateIds = candidateUsers.map((u) => String(u._id));
  const communityMap = await getCommunitiesForUsers([String(searcherId), ...candidateIds]);
  const mine = new Set((communityMap[String(searcherId)] || []).map((c) => c.id));

  const trustByUser = {};
  const sharedByUser = {};
  candidateUsers.forEach((u) => {
    const id = String(u._id);
    trustByUser[id] = toTrustLite(u.behaviorTrust);
    sharedByUser[id] = (communityMap[id] || []).filter((c) => mine.has(c.id));
  });
  return { trustByUser, sharedByUser, communityMap };
}

async function isMember(communityId, userId) {
  const m = await CommunityMember.findOne({ communityId, userId });
  return !!m;
}

async function memberUsers(communityId) {
  const members = await CommunityMember.find({ communityId });
  const ids = members.map((m) => String(m.userId));
  const users = ids.length ? await User.find({ _id: { $in: ids } }) : [];
  return { ids, users };
}

module.exports = {
  slugify,
  refreshMemberCount,
  getCommunitiesForUsers,
  buildRankingContext,
  isMember,
  memberUsers,
};
