/* eslint-disable no-console */
import { initCasbinRule } from "./sys/casbinRule";
import { initSysDomain } from "./sys/sysDomain";
import { initSysMenu } from "./sys/sysMenu";
import { initSysRole } from "./sys/sysRole";
import { initSysRoleMenu } from "./sys/sysRoleMenu";
import { initSysUser } from "./sys/sysUser";
import { initSysUserRole } from "./sys/sysUserRole";

async function run() {
  try {
    console.log("-> 初始化系统域...");
    await initSysDomain();

    console.log("-> 初始化系统角色...");
    await initSysRole();

    console.log("-> 初始化系统用户...");
    await initSysUser();

    console.log("-> 初始化系统菜单...");
    await initSysMenu();

    console.log("-> 初始化用户角色关联...");
    await initSysUserRole();

    console.log("-> 初始化角色菜单关联...");
    await initSysRoleMenu();

    console.log("-> 初始化 Casbin 权限规则...");
    await initCasbinRule();
  }
  catch (error) {
    console.error("初始化过程中出错:", error);
    throw error;
  }
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
