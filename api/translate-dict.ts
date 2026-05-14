// Domain-specific Chinese-English dictionary for securities/futures exam questions
// This provides reliable offline translation for common financial terms

export const FINANCIAL_DICT: Record<string, string> = {
  // === Common Financial Terms ===
  "证券": "securities",
  "期货": "futures",
  "股票": "stocks",
  "债券": "bonds",
  "基金": "funds",
  "期权": "options",
  "权证": "warrants",
  "衍生品": "derivatives",
  "金融": "financial",
  "投资": "investment",
  "融资": "financing",
  "融券": "securities lending",
  "交易": "trading",
  "市场": "market",
  "交易所": "exchange",
  "上市": "listed",
  "退市": "delisted",
  "发行": "issuance",
  "承销": "underwriting",
  "保荐": "sponsorship",
  "招股": "prospectus",
  "招股说明书": "prospectus",

  // === Market Participants ===
  "投资者": "investor",
  "机构": "institution",
  "机构投资者": "institutional investor",
  "个人投资者": "individual investor",
  "合格投资者": "qualified investor",
  "证券公司": "securities company",
  "期货公司": "futures company",
  "基金管理人": "fund manager",
  "托管人": "custodian",
  "做市商": "market maker",
  "承销商": "underwriter",
  "保荐人": "sponsor",
  "分析师": "analyst",
  "交易员": "trader",
  "经纪人": "broker",
  "客户经理": "account manager",

  // === Trading Terms ===
  "买入": "buy",
  "卖出": "sell",
  "多头": "long",
  "空头": "short",
  "多头头寸": "long position",
  "空头头寸": "short position",
  "开仓": "open position",
  "平仓": "close position",
  "持仓": "hold position",
  "交割": "delivery",
  "结算": "settlement",
  "清算": "clearing",
  "撮合": "matching",
  "竞价": "auction",
  "连续竞价": "continuous auction",
  "集合竞价": "call auction",
  "限价": "limit price",
  "市价": "market price",
  "报价": "quote",
  "委托": "order",
  "撤单": "cancel order",
  "成交": "transaction",
  "成交量": "trading volume",
  "成交额": "turnover",
  "涨跌幅": "price change",
  "涨停": "limit up",
  "跌停": "limit down",
  "涨停板": "upper limit",
  "跌停板": "lower limit",
  "停牌": "trading halt",
  "复牌": "resume trading",
  "除权": "ex-rights",
  "除息": "ex-dividend",
  "分红": "dividend",
  "配股": "rights issue",
  "增发": "additional issuance",
  "回购": "repurchase",
  "申购": "subscription",
  "认购": "subscribe",
  "赎回": "redemption",
  "转换": "conversion",
  "套利": "arbitrage",
  "对冲": "hedging",
  "投机": "speculation",
  "套期保值": "hedging",
  "保证金": "margin",
  "杠杆": "leverage",
  "融资融券": "margin trading and short selling",

  // === Risk & Compliance ===
  "风险": "risk",
  "市场风险": "market risk",
  "信用风险": "credit risk",
  "流动性风险": "liquidity risk",
  "操作风险": "operational risk",
  "合规": "compliance",
  "监管": "regulation",
  "违规": "violation",
  "处罚": "penalty",
  "信息披露": "information disclosure",
  "内幕交易": "insider trading",
  "操纵市场": "market manipulation",
  "虚假陈述": "false statement",
  "欺诈": "fraud",
  "客户": "client",
  "适当性": "suitability",
  "投资者适当性": "investor suitability",
  "风险承受能力": "risk tolerance",

  // === Account & Settlement ===
  "账户": "account",
  "资金账户": "capital account",
  "证券账户": "securities account",
  "期货账户": "futures account",
  "保证金账户": "margin account",
  "结算账户": "settlement account",
  "托管": "custody",
  "存管": "depository",
  "第三方存管": "third-party depository",
  "过户": "transfer",
  "登记": "registration",
  "存管结算": "depository and settlement",

  // === Products ===
  "公募基金": "public fund",
  "私募基金": "private fund",
  "资产管理": "asset management",
  "理财产品": "wealth management product",
  "信托": "trust",
  "资管计划": "asset management plan",
  "集合计划": "collective plan",
  "专项计划": "special plan",
  "收益凭证": "income certificate",
  "结构化产品": "structured product",
  "分级基金": "structured fund",
  "货币基金": "money market fund",
  "指数基金": "index fund",
  "ETF": "ETF",
  "LOF": "LOF",
  "QDII": "QDII",
  "QFII": "QFII",
  "RQFII": "RQFII",
  "沪港通": "Shanghai-Hong Kong Stock Connect",
  "深港通": "Shenzhen-Hong Kong Stock Connect",
  "债券通": "Bond Connect",
  "新三板": "NEEQ",
  "科创板": "STAR Market",
  "创业板": "ChiNext",
  "主板": "Main Board",
  "中小板": "SME Board",

  // === Analysis Terms ===
  "基本面": "fundamentals",
  "技术面": "technical analysis",
  "估值": "valuation",
  "市盈率": "P/E ratio",
  "市净率": "P/B ratio",
  "股息率": "dividend yield",
  "收益率": "return rate",
  "年化收益": "annualized return",
  "净值": "net value",
  "份额": "shares",
  "面值": "face value",
  "市值": "market capitalization",
  "流通市值": "float market cap",
  "总资产": "total assets",
  "净资产": "net assets",
  "净利润": "net profit",
  "营业收入": "operating revenue",
  "财务报表": "financial statement",
  "资产负债表": "balance sheet",
  "利润表": "income statement",
  "现金流量表": "cash flow statement",
  "审计": "audit",
  "年报": "annual report",
  "季报": "quarterly report",
  "公告": "announcement",
  "研报": "research report",

  // === Legal & Regulatory ===
  "法律": "law",
  "法规": "regulations",
  "条例": "rules",
  "办法": "measures",
  "规定": "provisions",
  "通知": "notice",
  "证监会": "CSRC",
  "证券交易所": "stock exchange",
  "期货交易所": "futures exchange",
  "证券业协会": "Securities Association",
  "基金业协会": "Fund Association",
  "期货业协会": "Futures Association",
  "银保监会": "CBIRC",
  "中国人民银行": "PBOC",
  "公司法": "Company Law",
  "证券法": "Securities Law",
  "基金法": "Fund Law",
  "合同法": "Contract Law",
  "信托法": "Trust Law",
  "刑法": "Criminal Law",
  "民法": "Civil Law",
  "破产法": "Bankruptcy Law",

  // === Common Verbs & Adjectives ===
  "下列": "which of the following",
  "以下": "below",
  "以上": "above",
  "属于": "belongs to",
  "不属于": "does not belong to",
  "正确": "correct",
  "错误": "incorrect",
  "符合": "complies with",
  "不符合": "does not comply with",
  "应当": "shall",
  "可以": "may",
  "必须": "must",
  "不得": "shall not",
  "禁止": "prohibited",
  "允许": "allowed",
  "需要": "needs",
  "能够": "can",
  "根据": "according to",
  "依据": "based on",
  "按照": "in accordance with",
  "关于": "regarding",
  "包括": "including",
  "不包括": "excluding",
  "主要": "main",
  "一般": "general",
  "特殊": "special",
  "特定": "specific",
  "相关": "related",
  "直接": "direct",
  "间接": "indirect",
  "公开": "public",
  "私下": "private",
  "书面": "written",
  "口头": "oral",
  "备案": "file",
  "核准": "approve",
  "注册": "register",
  "许可": "license",
  "申报": "declare",
  "报告": "report",
  "披露": "disclose",
  "公布": "publish",
  "同意": "agree",
  "批准": "approve",
  "决定": "decide",
  "选择": "select",
  "判断": "determine",
  "描述": "describe",
  "说明": "explain",
  "分析": "analyze",
  "比较": "compare",
  "计算": "calculate",
  "确定": "confirm",
  "制定": "formulate",
  "修改": "modify",
  "变更": "change",
  "终止": "terminate",
  "解除": "cancel",
  "撤销": "revoke",
  "生效": "take effect",
  "失效": "become invalid",

  // === Numbers & Quantities ===
  " million": " million",
  "亿": " hundred million",
  "万": " ten thousand",
  "千": " thousand",
  "百": " hundred",
  "十": " ten",
  "个": "",
  "第一": "first",
  "第二": "second",
  "第三": "third",
  "最大": "maximum",
  "最小": "minimum",
  "最高": "highest",
  "最低": "lowest",
  "超过": "exceed",
  "不超过": "not exceed",
  "低于": "below",
  "高于": "above",
  "等于": "equal to",
  "不少于": "not less than",
  "不多于": "not more than",
  "以内": "within",
  "大于": "greater than",
  "小于": "less than",
  "比例": "ratio",
  "百分比": "percentage",

  // === Time-related ===
  "日": "day",
  "工作日": "working day",
  "交易日": "trading day",
  "天": "days",
  "月": "month",
  "季度": "quarter",
  "年": "year",
  "年度": "annual",
  "定期": "regular",
  "临时": "temporary",
  "持续": "continuous",
  "期间": "period",
  "期限": "term",
  "到期": "mature",
  "到期日": "maturity date",
  "起息日": "value date",
  "付息": "interest payment",
  "计息": "interest accrual",
  "逾期": "overdue",
  "提前": "in advance",
  "延期": "postpone",
  "立即": "immediately",
  "及时": "timely",

  // === Question Patterns ===
  "什么是": "What is",
  "哪些": "which",
  "哪个": "which",
  "为什么": "why",
  "如何": "how",
  "是否": "whether",
  "能否": "can",
  "说法": "statement",
  "情形": "situation",
  "情况": "situation",
  "行为": "behavior",
  "事项": "matters",
  "条件": "conditions",
  "要求": "requirements",
  "标准": "standards",
  "原则": "principles",
  "制度": "system",
  "程序": "procedures",
  "流程": "process",
  "方法": "methods",
  "方式": "method",
  "途径": "approach",
  "目的": "purpose",
  "作用": "function",
  "职责": "responsibilities",
  "义务": "obligations",
  "权利": "rights",
  "责任": "liability",
  "后果": "consequences",
  "影响": "impact",
  "意义": "significance",
  "特征": "characteristics",
  "优势": "advantages",
  "劣势": "disadvantages",
  "区别": "differences",
  "联系": "connection",
  "关系": "relationship",
  "范围": "scope",
  "内容": "content",
  "形式": "form",
  "种类": "types",
  "分类": "classification",
  "示例": "example",
  "例外": "exception",
};

