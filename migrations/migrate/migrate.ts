// This file is used to migrate the database to the current version
// It is run when the docker container starts
const path = require('node:path');
const dotenv = require('dotenv');
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const { eq } = require('drizzle-orm');
const postgres = require('postgres');

const migrationsFolder = process.argv[2] ?? '../';

// 加载环境变量 - 优先使用容器环境变量，其次从 .env 文件
if (!process.env.DATABASE_URL) {
  console.log('未找到容器环境变量，尝试从 .env 文件加载...');
  dotenv.config({ path: path.join(__dirname, '/../../.env') });
}

if (!process.env.DATABASE_URL) {
  console.error('数据库URL未设置 - 请检查环境变量');
  process.exit(1);
}

// 创建Postgres客户端
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(sql);

// 检查数据库是否需要初始化数据
const checkNeedSeed = async () => {
  try {
    // 导入 schema
    const schemaModule = require('../dist/db/schema/index.js');
    const { systemUser } = schemaModule;

    const result = await db.select().from(systemUser).limit(1);
    return result.length === 0;
  } catch (error: any) {
    console.log('检查 seed 状态时出错，假设需要初始化:', error.message);
    return true;
  }
};

// 执行数据初始化
const seedDatabase = async () => {
  try {
    console.log('开始数据库初始化...');

    // 导入 seed 模块
    const seedModule = require('../dist/migrations/seed/index.js');
    await seedModule.main();
    console.log('数据库初始化成功完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
};

const migrateDatabase = async () => {
  console.log(`开始数据库迁移... 迁移文件夹: ${migrationsFolder}`);

  try {
    // 执行迁移
    await migrate(db, { migrationsFolder });
    console.log('数据库迁移成功完成！');

    // 检查是否需要初始化数据
    const needSeed = await checkNeedSeed();
    if (needSeed) {
      console.log('检测到空数据库，开始初始化数据...');
      await seedDatabase();
    } else {
      console.log('数据库已有数据，跳过初始化');
    }
  } catch (error) {
    console.error('数据库迁移或初始化失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await sql.end();
  }
};

// 执行迁移
migrateDatabase();
