import { FeedGroup, client, notificationFeed, timelineFeed, userFeed } from '../stream.js';

const enriched = (viewerId, limit, idLt) => ({
  limit,
  id_lt: idLt,
  enrich: true,
  withReactionCounts: true,
  withRecentReactions: true,
  withOwnReactions: true,
  user_id: viewerId,
});

// A post as the app renders it: author, text, photos, trail, counts.
function present(activity) {
  return {
    id: activity.id,
    kind: activity.verb,
    author: activity.actor?.data ? { id: activity.actor.id, ...activity.actor.data } : activity.actor,
    text: activity.body ?? activity.text,
    photos: activity.media || [],
    trail: activity.object?.collection === 'trail' ? { id: activity.object.id, ...activity.object.data } : null,
    reshareOf: activity.verb === 'share' && typeof activity.object === 'object' ? present(activity.object) : null,
    hashtags: activity.hashtags || [],
    time: activity.time,
    counts: activity.reaction_counts || {},
    liked: Boolean(activity.own_reactions?.like?.length),
    saved: Boolean(activity.own_reactions?.save?.length),
    recentComments: (activity.latest_reactions?.comment || []).map((c) => ({ id: c.id, user: c.user?.data?.name, text: c.data.text })),
  };
}

export async function homeTimeline(viewerId, { limit = 20, before } = {}) {
  const { results } = await timelineFeed(viewerId).get(enriched(viewerId, limit, before));
  return results.map(present);
}

export async function profilePosts(viewerId, userId, { limit = 20, before } = {}) {
  const { results } = await userFeed(userId).get(enriched(viewerId, limit, before));
  return results.map(present);
}

export async function hashtagPosts(viewerId, tag, { limit = 20, before } = {}) {
  const { results } = await client.feed(FeedGroup.TAG, tag.toLowerCase()).get(enriched(viewerId, limit, before));
  return results.map(present);
}

export async function notifications(viewerId, { markSeen = false } = {}) {
  const { results, unseen, unread } = await notificationFeed(viewerId).get({ limit: 20, enrich: true, mark_seen: markSeen });
  return {
    unseen,
    unread,
    groups: results.map((g) => ({
      verb: g.verb,
      count: g.activity_count,
      actors: [...new Set(g.activities.map((a) => a.actor?.data?.name || a.actor))],
      seen: g.is_seen,
      latest: g.activities[0]?.text || g.activities[0]?.reaction?.kind || null,
    })),
  };
}

export async function comments(activityId, { limit = 25 } = {}) {
  const { results } = await client.reactions.filter({ activity_id: activityId, kind: 'comment', limit });
  return results.map((c) => ({
    id: c.id,
    user: c.user_id,
    text: c.data.text,
    replies: (c.latest_children?.comment || []).map((r) => ({ id: r.id, user: r.user_id, text: r.data.text })),
    likes: c.children_counts?.like || 0,
  }));
}

// Short-lived token so the mobile app can subscribe to realtime updates on
// the hiker's own feeds.
export const realtimeToken = (userId) => client.createUserToken(userId);
