// #hashtags and @mentions in post text.
export const hashtagsIn = (text) => [...new Set([...(text || '').matchAll(/#([a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase()))];
export const mentionsIn = (text) => [...new Set([...(text || '').matchAll(/@([a-z0-9_-]+)/gi)].map((m) => m[1]))];
