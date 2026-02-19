import fs from "fs";

// 读取 CSV 文件
const csvContent = fs.readFileSync("data/all_words.csv", "utf-8");

// 解析 CSV
function parseCSV(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  const result = {};

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj = {};

    headers.forEach((header, index) => {
      // 跳过 guid 字段
      if (header === "guid") return;

      obj[header] = values[index]?.trim() || "";
    });

    // 解析 tags 为数组
    if (obj.tags) {
      obj.tags = obj.tags.split(/\s+/).filter(Boolean);
    }

    // 以 expression 为 key
    if (obj.expression) {
      result[obj.expression] = obj;
    }
  }

  return result;
}

// 处理 CSV 中的逗号和引号
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

const jsonData = parseCSV(csvContent);

// 保存为 JSON
fs.writeFileSync("data/all_words.json", JSON.stringify(jsonData, null, 2), "utf-8");

console.log(`转换完成，共 ${Object.keys(jsonData).length} 条词汇`);
