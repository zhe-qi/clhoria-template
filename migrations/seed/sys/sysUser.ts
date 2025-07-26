/* eslint-disable unicorn/filename-case */
/* eslint-disable no-console */

import { hash } from "@node-rs/argon2";

import db from "@/db";
import { sysUser } from "@/db/schema";

export async function initSysUser() {
  const defaultPassword = await hash("123456");

  const data = [
    {
      username: "admin",
      password: defaultPassword,
      domain: "default",
      builtIn: true,
      avatar: "https://dummyimage.com/200x200/F59E0B/ffffff&text=A",
      email: "admin@example.com",
      phoneNumber: "18522222222",
      nickName: "Administrator",
      status: 1,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      username: "user",
      password: defaultPassword,
      domain: "default",
      builtIn: true,
      avatar: "https://dummyimage.com/200x200/8B5CF6/ffffff&text=U",
      email: "user@example.com",
      phoneNumber: "18533333333",
      nickName: "User",
      status: 1,
      createdBy: "-1",
      updatedBy: null,
    },
  ];

  await db.insert(sysUser).values(data).onConflictDoNothing();
  console.log("系统用户初始化完成");
}
