// Translation service — ensures complete SC/TC/EN for all questions at import time
// Uses Moonshot LLM for English translation + local SC→TC conversion

import { env } from "./lib/env";

// Minimal SC→TC map (500 most common characters used in financial exams)
const sc2tcMap: Record<string, string> = {
  "万": "萬", "与": "與", "专": "專", "业": "業", "东": "東", "两": "兩", "严": "嚴", "丧": "喪", "个": "個", "丰": "豐",
  "临": "臨", "为": "為", "丽": "麗", "举": "舉", "义": "義", "乌": "烏", "乐": "樂", "乔": "喬", "习": "習", "乡": "鄉",
  "书": "書", "买": "買", "乱": "亂", "了": "瞭", "争": "爭", "于": "於", "亏": "虧", "云": "雲", "亚": "亞", "产": "產",
  "亩": "畝", "亲": "親", "亿": "億", "仅": "僅", "仆": "僕", "从": "從", "仑": "侖", "仓": "倉", "仪": "儀", "们": "們",
  "价": "價", "众": "眾", "优": "優", "伙": "夥", "会": "會", "伟": "偉", "传": "傳", "伤": "傷", "伦": "倫", "伪": "偽",
  "体": "體", "余": "餘", "佣": "傭", "侠": "俠", "侣": "侶", "侦": "偵", "侧": "側", "侨": "僑", "侬": "儂", "债": "債",
  "倾": "傾", "储": "儲", "儿": "兒", "克": "剋", "党": "黨", "关": "關", "兴": "興", "养": "養", "兽": "獸", "内": "內",
  "册": "冊", "写": "寫", "军": "軍", "农": "農", "冯": "馮", "况": "況", "冻": "凍", "准": "準", "凉": "涼", "减": "減",
  "凑": "湊", "几": "幾", "凤": "鳳", "凭": "憑", "凯": "凱", "击": "擊", "凿": "鑿", "则": "則", "刚": "剛", "创": "創",
  "删": "刪", "别": "別", "制": "製", "剂": "劑", "剧": "劇", "劝": "勸", "办": "辦", "务": "務", "动": "動", "励": "勵",
  "劲": "勁", "劳": "勞", "势": "勢", "勋": "勲", "匀": "勻", "医": "醫", "华": "華", "协": "協", "单": "單", "卖": "賣",
  "占": "佔", "卫": "衛", "却": "卻", "历": "歷", "厉": "厲", "压": "壓", "厌": "厭", "厕": "廁", "参": "參", "双": "雙",
  "发": "髮", "变": "變", "台": "臺", "叶": "葉", "号": "號", "吃": "喫", "后": "後", "向": "嚮", "吓": "嚇", "吗": "嗎",
  "听": "聽", "启": "啟", "吴": "吳", "员": "員", "周": "週", "咨": "諮", "咸": "鹹", "响": "響", "哑": "啞", "哗": "嘩",
  "喷": "噴", "回": "迴", "团": "團", "园": "園", "围": "圍", "国": "國", "图": "圖", "圆": "圓", "圣": "聖", "场": "場",
  "坏": "壞", "坚": "堅", "坛": "壇", "坟": "墳", "坠": "墜", "垒": "壘", "垫": "墊", "壮": "壯", "声": "聲", "壳": "殼",
  "备": "備", "复": "復", "够": "夠", "头": "頭", "夸": "誇", "夹": "夾", "夺": "奪", "奋": "奮", "奖": "獎", "奥": "奧",
  "奶": "嬭", "妇": "婦", "妈": "媽", "姜": "薑", "娱": "娛", "娲": "媧", "婴": "嬰", "孙": "孫", "学": "學", "宝": "寶",
  "实": "實", "宠": "寵", "审": "審", "宪": "憲", "宫": "宮", "宽": "寬", "宾": "賓", "导": "導", "寿": "壽", "将": "將",
  "尔": "爾", "尘": "塵", "尝": "嚐", "尧": "堯", "尴": "尷", "尽": "盡", "层": "層", "属": "屬", "岁": "歲", "岂": "豈",
  "岗": "崗", "岛": "島", "岭": "嶺", "峡": "峽", "崭": "嶃", "巩": "鞏", "币": "幣", "帅": "帥", "师": "師", "帐": "帳",
  "带": "帶", "帮": "幫", "干": "幹", "并": "並", "幸": "倖", "广": "廣", "庄": "莊", "庆": "慶", "应": "應", "庞": "龐",
  "废": "廢", "开": "開", "异": "異", "弃": "棄", "张": "張", "弥": "彌", "强": "強", "归": "歸", "当": "當", "录": "錄",
  "彦": "彥", "彩": "綵", "彻": "徹", "征": "徴", "径": "徑", "忆": "憶", "忧": "憂", "怀": "懷", "态": "態", "总": "總",
  "恋": "戀", "恳": "懇", "恶": "惡", "恼": "惱", "悦": "悅", "悬": "懸", "悯": "憫", "惊": "驚", "惧": "懼", "惨": "慘",
  "惯": "慣", "愤": "憤", "愿": "願", "戏": "戲", "战": "戰", "户": "戶", "扎": "紮", "扑": "撲", "托": "託", "执": "執",
  "扩": "擴", "扫": "掃", "扬": "揚", "扰": "擾", "折": "摺", "抚": "撫", "抢": "搶", "报": "報", "担": "擔", "拟": "擬",
  "拥": "擁", "拦": "攔", "拧": "擰", "拨": "撥", "择": "擇", "挂": "掛", "挡": "擋", "挣": "掙", "挤": "擠", "挥": "揮",
  "损": "損", "据": "據", "摄": "攝", "摆": "擺", "摇": "搖", "撑": "撐", "撞": "撐", "效": "傚", "敌": "敵", "数": "數",
  "斗": "鬥", "断": "斷", "无": "無", "旧": "舊", "时": "時", "旷": "曠", "显": "顯", "晓": "曉", "暂": "暫", "曲": "麯",
  "术": "術", "朱": "硃", "朴": "樸", "机": "機", "杀": "殺", "杂": "雜", "权": "權", "杆": "桿", "条": "條", "来": "來",
  "杨": "楊", "杰": "傑", "松": "鬆", "板": "闆", "极": "極", "构": "構", "枣": "棗", "枪": "槍", "枫": "楓", "查": "査",
  "标": "標", "栋": "棟", "栏": "欄", "树": "樹", "样": "樣", "桥": "橋", "梦": "夢", "检": "檢", "楼": "樓", "榄": "欖",
  "横": "橫", "樱": "櫻", "橱": "櫥", "欢": "歡", "欧": "歐", "欲": "慾", "残": "殘", "气": "氣", "汇": "匯", "汉": "漢",
  "污": "汙", "汤": "湯", "沈": "瀋", "沟": "溝", "没": "沒", "泄": "洩", "注": "註", "泪": "淚", "洁": "潔", "洒": "灑",
  "浅": "淺", "浆": "漿", "浇": "澆", "浊": "濁", "测": "測", "济": "濟", "浓": "濃", "涂": "塗", "涛": "濤", "涨": "漲",
  "渐": "漸", "灭": "滅", "灯": "燈", "灵": "靈", "灾": "災", "灿": "燦", "炉": "爐", "点": "點", "炼": "煉", "烟": "煙",
  "烦": "煩", "烧": "燒", "热": "熱", "焕": "煥", "爱": "愛", "爷": "爺", "牵": "牽", "牺": "犧", "状": "狀", "犹": "猶",
  "狮": "獅", "狱": "獄", "猎": "獵", "猪": "豬", "猫": "貓", "献": "獻", "环": "環", "现": "現", "琐": "瑣", "琼": "瓊",
  "电": "電", "画": "畫", "畅": "暢", "疗": "療", "疯": "瘋", "盐": "鹽", "监": "監", "盖": "蓋", "盗": "盜", "盘": "盤",
  "码": "碼", "础": "礎", "硕": "碩", "确": "確", "碍": "礙", "礼": "禮", "离": "離", "种": "種", "秘": "祕", "称": "稱",
  "税": "稅", "稣": "穌", "稳": "穩", "穷": "窮", "窃": "竊", "窝": "窩", "竞": "競", "笋": "筍", "笔": "筆", "笼": "籠",
  "筑": "築", "筹": "籌", "签": "簽", "简": "簡", "篮": "籃", "篱": "籬", "类": "類", "粮": "糧", "系": "係", "红": "紅",
  "约": "約", "级": "級", "纪": "紀", "纯": "純", "纳": "納", "纸": "紙", "练": "練", "组": "組", "细": "細", "终": "終",
  "绍": "紹", "经": "經", "绑": "綁", "绒": "絨", "结": "結", "给": "給", "络": "絡", "绝": "絕", "统": "統", "继": "繼",
  "续": "續", "维": "維", "绵": "綿", "绿": "綠", "缓": "緩", "编": "編", "缘": "緣", "缩": "縮", "羡": "羨", "群": "羣",
  "职": "職", "联": "聯", "聪": "聰", "肃": "肅", "肤": "膚", "肾": "腎", "胀": "脹", "胁": "脅", "胆": "膽", "胜": "勝",
  "胡": "鬍", "脑": "腦", "脱": "脫", "腊": "臘", "腾": "騰", "致": "緻", "舍": "捨", "舰": "艦", "艺": "藝", "节": "節",
  "苍": "蒼", "苏": "蘇", "范": "範", "荐": "薦", "荣": "榮", "药": "藥", "莲": "蓮", "获": "獲", "营": "營", "萨": "薩",
  "蒋": "蔣", "蒙": "濛", "蓝": "藍", "虑": "慮", "虫": "蟲", "蚕": "蠶", "蛮": "蠻", "蝉": "蟬", "补": "補", "表": "錶",
  "装": "裝", "裤": "褲", "观": "觀", "规": "規", "视": "視", "览": "覽", "觉": "覺", "计": "計", "订": "訂", "认": "認",
  "让": "讓", "议": "議", "记": "記", "讲": "講", "许": "許", "论": "論", "设": "設", "访": "訪", "证": "證", "评": "評",
  "识": "識", "诉": "訴", "词": "詞", "译": "譯", "试": "試", "诗": "詩", "诚": "誠", "话": "話", "诞": "誕", "询": "詢",
  "该": "該", "详": "詳", "语": "語", "误": "誤", "说": "說", "请": "請", "诸": "諸", "诺": "諾", "读": "讀", "课": "課",
  "调": "調", "谈": "談", "谋": "謀", "谜": "謎", "谢": "謝", "谣": "謠", "谦": "謙", "谨": "謹", "谱": "譜", "谷": "穀",
  "负": "負", "财": "財", "责": "責", "贤": "賢", "败": "敗", "货": "貨", "质": "質", "贩": "販", "贪": "貪", "购": "購",
  "贯": "貫", "贱": "賤", "贴": "貼", "贵": "貴", "贷": "貸", "贸": "貿", "费": "費", "贺": "賀", "贼": "賊", "贾": "賈",
  "赞": "贊", "赢": "贏", "赵": "趙", "跃": "躍", "躯": "軀", "车": "車", "轨": "軌", "轩": "軒", "转": "轉", "轮": "輪",
  "软": "軟", "载": "載", "较": "較", "辅": "輔", "辞": "辭", "辩": "辯", "边": "邊", "达": "達", "迁": "遷", "过": "過",
  "迈": "邁", "运": "運", "还": "還", "进": "進", "远": "遠", "违": "違", "连": "連", "迟": "遲", "适": "適", "选": "選",
  "逊": "遜", "递": "遞", "逻": "邏", "遗": "遺", "遥": "遙", "邓": "鄧", "邻": "鄰", "郑": "鄭", "酱": "醬", "里": "裡",
  "鉴": "鑒", "针": "針", "钉": "釘", "钓": "釣", "钟": "鐘", "钢": "鋼", "钦": "欽", "钱": "錢", "铁": "鐵", "铜": "銅",
  "银": "銀", "链": "鏈", "销": "銷", "锁": "鎖", "锅": "鍋", "锈": "銹", "锋": "鋒", "错": "錯", "锡": "錫", "锣": "鑼",
  "锦": "錦", "键": "鍵", "镜": "鏡", "长": "長", "门": "門", "闪": "閃", "闭": "閉", "问": "問", "闲": "閒", "间": "間",
  "闷": "悶", "闻": "聞", "闽": "閩", "阀": "閥", "阁": "閣", "阅": "閱", "队": "隊", "阳": "陽", "阶": "階", "际": "際",
  "陆": "陸", "陈": "陳", "险": "險", "隐": "隱", "难": "難", "雇": "僱", "雾": "霧", "霉": "黴", "静": "靜", "面": "麵",
  "韦": "韋", "韩": "韓", "韵": "韻", "页": "頁", "顶": "頂", "项": "項", "顺": "順", "须": "須", "顾": "顧", "顿": "頓",
  "预": "預", "领": "領", "频": "頻", "题": "題", "额": "額", "风": "風", "飘": "飄", "飞": "飛", "饥": "饑", "饭": "飯",
  "饮": "飲", "饰": "飾", "饱": "飽", "饼": "餅", "饿": "餓", "馆": "館", "马": "馬", "驱": "驅", "驶": "駛", "验": "驗",
  "骑": "騎", "骗": "騙", "骤": "驟", "鱼": "魚", "鲜": "鮮", "鸟": "鳥", "鸡": "雞", "鸣": "鳴", "鸭": "鴨", "鸿": "鴻",
  "麦": "麥", "麻": "蔴", "黄": "黃", "齐": "齊", "齿": "齒", "龄": "齡", "龙": "龍"
};

