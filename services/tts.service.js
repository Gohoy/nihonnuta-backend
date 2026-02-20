const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const cosService = require("./cos.service");

const BUCKET = "songs";
const VOICE = "ja-JP-NanamiNeural";

async function getOrGenerateTTS(word) {
  const objectName = `tts/${encodeURIComponent(word)}.mp3`;

  // 1. Check MinIO cache
  try {
    await cosService.minioClient.statObject(BUCKET, objectName);
    return cosService.getObjectUrl(BUCKET, objectName);
  } catch (e) {
    // Object doesn't exist, generate it
  }

  // 2. Generate via Edge TTS
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(word);

  const chunks = [];
  for await (const chunk of audioStream) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    }
  }
  const buffer = Buffer.concat(chunks);

  if (buffer.length === 0) {
    throw { status: 500, message: "TTS 生成失败：音频为空" };
  }

  // 3. Upload to MinIO
  await cosService.uploadObject(BUCKET, objectName, {
    buffer,
    size: buffer.length,
    mimetype: "audio/mpeg",
  });

  return cosService.getObjectUrl(BUCKET, objectName);
}

module.exports = { getOrGenerateTTS };
