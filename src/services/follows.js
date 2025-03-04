import { db } from '../db.js';
import { FeedGroup, client, timelineFeed } from '../stream.js';

// Hikers new users follow so their timeline isn't empty.
const STARTER_HIKERS = (process.env.STARTER_HIKERS || '').split(',').filter(Boolean);

export async function followHiker(userId, targetUserId) {
  await timelineFeed(userId).follow(FeedGroup.USER, targetUserId);
  db.prepare('INSERT OR IGNORE INTO follows (follower_id, target) VALUES (?, ?)').run(userId, `${FeedGroup.USER}:${targetUserId}`);
}

export async function unfollowHiker(userId, targetUserId) {
  await timelineFeed(userId).unfollow(FeedGroup.USER, targetUserId);
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND target = ?').run(userId, `${FeedGroup.USER}:${targetUserId}`);
}

export async function followHashtag(userId, tag) {
  await timelineFeed(userId).follow(FeedGroup.TAG, tag.toLowerCase());
  db.prepare('INSERT OR IGNORE INTO follows (follower_id, target) VALUES (?, ?)').run(userId, `${FeedGroup.TAG}:${tag.toLowerCase()}`);
}

export async function unfollowHashtag(userId, tag) {
  await timelineFeed(userId).unfollow(FeedGroup.TAG, tag.toLowerCase(), { keepHistory: true });
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND target = ?').run(userId, `${FeedGroup.TAG}:${tag.toLowerCase()}`);
}

export async function followStarterHikers(userId) {
  const targets = STARTER_HIKERS.filter((id) => id !== userId);
  if (targets.length === 0) return;
  await client.followMany(
    targets.map((id) => ({ source: `${FeedGroup.TIMELINE}:${userId}`, target: `${FeedGroup.USER}:${id}` })),
    0, // new hikers start with an empty timeline; no backfill
  );
  const insert = db.prepare('INSERT OR IGNORE INTO follows (follower_id, target) VALUES (?, ?)');
  for (const id of targets) insert.run(userId, `${FeedGroup.USER}:${id}`);
}
