import { db, now } from '../db.js';
import { FeedGroup, client, userRef } from '../stream.js';
import { allUserIds, getUser } from './users.js';

// Admin announcements (trail closures, events) land in every hiker's
// notification feed at once.
export async function announce(adminId, { title, body, trailId }) {
  if (!getUser(adminId)?.is_admin) return null;
  const createdAt = now();
  const { lastInsertRowid: id } = db.prepare("INSERT INTO posts (author_id, kind, created_at) VALUES (?, 'announcement', ?)").run(adminId, createdAt);
  const feeds = allUserIds().map((userId) => `${FeedGroup.NOTIFICATION}:${userId}`);
  await client.addToMany(
    {
      actor: userRef(adminId),
      verb: 'announce',
      object: `announcement:${id}`,
      foreign_id: `announcement:${id}`,
      time: createdAt,
      title,
      text: body,
      trail_id: trailId || null,
    },
    feeds,
  );
  return { id: Number(id), recipients: feeds.length };
}
