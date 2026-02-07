const DEFAULT_BASE_URL = "http://localhost:3000";

function getBaseUrl() {
  return process.env.NETEASE_API_BASE || DEFAULT_BASE_URL;
}

async function requestJson(path, query = {}) {
  const url = new URL(path, getBaseUrl());
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    const error = new Error(`Netease API error: ${res.status} ${text}`);
    error.statusCode = res.status;
    throw error;
  }
  return res.json();
}

async function searchSongs(keywords, limit = 20, offset = 0) {
  // cloudsearch: type=1 => song
  const data = await requestJson("/cloudsearch", {
    keywords,
    type: 1,
    limit,
    offset,
  });

  const songs = data?.result?.songs || data?.songs || [];
  return {
    keywords,
    songs,
    total: data?.result?.songCount ?? songs.length,
  };
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

// 导出 requestJson 供其他服务使用
module.exports.requestJson = requestJson;

module.exports = {
  searchSongs,
  getLyric,
  getSongDetail,
  getSongUrl,
  requestJson,
};
