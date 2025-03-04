import stream from 'getstream';

const { STREAM_API_KEY, STREAM_API_SECRET, STREAM_APP_ID, STREAM_BASE_URL } = process.env;

if (!STREAM_API_KEY || !STREAM_API_SECRET) {
  throw new Error('STREAM_API_KEY and STREAM_API_SECRET must be set');
}

// STREAM_BASE_URL is only needed when talking to a non-default API host.
const options = STREAM_BASE_URL ? { urlOverride: { api: `${STREAM_BASE_URL.replace(/\/$/, '')}/api/` } } : {};

export const client = stream.connect(STREAM_API_KEY, STREAM_API_SECRET, STREAM_APP_ID || null, options);

// Feed groups configured in the Stream dashboard.
export const FeedGroup = {
  USER: 'user', // flat: a hiker's own posts
  TIMELINE: 'timeline', // flat: what a hiker follows
  NOTIFICATION: 'notification', // notification: likes, comments, mentions, announcements
  TAG: 'tag', // flat: one feed per hashtag
};

export const userFeed = (userId) => client.feed(FeedGroup.USER, userId);
export const timelineFeed = (userId) => client.feed(FeedGroup.TIMELINE, userId);
export const notificationFeed = (userId) => client.feed(FeedGroup.NOTIFICATION, userId);

export const userRef = (userId) => client.user(userId).ref();
