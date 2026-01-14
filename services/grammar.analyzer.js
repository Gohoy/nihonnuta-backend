// grammar-analyzer.js

import GRAMMAR_RULES from "../data/grammar-rules.js";


class GrammarAnalyzer {
  constructor() {
    this.rules = GRAMMAR_RULES;
  }

  /**
   * 检查 token 是否匹配规则中的一个条件
   */
  matchCondition(token, condition) {
    // 检查 text
    if (condition.text && token.text !== condition.text) {
      return false;
    }

    // 检查 pos
    if (condition.pos && token.pos !== condition.pos) {
      return false;
    }

    // 检查 pos_detail
    if (condition.pos_detail && token.pos_detail !== condition.pos_detail) {
      return false;
    }

    // 检查 base_form
    if (condition.base_form && token.base_form !== condition.base_form) {
      return false;
    }

    // 检查 kana 正则
    if (condition.kana_pattern && !condition.kana_pattern.test(token.kana)) {
      return false;
    }

    return true;
  }

  /**
   * 在 tokens 中从位置 startIndex 开始匹配 pattern
   */
  matchPattern(tokens, startIndex, pattern) {
    if (startIndex + pattern.length > tokens.length) {
      return null;
    }

    const matchedTokens = [];

    for (let i = 0; i < pattern.length; i++) {
      const token = tokens[startIndex + i];
      const condition = pattern[i];

      if (!this.matchCondition(token, condition)) {
        return null;
      }

      matchedTokens.push(token);
    }

    return {
      startIndex,
      endIndex: startIndex + pattern.length - 1,
      tokens: matchedTokens,
    };
  }

  /**
   * 分析一行歌词的语法
   */
  analyzeLine(tokens) {
    const grammarPoints = [];
    const usedIndices = new Set(); // 避免重复匹配

    // 遍历每个规则
    for (const rule of this.rules) {
      // 遍历每个可能的起始位置
      for (let i = 0; i < tokens.length; i++) {
        // 跳过已匹配的位置
        if (usedIndices.has(i)) continue;

        // 尝试匹配主 pattern
        let match = this.matchPattern(tokens, i, rule.pattern);

        // 如果主 pattern 不匹配，尝试 alternativePattern
        if (!match && rule.alternativePattern) {
          match = this.matchPattern(tokens, i, rule.alternativePattern);
        }

        // 如果有自定义匹配条件
        if (match && rule.matchCondition) {
          if (!rule.matchCondition(tokens, i)) {
            match = null;
          }
        }

        if (match) {
          // 标记已使用的索引
          for (let j = match.startIndex; j <= match.endIndex; j++) {
            usedIndices.add(j);
          }

          // 生成匹配的文本
          const matchedText = match.tokens.map((t) => t.text).join("");
          const matchedKana = match.tokens.map((t) => t.kana).join("");

          grammarPoints.push({
            grammar_id: grammarPoints.length,
            rule_id: rule.id,
            name: rule.name,
            level: rule.level,
            pattern: rule.pattern.map((p) => p.text || p.pos).join(" + "),
            token_ids: match.tokens.map((t) => t.token_id),
            matched_text: matchedText,
            matched_kana: matchedKana,
            description: rule.description,
            example: rule.example,
          });
        }
      }
    }

    // 按位置排序
    grammarPoints.sort((a, b) => a.token_ids[0] - b.token_ids[0]);

    return grammarPoints;
  }

  /**
   * 分析完整歌词
   */
  analyzeLyricsGrammar(lyricsData) {
    const lines = lyricsData.lines || [];

    return lines.map((line, index) => {
      const grammar = this.analyzeLine(line.tokens);
      return {
        ...line,
        line_num: index,
        grammar,
      };
    });
  }
}

export default GrammarAnalyzer;
