import fs from "fs";
import { ProxyAgent, fetch } from "undici";

// ================= 配置 =================
const ENDPOINT = "https://query.wikidata.org/sparql";
const PROXY = "http://127.0.0.1:7890";
const OUTPUT_FILE = "./china_dynasties.json";
// =======================================

// ✅ 正确的代理方式（undici 专用）
const dispatcher = new ProxyAgent(PROXY);

async function fetchWithRetry(query, retry = 3) {
  for (let i = 1; i <= retry; i++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        dispatcher, // ⭐ 关键点
        headers: {
          "Content-Type": "application/sparql-query",
          "Accept": "application/sparql-results+json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
        },
        body: query
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.error(`⚠️ 第 ${i} 次请求失败：`, err.message);
      if (i === retry) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// ================= 查询语句 =================
const QUERY = `
SELECT ?item ?itemLabel ?start ?end WHERE {
  ?article schema:about ?item ;
           schema:isPartOf <https://zh.wikipedia.org/> ;
           schema:inLanguage "zh" .

  ?item wdt:P31 wd:Q48349 .   # dynasty（朝代）

  OPTIONAL { ?item wdt:P571 ?start. }
  OPTIONAL { ?item wdt:P576 ?end. }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "zh".
  }
}
ORDER BY ?start
`;

async function main() {
  console.log("🚀 正在从 Wikidata 拉取中国历史政权数据...");

  const data = await fetchWithRetry(QUERY);

  const result = data.results.bindings.map(item => ({
    id: item.item.value,
    name: item.itemLabel?.value || "",
    start: item.start?.value || null,
    end: item.end?.value || null
  }));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf-8");
  console.log(`✅ 成功写入 ${result.length} 条记录 → ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error("❌ 程序最终失败：", err);
});
