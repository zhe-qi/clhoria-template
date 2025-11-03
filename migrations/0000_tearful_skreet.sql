CREATE TABLE "casbin_rule" (
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
CREATE TABLE "system_roles" (
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
CREATE TABLE "system_user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" varchar(64) NOT NULL,
	CONSTRAINT "system_user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "system_users" (
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
	CONSTRAINT "system_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "client_users" (
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
	CONSTRAINT "client_users_username_unique" UNIQUE("username"),
	CONSTRAINT "client_users_mobile_unique" UNIQUE("mobile"),
	CONSTRAINT "client_users_email_unique" UNIQUE("email"),
	CONSTRAINT "client_users_wxUnionid_unique" UNIQUE("wx_unionid"),
	CONSTRAINT "client_users_qqUnionid_unique" UNIQUE("qq_unionid"),
	CONSTRAINT "client_users_aliOpenid_unique" UNIQUE("ali_openid"),
	CONSTRAINT "client_users_appleOpenid_unique" UNIQUE("apple_openid"),
	CONSTRAINT "client_users_myInviteCode_unique" UNIQUE("my_invite_code")
);
--> statement-breakpoint
CREATE INDEX "idx_casbin_g_v0" ON "casbin_rule" USING btree ("ptype","v0","v1");--> statement-breakpoint
CREATE INDEX "system_user_username_idx" ON "system_users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "client_users_username_idx" ON "client_users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "client_users_mobile_idx" ON "client_users" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "client_users_email_idx" ON "client_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "client_users_status_idx" ON "client_users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "client_users_register_date_idx" ON "client_users" USING btree ("register_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "client_users_last_login_date_idx" ON "client_users" USING btree ("last_login_date" DESC NULLS LAST);