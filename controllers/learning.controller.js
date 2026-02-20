const learningService = require("../services/learning.service");

async function recordLearning(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.fail(401, "未登录");
    }
    const { song_id } = req.body || {};
    if (!song_id) {
      return res.fail(400, "song_id is required");
    }
    await learningService.upsertLearningRecord(userId, song_id);
    return res.success({ success: true });
  } catch (error) {
    return res.fail(500, error.message);
  }
}

async function getRecentLearned(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.fail(401, "未登录");
    }
    const limit = parseInt(req.query.limit, 10) || 10;
    const songs = await learningService.getRecentLearnedSongs(userId, limit);
    return res.success({ songs });
  } catch (error) {
    return res.fail(500, error.message);
  }
}

module.exports = {
  recordLearning,
  getRecentLearned,
};
