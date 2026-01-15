import { createRequire } from "module";
import GrammarAnalyzer from "./grammar.analyzer.js";
const require = createRequire(import.meta.url);

const KuroshiroModule = require("kuroshiro");
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");
const Kuroshiro = KuroshiroModule.default;

class LyricsProcessor {
  constructor() {
    this.kuroshiro = new Kuroshiro();
    this.analyzer = new KuromojiAnalyzer();
    this.ready = false;
    this.allWords = require("../data/all_words.json");
  }

  async init() {
    await this.kuroshiro.init(this.analyzer);
    this.ready = true;
  }

  kataToHira(str) {
    return str.replace(/[\u30A1-\u30F6]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0x60)
    );
  }

  hasKanji(str) {
    return /[\u4e00-\u9faf\u3400-\u4dbf]/.test(str);
  }

  parseRubyHtml(html) {
    const parts = [];

    // 先移除 <rp>...</rp> 标签
    const cleanHtml = html.replace(/<rp>[^<]*<\/rp>/g, "");

    const regex = /<ruby>([^<]+)<rt>([^<]+)<\/rt><\/ruby>|([^<]+)/g;
    let match;

    while ((match = regex.exec(cleanHtml)) !== null) {
      if (match[1] && match[2]) {
        parts.push({
          text: match[1],
          ruby: match[2],
          type: "kanji",
        });
      } else if (match[3] && match[3].trim()) {
        parts.push({
          text: match[3],
          ruby: null,
          type: "kana",
        });
      }
    }

    return parts;
  }

  // 清理 HTML 中的 rp 标签
  cleanFuriganaHtml(html) {
    return html.replace(/<rp>[^<]*<\/rp>/g, "");
  }

  async generateFuriganaForToken(surface, reading) {
    if (!this.hasKanji(surface)) {
      return {
        html: surface,
        parts: [{ text: surface, ruby: null, type: "kana" }],
      };
    }

    const rawHtml = await this.kuroshiro.convert(surface, {
      mode: "furigana",
      to: "hiragana",
    });

    // 清理 rp 标签
    const html = this.cleanFuriganaHtml(rawHtml);
    const parts = this.parseRubyHtml(rawHtml);

    return { html, parts };
  }

  async processLine(text) {
    if (!text.trim()) {
      return {
        original: text,
        tokens: [],
        furigana_html: "",
      };
    }

    const rawTokens = await this.analyzer.parse(text);
    const tokens = [];
    const htmlParts = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const raw = rawTokens[i];
      const surface = raw.surface_form;
      const reading = this.kataToHira(raw.reading || surface);

      const furigana = await this.generateFuriganaForToken(surface, reading);

      tokens.push({
        token_id: i,
        text: surface,
        kana: reading,
        base_form: raw.basic_form || surface,
        pos: raw.pos || "",
        pos_detail: raw.pos_detail_1 || "",
        furigana: furigana.parts,
        furigana_html: furigana.html,
        has_kanji: this.hasKanji(surface),
      });

      htmlParts.push(furigana.html);
    }

    return {
      original: text,
      kana: tokens.map((t) => t.kana).join(""),
      furigana_html: htmlParts.join(""),
      tokens,
    };
  }

  async processSongLyrics(songId) {
    // 首先是拿到它的歌词
    // 然后是处理歌词的分词
    // 然后是歌词分词的单词分级
    // 然后语语法分析

    const res = await fetch(`http://localhost:3000/lyric?id=${songId}`);

    let data = await res.json();
    const originLyrics = data.lrc.lyric.split("\n");
    const translateLyrics = data.tlyric.lyric.split("\n");
    const romalrc = data.romalrc.lyric.split("\n");
    // 先处理原歌词的数据：分词
    let lyricsJsonRes = {};
    let timelineTextMap = {};

    // 先处理翻译歌词
    for (let index in translateLyrics) {
      const lineObj = parseLrcLine(translateLyrics[index]);
      if (lineObj.time !== undefined) {
        if (!timelineTextMap[lineObj.time]) {
          timelineTextMap[lineObj.time] = {};
        }
        timelineTextMap[lineObj.time]["translate"] = lineObj.text;
      }
    }

    // 处理罗马音歌词
    for (let index in romalrc) {
      const lineObj = parseLrcLine(romalrc[index]);
      if (lineObj.time !== undefined) {
        if (!timelineTextMap[lineObj.time]) {
          timelineTextMap[lineObj.time] = {};
        }
        timelineTextMap[lineObj.time]["roma"] = lineObj.text;
      }
    }

    // 处理原歌词和分词
    for (let index in originLyrics) {
      // 需要先去除前面的时间
      const lineObj = parseLrcLine(originLyrics[index]);
      if (lineObj.time !== undefined) {
        if (!timelineTextMap[lineObj.time]) {
          timelineTextMap[lineObj.time] = {};
        }

        const lineProcessRes = await this.processLine(lineObj.text);
        for (let token of lineProcessRes.tokens) {
          token.tags = this.allWords[token.text]?.tags;
        }
        timelineTextMap[lineObj.time] = {
          ...timelineTextMap[lineObj.time],
          ...lineProcessRes,
        };
      }
    }
    lyricsJsonRes["meta"] = {
      lineCount: translateLyrics.length,
      // 从这行开始才是歌词，index（从0开始）
      lyricStartIndex:
        Object.keys(timelineTextMap).length - translateLyrics.length,
    };
    lyricsJsonRes["lines"] = Object.values(timelineTextMap);
    const grammarAnalyzer = new GrammarAnalyzer();
    return grammarAnalyzer.analyzeLyricsGrammar(lyricsJsonRes);
  }
}

function parseLrcLine(line) {
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  const match = line.match(regex);

  if (match) {
    const minutes = parseInt(match[1]);
    const seconds = parseInt(match[2]);
    const ms = parseInt(match[3].padEnd(3, "0"));
    const timeMs = minutes * 60000 + seconds * 1000 + ms;

    return {
      time: timeMs, // 194140 (毫秒)
      timeStr: `${match[1]}:${match[2]}.${match[3]}`, // "03:14.140"
      text: match[4], // "とても忘れられないそれだけが確か"
    };
  }

  return { time: 0, timeStr: "", text: line };
}

// 测试
async function main() {
  const processor = new LyricsProcessor();
  await processor.init();
  //
  // const result = await processor.processLine("今日は夏の午後")
  const result = await processor.processSongLyrics(536622304);
  console.log(JSON.stringify(result, null, 2));
}
main().catch(console.error);

export default LyricsProcessor;
