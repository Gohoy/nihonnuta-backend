const Minio = require("minio");

// MinIO 客户端配置
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost", // 或你的服务器IP
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: String(process.env.MINIO_USE_SSL || "false") === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "gohoy",
  secretKey: process.env.MINIO_SECRET_KEY || "12345678",
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
  const presignedUrl = await minioClient.presignedGetObject(
    bucketName,
    objectName,
    24 * 60 * 60
  );
  // Replace internal Docker hostname with public host for browser access
  const publicHost = process.env.MINIO_PUBLIC_HOST;
  const publicPort = process.env.MINIO_PUBLIC_PORT || "9000";
  const publicSSL = String(process.env.MINIO_PUBLIC_USE_SSL || "false") === "true";
  if (publicHost) {
    const internalUrl = new URL(presignedUrl);
    internalUrl.hostname = publicHost;
    internalUrl.port = publicPort;
    internalUrl.protocol = publicSSL ? "https:" : "http:";
    return internalUrl.toString();
  }
  return presignedUrl;
}

// 获取永久访问 URL（需要设置 bucket 为公开）
function getPublicUrl(bucketName, objectName) {
  const protocol = String(process.env.MINIO_PUBLIC_USE_SSL || "false") === "true" ? "https" : "http";
  const host = process.env.MINIO_PUBLIC_HOST || "localhost";
  const port = process.env.MINIO_PUBLIC_PORT || "9000";
  return `${protocol}://${host}:${port}/${bucketName}/${objectName}`;
}

module.exports = {
  minioClient,
  uploadObject,
  getObjectUrl,
  getPublicUrl,
};
