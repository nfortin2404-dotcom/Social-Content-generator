import fs from 'fs';
import path from 'path';

const DATA_DIR = './data';
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const POSTS_DIR = path.join(DATA_DIR, 'posts');

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, 'media'), { recursive: true });
}

// ─── Configuration ───────────────────────────────────────────────────────────

export function saveConfig(config) {
  ensureDirs();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export function savePosts(date, posts) {
  ensureDirs();
  const file = path.join(POSTS_DIR, `${date}.json`);

  // Merger avec les posts existants (ne pas écraser les publiés)
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    existing = [];
  }

  // Garder les posts publiés existants, remplacer les pending/failed
  const published = existing.filter((p) => p.status === 'published');
  const merged = [
    ...published,
    ...posts.filter((p) => !published.find((ep) => ep.id === p.id)),
  ];

  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
  return merged;
}

export function loadPosts(date) {
  const file = path.join(POSTS_DIR, `${date}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

export function updatePostStatus(postId, date, status, extra = {}) {
  const file = path.join(POSTS_DIR, `${date}.json`);
  try {
    const posts = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx !== -1) {
      posts[idx] = { ...posts[idx], status, ...extra };
      fs.writeFileSync(file, JSON.stringify(posts, null, 2));
    }
  } catch {
    // Ignorer si le fichier n'existe pas
  }
}

export function getAllPostDates() {
  ensureDirs();
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort()
    .reverse();
}

export function getPostStats(date) {
  const posts = loadPosts(date) || [];
  return {
    total: posts.length,
    published: posts.filter((p) => p.status === 'published').length,
    pending: posts.filter((p) => p.status === 'pending').length,
    failed: posts.filter((p) => p.status === 'failed').length,
    byPlatform: {
      instagram: posts.filter((p) => p.platform === 'instagram'),
      facebook: posts.filter((p) => p.platform === 'facebook'),
      tiktok: posts.filter((p) => p.platform === 'tiktok'),
    },
  };
}
