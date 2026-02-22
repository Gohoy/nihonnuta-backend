const adminService = require("../services/admin.service");
const suggestionsService = require("../services/suggestions.service");

async function listUsers(req, res) {
  try {
    const { search, offset = 0, limit = 20 } = req.query;
    const result = await adminService.listUsers({
      search,
      offset: Number(offset),
      limit: Number(limit),
    });
    return res.success(result);
  } catch (e) {
    return res.fail(e.status || 500, e.message || "查询失败");
  }
}

async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) return res.fail(400, "请指定角色");

    // Prevent self-demotion
    if (id === req.user.userId && role !== "admin") {
      return res.fail(400, "不能降低自己的权限");
    }

    await adminService.updateUserRole(id, role);
    return res.success({ message: "角色已更新" });
  } catch (e) {
    return res.fail(e.status || 500, e.message || "更新失败");
  }
}

async function listSongs(req, res) {
  try {
    const { search, status, offset = 0, limit = 20 } = req.query;
    const result = await adminService.listAllSongs({
      search,
      status,
      offset: Number(offset),
      limit: Number(limit),
    });
    return res.success(result);
  } catch (e) {
    return res.fail(e.status || 500, e.message || "歌曲查询失败");
  }
}

async function updateSong(req, res) {
  try {
    const { id } = req.params;
    await adminService.updateSong(id, req.body);
    return res.success({ message: "歌曲已更新" });
  } catch (e) {
    return res.fail(e.status || 500, e.message || "更新失败");
  }
}

async function deleteSong(req, res) {
  try {
    const { id } = req.params;
    await adminService.deleteSong(id);
    return res.success({ message: "歌曲已下线" });
  } catch (e) {
    return res.fail(e.status || 500, e.message || "操作失败");
  }
}

async function listSuggestions(req, res) {
  try {
    const { status = "pending", offset = 0, limit = 20 } = req.query;
    const result = await adminService.listAllSuggestions({
      status,
      offset: Number(offset),
      limit: Number(limit),
    });
    return res.success(result);
  } catch (e) {
    return res.fail(e.status || 500, e.message || "建议查询失败");
  }
}

async function reviewSuggestion(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.fail(400, "status 必须是 approved 或 rejected");
    }

    const suggestion = await suggestionsService.getSuggestionById(id);
    if (!suggestion) return res.fail(404, "建议不存在");

    const updated = await suggestionsService.reviewSuggestion(id, status, req.user.userId);

    if (status === "approved") {
      await suggestionsService.applySuggestionToSong(updated);
    }

    return res.success(updated);
  } catch (e) {
    return res.fail(e.status || 500, e.message || "审核失败");
  }
}

module.exports = {
  listUsers,
  updateUserRole,
  listSongs,
  updateSong,
  deleteSong,
  listSuggestions,
  reviewSuggestion,
};
