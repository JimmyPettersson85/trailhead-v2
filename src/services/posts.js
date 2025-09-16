import { db, now } from '../db.js';
import { FeedGroup, client, userFeed, userRef } from '../stream.js';
import { hashtagsIn, mentionsIn } from './text.js';
import { trailRef } from './trails.js';
import { getUser } from './users.js';

const postForeignId = (postId) => `post:${postId}`;

// A post goes to the author's user feed; followers get it through their
// timeline. Each #hashtag copies it into that tag feed and each @mention into
// the mentioned hiker's notification feed.
function targetsFor(text) {
  const mentioned = mentionsIn(text).filter((id) => getUser(id));
  return {
    mentioned,
    to: [...hashtagsIn(text).map((tag) => `${FeedGroup.TAG}:${tag}`), ...mentioned.map((id) => `${FeedGroup.NOTIFICATION}:${id}`)],
  };
}

export async function createPost(authorId, { text, photos = [], trailId }) {
  const createdAt = now();
  const { lastInsertRowid: postId } = db.prepare('INSERT INTO posts (author_id, created_at) VALUES (?, ?)').run(authorId, createdAt);
  const { mentioned, to } = targetsFor(text);

  const activity = await userFeed(authorId).addActivity({
    actor: userRef(authorId),
    verb: 'post',
    object: trailId ? trailRef(trailId) : postForeignId(postId),
    foreign_id: postForeignId(postId),
    time: createdAt,
    text,
    attachments: { images: photos },
    hashtags: hashtagsIn(text),
    mentions: mentioned.map(userRef),
    to,
  });
  db.prepare('UPDATE posts SET activity_id = ? WHERE id = ?').run(activity.id, postId);
  return { id: Number(postId), activityId: activity.id };
}

export async function editPost(authorId, postId, { text }) {
  const post = ownPost(authorId, postId);
  if (!post) return null;
  await client.activityPartialUpdate({
    foreign_id: postForeignId(post.id),
    time: post.created_at,
    set: { text, hashtags: hashtagsIn(text) },
  });
  return { id: post.id };
}

export async function deletePost(authorId, postId) {
  const post = ownPost(authorId, postId);
  if (!post) return false;
  await userFeed(authorId).removeActivity({ foreign_id: postForeignId(post.id) });
  db.prepare('UPDATE posts SET deleted_at = ? WHERE id = ?').run(now(), post.id);
  return true;
}

// A reshare is its own activity pointing at the original one.
export async function resharePost(userId, postId, { text } = {}) {
  const original = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL').get(postId);
  if (!original?.activity_id) return null;
  const createdAt = now();
  const { lastInsertRowid: shareId } = db
    .prepare("INSERT INTO posts (author_id, kind, created_at) VALUES (?, 'share', ?)")
    .run(userId, createdAt);
  const activity = await userFeed(userId).addActivity({
    actor: userRef(userId),
    verb: 'share',
    object: `SA:${original.activity_id}`,
    foreign_id: `share:${shareId}`,
    time: createdAt,
    text: text || '',
    to: original.author_id === userId ? [] : [`${FeedGroup.NOTIFICATION}:${original.author_id}`],
  });
  db.prepare('UPDATE posts SET activity_id = ? WHERE id = ?').run(activity.id, shareId);
  return { id: Number(shareId), activityId: activity.id };
}

export function getPost(postId) {
  return db.prepare('SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL').get(postId);
}

function ownPost(authorId, postId) {
  return db.prepare("SELECT * FROM posts WHERE id = ? AND author_id = ? AND kind = 'post' AND deleted_at IS NULL").get(postId, authorId);
}
