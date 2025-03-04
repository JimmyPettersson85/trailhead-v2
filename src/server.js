import express from 'express';

import { announce } from './services/announcements.js';
import * as feeds from './services/feeds.js';
import { followHashtag, followHiker, followStarterHikers, unfollowHashtag, unfollowHiker } from './services/follows.js';
import { createPost, deletePost, editPost, getPost, resharePost } from './services/posts.js';
import * as reactions from './services/reactions.js';
import { upsertTrail } from './services/trails.js';
import { getUser, signUp, updateProfile } from './services/users.js';

const app = express();
app.use(express.json());

// Demo auth: the mobile app sends the signed-in hiker's id. Swap for real
// sessions before shipping.
function auth(req, res, next) {
  const user = getUser(req.get('X-User-Id'));
  if (!user) return res.status(401).json({ error: 'unknown user' });
  req.user = user;
  next();
}

const route = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res))
    .then((out) => (out === null || out === false ? res.status(404).json({ error: 'not found' }) : res.json(out ?? { ok: true })))
    .catch(next);

app.post('/signup', route(async (req) => {
  const user = await signUp(req.body);
  await followStarterHikers(user.id);
  return { user, token: feeds.realtimeToken(user.id) };
}));
app.patch('/me', auth, route((req) => updateProfile(req.user.id, req.body)));
app.get('/me/token', auth, route((req) => ({ token: feeds.realtimeToken(req.user.id) })));

app.put('/trails/:id', auth, route((req) => upsertTrail({ id: req.params.id, ...req.body })));

app.post('/posts', auth, route((req) => createPost(req.user.id, req.body)));
app.patch('/posts/:id', auth, route((req) => editPost(req.user.id, Number(req.params.id), req.body)));
app.delete('/posts/:id', auth, route((req) => deletePost(req.user.id, Number(req.params.id))));
app.post('/posts/:id/reshare', auth, route((req) => resharePost(req.user.id, Number(req.params.id), req.body)));
app.post('/posts/:id/like', auth, route((req) => reactions.likePost(req.user.id, Number(req.params.id))));
app.delete('/posts/:id/like', auth, route((req) => reactions.unlikePost(req.user.id, Number(req.params.id))));
app.post('/posts/:id/save', auth, route((req) => reactions.savePost(req.user.id, Number(req.params.id))));
app.post('/posts/:id/comments', auth, route((req) => reactions.commentOnPost(req.user.id, Number(req.params.id), req.body)));
app.get('/posts/:id/comments', auth, route(async (req) => {
  const post = getPost(Number(req.params.id));
  return post && feeds.comments(post.activity_id);
}));

app.post('/comments/:id/replies', auth, route((req) => reactions.replyToComment(req.user.id, req.params.id, req.body)));
app.post('/comments/:id/like', auth, route((req) => reactions.likeComment(req.user.id, req.params.id)));
app.patch('/comments/:id', auth, route((req) => reactions.editComment(req.user.id, req.params.id, req.body)));
app.delete('/reactions/:id', auth, route((req) => reactions.deleteReaction(req.user.id, req.params.id)));

app.post('/follows/hikers/:id', auth, route((req) => followHiker(req.user.id, req.params.id)));
app.delete('/follows/hikers/:id', auth, route((req) => unfollowHiker(req.user.id, req.params.id)));
app.post('/follows/tags/:tag', auth, route((req) => followHashtag(req.user.id, req.params.tag)));
app.delete('/follows/tags/:tag', auth, route((req) => unfollowHashtag(req.user.id, req.params.tag)));

app.get('/timeline', auth, route((req) => feeds.homeTimeline(req.user.id, { before: req.query.before })));
app.get('/hikers/:id/posts', auth, route((req) => feeds.profilePosts(req.user.id, req.params.id, { before: req.query.before })));
app.get('/tags/:tag', auth, route((req) => feeds.hashtagPosts(req.user.id, req.params.tag, { before: req.query.before })));
app.get('/notifications', auth, route((req) => feeds.notifications(req.user.id, { markSeen: req.query.seen === '1' })));
app.get('/saved', auth, route((req) => reactions.savedPosts(req.user.id)));

app.post('/admin/announcements', auth, route((req) => announce(req.user.id, req.body)));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.response?.status || 500).json({ error: err.message });
});

const port = Number(process.env.PORT || 4100);
app.listen(port, () => console.log(`trailhead listening on :${port}`));
