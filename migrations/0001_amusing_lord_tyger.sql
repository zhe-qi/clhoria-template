ALTER TABLE "sys_domain" ALTER COLUMN "status" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "sys_domain" ALTER COLUMN "status" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "sys_menu" ALTER COLUMN "status" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "sys_menu" ALTER COLUMN "status" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "sys_organization" ALTER COLUMN "status" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "sys_organization" ALTER COLUMN "status" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "sys_role" ALTER COLUMN "status" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "sys_role" ALTER COLUMN "status" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "sys_user" ALTER COLUMN "status" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "sys_user" ALTER COLUMN "status" SET DEFAULT 1;--> statement-breakpoint
DROP TYPE "public"."status";