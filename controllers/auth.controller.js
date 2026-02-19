const authService = require("../services/auth.service");

async function register(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.fail(400, "用户名和密码不能为空");
    }
    if (password.length < 6) {
      return res.fail(400, "密码长度不能少于6位");
    }
    const result = await authService.register(username, password);
    return res.success(result);
  } catch (error) {
    if (error.status) {
      return res.fail(error.status, error.message);
    }
    console.error("注册失败:", error);
    return res.fail(500, "注册失败");
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.fail(400, "用户名和密码不能为空");
    }
    const result = await authService.login(username, password);
    return res.success(result);
  } catch (error) {
    if (error.status) {
      return res.fail(error.status, error.message);
    }
    console.error("登录失败:", error);
    return res.fail(500, "登录失败");
  }
}

async function wxLogin(req, res) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.fail(400, "缺少微信登录code");
    }
    const result = await authService.wxLogin(code);
    return res.success(result);
  } catch (error) {
    if (error.status) {
      return res.fail(error.status, error.message);
    }
    console.error("微信登录失败:", error);
    return res.fail(500, "微信登录失败");
  }
}

async function logout(req, res) {
  return res.success({ message: "退出成功" });
}

async function getUserInfo(req, res) {
  try {
    const userId = req.user.userId;
    const result = await authService.getUserInfo(userId);
    return res.success(result);
  } catch (error) {
    if (error.status) {
      return res.fail(error.status, error.message);
    }
    console.error("获取用户信息失败:", error);
    return res.fail(500, "获取用户信息失败");
  }
}

async function updateLevel(req, res) {
  try {
    const userId = req.user.userId;
    const { level } = req.body;
    if (!level) {
      return res.fail(400, "level is required");
    }
    const result = await authService.updateUserLevel(userId, level);
    return res.success(result);
  } catch (error) {
    if (error.status) {
      return res.fail(error.status, error.message);
    }
    return res.fail(500, "更新等级失败");
  }
}

module.exports = { register, login, wxLogin, logout, getUserInfo, updateLevel };
