import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcryptjs from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;
let localImageCache = null;

// Helper: Generate Koei-style Avatar URL based on attributes
const getAvatarUrl = (name, stars, country, keywords) => {
    // 0. Check Local Custom Image (Project Root / public / images)
    // Path: backend/src/../../public/images -> root/public/images
    try {
        const imageDir = path.resolve(__dirname, '../../public/images');
        
        // Reload cache if it's null or empty (to ensure we catch files added late or if init failed)
        if (!localImageCache || localImageCache.length === 0) {
            if (fs.existsSync(imageDir)) {
                localImageCache = fs.readdirSync(imageDir);
                console.log(`[DB] Loaded ${localImageCache.length} images from ${imageDir}`);
            } else {
                // Only log this once or if really missing
                if (localImageCache === null) console.log(`[DB] Image directory not found at ${imageDir}`);
                localImageCache = [];
            }
        }

        if (localImageCache && localImageCache.length > 0) {
            // Normalize name for matching (NFC for standard composition)
            const normalizedName = name.normalize('NFC');
            
            // Find a file that contains the general's name
            // Files are typically named like "0060_曹操_1.jpg" or "1002_关羽_1.jpg"
            // We use normalize() on the filename as well to ensure CJK characters match correctly
            const match = localImageCache.find(f => f.normalize('NFC').includes(normalizedName));
            
            if (match) {
                console.log(`[DB] Found local image for ${name}: ${match}`);
                // Encode the filename to handle Chinese characters in URLs properly
                return `/api/images/${encodeURIComponent(match)}`;
            }
        }
    } catch (e) {
        console.error('Error checking local images:', e);
    }

    // 1. Country Theme Colors & Atmosphere
    let theme = '';
    switch(country) {
        case '魏': 
            theme = 'main color majestic blue and purple, cold winter atmosphere, imposing palace background, noble aura'; 
            break;
        case '蜀': 
            theme = 'main color emerald green and gold, warm sunlight, bamboo forest or mountain background, benevolent aura'; 
            break;
        case '吴': 
            theme = 'main color crimson red and gold, fire particles, yangtze river background, fierce heroic aura'; 
            break;
        case '群': 
            theme = 'main color dark grey and black iron, chaotic battlefield smoke background, intimidating warlord aura'; 
            break;
        default:
            theme = 'ancient chinese warrior style';
    }

    // 2. Star Rating Quality & Detail Level
    let quality = '';
    switch(stars) {
        case 5: 
            quality = 'legendary masterpiece, god ray lighting, extremely intricate ornate armor with gold trim, glowing eyes, hyper-detailed face, 8k resolution, cinematic depth of field'; 
            break;
        case 4: 
            quality = 'epic hero portrait, highly detailed ornate armor, sharp focus, dynamic dramatic lighting, 4k resolution'; 
            break;
        case 3: 
            quality = 'veteran general, battle-worn realistic armor, gritty texture, serious expression, realistic lighting'; 
            break;
        default: 
            quality = 'common soldier, simple leather and iron armor, rough texture, muted colors'; 
            break;
    }

    // 3. Construct Prompt
    const prompt = encodeURIComponent(`Portrait of ${keywords}, ${name}, ${theme}, ${quality}, Koei Romance of the Three Kingdoms XIV art style, oil painting texture, hyper-realistic face`);
    
    // 4. Stable Seed based on name
    const seed = name.split('').reduce((a,b)=>a+b.charCodeAt(0), 0);
    
    return `https://image.pollinations.ai/prompt/${prompt}?width=300&height=450&nologo=true&seed=${seed}&model=flux`;
};

// Skill Mapping for Famous Generals
const SKILL_MAP = {
    '曹操': { name: '天下归心', desc: '发动霸道之气，大幅提升全队战力。' },
    '刘备': { name: '惟贤惟德', desc: '仁德感召，提升全队防御与生存能力。' },
    '孙权': { name: '坐断东南', desc: '帝王威仪，全队属性均衡提升。' },
    '吕布': { name: '天下无双', desc: '战神降世，对敌方造成毁灭性打击。' },
    '关羽': { name: '武圣显灵', desc: '青龙偃月斩，极高概率暴击。' },
    '张飞': { name: '当阳怒吼', desc: '震慑敌军，降低敌方战力。' },
    '赵云': { name: '七进七出', desc: '龙胆亮银枪，无视敌方部分防御。' },
    '诸葛亮': { name: '八阵图', desc: '神机妙算，大幅削弱敌方战力并提升我方智力。' },
    '周瑜': { name: '火烧赤壁', desc: '业火燎原，造成巨额计策伤害。' },
    '司马懿': { name: '鹰视狼顾', desc: '深谋远虑，反弹敌方伤害。' },
    '郭嘉': { name: '遗计', desc: '天妒英才，大幅提升我方计策成功率。' },
    '陆逊': { name: '火烧连营', desc: '计策连环，持续削弱敌军。' },
    '典韦': { name: '古之恶来', desc: '舍身护主，极大提升自身防御。' },
    '许褚': { name: '裸衣', desc: '虎痴狂暴，牺牲防御大幅提升攻击。' },
    '马超': { name: '神威', desc: '西凉铁骑，冲击敌阵大幅提升攻击。' },
    '黄忠': { name: '百步穿杨', desc: '老当益壮，必定命中敌方要害。' },
    '孙策': { name: '小霸王', desc: '江东猛虎，提升全队攻击速度。' },
    '张辽': { name: '突袭', desc: '威震逍遥津，战斗开始时战力激增。' },
    '甘宁': { name: '锦帆夜袭', desc: '百骑劫营，高概率先手攻击。' },
    '华雄': { name: '骁骑', desc: '西凉猛将，提升单体伤害。' },
    '颜良': { name: '勇冠三军', desc: '河北名将，提升攻击力。' },
    '文丑': { name: '獬豸狂啸', desc: '河北名将，震慑敌军。' },
    '董卓': { name: '酒池肉林', desc: '暴虐之气，提升攻击但降低防御。' },
    '貂蝉': { name: '闭月羞花', desc: '倾国倾城，使敌方大概率混乱。' },
    '姜维': { name: '继往开来', desc: '继承武侯遗志，攻防一体。' },
    '邓艾': { name: '偷渡阴平', desc: '奇兵突袭，无视敌方地形优势。' },
    '钟会': { name: '精练策数', desc: '智谋超群，提升计策伤害。' }
};

// Generate default skill based on stats
const getDefaultSkill = (str, int, ldr) => {
    if (int > str && int > ldr) return { name: '奇策', desc: '运用计略打击敌军。' };
    if (ldr > str && ldr > int) return { name: '统军', desc: '指挥部队，稳扎稳打。' };
    return { name: '猛击', desc: '奋力一击，造成物理伤害。' };
};

