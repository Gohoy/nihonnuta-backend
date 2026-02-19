const wordbookService = require("../services/wordbook.service");
const { sm2 } = require("../services/srs.service");

async function addWord(req, res) {
  try {
    const userId = req.user.userId;
    const { song_id, line_num, token_id, word, kana, pos, meaning } = req.body;

    if (!song_id || line_num === undefined || token_id === undefined || !word) {
      return res.status(400).json({ message: "song_id, line_num, token_id, and word are required" });
    }

    const wordData = { word, kana, pos, meaning };
    const result = await wordbookService.addWordToBook(userId, song_id, line_num, token_id, wordData);
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getWordbook(req, res) {
  try {
    const userId = req.user.userId;
    const options = {
      masterStatus: req.query.master_status,
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0,
    };

    const result = await wordbookService.getUserWordbook(userId, options);
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function updateWordStatus(req, res) {
  try {
    const userId = req.user.userId;
    const { word_book_id, master_status } = req.body;

    if (!word_book_id || !master_status) {
      return res.status(400).json({ message: "word_book_id and master_status are required" });
    }

    const validStatuses = ['unmastered', 'learning', 'mastered'];
    if (!validStatuses.includes(master_status)) {
      return res.status(400).json({ message: "master_status must be one of: unmastered, learning, mastered" });
    }

    const result = await wordbookService.updateWordMasterStatus(userId, word_book_id, master_status);
    if (!result) {
      return res.status(404).json({ message: "Word not found" });
    }
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function removeWord(req, res) {
  try {
    const userId = req.user.userId;
    const wordBookId = req.params.id;

    if (!wordBookId) {
      return res.status(400).json({ message: "word_book_id is required" });
    }

    const result = await wordbookService.removeWordFromBook(userId, wordBookId);
    if (!result) {
      return res.status(404).json({ message: "Word not found" });
    }
    return res.success({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function updateWordNote(req, res) {
  try {
    const userId = req.user.userId;
    const { word_book_id, note } = req.body;

    if (!word_book_id) {
      return res.status(400).json({ message: "word_book_id is required" });
    }

    const result = await wordbookService.updateWordNote(userId, word_book_id, note || '');
    if (!result) {
      return res.status(404).json({ message: "Word not found" });
    }
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getWordbookStats(req, res) {
  try {
    const userId = req.user.userId;
    const stats = await wordbookService.getWordbookStats(userId);
    return res.success(stats);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getReviewWords(req, res) {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await wordbookService.getDueWords(userId, limit);
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function submitReview(req, res) {
  try {
    const userId = req.user.userId;
    const { word_book_id, quality } = req.body;

    if (!word_book_id || quality === undefined) {
      return res.status(400).json({ message: "word_book_id and quality are required" });
    }
    if (quality < 0 || quality > 3) {
      return res.status(400).json({ message: "quality must be 0-3" });
    }

    const pool = require("../db/pool");
    const { rows } = await pool.query(
      "SELECT ease_factor, interval_days, review_count FROM user_wordbooks WHERE word_book_id = $1 AND user_id = $2",
      [word_book_id, userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ message: "Word not found" });
    }

    const { ease_factor, interval_days, review_count } = rows[0];
    const srsResult = sm2(quality, parseFloat(ease_factor) || 2.5, interval_days || 0, review_count || 0);
    const result = await wordbookService.reviewWord(userId, word_book_id, srsResult);
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  addWord,
  getWordbook,
  updateWordStatus,
  removeWord,
  updateWordNote,
  getWordbookStats,
  getReviewWords,
  submitReview,
};
