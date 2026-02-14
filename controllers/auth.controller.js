const authService = require('../services/auth.service');

/**
 * 微信登录
 */
async function wxLogin(req, res) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.fail(400, 'code is required');
    }
    const { openid } = await authService.wxCodeToSession(code);
    const user = await authService.findOrCreateUserByOpenid(openid);
    const { token, expiresIn } = authService.generateToken(user.user_id);
    return res.success({ token, expiresIn });
  } catch (error) {
    console.error('微信登录失败:', error);
    return res.fail(500, error.message);
  }
}

/**
 * 获取当前登录用户信息
 */
async function getUserInfo(req, res) {
  try {
    const user = await authService.getUserById(req.userId);
    if (!user) {
      return res.fail(404, '用户不存在');
    }
    return res.success({
      userId: user.user_id,
      username: user.username,
      nickname: user.username,
      avatar: user.avatar_url,
      level: user.level,
      totalLearnWords: user.total_learn_words,
      totalLearnTime: user.total_learn_time,
    });
  } catch (error) {
    return res.fail(500, error.message);
  }
}

/**
 * 更新用户信息
 */
async function updateUserInfo(req, res) {
  try {
    const { username, avatar_url } = req.body;
    const user = await authService.updateUserInfo(req.userId, { username, avatar_url });
    if (!user) {
      return res.fail(404, '用户不存在');
    }
    return res.success({
      userId: user.user_id,
      username: user.username,
      nickname: user.username,
      avatar: user.avatar_url,
      level: user.level,
      totalLearnWords: user.total_learn_words,
      totalLearnTime: user.total_learn_time,
    });
  } catch (error) {
    return res.fail(500, error.message);
  }
}

/**
 * 登出
 */
async function logout(req, res) {
  return res.success({ success: true });
}

module.exports = {
  wxLogin,
  getUserInfo,
  updateUserInfo,
  logout,
};
