/* eslint-disable unicorn/filename-case */
/* eslint-disable no-console */

import db from "@/db";
import { sysDomain } from "@/db/schema";

export async function initSysDomain() {
  const data = [
    {
      code: "default",
      name: "默认域",
      description: "默认域",
      status: 1,
      createdBy: "-1",
      updatedBy: null,
    },
  ];

  await db.insert(sysDomain).values(data).onConflictDoNothing();
  console.log("系统域初始化完成");
}
