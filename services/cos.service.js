const Minio = require("minio");

// MinIO 客户端配置
const minioClient = new Minio.Client({
  endPoint: "localhost", // 或你的服务器IP
  port: 9000,
  useSSL: false,
  accessKey: "gohoy",
  secretKey: "12345678",
});

// 上传文件
async function uploadObject(bucketName, objectName, file) {
  // 确保 bucket 存在
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName);
  }

  // 上传文件
  await minioClient.putObject(
    bucketName,
    objectName,
    file.buffer, // 文件 buffer
    file.size,
    { "Content-Type": file.mimetype }
  );

  return objectName;
}

// 获取文件访问 URL（临时链接，有效期1天）
async function getObjectUrl(bucketName, objectName) {
  return await minioClient.presignedGetObject(
    bucketName,
    objectName,
    24 * 60 * 60
  );
}

// 获取永久访问 URL（需要设置 bucket 为公开）
function getPublicUrl(bucketName, objectName) {
  return `http://localhost:9000/${bucketName}/${objectName}`;
}

module.exports = {
  minioClient,
  uploadObject,
  getObjectUrl,
  getPublicUrl,
};
