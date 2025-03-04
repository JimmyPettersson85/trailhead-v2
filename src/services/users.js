import { db, now } from '../db.js';
import { client } from '../stream.js';

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);

// Stream user data is what enrichment returns as the activity actor, so it
// carries exactly what the app renders next to a post.
const streamProfile = (user) => ({
  name: user.display_name,
  profileImage: user.avatar_url || undefined,
});

export async function signUp({ id, displayName, avatarUrl }) {
  const user = { id, display_name: displayName, avatar_url: avatarUrl || null, is_admin: ADMIN_IDS.includes(id) ? 1 : 0, created_at: now() };
  db.prepare('INSERT INTO users (id, display_name, avatar_url, is_admin, created_at) VALUES (?, ?, ?, ?, ?)').run(
    user.id,
    user.display_name,
    user.avatar_url,
    user.is_admin,
    user.created_at,
  );
  await client.user(id).getOrCreate(streamProfile(user));
  return user;
}

export async function updateProfile(id, { displayName, avatarUrl }) {
  const user = getUser(id);
  if (!user) return null;
  if (displayName !== undefined) user.display_name = displayName;
  if (avatarUrl !== undefined) user.avatar_url = avatarUrl;
  db.prepare('UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?').run(user.display_name, user.avatar_url, id);
  await client.user(id).update(streamProfile(user));
  return user;
}

export function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function allUserIds() {
  return db.prepare('SELECT id FROM users').all().map((r) => r.id);
}