// Sorted by length (longest first) for greedy matching
export function getSortedDictKeys(): string[] {
  return Object.keys(FINANCIAL_DICT).sort((a, b) => b.length - a.length);
}

// Dictionary-based translation: replaces Chinese terms with English equivalents
export function dictTranslate(text: string): string {
  if (!text || !/[\u4e00-\u9fff]/.test(text)) return text; // Not Chinese, return as-is

  const keys = getSortedDictKeys();
  let result = text;
  let changed = false;

  for (const key of keys) {
    if (result.includes(key)) {
      result = result.split(key).join(FINANCIAL_DICT[key]);
      changed = true;
    }
  }

  // If no dictionary terms matched, add a marker
  if (!changed) {
    return `[EN] ${text}`;
  }

  // Clean up extra spaces
  result = result.replace(/\s+/g, " ").trim();
  // Fix spaces around punctuation
  result = result.replace(/\s+([,.;:!?。，；：！？])/g, "$1");
  // Remove space before Chinese punctuation
  result = result.replace(/\s+([）】」』])/g, "$1");
  // Remove space after Chinese opening brackets
  result = result.replace(/([（【「『])\s+/g, "$1");

  return result || `[EN] ${text}`;
}

// Check if text still has Chinese characters after translation
export function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

// Batch dictionary translation for multiple texts
export function batchDictTranslate(texts: string[]): { results: string[]; fullyTranslated: number[] } {
  const results: string[] = [];
  const fullyTranslated: number[] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text || !hasChinese(text)) {
      results.push(text);
      if (text) fullyTranslated.push(i);
      continue;
    }

    const translated = dictTranslate(text);
    results.push(translated);

    // Count as fully translated if no Chinese remains (or was already English)
    if (!hasChinese(translated) || !hasChinese(text)) {
      fullyTranslated.push(i);
    }
  }

  return { results, fullyTranslated };
}
