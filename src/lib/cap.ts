import Cap from "@cap.js/server";
import { and, eq, gt, lte } from "drizzle-orm";

import db from "@/db";
import { capChallenges, capTokens } from "@/db/schema";

/**
 * Cap.js 验证码服务实例
 * 使用PostgreSQL数据库存储挑战和token数据
 */
export const cap = new Cap({
  storage: {
    challenges: {
      store: async (token, challengeData) => {
        await db.insert(capChallenges).values({
          token,
          data: JSON.stringify(challengeData),
          expires: new Date(challengeData.expires),
        }).onConflictDoUpdate({
          target: capChallenges.token,
          set: {
            data: JSON.stringify(challengeData),
            expires: new Date(challengeData.expires),
          },
        });
      },
      read: async (token) => {
        const [row] = await db.select({
          data: capChallenges.data,
          expires: capChallenges.expires,
        })
          .from(capChallenges)
          .where(and(
            eq(capChallenges.token, token),
            gt(capChallenges.expires, new Date()),
          ))
          .limit(1);

        return row
          ? { challenge: JSON.parse(row.data), expires: new Date(row.expires).getTime() }
          : null;
      },
      delete: async (token) => {
        await db.delete(capChallenges)
          .where(eq(capChallenges.token, token));
      },
      listExpired: async () => {
        const rows = await db.select({
          token: capChallenges.token,
        })
          .from(capChallenges)
          .where(lte(capChallenges.expires, new Date()));

        return rows.map(row => row.token);
      },
    },
    tokens: {
      store: async (tokenKey, expires) => {
        await db.insert(capTokens).values({
          key: tokenKey,
          expires: new Date(expires),
        }).onConflictDoUpdate({
          target: capTokens.key,
          set: {
            expires: new Date(expires),
          },
        });
      },
      get: async (tokenKey) => {
        const [row] = await db.select({
          expires: capTokens.expires,
        })
          .from(capTokens)
          .where(and(
            eq(capTokens.key, tokenKey),
            gt(capTokens.expires, new Date()),
          ))
          .limit(1);

        return row ? new Date(row.expires).getTime() : null;
      },
      delete: async (tokenKey) => {
        await db.delete(capTokens)
          .where(eq(capTokens.key, tokenKey));
      },
      listExpired: async () => {
        const rows = await db.select({
          key: capTokens.key,
        })
          .from(capTokens)
          .where(lte(capTokens.expires, new Date()));

        return rows.map(row => row.key);
      },
    },
  },
});