export async function initDB() {
  console.log('Initializing Database...');
  db = await open({
    filename: './sanguo.db',
    driver: sqlite3.Database
  });
  console.log('Database connected.');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      gold INTEGER DEFAULT 1000,
      tokens INTEGER DEFAULT 10,
      pity_counter INTEGER DEFAULT 0,
      last_signin TEXT
    );

    CREATE TABLE IF NOT EXISTS generals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      stars INTEGER,
      str INTEGER,
      int INTEGER,
      ldr INTEGER,
      luck INTEGER,
      country TEXT,
      avatar TEXT,
      description TEXT,
      skill_name TEXT,
      skill_desc TEXT
    );

    CREATE TABLE IF NOT EXISTS user_generals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      general_id INTEGER,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      is_in_team BOOLEAN DEFAULT 0,
      evolution INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(general_id) REFERENCES generals(id)
    );

    CREATE TABLE IF NOT EXISTS user_shards (
      user_id INTEGER,
      general_id INTEGER,
      count INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, general_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(general_id) REFERENCES generals(id)
    );

    CREATE TABLE IF NOT EXISTS equipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT,
      stat_bonus INTEGER,
      stars INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_equipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      equipment_id INTEGER,
      general_id INTEGER,
      level INTEGER DEFAULT 1,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(equipment_id) REFERENCES equipments(id)
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      req_power INTEGER,
      gold_drop INTEGER,
      exp_drop INTEGER,
      can_sweep BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_campaign_progress (
      user_id INTEGER,
      campaign_id INTEGER,
      stars INTEGER,
      PRIMARY KEY (user_id, campaign_id)
    );
  `);

  // Migration: Add skill columns if they don't exist
  try {
      await db.exec("ALTER TABLE generals ADD COLUMN skill_name TEXT");
      await db.exec("ALTER TABLE generals ADD COLUMN skill_desc TEXT");
  } catch (e) {}

  try { await db.exec("ALTER TABLE user_generals ADD COLUMN evolution INTEGER DEFAULT 0"); } catch (e) {}

  // Migration: Clean duplicates for unique index
  try {
      await db.run("DELETE FROM generals WHERE id NOT IN (SELECT MIN(id) FROM generals GROUP BY name)");
      await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_generals_name ON generals(name)");
  } catch (e) {
      console.log("Migration/Index note:", e.message);
  }

  // Raw General Data 
  const rawGenerals = [
      // --- WEI (50) ---
      { name: '曹操', stars: 5, str: 85, int: 96, ldr: 99, luck: 80, country: '魏', description: '乱世枭雄，魏武帝。', keywords: 'Cao Cao, ambitious ruler' },
      { name: '曹丕', stars: 4, str: 70, int: 85, ldr: 80, luck: 70, country: '魏', description: '魏文帝，虽有才略但气量狭小。', keywords: 'Cao Pi, emperor' },
      { name: '曹叡', stars: 4, str: 65, int: 88, ldr: 85, luck: 75, country: '魏', description: '魏明帝，善于权术。', keywords: 'Cao Rui, emperor' },
      { name: '曹植', stars: 3, str: 40, int: 92, ldr: 30, luck: 60, country: '魏', description: '才高八斗，七步成诗。', keywords: 'Cao Zhi, poet' },
      { name: '曹彰', stars: 4, str: 90, int: 40, ldr: 75, luck: 65, country: '魏', description: '黄须儿，勇猛善战。', keywords: 'Cao Zhang, yellow beard warrior' },
      { name: '曹仁', stars: 5, str: 88, int: 75, ldr: 94, luck: 70, country: '魏', description: '天人将军，极其善守。', keywords: 'Cao Ren, heavy armor defense' },
      { name: '曹洪', stars: 4, str: 82, int: 60, ldr: 78, luck: 85, country: '魏', description: '多次舍命救曹操。', keywords: 'Cao Hong, loyal warrior' },
      { name: '曹休', stars: 4, str: 78, int: 65, ldr: 82, luck: 60, country: '魏', description: '千里驹，统领虎豹骑。', keywords: 'Cao Xiu, cavalry commander' },
      { name: '曹真', stars: 4, str: 80, int: 75, ldr: 88, luck: 70, country: '魏', description: '曾大破羌胡，抵御诸葛亮。', keywords: 'Cao Zhen, general' },
      { name: '夏侯惇', stars: 5, str: 92, int: 60, ldr: 88, luck: 70, country: '魏', description: '拔矢啖睛，魏国元老。', keywords: 'Xiahou Dun, eyepatch' },
      { name: '夏侯渊', stars: 5, str: 91, int: 55, ldr: 86, luck: 60, country: '魏', description: '神速将军，擅长奔袭。', keywords: 'Xiahou Yuan, archer' },
      { name: '夏侯霸', stars: 4, str: 85, int: 60, ldr: 75, luck: 50, country: '魏', description: '后投蜀汉，随姜维北伐。', keywords: 'Xiahou Ba, armor' },
      { name: '夏侯尚', stars: 3, str: 75, int: 75, ldr: 80, luck: 60, country: '魏', description: '平定上庸，受曹丕宠信。', keywords: 'Xiahou Shang, general' },
      { name: '张辽', stars: 5, str: 94, int: 82, ldr: 95, luck: 70, country: '魏', description: '威震逍遥津，五子良将之首。', keywords: 'Zhang Liao, dual axes' },
      { name: '张郃', stars: 5, str: 90, int: 78, ldr: 92, luck: 60, country: '魏', description: '巧变善战，诸葛亮所忌惮。', keywords: 'Zhang He, spear' },
      { name: '徐晃', stars: 4, str: 91, int: 70, ldr: 85, luck: 60, country: '魏', description: '治军严整，有周亚夫之风。', keywords: 'Xu Huang, big axe' },
      { name: '于禁', stars: 4, str: 78, int: 72, ldr: 88, luck: 40, country: '魏', description: '毅重，可惜晚节不保。', keywords: 'Yu Jin, solemn general' },
      { name: '乐进', stars: 4, str: 85, int: 50, ldr: 80, luck: 70, country: '魏', description: '骁果，每战先登。', keywords: 'Le Jin, short brave warrior' },
      { name: '李典', stars: 3, str: 75, int: 78, ldr: 75, luck: 70, country: '魏', description: '儒雅长者，深明大义。', keywords: 'Li Dian, scholar general' },
      { name: '典韦', stars: 5, str: 98, int: 30, ldr: 60, luck: 40, country: '魏', description: '古之恶来，双戟无敌。', keywords: 'Dian Wei, giant warrior' },
      { name: '许褚', stars: 5, str: 97, int: 35, ldr: 65, luck: 60, country: '魏', description: '虎痴，裸衣战马超。', keywords: 'Xu Chu, shirtless warrior' },
      { name: '文聘', stars: 4, str: 82, int: 65, ldr: 85, luck: 70, country: '魏', description: '镇守江夏数十年，威震敌国。', keywords: 'Wen Pin, general' },
      { name: '庞德', stars: 4, str: 93, int: 60, ldr: 80, luck: 30, country: '魏', description: '抬棺决战，宁死不降。', keywords: 'Pang De, white horse' },
      { name: '臧霸', stars: 3, str: 80, int: 60, ldr: 75, luck: 70, country: '魏', description: '泰山群寇首领，镇守青徐。', keywords: 'Zang Ba, bandit leader' },
      { name: '孙礼', stars: 3, str: 80, int: 65, ldr: 70, luck: 60, country: '魏', description: '刚正不阿，曾搏虎救主。', keywords: 'Sun Li, tiger fighter' },
      { name: '郭淮', stars: 4, str: 78, int: 82, ldr: 88, luck: 75, country: '魏', description: '御蜀屏障，善于谋划。', keywords: 'Guo Huai, strategist general' },
      { name: '郝昭', stars: 4, str: 80, int: 85, ldr: 90, luck: 70, country: '魏', description: '陈仓坚守，力退诸葛亮。', keywords: 'Hao Zhao, defender' },
      { name: '王双', stars: 3, str: 88, int: 20, ldr: 60, luck: 40, country: '魏', description: '身长九尺，使得六十斤大刀。', keywords: 'Wang Shuang, meteor hammer' },
      { name: '诸葛诞', stars: 3, str: 70, int: 75, ldr: 80, luck: 40, country: '魏', description: '功狗，淮南三叛之一。', keywords: 'Zhuge Dan, rebel' },
      { name: '钟会', stars: 5, str: 60, int: 94, ldr: 90, luck: 30, country: '魏', description: '精练策数，灭蜀主将。', keywords: 'Zhong Hui, ambitious strategist' },
      { name: '邓艾', stars: 5, str: 85, int: 92, ldr: 93, luck: 50, country: '魏', description: '偷渡阴平，灭蜀第一功。', keywords: 'Deng Ai, map strategist' },
      { name: '陈泰', stars: 4, str: 75, int: 86, ldr: 85, luck: 70, country: '魏', description: '陈群之子，弘雅有智。', keywords: 'Chen Tai, noble general' },
      { name: '司马懿', stars: 5, str: 70, int: 99, ldr: 97, luck: 90, country: '魏', description: '鹰视狼顾，三国终结者。', keywords: 'Sima Yi, dark strategist' },
      { name: '司马师', stars: 4, str: 75, int: 90, ldr: 88, luck: 70, country: '魏', description: '沉稳坚毅，平定叛乱。', keywords: 'Sima Shi, eye injury' },
      { name: '司马昭', stars: 4, str: 70, int: 92, ldr: 85, luck: 80, country: '魏', description: '司马昭之心，路人皆知。', keywords: 'Sima Zhao, ruler' },
      { name: '羊祜', stars: 5, str: 65, int: 90, ldr: 92, luck: 85, country: '魏', description: '德才兼备，伐吴奠基人。', keywords: 'Yang Hu, gentle commander' },
      { name: '杜预', stars: 4, str: 50, int: 88, ldr: 90, luck: 80, country: '魏', description: '武库，势如破竹。', keywords: 'Du Yu, scholar general' },
      { name: '王濬', stars: 4, str: 75, int: 80, ldr: 85, luck: 70, country: '魏', description: '楼船破吴，水军都督。', keywords: 'Wang Jun, naval commander' },
      { name: '贾逵', stars: 3, str: 65, int: 82, ldr: 75, luck: 60, country: '魏', description: '豫州刺史，据守有功。', keywords: 'Jia Kui, official' },
      { name: '满宠', stars: 4, str: 70, int: 88, ldr: 85, luck: 75, country: '魏', description: '征东将军，屡抗东吴。', keywords: 'Man Chong, defender' },
      { name: '田豫', stars: 4, str: 75, int: 80, ldr: 85, luck: 70, country: '魏', description: '威震北疆，讨伐乌丸。', keywords: 'Tian Yu, border general' },
      { name: '牵招', stars: 3, str: 75, int: 78, ldr: 80, luck: 65, country: '魏', description: '北疆名将，与田豫齐名。', keywords: 'Qian Zhao, general' },
      { name: '秦朗', stars: 3, str: 70, int: 65, ldr: 70, luck: 60, country: '魏', description: '曹操养子，低调稳重。', keywords: 'Qin Lang, general' },
      { name: '夏侯威', stars: 3, str: 70, int: 60, ldr: 65, luck: 50, country: '魏', description: '夏侯渊次子。', keywords: 'Xiahou Wei, young general' },
      { name: '夏侯惠', stars: 3, str: 50, int: 75, ldr: 60, luck: 50, country: '魏', description: '善属文。', keywords: 'Xiahou Hui, official' },
      { name: '曹爽', stars: 3, str: 60, int: 50, ldr: 60, luck: 20, country: '魏', description: '虽身居高位，却无才能。', keywords: 'Cao Shuang, noble' },
      { name: '桓范', stars: 3, str: 40, int: 85, ldr: 50, luck: 30, country: '魏', description: '智囊，可惜不被采纳。', keywords: 'Huan Fan, advisor' },
      { name: '韩德', stars: 2, str: 75, int: 40, ldr: 60, luck: 20, country: '魏', description: '西凉猛将，被赵云灭门。', keywords: 'Han De, axe' },
      { name: '夏侯楙', stars: 1, str: 40, int: 30, ldr: 40, luck: 80, country: '魏', description: '无能驸马。', keywords: 'Xiahou Mao, noble' },
      { name: '王凌', stars: 3, str: 65, int: 75, ldr: 75, luck: 40, country: '魏', description: '淮南一叛首领。', keywords: 'Wang Ling, old general' },

      // --- SHU (50) ---
      { name: '刘备', stars: 5, str: 80, int: 85, ldr: 90, luck: 95, country: '蜀', description: '汉昭烈帝，仁德之君。', keywords: 'Liu Bei, benevolent ruler' },
      { name: '刘禅', stars: 2, str: 20, int: 30, ldr: 40, luck: 90, country: '蜀', description: '后主，乐不思蜀。', keywords: 'Liu Shan, fat ruler' },
      { name: '关羽', stars: 5, str: 98, int: 75, ldr: 95, luck: 60, country: '蜀', description: '武圣，过五关斩六将。', keywords: 'Guan Yu, green dragon blade' },
      { name: '张飞', stars: 5, str: 99, int: 40, ldr: 85, luck: 60, country: '蜀', description: '万人敌，长坂坡一声吼。', keywords: 'Zhang Fei, serpent spear' },
      { name: '赵云', stars: 5, str: 96, int: 80, ldr: 88, luck: 90, country: '蜀', description: '浑身是胆，常胜将军。', keywords: 'Zhao Yun, silver armor spear' },
      { name: '马超', stars: 5, str: 97, int: 50, ldr: 88, luck: 50, country: '蜀', description: '锦马超，神威天将军。', keywords: 'Ma Chao, lion helmet' },
      { name: '黄忠', stars: 5, str: 93, int: 60, ldr: 85, luck: 70, country: '蜀', description: '老当益壮，定军山斩夏侯渊。', keywords: 'Huang Zhong, archer' },
      { name: '诸葛亮', stars: 5, str: 40, int: 100, ldr: 98, luck: 80, country: '蜀', description: '卧龙，千古名相。', keywords: 'Zhuge Liang, feather fan' },
      { name: '庞统', stars: 5, str: 40, int: 98, ldr: 85, luck: 40, country: '蜀', description: '凤雏，可惜落凤坡早逝。', keywords: 'Pang Tong, ugly genius' },
      { name: '法正', stars: 4, str: 40, int: 96, ldr: 80, luck: 60, country: '蜀', description: '蜀之谋主，定军山策划者。', keywords: 'Fa Zheng, schemer' },
      { name: '魏延', stars: 4, str: 92, int: 70, ldr: 85, luck: 40, country: '蜀', description: '作战勇猛，子午谷奇谋。', keywords: 'Wei Yan, red face mask' },
      { name: '姜维', stars: 5, str: 90, int: 90, ldr: 92, luck: 50, country: '蜀', description: '天水麒麟儿，九伐中原。', keywords: 'Jiang Wei, spear and book' },
      { name: '马岱', stars: 3, str: 82, int: 60, ldr: 75, luck: 70, country: '蜀', description: '斩杀魏延。', keywords: 'Ma Dai, assassin' },
      { name: '王平', stars: 4, str: 80, int: 75, ldr: 88, luck: 70, country: '蜀', description: '无当飞军统帅，稳重识大体。', keywords: 'Wang Ping, shield' },
      { name: '李严', stars: 3, str: 70, int: 80, ldr: 80, luck: 50, country: '蜀', description: '托孤大臣，因运粮不力被废。', keywords: 'Li Yan, official' },
      { name: '刘封', stars: 3, str: 85, int: 50, ldr: 70, luck: 30, country: '蜀', description: '刘备养子，勇猛刚烈。', keywords: 'Liu Feng, warrior' },
      { name: '关平', stars: 4, str: 85, int: 65, ldr: 78, luck: 60, country: '蜀', description: '关羽义子，随父殉难。', keywords: 'Guan Ping, young warrior' },
      { name: '关兴', stars: 3, str: 86, int: 60, ldr: 75, luck: 60, country: '蜀', description: '继承武圣之风。', keywords: 'Guan Xing, young warrior' },
      { name: '张苞', stars: 3, str: 87, int: 40, ldr: 70, luck: 50, country: '蜀', description: '张飞之子，勇猛似父。', keywords: 'Zhang Bao, snake spear' },
      { name: '周仓', stars: 3, str: 85, int: 30, ldr: 60, luck: 60, country: '蜀', description: '为关羽扛刀的猛将。', keywords: 'Zhou Cang, bearer' },
      { name: '廖化', stars: 3, str: 78, int: 65, ldr: 75, luck: 90, country: '蜀', description: '蜀中无大将，廖化作先锋。', keywords: 'Liao Hua, veteran' },
      { name: '张翼', stars: 3, str: 75, int: 70, ldr: 78, luck: 70, country: '蜀', description: '亢直，不主张北伐。', keywords: 'Zhang Yi, defender' },
      { name: '张嶷', stars: 4, str: 78, int: 75, ldr: 82, luck: 60, country: '蜀', description: '平定南中，无当飞军名将。', keywords: 'Zhang Ni, tribal armor' },
      { name: '吴懿', stars: 3, str: 75, int: 70, ldr: 80, luck: 80, country: '蜀', description: '蜀汉外戚，车骑将军。', keywords: 'Wu Yi, general' },
      { name: '吴班', stars: 3, str: 72, int: 60, ldr: 75, luck: 60, country: '蜀', description: '豪爽，随刘备伐吴。', keywords: 'Wu Ban, general' },
      { name: '陈到', stars: 4, str: 85, int: 60, ldr: 82, luck: 70, country: '蜀', description: '统领白毦兵，仅次于赵云。', keywords: 'Chen Dao, elite guard' },
      { name: '霍峻', stars: 4, str: 70, int: 75, ldr: 85, luck: 70, country: '蜀', description: '以数百人坚守葭萌关。', keywords: 'Huo Jun, tower defender' },
      { name: '霍弋', stars: 3, str: 70, int: 75, ldr: 80, luck: 70, country: '蜀', description: '镇守南中，忠心不二。', keywords: 'Huo Yi, general' },
      { name: '傅肜', stars: 3, str: 75, int: 50, ldr: 70, luck: 20, country: '蜀', description: '夷陵断后，壮烈战死。', keywords: 'Fu Tong, spear' },
      { name: '傅佥', stars: 3, str: 80, int: 60, ldr: 75, luck: 30, country: '蜀', description: '继承父志，死战不退。', keywords: 'Fu Qian, young hero' },
      { name: '冯习', stars: 2, str: 70, int: 50, ldr: 65, luck: 20, country: '蜀', description: '夷陵之战蜀军大都督。', keywords: 'Feng Xi, general' },
      { name: '张南', stars: 2, str: 70, int: 50, ldr: 65, luck: 20, country: '蜀', description: '夷陵之战先锋。', keywords: 'Zhang Nan, general' },
      { name: '黄权', stars: 4, str: 60, int: 85, ldr: 80, luck: 60, country: '蜀', description: '良谋，被迫降魏。', keywords: 'Huang Quan, official' },
      { name: '李恢', stars: 3, str: 65, int: 80, ldr: 75, luck: 70, country: '蜀', description: '说降马超，平定南中。', keywords: 'Li Hui, diplomat' },
      { name: '马忠', stars: 3, str: 70, int: 70, ldr: 80, luck: 80, country: '蜀', description: '镇守南中，威恩并施。', keywords: 'Ma Zhong, general' },
      { name: '邓芝', stars: 3, str: 60, int: 85, ldr: 75, luck: 80, country: '蜀', description: '出使东吴，不辱使命。', keywords: 'Deng Zhi, diplomat' },
      { name: '向宠', stars: 3, str: 65, int: 70, ldr: 75, luck: 70, country: '蜀', description: '性行淑均，晓畅军事。', keywords: 'Xiang Chong, general' },
      { name: '赵统', stars: 2, str: 70, int: 50, ldr: 60, luck: 60, country: '蜀', description: '赵云长子。', keywords: 'Zhao Tong, general' },
      { name: '赵广', stars: 2, str: 75, int: 40, ldr: 60, luck: 30, country: '蜀', description: '赵云次子，战死沙场。', keywords: 'Zhao Guang, warrior' },
      { name: '高翔', stars: 2, str: 65, int: 50, ldr: 65, luck: 50, country: '蜀', description: '参与北伐，屯兵列柳城。', keywords: 'Gao Xiang, general' },
      { name: '辅匡', stars: 2, str: 65, int: 50, ldr: 65, luck: 50, country: '蜀', description: '蜀中宿将。', keywords: 'Fu Kuang, old general' },
      { name: '刘琰', stars: 2, str: 40, int: 60, ldr: 40, luck: 40, country: '蜀', description: '位高权轻，善于交际。', keywords: 'Liu Yan, official' },
      { name: '糜竺', stars: 3, str: 30, int: 75, ldr: 40, luck: 90, country: '蜀', description: '雍容大方，倾家助主。', keywords: 'Mi Zhu, merchant' },
      { name: '糜芳', stars: 2, str: 60, int: 40, ldr: 50, luck: 20, country: '蜀', description: '背叛关羽，投降东吴。', keywords: 'Mi Fang, traitor' },
      { name: '士仁', stars: 2, str: 60, int: 40, ldr: 50, luck: 20, country: '蜀', description: '与糜芳一同投降。', keywords: 'Shi Ren, traitor' },
      { name: '孟达', stars: 3, str: 75, int: 75, ldr: 70, luck: 30, country: '蜀', description: '反复无常，降魏复叛。', keywords: 'Meng Da, general' },
      { name: '严颜', stars: 3, str: 85, int: 60, ldr: 75, luck: 60, country: '蜀', description: '断头将军，老当益壮。', keywords: 'Yan Yan, old warrior' },
      { name: '罗宪', stars: 4, str: 75, int: 80, ldr: 88, luck: 70, country: '蜀', description: '蜀亡后坚守永安抗吴。', keywords: 'Luo Xian, defender' },
      { name: '诸葛尚', stars: 3, str: 80, int: 60, ldr: 60, luck: 20, country: '蜀', description: '诸葛亮之孙，绵竹战死。', keywords: 'Zhuge Shang, young hero' },

      // --- WU (50) ---
      { name: '孙坚', stars: 5, str: 94, int: 75, ldr: 93, luck: 40, country: '吴', description: '江东猛虎，武烈皇帝。', keywords: 'Sun Jian, red turban' },
      { name: '孙策', stars: 5, str: 95, int: 70, ldr: 96, luck: 40, country: '吴', description: '小霸王，平定江东。', keywords: 'Sun Ce, spear' },
      { name: '孙权', stars: 5, str: 75, int: 85, ldr: 95, luck: 90, country: '吴', description: '碧眼儿，善于用人。', keywords: 'Sun Quan, green eyes' },
      { name: '周瑜', stars: 5, str: 70, int: 98, ldr: 96, luck: 70, country: '吴', description: '美周郎，赤壁一把火。', keywords: 'Zhou Yu, guqin' },
      { name: '鲁肃', stars: 5, str: 50, int: 94, ldr: 90, luck: 80, country: '吴', description: '榻上策，联刘抗曹。', keywords: 'Lu Su, diplomat' },
      { name: '吕蒙', stars: 5, str: 80, int: 90, ldr: 94, luck: 60, country: '吴', description: '白衣渡江，士别三日。', keywords: 'Lu Meng, white cloak' },
      { name: '陆逊', stars: 5, str: 65, int: 97, ldr: 98, luck: 80, country: '吴', description: '书生拜帅，火烧连营。', keywords: 'Lu Xun, young strategist' },
      { name: '陆抗', stars: 5, str: 70, int: 92, ldr: 95, luck: 80, country: '吴', description: '东吴最后的长城。', keywords: 'Lu Kang, defender' },
      { name: '张昭', stars: 4, str: 20, int: 90, ldr: 60, luck: 80, country: '吴', description: '内事不决问张昭。', keywords: 'Zhang Zhao, old official' },
      { name: '程普', stars: 4, str: 82, int: 70, ldr: 85, luck: 70, country: '吴', description: '三代元老，德高望重。', keywords: 'Cheng Pu, iron spine snake spear' },
      { name: '黄盖', stars: 4, str: 83, int: 65, ldr: 80, luck: 70, country: '吴', description: '苦肉计，赤壁先锋。', keywords: 'Huang Gai, iron whip' },
      { name: '韩当', stars: 3, str: 80, int: 60, ldr: 75, luck: 70, country: '吴', description: '擅长骑射，江表虎臣。', keywords: 'Han Dang, bow' },
      { name: '蒋钦', stars: 3, str: 82, int: 65, ldr: 78, luck: 60, country: '吴', description: '贵守约，性清约。', keywords: 'Jiang Qin, general' },
      { name: '周泰', stars: 4, str: 90, int: 40, ldr: 70, luck: 80, country: '吴', description: '身被十二创，忠勇护主。', keywords: 'Zhou Tai, scars' },
      { name: '陈武', stars: 3, str: 85, int: 40, ldr: 70, luck: 30, country: '吴', description: '庐江上甲，合肥战死。', keywords: 'Chen Wu, warrior' },
      { name: '董袭', stars: 3, str: 84, int: 40, ldr: 65, luck: 30, country: '吴', description: '讨伐山越，淹死于濡须。', keywords: 'Dong Xi, warrior' },
      { name: '甘宁', stars: 5, str: 94, int: 60, ldr: 88, luck: 50, country: '吴', description: '锦帆贼，百骑劫魏营。', keywords: 'Gan Ning, feather, bells' },
      { name: '凌统', stars: 4, str: 88, int: 60, ldr: 80, luck: 60, country: '吴', description: '国士之风，与甘宁和解。', keywords: 'Ling Tong, dual swords' },
      { name: '徐盛', stars: 4, str: 85, int: 75, ldr: 86, luck: 70, country: '吴', description: '疑兵之计，大破曹丕。', keywords: 'Xu Sheng, wall defender' },
      { name: '潘璋', stars: 3, str: 80, int: 60, ldr: 75, luck: 70, country: '吴', description: '擒获关羽，性奢靡。', keywords: 'Pan Zhang, hook' },
      { name: '丁奉', stars: 4, str: 82, int: 70, ldr: 85, luck: 80, country: '吴', description: '雪中奋短兵，东吴后期名将。', keywords: 'Ding Feng, snow' },
      { name: '朱治', stars: 3, str: 65, int: 75, ldr: 80, luck: 80, country: '吴', description: '举荐孙权，元老旧臣。', keywords: 'Zhu Zhi, official' },
      { name: '朱然', stars: 4, str: 75, int: 75, ldr: 88, luck: 80, country: '吴', description: '威震敌国，坚守江陵。', keywords: 'Zhu Ran, defender' },
      { name: '吕范', stars: 3, str: 60, int: 80, ldr: 80, luck: 70, country: '吴', description: '如亲戚待，后勤总管。', keywords: 'Lu Fan, official' },
      { name: '太史慈', stars: 5, str: 93, int: 65, ldr: 85, luck: 40, country: '吴', description: '神射手，信义笃烈。', keywords: 'Taishi Ci, dual halberds' },
      { name: '贺齐', stars: 3, str: 80, int: 70, ldr: 85, luck: 70, country: '吴', description: '平定山越，喜好华丽。', keywords: 'He Qi, colorful armor' },
      { name: '全琮', stars: 3, str: 75, int: 70, ldr: 80, luck: 70, country: '吴', description: '孙权女婿，右大司马。', keywords: 'Quan Cong, noble' },
      { name: '朱桓', stars: 4, str: 85, int: 75, ldr: 85, luck: 60, country: '吴', description: '胆略过人，性格高傲。', keywords: 'Zhu Huan, spear' },
      { name: '步骘', stars: 3, str: 60, int: 85, ldr: 80, luck: 70, country: '吴', description: '平定交州，宽弘大度。', keywords: 'Bu Zhi, scholar' },
      { name: '虞翻', stars: 3, str: 60, int: 88, ldr: 50, luck: 40, country: '吴', description: '狂直，精通易经。', keywords: 'Yu Fan, scholar' },
      { name: '诸葛瑾', stars: 3, str: 60, int: 85, ldr: 80, luck: 80, country: '吴', description: '诸葛亮之兄，温厚诚信。', keywords: 'Zhuge Jin, donkey' },
      { name: '诸葛恪', stars: 4, str: 60, int: 90, ldr: 85, luck: 20, country: '吴', description: '才气干略，刚愎自用。', keywords: 'Zhuge Ke, arrogant' },
      { name: '顾雍', stars: 3, str: 30, int: 88, ldr: 70, luck: 80, country: '吴', description: '丞相，沉默寡言。', keywords: 'Gu Yong, official' },
      { name: '张纮', stars: 3, str: 20, int: 92, ldr: 50, luck: 70, country: '吴', description: '二张之一，战略规划。', keywords: 'Zhang Hong, scholar' },
      { name: '阚泽', stars: 3, str: 30, int: 85, ldr: 40, luck: 60, country: '吴', description: '献诈降书，博学多才。', keywords: 'Kan Ze, scholar' },
      { name: '孙桓', stars: 3, str: 80, int: 70, ldr: 80, luck: 60, country: '吴', description: '宗室名将，围困关羽。', keywords: 'Sun Huan, young general' },
      { name: '孙韶', stars: 3, str: 80, int: 60, ldr: 75, luck: 70, country: '吴', description: '镇守边疆，善于侦察。', keywords: 'Sun Shao, scout' },
      { name: '孙静', stars: 2, str: 60, int: 70, ldr: 60, luck: 80, country: '吴', description: '孙坚之弟。', keywords: 'Sun Jing, old official' },
      { name: '孙瑜', stars: 3, str: 70, int: 75, ldr: 75, luck: 60, country: '吴', description: '好学不倦。', keywords: 'Sun Yu, scholar warrior' },
      { name: '孙皎', stars: 3, str: 75, int: 65, ldr: 75, luck: 60, country: '吴', description: '轻财好施。', keywords: 'Sun Jiao, general' },
      { name: '吕岱', stars: 3, str: 70, int: 75, ldr: 85, luck: 90, country: '吴', description: '高寿，清忠奉公。', keywords: 'Lu Dai, old general' },
      { name: '周鲂', stars: 3, str: 50, int: 85, ldr: 70, luck: 70, country: '吴', description: '断发诱敌。', keywords: 'Zhou Fang, hair cut' },
      { name: '钟离牧', stars: 3, str: 65, int: 70, ldr: 75, luck: 60, country: '吴', description: '不避矢石，亲自种稻。', keywords: 'Zhongli Mu, farmer general' },
      { name: '留赞', stars: 3, str: 85, int: 40, ldr: 75, luck: 30, country: '吴', description: '临战必歌，白发苍苍。', keywords: 'Liu Zan, singing general' },
      { name: '唐咨', stars: 2, str: 70, int: 50, ldr: 65, luck: 50, country: '吴', description: '魏降将，善造船。', keywords: 'Tang Zi, engineer' },
      { name: '文鸯', stars: 5, str: 96, int: 50, ldr: 80, luck: 40, country: '吴', description: '勇力绝人，单骑退雄兵。', keywords: 'Wen Yang, steel whip' },
      { name: '祖郎', stars: 2, str: 75, int: 30, ldr: 60, luck: 50, country: '吴', description: '山越首领，归降孙策。', keywords: 'Zu Lang, bandit' },
      { name: '孙亮', stars: 1, str: 20, int: 60, ldr: 30, luck: 20, country: '吴', description: '被废之君。', keywords: 'Sun Liang, young emperor' },
      { name: '孙休', stars: 2, str: 30, int: 70, ldr: 50, luck: 60, country: '吴', description: '除掉权臣孙綝。', keywords: 'Sun Xiu, emperor' },
      { name: '孙皓', stars: 2, str: 50, int: 40, ldr: 40, luck: 10, country: '吴', description: '暴君，亡国之主。', keywords: 'Sun Hao, tyrant' },

      // --- QUN (Other) (50) ---
      { name: '吕布', stars: 5, str: 100, int: 30, ldr: 85, luck: 20, country: '群', description: '人中吕布，马中赤兔。', keywords: 'Lu Bu, pheasant tail, halberd' },
      { name: '董卓', stars: 4, str: 85, int: 70, ldr: 90, luck: 10, country: '群', description: '西凉军阀，暴虐无道。', keywords: 'Dong Zhuo, fat tyrant' },
      { name: '袁绍', stars: 4, str: 70, int: 75, ldr: 90, luck: 40, country: '群', description: '四世三公，外宽内忌。', keywords: 'Yuan Shao, golden armor' },
      { name: '袁术', stars: 3, str: 60, int: 60, ldr: 70, luck: 20, country: '群', description: '冢中枯骨，僭号称帝。', keywords: 'Yuan Shu, skeleton throne' },
      { name: '公孙瓒', stars: 4, str: 85, int: 60, ldr: 85, luck: 30, country: '群', description: '白马将军，威震塞外。', keywords: 'Gongsun Zan, white horse' },
      { name: '马腾', stars: 3, str: 80, int: 50, ldr: 80, luck: 40, country: '群', description: '伏波将军之后，西凉军阀。', keywords: 'Ma Teng, western warrior' },
      { name: '韩遂', stars: 3, str: 70, int: 80, ldr: 80, luck: 50, country: '群', description: '九曲黄河，割据西凉。', keywords: 'Han Sui, strategist' },
      { name: '张鲁', stars: 3, str: 50, int: 70, ldr: 80, luck: 60, country: '群', description: '五斗米道师君，割据汉中。', keywords: 'Zhang Lu, taoist' },
      { name: '张绣', stars: 3, str: 80, int: 60, ldr: 75, luck: 50, country: '群', description: '北地枪王，宛城战曹操。', keywords: 'Zhang Xiu, spear' },
      { name: '刘表', stars: 3, str: 40, int: 80, ldr: 80, luck: 60, country: '群', description: '八俊之一，坐谈客。', keywords: 'Liu Biao, scholar' },
      { name: '刘璋', stars: 2, str: 30, int: 50, ldr: 60, luck: 40, country: '群', description: '暗弱，引狼入室。', keywords: 'Liu Zhang, weak ruler' },
      { name: '陶谦', stars: 2, str: 30, int: 70, ldr: 60, luck: 50, country: '群', description: '三让徐州。', keywords: 'Tao Qian, old man' },
      { name: '孔融', stars: 3, str: 20, int: 85, ldr: 50, luck: 20, country: '群', description: '孔子之后，刚正不阿。', keywords: 'Kong Rong, scholar' },
      { name: '王允', stars: 3, str: 30, int: 90, ldr: 70, luck: 20, country: '群', description: '连环计，诛董卓。', keywords: 'Wang Yun, minister' },
      { name: '何进', stars: 2, str: 40, int: 30, ldr: 70, luck: 10, country: '群', description: '屠户大将军，引狼入室。', keywords: 'He Jin, butcher' },
      { name: '卢植', stars: 4, str: 70, int: 90, ldr: 92, luck: 50, country: '群', description: '海内人望，文武双全。', keywords: 'Lu Zhi, teacher' },
      { name: '皇甫嵩', stars: 4, str: 80, int: 85, ldr: 94, luck: 60, country: '群', description: '平定黄巾，一代名将。', keywords: 'Huangfu Song, general' },
      { name: '朱儁', stars: 4, str: 82, int: 80, ldr: 90, luck: 50, country: '群', description: '坚守孤城，平定黄巾。', keywords: 'Zhu Jun, general' },
      { name: '丁原', stars: 2, str: 60, int: 50, ldr: 60, luck: 10, country: '群', description: '吕布义父。', keywords: 'Ding Yuan, old general' },
      { name: '华雄', stars: 4, str: 92, int: 40, ldr: 75, luck: 10, country: '群', description: '董卓骁将，温酒斩华雄。', keywords: 'Hua Xiong, fierce face' },
      { name: '李傕', stars: 3, str: 75, int: 60, ldr: 75, luck: 40, country: '群', description: '董卓部将，祸乱长安。', keywords: 'Li Jue, villain' },
      { name: '郭汜', stars: 3, str: 75, int: 50, ldr: 70, luck: 40, country: '群', description: '董卓部将，互相攻杀。', keywords: 'Guo Si, villain' },
      { name: '樊稠', stars: 2, str: 70, int: 30, ldr: 60, luck: 20, country: '群', description: '董卓部将，被李傕所杀。', keywords: 'Fan Chou, warrior' },
      { name: '张济', stars: 2, str: 65, int: 50, ldr: 65, luck: 30, country: '群', description: '董卓部将，战死。', keywords: 'Zhang Ji, warrior' },
      { name: '牛辅', stars: 2, str: 60, int: 40, ldr: 50, luck: 10, country: '群', description: '董卓女婿，怯懦。', keywords: 'Niu Fu, coward' },
      { name: '颜良', stars: 4, str: 94, int: 40, ldr: 80, luck: 10, country: '群', description: '河北四庭柱，勇冠三军。', keywords: 'Yan Liang, tiger armor' },
      { name: '文丑', stars: 4, str: 93, int: 40, ldr: 80, luck: 10, country: '群', description: '河北四庭柱，战延津。', keywords: 'Wen Chou, monster mask' },
      { name: '高览', stars: 3, str: 85, int: 60, ldr: 75, luck: 50, country: '群', description: '河北四庭柱，后降曹。', keywords: 'Gao Lan, heavy armor' },
      { name: '淳于琼', stars: 2, str: 65, int: 40, ldr: 60, luck: 10, country: '群', description: '乌巢酒徒。', keywords: 'Chunyu Qiong, drunk' },
      { name: '审配', stars: 3, str: 50, int: 80, ldr: 75, luck: 30, country: '群', description: '忠烈之士，死守邺城。', keywords: 'Shen Pei, official' },
      { name: '麴义', stars: 4, str: 85, int: 60, ldr: 85, luck: 10, country: '群', description: '先登死士，大破白马义从。', keywords: 'Qu Yi, shield crossbow' },
      { name: '纪灵', stars: 3, str: 82, int: 50, ldr: 75, luck: 40, country: '群', description: '三尖两刃刀。', keywords: 'Ji Ling, trident' },
      { name: '桥蕤', stars: 2, str: 60, int: 50, ldr: 60, luck: 20, country: '群', description: '袁术大将，战死。', keywords: 'Qiao Rui, warrior' },
      { name: '张勋', stars: 2, str: 60, int: 40, ldr: 65, luck: 30, country: '群', description: '袁术大将。', keywords: 'Zhang Xun, general' },
      { name: '刘繇', stars: 2, str: 40, int: 60, ldr: 50, luck: 30, country: '群', description: '扬州牧，被孙策击败。', keywords: 'Liu Yao, official' },
      { name: '严白虎', stars: 2, str: 65, int: 30, ldr: 50, luck: 20, country: '群', description: '东吴德王，山贼出身。', keywords: 'Yan Baihu, tiger skin' },
      { name: '笮融', stars: 2, str: 50, int: 40, ldr: 40, luck: 10, country: '群', description: '残酷的佛教徒。', keywords: 'Ze Rong, monk warrior' },
      { name: '蔡瑁', stars: 3, str: 60, int: 70, ldr: 75, luck: 50, country: '群', description: '水军都督，降曹。', keywords: 'Cai Mao, naval officer' },
      { name: '张允', stars: 2, str: 55, int: 60, ldr: 70, luck: 50, country: '群', description: '蔡瑁之党。', keywords: 'Zhang Yun, naval officer' },
      { name: '黄祖', stars: 3, str: 65, int: 60, ldr: 70, luck: 40, country: '群', description: '射杀孙坚，坚守江夏。', keywords: 'Huang Zu, archer leader' },
      { name: '庞羲', stars: 2, str: 50, int: 60, ldr: 60, luck: 50, country: '群', description: '刘璋亲家。', keywords: 'Pang Xi, official' },
      { name: '张任', stars: 4, str: 85, int: 70, ldr: 85, luck: 20, country: '群', description: '落凤坡射死庞统，忠勇不屈。', keywords: 'Zhang Ren, ambush' },
      { name: '李异', stars: 2, str: 70, int: 40, ldr: 60, luck: 30, country: '群', description: '被赵云击败。', keywords: 'Li Yi, golden axe' },
      { name: '刘璝', stars: 2, str: 65, int: 50, ldr: 65, luck: 30, country: '群', description: '刘璋部将。', keywords: 'Liu Gui, defender' },
      { name: '泠苞', stars: 2, str: 70, int: 50, ldr: 65, luck: 30, country: '群', description: '决堤水淹刘备。', keywords: 'Ling Bao, water warrior' },
      { name: '邓贤', stars: 2, str: 65, int: 50, ldr: 60, luck: 30, country: '群', description: '刘璋部将。', keywords: 'Deng Xian, general' },
      { name: '公孙度', stars: 3, str: 60, int: 70, ldr: 80, luck: 60, country: '群', description: '辽东王。', keywords: 'Gongsun Du, king' },
      { name: '高顺', stars: 4, str: 88, int: 50, ldr: 90, luck: 10, country: '群', description: '陷阵营统帅，忠贞不二。', keywords: 'Gao Shun, heavy shield' },
      { name: '陈宫', stars: 4, str: 30, int: 92, ldr: 70, luck: 10, country: '群', description: '刚直烈士，吕布谋主。', keywords: 'Chen Gong, scroll' },
      { name: '貂蝉', stars: 5, str: 20, int: 80, ldr: 60, luck: 90, country: '群', description: '闭月羞花，连环计。', keywords: 'Diao Chan, dancer' }
  ];

  console.log('Seeding/Updating Generals with Skills...');
  for (const g of rawGenerals) {
    // Get Avatar (Local or AI)
    const avatarUrl = getAvatarUrl(g.name, g.stars, g.country, g.keywords);
    
    // Determine Skill
    let skill = SKILL_MAP[g.name];
    if (!skill) {
        skill = getDefaultSkill(g.str, g.int, g.ldr);
    }

    const existing = await db.get('SELECT id FROM generals WHERE name = ?', [g.name]);
    
    if (existing) {
        await db.run(
            `UPDATE generals SET 
                stars = ?, str = ?, int = ?, ldr = ?, luck = ?, 
                country = ?, avatar = ?, description = ?,
                skill_name = ?, skill_desc = ?
             WHERE id = ?`,
            [g.stars, g.str, g.int, g.ldr, g.luck, g.country, avatarUrl, g.description, skill.name, skill.desc, existing.id]
        );
    } else {
        await db.run(
            `INSERT INTO generals (name, stars, str, int, ldr, luck, country, avatar, description, skill_name, skill_desc) 
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [g.name, g.stars, g.str, g.int, g.ldr, g.luck, g.country, avatarUrl, g.description, skill.name, skill.desc]
        );
    }
  }

  // Seed Campaigns & Equipment (Only if table is empty)
  const campCount = await db.get('SELECT count(*) as c FROM campaigns');
  if (campCount.c === 0) {
    const campaigns = [
      { name: '黄巾之乱', req_power: 100, gold: 100, exp: 50 },
      { name: '虎牢关之战', req_power: 500, gold: 300, exp: 150 },
      { name: '官渡之战', req_power: 1500, gold: 800, exp: 400 },
      { name: '赤壁之战', req_power: 3000, gold: 2000, exp: 1000 },
      { name: '汉中之战', req_power: 5000, gold: 4000, exp: 2000 },
      { name: '夷陵之战', req_power: 8000, gold: 6000, exp: 3000 },
      { name: '五丈原', req_power: 12000, gold: 10000, exp: 5000 },
    ];
    for (const c of campaigns) {
      await db.run(
        `INSERT INTO campaigns (name, req_power, gold_drop, exp_drop) VALUES (?,?,?,?)`,
        [c.name, c.req_power, c.gold, c.exp]
      );
    }
    
    const equipments = [
        { name: '青龙偃月刀', type: 'weapon', stat_bonus: 50, stars: 5 },
        { name: '丈八蛇矛', type: 'weapon', stat_bonus: 48, stars: 5 },
        { name: '倚天剑', type: 'weapon', stat_bonus: 45, stars: 5 },
        { name: '青釭剑', type: 'weapon', stat_bonus: 45, stars: 5 },
        { name: '方天画戟', type: 'weapon', stat_bonus: 55, stars: 5 },
        { name: '雌雄双股剑', type: 'weapon', stat_bonus: 40, stars: 5 },
        { name: '古锭刀', type: 'weapon', stat_bonus: 28, stars: 4 },
        { name: '烂银枪', type: 'weapon', stat_bonus: 30, stars: 4 },
        { name: '铁脊蛇矛', type: 'weapon', stat_bonus: 20, stars: 3 },
        { name: '大斧', type: 'weapon', stat_bonus: 15, stars: 3 },
        { name: '铁剑', type: 'weapon', stat_bonus: 10, stars: 2 },
        
        { name: '兽面吞头铠', type: 'armor', stat_bonus: 40, stars: 5 },
        { name: '八卦袍', type: 'armor', stat_bonus: 35, stars: 5 },
        { name: '明光铠', type: 'armor', stat_bonus: 35, stars: 4 },
        { name: '锁子甲', type: 'armor', stat_bonus: 20, stars: 3 },
        { name: '皮甲', type: 'armor', stat_bonus: 10, stars: 2 },

        { name: '赤兔马', type: 'treasure', stat_bonus: 40, stars: 5 },
        { name: '的卢', type: 'treasure', stat_bonus: 35, stars: 4 },
        { name: '绝影', type: 'treasure', stat_bonus: 30, stars: 4 },
        { name: '爪黄飞电', type: 'treasure', stat_bonus: 30, stars: 4 },
        { name: '玉玺', type: 'treasure', stat_bonus: 50, stars: 5 },
        { name: '孟德新书', type: 'treasure', stat_bonus: 25, stars: 4 },
        { name: '孙子兵法', type: 'treasure', stat_bonus: 45, stars: 5 },
    ];
    for (const e of equipments) {
        await db.run(
            `INSERT INTO equipments (name, type, stat_bonus, stars) VALUES (?,?,?,?)`,
            [e.name, e.type, e.stat_bonus, e.stars]
        );
    }
  }

  // Force Ensure Admin User Exists
  try {
    const hashedPassword = await bcryptjs.hash('123456', 10);
    const existingAdmin = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (existingAdmin) {
        await db.run('UPDATE users SET password = ?, gold = 999999, tokens = 9999 WHERE username = ?', [hashedPassword, 'admin']);
    } else {
        await db.run('INSERT INTO users (username, password, gold, tokens) VALUES (?, ?, ?, ?)', ['admin', hashedPassword, 999999, 9999]);
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

export function getDB() {
  return db;
}