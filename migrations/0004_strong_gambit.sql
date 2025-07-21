ALTER TABLE "sys_login_log" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sys_login_log" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sys_login_log" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sys_operation_log" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sys_operation_log" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sys_operation_log" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sys_access_key" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sys_access_key" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sys_access_key" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sys_menu" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sys_tokens" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sys_tokens" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sys_tokens" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "client_users" ADD COLUMN "created_by" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "client_users" ADD COLUMN "updated_by" varchar(64);--> statement-breakpoint
ALTER TABLE "sys_operation_log" ADD COLUMN "created_by" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "sys_access_key" ADD COLUMN "updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "sys_access_key" ADD COLUMN "updated_by" varchar(64);--> statement-breakpoint
ALTER TABLE "sys_endpoint" ADD COLUMN "created_by" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "sys_endpoint" ADD COLUMN "updated_by" varchar(64);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "created_by" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "updated_by" varchar(64);