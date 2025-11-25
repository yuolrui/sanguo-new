export const createTables = async (db) => {
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
  };
