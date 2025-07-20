ALTER TABLE "sys_menu" DROP CONSTRAINT "sys_menu_route_name_unique";--> statement-breakpoint
ALTER TABLE "sys_tokens" DROP CONSTRAINT "sys_tokens_access_token_unique";--> statement-breakpoint
ALTER TABLE "sys_tokens" DROP CONSTRAINT "sys_tokens_refresh_token_unique";--> statement-breakpoint
ALTER TABLE "sys_user" DROP CONSTRAINT "sys_user_phone_number_unique";--> statement-breakpoint
ALTER TABLE "sys_menu" ADD CONSTRAINT "sys_menu_routeName_unique" UNIQUE("route_name");--> statement-breakpoint
ALTER TABLE "sys_tokens" ADD CONSTRAINT "sys_tokens_accessToken_unique" UNIQUE("access_token");--> statement-breakpoint
ALTER TABLE "sys_tokens" ADD CONSTRAINT "sys_tokens_refreshToken_unique" UNIQUE("refresh_token");--> statement-breakpoint
ALTER TABLE "sys_user" ADD CONSTRAINT "sys_user_phoneNumber_unique" UNIQUE("phone_number");