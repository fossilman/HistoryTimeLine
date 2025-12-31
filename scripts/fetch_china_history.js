const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;

class WikipediaHistoryScraper {
  constructor() {
    // 遵守维基百科的爬虫规则
    this.headers = {
      'User-Agent': 'HistoryDataBot/1.0 (Educational Purpose; Contact: your-email@example.com)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    };
    this.baseUrl = 'https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%9B%BD%E5%8E%86%E5%8F%B2%E5%B9%B4%E8%A1%A8';
    this.delay = 1000; // 请求间隔至少1秒
    this.polities = [];
    this.events = [];
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchPage(url) {
    try {
      await this.sleep(this.delay); // 遵守爬虫礼仪
      console.log(`正在请求: ${url}`);
      
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error(`请求失败: ${error.message}`);
      return null;
    }
  }

  parseDynastyTable(html) {
    const $ = cheerio.load(html);
    
    // 查找历史朝代表格
    $('table.wikitable').each((index, table) => {
      $(table).find('tr').slice(1).each((rowIndex, row) => {
        const cells = $(row).find('td, th');
        if (cells.length >= 2) {
          this.parseDynastyRow($, cells);
        }
      });
    });
  }

  parseDynastyRow($, cells) {
    try {
      // 提取朝代名称
      const nameCell = $(cells[0]);
      let name = nameCell.text().trim();
      
      // 清理名称中的注释和括号
      name = name.replace(/\[.*?\]/g, '').replace(/（.*?）/g, '').trim();
      
      // 提取年份范围
      const yearText = cells.length > 1 ? $(cells[1]).text().trim() : '';
      const { startYear, endYear } = this.parseYearRange(yearText);
      
      if (name && startYear !== null) {
        const polityId = this.generateId(name);
        
        const polity = {
          id: polityId,
          name: name,
          civilizationId: 'sinitic',
          startYear: startYear,
          endYear: endYear
        };
        
        this.polities.push(polity);
        console.log(`解析朝代: ${name} (${startYear} - ${endYear})`);
      }
    } catch (error) {
      console.error(`解析行失败: ${error.message}`);
    }
  }

  parseYearRange(yearText) {
    // 清理文本
    let cleaned = yearText
      .replace(/年/g, '')
      .replace(/公元/g, '')
      .replace(/约/g, '')
      .replace(/？/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // 处理"前XXX"格式
    cleaned = cleaned.replace(/前(\d+)/g, '-$1');
    
    // 查找年份范围模式
    // 支持格式: "前221-前206", "-221--206", "618-907", "618年-907年" 等
    const rangePattern = /(-?\d+)\s*[-–—至]\s*(-?\d+)/;
    const match = cleaned.match(rangePattern);
    
    if (match) {
      const start = parseInt(match[1]);
      const end = parseInt(match[2]);
      return { startYear: start, endYear: end };
    }
    
    // 尝试匹配单个年份
    const singlePattern = /(-?\d+)/;
    const singleMatch = cleaned.match(singlePattern);
    
    if (singleMatch) {
      const year = parseInt(singleMatch[1]);
      return { startYear: year, endYear: null };
    }
    
    return { startYear: null, endYear: null };
  }

  parseEvents(html) {
    const $ = cheerio.load(html);
    
    // 查找事件列表
    $('ul, ol').each((index, list) => {
      $(list).children('li').each((itemIndex, item) => {
        this.parseEventItem($, item);
      });
    });
  }

  parseEventItem($, item) {
    try {
      const text = $(item).text().trim();
      
      // 查找年份和事件名称
      // 格式: "前221年：秦统一六国" 或 "221年：xxx"
      const pattern = /(前)?(\d+)年[：:]\s*(.+)/;
      const match = text.match(pattern);
      
      if (match) {
        const isBC = match[1] === '前';
        const yearNum = parseInt(match[2]);
        const year = isBC ? -yearNum : yearNum;
        
        // 获取事件描述部分
        let eventText = match[3].trim()
          .replace(/\[.*?\]/g, '')  // 移除方括号注释
          .replace(/（.*?）/g, '');  // 移除圆括号注释
        
        // 按句号分割成多个事件
        const eventNames = eventText
          .split(/[。；;]/)  // 按句号、分号分割
          .map(name => name.trim())
          .filter(name => name.length > 0 && name.length < 100);
        
        // 为每个事件创建独立的条目
        eventNames.forEach(eventName => {
          // 生成唯一ID，结合年份和事件名称
          const baseId = this.generateId(eventName);
          const eventId = this.generateUniqueEventId(baseId, year);
          
          const event = {
            id: eventId,
            name: eventName,
            type: 'point',
            year: year,
            relatedPolities: []
          };
          
          this.events.push(event);
          console.log(`解析事件: ${eventName} (${year})`);
        });
      }
    } catch (error) {
      console.error(`解析事件失败: ${error.message}`);
    }
  }

  generateUniqueEventId(baseId, year) {
    // 检查是否已存在相同年份和相似ID的事件
    const existingIds = this.events
      .filter(e => e.year === year)
      .map(e => e.id);
    
    // 如果ID不存在，直接返回
    if (!existingIds.includes(baseId)) {
      return baseId;
    }
    
    // 如果存在，添加序号后缀
    let counter = 1;
    let newId = `${baseId}_${counter}`;
    
    while (existingIds.includes(newId)) {
      counter++;
      newId = `${baseId}_${counter}`;
    }
    
    return newId;
  }

  generateId(name) {
    // 简单的拼音转换映射
    const replacements = {
      '夏': 'xia', '商': 'shang', '周': 'zhou', '秦': 'qin',
      '汉': 'han', '晋': 'jin', '隋': 'sui', '唐': 'tang',
      '宋': 'song', '元': 'yuan', '明': 'ming', '清': 'qing',
      '三国': 'three_kingdoms', '魏': 'wei', '蜀': 'shu', '吴': 'wu',
      '西': 'western_', '东': 'eastern_', '南': 'southern_', '北': 'northern_',
      '统一': 'unification', '建立': 'founding', '灭亡': 'fall',
      '战争': 'war', '运动': 'movement', '革命': 'revolution',
      '起义': 'rebellion', '改革': 'reform', '变法': 'reform'
    };
    
    let idStr = name.toLowerCase();
    
    for (const [cn, en] of Object.entries(replacements)) {
      idStr = idStr.replace(new RegExp(cn, 'g'), en);
    }
    
    // 移除特殊字符，保留字母、数字和下划线
    idStr = idStr.replace(/[^\w]/g, '_');
    idStr = idStr.replace(/_+/g, '_').replace(/^_|_$/g, '');
    
    return idStr || `item_${this.polities.length + this.events.length}`;
  }

  async scrape(url) {
    console.log(`开始爬取: ${url}`);
    console.log(`遵守维基百科爬虫规则: 请求间隔${this.delay}毫秒`);
    console.log('-'.repeat(50));
    
    const html = await this.fetchPage(url);
    if (!html) {
      console.log('无法获取页面');
      return;
    }
    
    console.log('\n解析朝代信息...');
    this.parseDynastyTable(html);
    
    console.log('\n解析历史事件...');
    this.parseEvents(html);
    
    console.log('\n' + '='.repeat(50));
    console.log(`共解析朝代: ${this.polities.length} 个`);
    console.log(`共解析事件: ${this.events.length} 个`);
  }

  async saveToJson(filename = 'china_history.json') {
    const data = {
      polities: this.polities,
      events: this.events
    };
    
    await fs.writeFile(
      filename,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
    
    console.log(`\n数据已保存到: ${filename}`);
    
    // 统计同一年份的事件
    this.printYearStatistics();
  }

  printYearStatistics() {
    const yearMap = new Map();
    
    this.events.forEach(event => {
      const count = yearMap.get(event.year) || 0;
      yearMap.set(event.year, count + 1);
    });
    
    const multipleEventsYears = Array.from(yearMap.entries())
      .filter(([year, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]); // 按事件数量降序排序
    
    if (multipleEventsYears.length > 0) {
      console.log('\n同一年份多个事件统计:');
      console.log('-'.repeat(50));
      multipleEventsYears.slice(0, 10).forEach(([year, count]) => {
        console.log(`${year}年: ${count}个事件`);
        // 显示该年份的所有事件
        this.events
          .filter(e => e.year === year)
          .forEach(e => console.log(`  - ${e.name}`));
      });
    }
  }

  async saveSeparateFiles() {
    await fs.writeFile(
      'polities.json',
      JSON.stringify(this.polities, null, 2),
      'utf-8'
    );
    
    await fs.writeFile(
      'events.json',
      JSON.stringify(this.events, null, 2),
      'utf-8'
    );
    
    console.log('数据已分别保存到: polities.json 和 events.json');
  }
}

async function main() {
  console.log('维基百科中国历史数据爬虫');
  console.log('='.repeat(50));
  console.log('注意事项:');
  console.log('1. 遵守维基百科爬虫规则');
  console.log('2. 请求间隔至少1秒');
  console.log('3. 使用合理的User-Agent');
  console.log('4. 仅用于教育和研究目的');
  console.log('='.repeat(50));
  console.log();
  
  // 创建爬虫实例
  const scraper = new WikipediaHistoryScraper();
  
  // 目标URL
  const url = 'https://zh.wikipedia.org/wiki/中国历史年表';
  
  // 开始爬取
  await scraper.scrape(url);
  
  // 保存数据
  await scraper.saveToJson('china_history.json');
  await scraper.saveSeparateFiles();
  
  // 打印示例数据
  console.log('\n' + '='.repeat(50));
  console.log('示例数据:');
  
  if (scraper.polities.length > 0) {
    console.log('\n朝代示例:');
    console.log(JSON.stringify(scraper.polities[0], null, 2));
  }
  
  if (scraper.events.length > 0) {
    console.log('\n事件示例:');
    console.log(JSON.stringify(scraper.events[0], null, 2));
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('发生错误:', error);
    process.exit(1);
  });
}

module.exports = WikipediaHistoryScraper;