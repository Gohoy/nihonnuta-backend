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

    data = {
      lrc: {
        version: 4,
        lyric:
          "[00:00.000] 作词 : 米津玄師\n" +
          "[00:00.212] 作曲 : 米津玄師\n" +
          "[00:00.424] 编曲 : 米津玄師/室屋光一郎\n" +
          "[00:00.636] 制作人 : 米津玄師\n" +
          "[00:00.851]夢ならばどれほどよかったでしょう\n" +
          "[00:06.650]未だにあなたのことを夢にみる\n" +
          "[00:12.340]忘れた物を取りに帰るように\n" +
          "[00:17.660]古びた思い出の埃を払う\n" +
          "[00:25.820]戻らない幸せがあることを\n" +
          "[00:31.580]最後にあなたが教えてくれた\n" +
          "[00:36.980]言えずに隠してた昏い過去も\n" +
          "[00:42.550]あなたがいなきゃ永遠に昏いまま\n" +
          "[00:48.230]きっともうこれ以上 傷つくことなど\n" +
          "[00:53.750]ありはしないとわかっている\n" +
          "[00:58.660]あの日の悲しみさえ\n" +
          "[01:01.410]あの日の苦しみさえ\n" +
          "[01:04.150]そのすべてを愛してた あなたとともに\n" +
          "[01:09.800]胸に残り離れない\n" +
          "[01:12.730]苦いレモンの匂い\n" +
          "[01:15.730]雨が降り止むまでは帰れない\n" +
          "[01:21.240]今でもあなたはわたしの光\n" +
          "[01:37.600]暗闇であなたの背をなぞった\n" +
          "[01:42.980]その輪郭を鮮明に覚えている\n" +
          "[01:48.800]受け止めきれないものと出会うたび\n" +
          "[01:54.400]溢れてやまないのは涙だけ\n" +
          "[01:59.990]何をしていたの\n" +
          "[02:02.760]何を見ていたの\n" +
          "[02:05.580]わたしの知らない横顔で\n" +
          "[02:10.390]どこかであなたが今\n" +
          "[02:13.380]わたしと同じ様な\n" +
          "[02:15.950]涙にくれ 淋しさの中にいるなら\n" +
          "[02:21.470]わたしのことなどどうか 忘れてください\n" +
          "[02:27.490]そんなことを心から願うほどに\n" +
          "[02:32.910]今でもあなたはわたしの光\n" +
          "[02:41.600]自分が思うより 恋をしていたあなたに\n" +
          "[02:52.410]あれから思うように 息ができない\n" +
          "[03:03.360]あんなに側にいたのにまるで嘘みたい\n" +
          "[03:14.140]とても忘れられないそれだけが確か\n" +
          "[03:30.430]あの日の悲しみさえ\n" +
          "[03:33.200]あの日の苦しみさえ\n" +
          "[03:35.910]その全てを愛してたあなたと共に\n" +
          "[03:41.320]胸に残り離れない\n" +
          "[03:44.280]苦いレモンの匂い\n" +
          "[03:47.730]雨が降り止むまでは帰れない\n" +
          "[03:52.840]切り分けた果実の片方の様に\n" +
          "[03:58.590]今でもあなたはわたしの光\n",
      },
      tlyric: {
        version: 42,
        lyric:
          "[00:00.851]如果这一切都是梦境该有多好\n" +
          "[00:06.650]至今仍能与你在梦中相遇\n" +
          "[00:12.340]如同取回遗忘之物一般\n" +
          "[00:17.660]细细拂去将回忆覆盖的尘埃\n" +
          "[00:25.820]有着无法挽回的幸福\n" +
          "[00:31.580]最终是你告诉我\n" +
          "[00:36.980]那些未对他人提及过的黑暗往事\n" +
          "[00:42.550]如果不曾有你的话 它们将永远沉睡在黑暗中\n" +
          "[00:48.230]我知道这世上一定没有\n" +
          "[00:53.750]比这更令人难过的事情了\n" +
          "[00:58.660]那日的悲伤\n" +
          "[01:01.410]与那日的痛苦\n" +
          "[01:04.150]连同深爱着这一切的你\n" +
          "[01:09.800]化作了深深烙印在我心中的\n" +
          "[01:12.730]苦涩柠檬的香气\n" +
          "[01:15.730]在雨过天晴前都无法归去\n" +
          "[01:21.240]时至今日 你仍是我的光芒\n" +
          "[01:37.600]在黑暗中追寻着你的身影\n" +
          "[01:42.980]那轮廓至今仍鲜明地刻印于心\n" +
          "[01:48.800]每当遇到无法承受的苦痛时\n" +
          "[01:54.400]总是不禁泪如泉涌\n" +
          "[01:59.990]你都经历过什么呢\n" +
          "[02:02.760]又目睹过什么呢\n" +
          "[02:05.580]脸上浮现着我不曾见过的神情\n" +
          "[02:10.390]如今你正在什么地方\n" +
          "[02:13.380]与我一样\n" +
          "[02:15.950]终日过着以泪洗面的寂寞生活的话\n" +
          "[02:21.470]就请你将我的一切全部遗忘吧\n" +
          "[02:27.490]这是我发自内心深处唯一的祈愿\n" +
          "[02:32.910]时至今日 你仍是我的光芒\n" +
          "[02:41.600]我深深地恋慕着你 甚至超出了我自己的想象\n" +
          "[02:52.410]自此每当想起你 都如同窒息般痛苦\n" +
          "[03:03.360]你曾亲密伴我身旁 如今却如烟云般消散\n" +
          "[03:14.140]唯一能确定的是 我永远都不会将你遗忘\n" +
          "[03:30.430]那日的悲伤\n" +
          "[03:33.200]与那日的痛苦\n" +
          "[03:35.910]连同深爱着这一切的你\n" +
          "[03:41.320]化作了深深烙印在我心中的\n" +
          "[03:44.280]苦涩柠檬的香气\n" +
          "[03:47.730]在雨过天晴前都无法归去\n" +
          "[03:52.840]如同被切开的半个柠檬一般\n" +
          "[03:58.590]时至今日 你仍是我的光芒",
      },
      romalrc: {
        version: 25,
        lyric:
          "[00:00.851]yu me na ra ba do re ho do yo ka tta de syo u\n" +
          "[00:06.650]i ma da ni a na ta no ko to wo yu me ni mi ru\n" +
          "[00:12.340]wa su re ta mo no wo to ri ni ka e ru yo u ni\n" +
          "[00:17.660]fu ru bi ta o mo i de no ho ko ri wo ha ra u\n" +
          "[00:25.820]mo do ra na i shi a wa se ga a ru ko to wo\n" +
          "[00:31.580]sa i go ni a na ta ga o shi e te ku re ta\n" +
          "[00:36.980]i e zu ni ka ku shi te ta ku ra i ka ko mo\n" +
          "[00:42.550]a na ta ga i na kya e i e n ni ku ra i ma ma\n" +
          "[00:48.230]ki tto mo u ko re i jyo u ki zu tsu ku ko to na do\n" +
          "[00:53.750]a ri wa shi na i to wa ka tte i ru\n" +
          "[00:58.660]a no hi no ka na shi mi sa e\n" +
          "[01:01.410]a no hi no ku ru shi mi sa e\n" +
          "[01:04.150]so no su be te wo a i shi te ta a na ta to to mo ni\n" +
          "[01:09.800]mu ne ni no ko ri ha na re na i\n" +
          "[01:12.730]ni ga i re mo n no ni o i\n" +
          "[01:15.730]a me ga fu ri ya mu ma de wa ka e re na i\n" +
          "[01:21.240]i ma de mo a na ta wa wa ta shi no hi ka ri\n" +
          "[01:37.600]ku ra ya mi de a na ta no se wo na zo tta\n" +
          "[01:42.980]so no ri n ka ku wo se n me i ni o bo e te i ru\n" +
          "[01:48.800]u ke to me ki re na i mo no to de a u ta bi\n" +
          "[01:54.400]a fu re te ya ma na i no wa na mi da da ke\n" +
          "[01:59.990]na ni wo shi te i ta no\n" +
          "[02:02.760]na ni wo mi te i ta no\n" +
          "[02:05.580]wa ta shi no shi ra na i yo ko ga o de\n" +
          "[02:10.390]do ko ka de a na ta ga i ma\n" +
          "[02:13.380]wa ta shi to o na ji yo u na\n" +
          "[02:15.950]na mi da ni ku re sa bi shi sa no na ka ni i ru na ra\n" +
          "[02:21.470]wa ta shi no ko to na do do u ka wa su re te ku da sa i\n" +
          "[02:27.490]so n na ko to wo ko ko ro ka ra ne ga u ho do ni\n" +
          "[02:32.910]i ma de mo a na ta wa wa ta shi no hi ka ri\n" +
          "[02:41.600]ji bu n ga o mo u yo ri ko i wo shi te i ta a na ta ni\n" +
          "[02:52.410]a re ka ra o mo u yo u ni i ki ga de ki na i\n" +
          "[03:03.360]a n na ni so ba ni i ta no ni ma ru de u so mi ta i\n" +
          "[03:14.140]to te mo wa su re ra re na i so re da ke ga ta shi ka\n" +
          "[03:30.430]a no hi no ka na shi mi sa e\n" +
          "[03:33.200]a no hi no ku ru shi mi sa e\n" +
          "[03:35.910]so no su be te wo a i shi te ta a na ta to to mo ni\n" +
          "[03:41.320]mu ne ni no ko ri ha na re na i\n" +
          "[03:44.280]ni ga i re mo n no ni o i\n" +
          "[03:47.730]a me ga hu ri ya mu ma de wa ka e re na i\n" +
          "[03:52.840]ki ri wa ke ta ka ji tsu no ka ta ho u no yo u ni\n" +
          "[03:58.590]i ma de mo a na ta wa wa ta shi no hi ka ri",
      },
    };
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
