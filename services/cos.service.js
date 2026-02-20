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

// 获取文件公开访问 URL（通过 nginx /storage/ 代理）
// bucket 需设置为 public download（mc anonymous set download）
function getObjectUrl(bucketName, objectName) {
  const publicHost = process.env.MINIO_PUBLIC_HOST;
  // Encode each path segment for safe URL usage
  const encodedPath = objectName.split('/').map(s => encodeURIComponent(s)).join('/');
  if (publicHost) {
    const publicSSL = String(process.env.MINIO_PUBLIC_USE_SSL || "false") === "true";
    const protocol = publicSSL ? "https" : "http";
    // 通过 nginx /storage/ 代理访问 MinIO，不暴露 9000 端口
    return `${protocol}://${publicHost}/storage/${bucketName}/${encodedPath}`;
  }
  // 本地开发直接访问 MinIO
  const endpoint = process.env.MINIO_ENDPOINT || "localhost";
  const port = process.env.MINIO_PORT || "9000";
  return `http://${endpoint}:${port}/${bucketName}/${encodedPath}`;
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
