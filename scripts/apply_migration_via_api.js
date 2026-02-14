// 通过后端API执行数据库迁移
const http = require('http');

const postData = JSON.stringify({});

const options = {
  hostname: 'localhost',
  port: 5217,
  path: '/migration/run',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response:', data);
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.write(postData);
req.end();
