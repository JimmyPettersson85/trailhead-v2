// Drives a running Trailhead server with a few days' worth of community
// activity: sign-ups, trails, posts, reshares, likes, comments, follows.
// Usage: node scripts/simulate.js [--hikers 12] [--posts 40] [--seed 1]
//   TRAILHEAD_URL (default http://localhost:4100)
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    hikers: { type: 'string', default: '12' },
    posts: { type: 'string', default: '40' },
    seed: { type: 'string', default: '1' },
    prefix: { type: 'string', default: 'h' },
  },
});
const BASE = process.env.TRAILHEAD_URL || 'http://localhost:4100';

// Deterministic PRNG so a run is reproducible.
let state = Number(values.seed) * 2654435761 >>> 0;
const rand = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const chance = (p) => rand() < p;

async function call(method, path, userId, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(userId ? { 'X-User-Id': userId } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(out)}`);
  return out;
}

const NAMES = ['Ada Ridge', 'Bo Larsen', 'Cam Okafor', 'Dee Marsh', 'Eli Brook', 'Fen Alder', 'Gus Pike', 'Hana Fell', 'Ike Moss', 'Jo Crag', 'Kit Vale', 'Lu Heath', 'Mo Tarn', 'Ned Scree', 'Oli Glen'];
const TRAILS = [
  { id: 'kungsleden-s1', name: 'Kungsleden, Abisko to Alesjaure', region: 'Lapland', lengthKm: 37 },
  { id: 'west-highland', name: 'West Highland Way', region: 'Scotland', lengthKm: 154 },
  { id: 'trolltunga', name: 'Trolltunga', region: 'Vestland', lengthKm: 27 },
  { id: 'tour-mont-blanc-d1', name: 'Tour du Mont Blanc, day 1', region: 'Alps', lengthKm: 16 },
];
const TAGS = ['sunrise', 'wildcamping', 'gear', 'rain', 'summit', 'fika'];
const LINES = ['Made it to the hut before the rain', 'Legs are done but worth it', 'Anyone tried this in October?', 'Best views of the trip', 'New boots held up fine', 'Reindeer on the trail!'];
const PHOTO = (n) => `https://images.trailhead.example/uploads/${n}.jpg`;

const P = values.prefix;
const hikers = NAMES.slice(0, Number(values.hikers)).map((name, i) => ({ id: `${P}${i + 1}`, displayName: name }));
const admin = hikers[0].id;

console.log(`simulating ${hikers.length} hikers and ${values.posts} posts against ${BASE}`);
for (const h of hikers) {
  // Re-runs reuse the same community; hikers who already exist are skipped.
  await call('POST', '/signup', null, { ...h, avatarUrl: chance(0.7) ? `https://images.trailhead.example/avatars/${h.id}.png` : undefined }).catch((err) => {
    if (!/UNIQUE/.test(err.message)) throw err;
  });
}
for (const t of TRAILS) await call('PUT', `/trails/${t.id}`, admin, { name: t.name, region: t.region, lengthKm: t.lengthKm });

for (const h of hikers) {
  for (const other of hikers) if (other.id !== h.id && chance(0.35)) await call('POST', `/follows/hikers/${other.id}`, h.id);
  if (chance(0.5)) await call('POST', `/follows/tags/${pick(TAGS)}`, h.id);
}

const posts = [];
for (let i = 0; i < Number(values.posts); i++) {
  const author = pick(hikers).id;
  let text = pick(LINES);
  if (chance(0.5)) text += ` #${pick(TAGS)}`;
  if (chance(0.25)) text += ` @${pick(hikers).id}`;
  const photos = chance(0.4) ? [PHOTO(i), ...(chance(0.3) ? [PHOTO(`${i}b`)] : [])] : [];
  const post = await call('POST', '/posts', author, { text, photos, trailId: chance(0.4) ? pick(TRAILS).id : undefined });
  posts.push({ ...post, author });
}

for (const post of posts) {
  for (const h of hikers) {
    if (chance(0.3)) await call('POST', `/posts/${post.id}/like`, h.id);
    if (chance(0.06)) await call('POST', `/posts/${post.id}/save`, h.id);
  }
  if (chance(0.5)) {
    const commenter = pick(hikers).id;
    const { commentId } = await call('POST', `/posts/${post.id}/comments`, commenter, { text: pick(LINES) });
    if (chance(0.5)) await call('POST', `/comments/${commentId}/replies`, post.author, { text: 'Thanks!' });
    if (chance(0.4)) await call('POST', `/comments/${commentId}/like`, pick(hikers).id);
    if (chance(0.15)) await call('PATCH', `/comments/${commentId}`, commenter, { text: `${pick(LINES)} (edited)` });
    if (chance(0.1)) await call('DELETE', `/reactions/${commentId}`, commenter);
  }
  if (chance(0.1)) await call('POST', `/posts/${post.id}/reshare`, pick(hikers).id, { text: chance(0.5) ? 'Look at this' : '' });
}

for (const post of posts) {
  if (chance(0.1)) await call('PATCH', `/posts/${post.id}`, post.author, { text: `${pick(LINES)} #${pick(TAGS)} (edited)` });
  else if (chance(0.06)) await call('DELETE', `/posts/${post.id}`, post.author);
  if (chance(0.08)) await call('DELETE', `/posts/${post.id}/like`, pick(hikers).id).catch(() => {});
}
for (const h of hikers) if (chance(0.2)) await call('DELETE', `/follows/hikers/${pick(hikers.filter((o) => o.id !== h.id)).id}`, h.id).catch(() => {});
if (chance(0.5)) await call('PATCH', '/me', pick(hikers).id, { avatarUrl: 'https://images.trailhead.example/avatars/new.png' });

await call('POST', '/admin/announcements', admin, { title: 'Trail closure', body: 'Trolltunga is closed this weekend for maintenance.', trailId: 'trolltunga' });

// Read paths, as the mobile app would.
for (const h of hikers.slice(0, 3)) {
  await call('GET', '/timeline', h.id);
  await call('GET', '/notifications', h.id);
}
console.log('done');
