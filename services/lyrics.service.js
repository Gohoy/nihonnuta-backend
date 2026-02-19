const GrammarAnalyzer = require("./grammar.analyzer.js");
const KuroshiroModule = require("kuroshiro");
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");
const Kuroshiro = KuroshiroModule.default || KuroshiroModule;

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

    // Build furigana from the morphological analyzer's reading
    // instead of kuroshiro (which may pick a different reading).
    const result = this.buildFuriganaFromReading(surface, reading);
    if (result) return result;

    // Fallback: wrap entire surface with the full reading
    const html = `<ruby>${surface}<rt>${reading}</rt></ruby>`;
    const parts = [{ text: surface, ruby: reading, type: "kanji" }];
    return { html, parts };
  }

  /**
   * Split surface into kanji/kana segments and align with reading.
   * E.g. surface="愛し" reading="あいし" → 愛(あい) + し
   *      surface="思い出" reading="おもいで" → 思(おも) + い + 出(で)
   */
  buildFuriganaFromReading(surface, reading) {
    // Split surface into segments of consecutive kanji vs kana
    const segments = [];
    let cur = "";
    let curIsKanji = false;
    for (const ch of surface) {
      const isK = this.isKanji(ch);
      if (cur && isK !== curIsKanji) {
        segments.push({ text: cur, isKanji: curIsKanji });
        cur = "";
      }
      cur += ch;
      curIsKanji = isK;
    }
    if (cur) segments.push({ text: cur, isKanji: curIsKanji });

    // Build a regex: kana segments become literal, kanji segments become (.+)
    let pattern = "^";
    for (const seg of segments) {
      if (seg.isKanji) {
        pattern += "(.+)";
      } else {
        // Escape regex special chars and use literal kana
        const hira = this.kataToHira(seg.text);
        pattern += hira.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
    }
    pattern += "$";

    const match = reading.match(new RegExp(pattern));
    if (!match) return null;

    // Assign readings from regex groups
    let groupIdx = 1;
    const parts = [];
    const htmlParts = [];
    for (const seg of segments) {
      if (seg.isKanji) {
        const ruby = match[groupIdx++];
        parts.push({ text: seg.text, ruby, type: "kanji" });
        htmlParts.push(`<ruby>${seg.text}<rt>${ruby}</rt></ruby>`);
      } else {
        parts.push({ text: seg.text, ruby: null, type: "kana" });
        htmlParts.push(seg.text);
      }
    }
    return { html: htmlParts.join(""), parts };
  }

  isKanji(ch) {
    const code = ch.codePointAt(0);
    // CJK Unified Ideographs + Extension A
    return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
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

  async processSongLyricsData(lyricData = {}, kanaOverrides = {}) {
    // 首先是拿到它的歌词
    // 然后是处理歌词的分词
    // 然后是歌词分词的单词分级
    // 然后语语法分析

    const originLyrics = (lyricData?.lrc?.lyric || "").split("\n");
    const translateLyrics = (lyricData?.tlyric?.lyric || "").split("\n");
    const romalrc = (lyricData?.romalrc?.lyric || "").split("\n");
    // 先处理原歌词的数据：分词
    let lyricsJsonRes = {};
    let timelineTextMap = {};

    // 先处理翻译歌词
    for (let index in translateLyrics) {
      const lineObj = parseLrcLine(translateLyrics[index]);
      if (lineObj.timeStr) {
        if (!timelineTextMap[lineObj.time]) {
          timelineTextMap[lineObj.time] = {};
        }
        timelineTextMap[lineObj.time]["translate"] = lineObj.text;
      }
    }

    // 处理罗马音歌词
    for (let index in romalrc) {
      const lineObj = parseLrcLine(romalrc[index]);
      if (lineObj.timeStr) {
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
      if (lineObj.timeStr) {
        if (!timelineTextMap[lineObj.time]) {
          timelineTextMap[lineObj.time] = {};
        }

        const lineProcessRes = await this.processLine(lineObj.text);
        for (let token of lineProcessRes.tokens) {
          const entry = this.allWords[token.text] || this.allWords[token.base_form];
          token.tags = entry?.tags;
          token.meaning = entry?.meaning;
        }
        // Apply kana overrides for this timestamp
        const lineOverrides = kanaOverrides[String(lineObj.time)];
        if (lineOverrides) {
          for (let token of lineProcessRes.tokens) {
            if (lineOverrides[token.text]) {
              token.kana = lineOverrides[token.text];
              if (this.hasKanji(token.text)) {
                token.furigana_html = `<ruby>${token.text}<rt>${token.kana}</rt></ruby>`;
                token.furigana = [{ text: token.text, ruby: token.kana, type: "kanji" }];
              }
            }
          }
          lineProcessRes.furigana_html = lineProcessRes.tokens.map(t => t.furigana_html || t.text).join("");
          lineProcessRes.kana = lineProcessRes.tokens.map(t => t.kana).join("");
        }
        timelineTextMap[lineObj.time] = {
          time: lineObj.time,
          time_str: lineObj.timeStr,
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
    const sortedTimes = Object.keys(timelineTextMap)
      .map((time) => Number(time))
      .filter((time) => !Number.isNaN(time))
      .sort((a, b) => a - b);
    lyricsJsonRes["lines"] = sortedTimes.map((time) => timelineTextMap[time]);
    const grammarAnalyzer = new GrammarAnalyzer();
    return grammarAnalyzer.analyzeLyricsGrammar(lyricsJsonRes);
  }

  async processLyricsText(rawLyrics = "") {
    const lines = rawLyrics.split("\n");
    const hasTime = lines.some((line) => /\[\d{2}:\d{2}\.\d{2,3}\]/.test(line));

    if (hasTime) {
      const timelineTextMap = {};
      for (const line of lines) {
        const lineObj = parseLrcLine(line);
        if (!lineObj.timeStr) {
          continue;
        }
        const lineProcessRes = await this.processLine(lineObj.text);
        for (let token of lineProcessRes.tokens) {
          const entry = this.allWords[token.text] || this.allWords[token.base_form];
          token.tags = entry?.tags;
          token.meaning = entry?.meaning;
        }
        timelineTextMap[lineObj.time] = {
          time: lineObj.time,
          time_str: lineObj.timeStr,
          ...lineProcessRes,
        };
      }

      const sortedTimes = Object.keys(timelineTextMap)
        .map((time) => Number(time))
        .filter((time) => !Number.isNaN(time))
        .sort((a, b) => a - b);

      const lyricsJsonRes = {
        meta: {
          lineCount: sortedTimes.length,
          lyricStartIndex: 0,
        },
        lines: sortedTimes.map((time) => timelineTextMap[time]),
      };
      const grammarAnalyzer = new GrammarAnalyzer();
      return grammarAnalyzer.analyzeLyricsGrammar(lyricsJsonRes);
    }

    const processedLines = [];
    for (const line of lines) {
      const text = line.trim();
      if (!text) continue;
      const lineProcessRes = await this.processLine(text);
      for (let token of lineProcessRes.tokens) {
        const entry = this.allWords[token.text] || this.allWords[token.base_form];
        token.tags = entry?.tags;
        token.meaning = entry?.meaning;
      }
      processedLines.push({
        ...lineProcessRes,
      });
    }

    const lyricsJsonRes = {
      meta: {
        lineCount: processedLines.length,
        lyricStartIndex: 0,
      },
      lines: processedLines,
    };
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

module.exports = LyricsProcessor;
