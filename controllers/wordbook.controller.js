const wordbookService = require("../services/wordbook.service");

async function addWord(req, res) {
  try {
    const { user_id, song_id, line_num, token_id, word, kana, pos, meaning } = req.body;
    
    if (!user_id || !song_id || line_num === undefined || token_id === undefined || !word) {
      return res.status(400).json({ message: "user_id, song_id, line_num, token_id, and word are required" });
    }
    
    const wordData = { word, kana, pos, meaning };
    const result = await wordbookService.addWordToBook(user_id, song_id, line_num, token_id, wordData);
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getWordbook(req, res) {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ message: "user_id is required" });
    }
    
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
    const { word_book_id, master_status } = req.body;
    const userId = req.body.user_id || req.query.user_id;
    
    if (!userId || !word_book_id || !master_status) {
      return res.status(400).json({ message: "user_id, word_book_id, and master_status are required" });
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
    const wordBookId = req.params.id;
    const userId = req.query.user_id || req.body.user_id;
    
    if (!userId || !wordBookId) {
      return res.status(400).json({ message: "user_id and word_book_id are required" });
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
    const { word_book_id, note } = req.body;
    const userId = req.body.user_id || req.query.user_id;
    
    if (!userId || !word_book_id) {
      return res.status(400).json({ message: "user_id and word_book_id are required" });
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
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ message: "user_id is required" });
    }
    
    const stats = await wordbookService.getWordbookStats(userId);
    return res.success(stats);
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
};

