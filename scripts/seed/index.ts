/* eslint-disable no-console */
import { initCasbinRule } from "./sys/casbinRule";
import { initSysDomain } from "./sys/sysDomain";
import { initSysMenu } from "./sys/sysMenu";
import { initSysRole } from "./sys/sysRole";
import { initSysRoleMenu } from "./sys/sysRoleMenu";
import { initSysUser } from "./sys/sysUser";
import { initSysUserRole } from "./sys/sysUserRole";

async function run() {
  await initSysDomain();
  await initSysUser();
  await initSysRole();
  await initSysMenu();
  await initSysUserRole();
  await initSysRoleMenu();
  await initCasbinRule();
}

(async () => {
  const date = new Date().getTime();
  console.log("数据库初始化开始");
  try {
    await run();
    console.log("数据库初始化完成");
    console.log("耗时:", new Date().getTime() - date, "ms");
  }
  catch (error) {
    console.error("数据库初始化失败:", error);
    process.exit(1);
  }
  finally {
    process.exit(0);
  }
})();
