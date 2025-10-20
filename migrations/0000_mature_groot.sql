CREATE TABLE "admin_casbin_rule" (
	"ptype" varchar(8) NOT NULL,
	"v0" varchar(64) NOT NULL,
	"v1" varchar(254) NOT NULL,
	"v2" varchar(64) DEFAULT '' NOT NULL,
	"v3" varchar(64) DEFAULT '' NOT NULL,
	"v4" varchar(64) DEFAULT '' NOT NULL,
	"v5" varchar(64) DEFAULT '' NOT NULL,
	CONSTRAINT "casbin_rule_pkey" PRIMARY KEY("v0","v1","v2","v3")
);
--> statement-breakpoint
CREATE TABLE "admin_system_role" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64),
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"name" varchar(64) NOT NULL,
	"description" text,
	"status" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_system_user" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64),
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"username" varchar(64) NOT NULL,
	"password" text NOT NULL,
	"built_in" boolean DEFAULT false,
	"avatar" text,
	"nick_name" varchar(64) NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "admin_system_user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "admin_system_user_role" (
	"user_id" uuid NOT NULL,
	"role_id" varchar(64) NOT NULL,
	CONSTRAINT "admin_system_user_role_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "client_user" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64),
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"username" varchar(64) NOT NULL,
	"password" varchar(128) NOT NULL,
	"password_secret_version" integer DEFAULT 1,
	"nickname" varchar(64),
	"gender" integer DEFAULT 0,
	"status" integer DEFAULT 0,
	"mobile" varchar(20),
	"mobile_confirmed" integer DEFAULT 0,
	"email" varchar(128),
	"email_confirmed" integer DEFAULT 0,
	"avatar" text,
	"department_ids" jsonb DEFAULT '[]'::jsonb,
	"enterprise_ids" jsonb DEFAULT '[]'::jsonb,
	"role_ids" jsonb DEFAULT '[]'::jsonb,
	"wx_unionid" varchar(64),
	"wx_openid" jsonb,
	"qq_openid" jsonb,
	"qq_unionid" varchar(64),
	"ali_openid" varchar(64),
	"apple_openid" varchar(64),
	"dcloud_appids" jsonb DEFAULT '[]'::jsonb,
	"comment" text,
	"third_party" jsonb,
	"register_env" jsonb,
	"realname_auth" jsonb,
	"score" integer DEFAULT 0,
	"register_date" timestamp,
	"register_ip" varchar(45),
	"last_login_date" timestamp,
	"last_login_ip" varchar(45),
	"tokens" jsonb DEFAULT '[]'::jsonb,
	"inviter_uids" jsonb DEFAULT '[]'::jsonb,
	"invite_time" timestamp,
	"my_invite_code" varchar(32),
	"identities" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "client_user_username_unique" UNIQUE("username"),
	CONSTRAINT "client_user_mobile_unique" UNIQUE("mobile"),
	CONSTRAINT "client_user_email_unique" UNIQUE("email"),
	CONSTRAINT "client_user_wxUnionid_unique" UNIQUE("wx_unionid"),
	CONSTRAINT "client_user_qqUnionid_unique" UNIQUE("qq_unionid"),
	CONSTRAINT "client_user_aliOpenid_unique" UNIQUE("ali_openid"),
	CONSTRAINT "client_user_appleOpenid_unique" UNIQUE("apple_openid"),
	CONSTRAINT "client_user_myInviteCode_unique" UNIQUE("my_invite_code")
);
--> statement-breakpoint
CREATE INDEX "idx_casbin_g_v0" ON "admin_casbin_rule" USING btree ("ptype","v0","v1");--> statement-breakpoint
CREATE INDEX "system_user_username_idx" ON "admin_system_user" USING btree ("username");--> statement-breakpoint
CREATE INDEX "client_users_username_idx" ON "client_user" USING btree ("username");--> statement-breakpoint
CREATE INDEX "client_users_mobile_idx" ON "client_user" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "client_users_email_idx" ON "client_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "client_users_status_idx" ON "client_user" USING btree ("status");--> statement-breakpoint
CREATE INDEX "client_users_register_date_idx" ON "client_user" USING btree ("register_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "client_users_last_login_date_idx" ON "client_user" USING btree ("last_login_date" DESC NULLS LAST);