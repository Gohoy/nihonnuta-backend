const learningService = require("../services/learning.service");

async function recordLearning(req, res) {
  try {
    const userId = req.user.userId;
    const { song_id } = req.body || {};
    if (!song_id) {
      return res.status(400).json({ message: "song_id is required" });
    }
    await learningService.upsertLearningRecord(userId, song_id);
    return res.success({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getRecentLearned(req, res) {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit, 10) || 10;
    const songs = await learningService.getRecentLearnedSongs(userId, limit);
    return res.success({ songs });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  recordLearning,
  getRecentLearned,
};
