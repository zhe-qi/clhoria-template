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

console.log('Environment check:');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL preview:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'undefined');

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
    const { sysDomain } = schemaModule;

    const result = await db.select().from(sysDomain).limit(1);
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
    const seedModule = require('../dist/migrations/seed/sys/sysDomain.js');
    await seedModule.initSysDomain();
    console.log('-> 初始化系统域完成');

    const dictModule = require('../dist/migrations/seed/sys/sysDictionaries.js');
    await dictModule.initSysDictionaries();
    console.log('-> 初始化系统字典完成');

    const roleModule = require('../dist/migrations/seed/sys/sysRole.js');
    await roleModule.initSysRole();
    console.log('-> 初始化系统角色完成');

    const userModule = require('../dist/migrations/seed/sys/sysUser.js');
    await userModule.initSysUser();
    console.log('-> 初始化系统用户完成');

    const menuModule = require('../dist/migrations/seed/sys/sysMenu.js');
    await menuModule.initSysMenu();
    console.log('-> 初始化系统菜单完成');

    const userRoleModule = require('../dist/migrations/seed/sys/sysUserRole.js');
    await userRoleModule.initSysUserRole();
    console.log('-> 初始化用户角色关联完成');

    const roleMenuModule = require('../dist/migrations/seed/sys/sysRoleMenu.js');
    await roleMenuModule.initSysRoleMenu();
    console.log('-> 初始化角色菜单关联完成');

    const casbinModule = require('../dist/migrations/seed/sys/casbinRule.js');
    await casbinModule.initCasbinRule();
    console.log('-> 初始化 Casbin 权限规则完成');

    console.log('数据库初始化成功完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
};

// 初始化 TimescaleDB 扩展和配置
const initTimescaleDB = async () => {
  try {
    console.log('正在初始化 TimescaleDB 扩展...');
    
    // 创建 TimescaleDB 扩展（如果不存在）
    await sql`CREATE EXTENSION IF NOT EXISTS timescaledb;`;
    console.log('-> TimescaleDB 扩展初始化完成');
    
    // 检查是否有时序表需要转换
    const tables = ['login_log', 'operation_log'];
    for (const table of tables) {
      try {
        // 检查表是否存在且未被转换为 hypertable
        const result = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          ) as table_exists,
          EXISTS (
            SELECT FROM _timescaledb_catalog.hypertable 
            WHERE table_name = ${table}
          ) as is_hypertable;
        `;
        
        if (result[0]?.table_exists && !result[0]?.is_hypertable) {
          await sql`SELECT create_hypertable(${table}, 'created_at', if_not_exists => TRUE);`;
          console.log(`-> 表 ${table} 已转换为 TimescaleDB hypertable`);
        }
      } catch (error) {
        // 忽略表不存在的错误，因为这些表可能在迁移中创建
        console.log(`-> 跳过表 ${table} 的 hypertable 转换 (可能尚未创建)`);
      }
    }
    
    console.log('TimescaleDB 初始化完成！');
  } catch (error) {
    console.error('TimescaleDB 初始化失败:', error);
    // 不强制退出，因为可能在非 TimescaleDB 环境中运行
    console.log('继续执行常规迁移...');
  }
};

const migrateDatabase = async () => {
  console.log(`开始数据库迁移... 迁移文件夹: ${migrationsFolder}`);

  try {
    // 先尝试初始化 TimescaleDB
    await initTimescaleDB();
    
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
