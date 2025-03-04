import { db } from '../db.js';
import { client } from '../stream.js';

// Trails live in a Stream collection so posts can reference them and get the
// trail details back on enrichment.
const TRAILS = 'trail';

export async function upsertTrail({ id, name, region, lengthKm }) {
  db.prepare(
    'INSERT INTO trails (id, name, region, length_km) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET name = excluded.name, region = excluded.region, length_km = excluded.length_km',
  ).run(id, name, region, lengthKm);
  const data = { name, region, length_km: lengthKm };
  try {
    await client.collections.add(TRAILS, id, data);
  } catch (err) {
    if (err.response?.status !== 409) throw err;
    await client.collections.update(TRAILS, id, data);
  }
  return { id, ...data };
}

export function trailRef(trailId) {
  return client.collections.entry(TRAILS, trailId).ref();
}

export function getTrail(id) {
  return db.prepare('SELECT * FROM trails WHERE id = ?').get(id);
}
