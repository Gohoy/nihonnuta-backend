const suggestionsService = require("../services/suggestions.service");
const songService = require("../services/songs.service");

async function submitSuggestion(req, res) {
  try {
    const song_id = req.params.id;
    const { line_index, time_ms, edits, reason } = req.body;

    if (!edits || !edits.length) {
      return res.fail(400, "请提供修改内容");
    }

    const results = [];
    for (const edit of edits) {
      if (edit.old_value === edit.new_value) continue;
      const row = await suggestionsService.createSuggestion({
        song_id,
        line_index,
        time_ms: time_ms || 0,
        field: edit.field,
        token_text: edit.token_text || '',
        old_value: edit.old_value || '',
        new_value: edit.new_value,
        reason: reason || '',
        submitted_by: req.user.userId,
      });
      results.push(row);
    }
    return res.success(results);
  } catch (error) {
    return res.fail(500, error.message);
  }
}

async function getSuggestions(req, res) {
  try {
    const song_id = req.params.id;
    const status = req.query.status || 'pending';
    const rows = await suggestionsService.getSuggestionsBySong(song_id, status);
    return res.success(rows);
  } catch (error) {
    return res.fail(500, error.message);
  }
}

async function reviewSuggestion(req, res) {
  try {
    const { suggestionId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.fail(400, "status 必须是 approved 或 rejected");
    }

    const suggestion = await suggestionsService.getSuggestionById(suggestionId);
    if (!suggestion) {
      return res.fail(404, "建议不存在");
    }

    const song = await songService.getSongById(suggestion.song_id);
    if (!song || song.create_user !== req.user.userId) {
      return res.fail(403, "只有歌曲创建者可以审核");
    }

    const updated = await suggestionsService.reviewSuggestion(suggestionId, status, req.user.userId);

    if (status === 'approved') {
      await suggestionsService.applySuggestionToSong(updated);
    }

    return res.success(updated);
  } catch (error) {
    return res.fail(500, error.message);
  }
}

async function getMySuggestions(req, res) {
  try {
    const offset = parseInt(req.query.offset, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 20;
    const rows = await suggestionsService.getSuggestionsByUser(req.user.userId, offset, limit);
    return res.success(rows);
  } catch (error) {
    return res.fail(500, error.message);
  }
}

module.exports = { submitSuggestion, getSuggestions, reviewSuggestion, getMySuggestions };
