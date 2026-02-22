const redemptionService = require("../services/redemption.service");

async function redeemCode(req, res) {
  const userId = req.user?.userId;
  if (!userId) return res.fail(401, "未登录");

  const { code } = req.body;
  if (!code || !code.trim()) return res.fail(400, "请输入兑换码");

  try {
    const result = await redemptionService.redeemCode(userId, code.trim());
    return res.success(result);
  } catch (e) {
    return res.fail(e.status || 500, e.message || "兑换失败");
  }
}

async function generateCodes(req, res) {
  const { count = 10, membership_type = "monthly", duration_days = 30, expire_days } = req.body;

  if (count < 1 || count > 100) return res.fail(400, "数量需在 1-100 之间");
  if (duration_days < 1) return res.fail(400, "天数需大于 0");

  try {
    const result = await redemptionService.generateBatch(
      count,
      membership_type,
      duration_days,
      req.user.userId,
      expire_days
    );
    return res.success(result);
  } catch (e) {
    return res.fail(e.status || 500, e.message || "生成失败");
  }
}

async function listCodes(req, res) {
  const { batch_id, status, limit = 50, offset = 0 } = req.query;
  try {
    const codes = await redemptionService.listCodes(batch_id, status, Number(limit), Number(offset));
    return res.success({ codes });
  } catch (e) {
    return res.fail(500, e.message || "查询失败");
  }
}

async function disableCode(req, res) {
  const { id } = req.params;
  try {
    await redemptionService.disableCode(id);
    return res.success({ message: "兑换码已禁用" });
  } catch (e) {
    return res.fail(e.status || 500, e.message || "禁用失败");
  }
}

module.exports = { redeemCode, generateCodes, listCodes, disableCode };
