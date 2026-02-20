const neteaseService = require("../services/netease.service");

async function loginStatus(req, res) {
  try {
    const status = await neteaseService.getLoginStatus();
    return res.success(status);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function qrKey(req, res) {
  try {
    const key = await neteaseService.generateQRKey();
    return res.success({ key });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function qrCreate(req, res) {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ message: "key is required" });
    const qrimg = await neteaseService.createQRCode(key);
    return res.success({ qrimg });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function qrCheck(req, res) {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ message: "key is required" });
    const result = await neteaseService.checkQRStatus(key);
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = { loginStatus, qrKey, qrCreate, qrCheck };
