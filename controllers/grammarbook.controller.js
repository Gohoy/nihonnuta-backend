const grammarbookService = require("../services/grammarbook.service");
const { sm2 } = require("../services/srs.service");

async function addGrammar(req, res) {
  try {
    const { user_id, song_id, line_num, grammar_id, related_token_ids, grammar_type, grammar_relation, structure_desc, grammar_desc } = req.body;
    
    if (!user_id || !song_id || line_num === undefined || grammar_id === undefined) {
      return res.status(400).json({ message: "user_id, song_id, line_num, and grammar_id are required" });
    }
    
    const grammarData = {
      related_token_ids: related_token_ids || [],
      grammar_type: grammar_type || '',
      grammar_relation: grammar_relation || '',
      structure_desc: structure_desc || '',
      grammar_desc: grammar_desc || '',
    };
    
    const result = await grammarbookService.addGrammarToBook(user_id, song_id, line_num, grammar_id, grammarData);
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getGrammarBook(req, res) {
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
    
    const result = await grammarbookService.getUserGrammarBook(userId, options);
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function updateGrammarStatus(req, res) {
  try {
    const { grammar_book_id, master_status } = req.body;
    const userId = req.body.user_id || req.query.user_id;
    
    if (!userId || !grammar_book_id || !master_status) {
      return res.status(400).json({ message: "user_id, grammar_book_id, and master_status are required" });
    }
    
    const validStatuses = ['unmastered', 'learning', 'mastered'];
    if (!validStatuses.includes(master_status)) {
      return res.status(400).json({ message: "master_status must be one of: unmastered, learning, mastered" });
    }
    
    const result = await grammarbookService.updateGrammarMasterStatus(userId, grammar_book_id, master_status);
    if (!result) {
      return res.status(404).json({ message: "Grammar not found" });
    }
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function removeGrammar(req, res) {
  try {
    const grammarBookId = req.params.id;
    const userId = req.query.user_id || req.body.user_id;
    
    if (!userId || !grammarBookId) {
      return res.status(400).json({ message: "user_id and grammar_book_id are required" });
    }
    
    const result = await grammarbookService.removeGrammarFromBook(userId, grammarBookId);
    if (!result) {
      return res.status(404).json({ message: "Grammar not found" });
    }
    return res.success({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function updateGrammarNote(req, res) {
  try {
    const { grammar_book_id, note } = req.body;
    const userId = req.body.user_id || req.query.user_id;
    
    if (!userId || !grammar_book_id) {
      return res.status(400).json({ message: "user_id and grammar_book_id are required" });
    }
    
    const result = await grammarbookService.updateGrammarNote(userId, grammar_book_id, note || '');
    if (!result) {
      return res.status(404).json({ message: "Grammar not found" });
    }
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getGrammarBookStats(req, res) {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ message: "user_id is required" });
    }
    
    const stats = await grammarbookService.getGrammarBookStats(userId);
    return res.success(stats);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getReviewGrammars(req, res) {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ message: "user_id is required" });
    }
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await grammarbookService.getDueGrammars(userId, limit);
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function submitGrammarReview(req, res) {
  try {
    const { grammar_book_id, quality } = req.body;
    const userId = req.body.user_id || req.query.user_id;

    if (!userId || !grammar_book_id || quality === undefined) {
      return res.status(400).json({ message: "user_id, grammar_book_id, and quality are required" });
    }
    if (quality < 0 || quality > 3) {
      return res.status(400).json({ message: "quality must be 0-3" });
    }

    const pool = require("../db/pool");
    const { rows } = await pool.query(
      "SELECT ease_factor, interval_days, review_count FROM user_grammar_books WHERE grammar_book_id = $1 AND user_id = $2",
      [grammar_book_id, userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ message: "Grammar not found" });
    }

    const { ease_factor, interval_days, review_count } = rows[0];
    const srsResult = sm2(quality, parseFloat(ease_factor) || 2.5, interval_days || 0, review_count || 0);
    const result = await grammarbookService.reviewGrammar(userId, grammar_book_id, srsResult);
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  addGrammar,
  getGrammarBook,
  updateGrammarStatus,
  removeGrammar,
  updateGrammarNote,
  getGrammarBookStats,
  getReviewGrammars,
  submitGrammarReview,
};

