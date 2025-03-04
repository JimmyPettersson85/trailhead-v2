import { db } from '../db.js';
import { FeedGroup, client } from '../stream.js';
import { getPost } from './posts.js';

const notifyAuthor = (post, userId) => (post.author_id === userId ? [] : [`${FeedGroup.NOTIFICATION}:${post.author_id}`]);

export async function likePost(userId, postId) {
  const post = getPost(postId);
  if (!post) return null;
  const existing = db.prepare('SELECT reaction_id FROM likes WHERE user_id = ? AND activity_id = ?').get(userId, post.activity_id);
  if (existing) return { reactionId: existing.reaction_id };
  const reaction = await client.reactions.add('like', post.activity_id, {}, { userId, targetFeeds: notifyAuthor(post, userId) });
  db.prepare('INSERT INTO likes (user_id, activity_id, reaction_id) VALUES (?, ?, ?)').run(userId, post.activity_id, reaction.id);
  return { reactionId: reaction.id };
}

export async function unlikePost(userId, postId) {
  const post = getPost(postId);
  const like = post && db.prepare('SELECT reaction_id FROM likes WHERE user_id = ? AND activity_id = ?').get(userId, post.activity_id);
  if (!like) return false;
  await client.reactions.delete(like.reaction_id);
  db.prepare('DELETE FROM likes WHERE user_id = ? AND activity_id = ?').run(userId, post.activity_id);
  return true;
}

export async function commentOnPost(userId, postId, { text }) {
  const post = getPost(postId);
  if (!post) return null;
  const reaction = await client.reactions.add('comment', post.activity_id, { text }, { userId, targetFeeds: notifyAuthor(post, userId) });
  return { commentId: reaction.id };
}

export async function replyToComment(userId, commentId, { text }) {
  const parent = await client.reactions.get(commentId);
  const targetFeeds = parent.user_id === userId ? [] : [`${FeedGroup.NOTIFICATION}:${parent.user_id}`];
  const reaction = await client.reactions.addChild('comment', commentId, { text }, { userId, targetFeeds });
  return { commentId: reaction.id };
}

export async function likeComment(userId, commentId) {
  const reaction = await client.reactions.addChild('like', commentId, {}, { userId });
  return { reactionId: reaction.id };
}

export async function editComment(userId, commentId, { text }) {
  const comment = await client.reactions.get(commentId);
  if (comment.user_id !== userId) return null;
  await client.reactions.update(commentId, { text });
  return { commentId };
}

export async function deleteReaction(userId, reactionId) {
  const reaction = await client.reactions.get(reactionId);
  if (reaction.user_id !== userId) return false;
  await client.reactions.delete(reactionId);
  return true;
}

// "Save for later" on a post.
export async function savePost(userId, postId) {
  const post = getPost(postId);
  if (!post) return null;
  const reaction = await client.reactions.add('save', post.activity_id, {}, { userId });
  return { reactionId: reaction.id };
}

export async function savedPosts(userId) {
  const { results } = await client.reactions.filter({ user_id: userId, kind: 'save', limit: 25, with_activity_data: true });
  return results;
}
