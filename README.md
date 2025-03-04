# Trailhead

Backend for Trailhead, a small community app for hikers: share trip posts with
photos, tag trails and hashtags, follow other hikers, like, comment and save.
Feeds, reactions and notifications run on [Stream Activity Feeds](https://getstream.io/activity-feeds/)
through the `getstream` Node SDK; the app's own data lives in SQLite.

## Run

```bash
npm install
export STREAM_API_KEY=... STREAM_API_SECRET=...   # from the Stream dashboard
npm start                                           # http://localhost:4100
```

Optional environment:

| Variable | Purpose |
| --- | --- |
| `STREAM_APP_ID` | Stream app id (only needed for some client features) |
| `STREAM_BASE_URL` | Non-default Stream API host |
| `DATABASE_PATH` | SQLite file, default `trailhead.db` |
| `ADMIN_USER_IDS` | Comma-separated hikers who can post announcements |
| `STARTER_HIKERS` | Comma-separated hikers every new sign-up follows |
| `PORT` | HTTP port, default 4100 |

`npm run simulate` drives a running server with a few days' worth of
community activity.

## Stream setup

Feed groups (create them in the dashboard):

| Group | Type | Holds |
| --- | --- | --- |
| `user` | flat | a hiker's own posts and reshares |
| `timeline` | flat | follows `user` and `tag` feeds |
| `notification` | notification | likes, comments, mentions, reshares, announcements |
| `tag` | flat | one feed per hashtag |

A `trail` collection holds the trails posts can reference.

## API

Authenticate with `X-User-Id: <hiker id>` (demo auth).

| Method | Path | |
| --- | --- | --- |
| POST | `/signup` | `{id, displayName, avatarUrl?}` |
| PATCH | `/me` | update display name / avatar |
| GET | `/me/token` | realtime token for the mobile app |
| PUT | `/trails/:id` | `{name, region, lengthKm}` |
| POST | `/posts` | `{text, photos?, trailId?}`; `#tags` and `@mentions` in the text |
| PATCH / DELETE | `/posts/:id` | edit text / delete |
| POST | `/posts/:id/reshare` | `{text?}` |
| POST / DELETE | `/posts/:id/like` | like / unlike |
| POST | `/posts/:id/save` | save for later |
| GET / POST | `/posts/:id/comments` | list / add `{text}` |
| POST | `/comments/:id/replies` | reply `{text}` |
| POST | `/comments/:id/like` | like a comment |
| PATCH | `/comments/:id` | edit `{text}` |
| DELETE | `/reactions/:id` | delete a comment or reaction |
| POST / DELETE | `/follows/hikers/:id`, `/follows/tags/:tag` | follow / unfollow |
| GET | `/timeline`, `/hikers/:id/posts`, `/tags/:tag` | feeds, `?before=<activity id>` |
| GET | `/notifications` | `?seen=1` marks them seen |
| GET | `/saved` | saved posts |
| POST | `/admin/announcements` | `{title, body, trailId?}` (admins) |