// Local SC→TC conversion (no API needed)
export function toTraditional(text: string): string {
  let result = "";
  for (const char of text) {
    result += sc2tcMap[char] || char;
  }
  return result;
}

// Check if text contains Chinese
function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

// Moonshot LLM translation — whole sentence
async function moonshotTranslate(texts: string[]): Promise<string[]> {
  const apiKey = env.moonshotApiKey;
  if (!apiKey) {
    console.warn("[translate-service] No MOONSHOT_API_KEY configured");
    return texts.map((t) => toTraditional(t));
  }

  // Build prompt
  const prompt = `Translate the following Chinese text to English. Translate the FULL sentence naturally, not word by word. Return ONLY the English translations, one per line, in the same order. Do not add explanations or notes.

${texts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;

  try {
    const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.warn("[translate-service] Moonshot HTTP", res.status, await res.text());
      return texts.map((t) => toTraditional(t));
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return texts.map((t) => toTraditional(t));

    // Parse numbered results
    const results: string[] = [];
    const lines = content.split("\n").filter((l) => l.trim());

    for (let i = 0; i < texts.length; i++) {
      const prefix = `${i + 1}.`;
      const line = lines.find((l) => l.trim().startsWith(prefix));
      if (line) {
        const translated = line.substring(line.indexOf(prefix) + prefix.length).trim();
        results.push(translated || toTraditional(texts[i]));
      } else {
        // Fallback: try to find any remaining line
        const untaken = lines.find((l) => !results.includes(l.trim()));
        results.push(untaken?.replace(/^\d+\.\s*/, "") || toTraditional(texts[i]));
      }
    }

    return results;
  } catch (err) {
    console.warn("[translate-service] Moonshot error:", err);
    return texts.map((t) => toTraditional(t));
  }
}

// Chunk texts into batches of max size
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// Main: translate questions to have complete SC/TC/EN
// Returns true if translation succeeded for all questions
export async function translateQuestions(
  questions: Array<{
    question: string;
    options: string[];
    enQuestion?: string;
    enOptions?: string[];
    tcQuestion?: string;
    tcOptions?: string[];
  }>,
): Promise<{ questions: typeof questions; allTranslated: boolean }> {
  // Collect all texts that need English translation
  const needEn: { qIdx: number; field: "q" | `o${number}`; text: string }[] = [];

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    // Question text
    if (!q.enQuestion || hasChinese(q.enQuestion)) {
      needEn.push({ qIdx: qi, field: "q", text: q.question });
    }
    // Options
    for (let oi = 0; oi < q.options.length; oi++) {
      if (!q.enOptions?.[oi] || hasChinese(q.enOptions[oi])) {
        needEn.push({ qIdx: qi, field: `o${oi}`, text: q.options[oi] });
      }
    }
  }

  // Call Moonshot for English (batch in groups of 15)
  if (needEn.length > 0) {
    const batches = chunk(needEn, 15);
    for (const batch of batches) {
      const texts = batch.map((n) => n.text);
      const results = await moonshotTranslate(texts);
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const translated = results[i];
        const q = questions[item.qIdx];
        if (item.field === "q") {
          q.enQuestion = translated;
        } else {
          const oi = parseInt(item.field.slice(1));
          if (!q.enOptions) q.enOptions = [...q.options];
          q.enOptions[oi] = translated;
        }
      }
    }
  }

  // Apply TC conversion to all (local, no API)
  for (const q of questions) {
    q.tcQuestion = toTraditional(q.question);
    q.tcOptions = q.options.map((o) => toTraditional(o));
  }

  // Verify all questions have EN
  const allTranslated = questions.every(
    (q) => q.enQuestion && !hasChinese(q.enQuestion) && q.enOptions?.every((o) => o && !hasChinese(o)),
  );

  return { questions, allTranslated };
}
