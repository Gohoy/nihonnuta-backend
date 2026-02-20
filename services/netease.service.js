const fs = require("fs");
const path = require("path");

const DEFAULT_BASE_URL = "http://localhost:3000";
const COOKIE_FILE = path.join(__dirname, "../data/netease-cookie.json");

function getBaseUrl() {
  return process.env.NETEASE_API_BASE || DEFAULT_BASE_URL;
}

// --- Cookie management ---
let neteaseCookie = "";

function loadCookie() {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      const data = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf-8"));
      neteaseCookie = data.cookie || "";
    }
  } catch {}
}

function saveCookie(cookie) {
  neteaseCookie = cookie;
  try {
    const dir = path.dirname(COOKIE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COOKIE_FILE, JSON.stringify({ cookie, updatedAt: new Date().toISOString() }));
  } catch (e) {
    console.warn("保存网易云cookie失败:", e.message);
  }
}

// Load cookie on startup
loadCookie();

// --- API request ---
async function requestJson(path, query = {}) {
  const url = new URL(path, getBaseUrl());
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  // Attach cookie if available and not already in query
  if (neteaseCookie && !query.cookie) {
    url.searchParams.set("cookie", neteaseCookie);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    const error = new Error(`Netease API error: ${res.status} ${text}`);
    error.statusCode = res.status;
    throw error;
  }
  return res.json();
}

// --- Music functions ---
async function searchSongs(keywords, limit = 20, offset = 0) {
  const data = await requestJson("/cloudsearch", { keywords, type: 1, limit, offset });
  const songs = data?.result?.songs || data?.songs || [];
  return { keywords, songs, total: data?.result?.songCount ?? songs.length };
}

async function getLyric(songId) {
  return requestJson("/lyric", { id: songId });
}

async function getSongDetail(songId) {
  return requestJson("/song/detail", { ids: songId });
}

async function getSongUrl(songId) {
  return requestJson("/song/url", { id: songId });
}

async function getSongDownloadUrl(songId, br = 999000) {
  return requestJson("/song/download/url", { id: songId, br });
}

// --- Login functions ---
async function getLoginStatus() {
  const data = await requestJson("/login/status");
  const profile = data?.data?.profile;
  return {
    loggedIn: !!profile,
    nickname: profile?.nickname || null,
    avatarUrl: profile?.avatarUrl || null,
    userId: profile?.userId || null,
  };
}

async function generateQRKey() {
  const data = await requestJson("/login/qr/key", { timestamp: Date.now() });
  return data?.data?.unikey;
}

async function createQRCode(key) {
  const data = await requestJson("/login/qr/create", { key, qrimg: true });
  return data?.data?.qrimg;
}

async function checkQRStatus(key) {
  const data = await requestJson("/login/qr/check", { key, timestamp: Date.now() });
  const code = data?.code;
  if (code === 803 && data?.cookie) {
    saveCookie(data.cookie);
  }
  return { code, message: data?.message || "" };
}

module.exports = {
  searchSongs,
  getLyric,
  getSongDetail,
  getSongUrl,
  getSongDownloadUrl,
  getLoginStatus,
  generateQRKey,
  createQRCode,
  checkQRStatus,
  requestJson,
};
