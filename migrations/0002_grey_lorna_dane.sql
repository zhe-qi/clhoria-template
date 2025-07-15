CREATE TABLE "api_key" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"key" varchar(64) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	CONSTRAINT "api_key_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "sys_access_key" DROP CONSTRAINT "sys_access_key_access_key_id_unique";--> statement-breakpoint
ALTER TABLE "sys_access_key" DROP CONSTRAINT "sys_access_key_access_key_secret_unique";--> statement-breakpoint
ALTER TABLE "sys_access_key" ADD CONSTRAINT "sys_access_key_accessKeyId_unique" UNIQUE("access_key_id");--> statement-breakpoint
ALTER TABLE "sys_access_key" ADD CONSTRAINT "sys_access_key_accessKeySecret_unique" UNIQUE("access_key_secret");