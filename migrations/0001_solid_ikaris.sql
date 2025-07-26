ALTER TABLE "sys_user" DROP CONSTRAINT "sys_user_email_unique";--> statement-breakpoint
ALTER TABLE "sys_user" DROP CONSTRAINT "sys_user_phoneNumber_unique";--> statement-breakpoint
ALTER TABLE "sys_user" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "sys_user" DROP COLUMN "phone_number";