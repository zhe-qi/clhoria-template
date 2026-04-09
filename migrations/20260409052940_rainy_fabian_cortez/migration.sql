CREATE TYPE "gender" AS ENUM('UNKNOWN', 'MALE', 'FEMALE');--> statement-breakpoint
CREATE TYPE "param_value_type" AS ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON');--> statement-breakpoint
CREATE TYPE "real_name_auth_status" AS ENUM('UNAUTHENTICATED', 'PENDING', 'VERIFIED', 'FAILED');--> statement-breakpoint
CREATE TYPE "real_name_auth_type" AS ENUM('INDIVIDUAL', 'ENTERPRISE');--> statement-breakpoint
CREATE TYPE "status" AS ENUM('ENABLED', 'DISABLED');--> statement-breakpoint
CREATE TYPE "user_status" AS ENUM('NORMAL', 'DISABLED', 'PENDING', 'REJECTED');--> statement-breakpoint
CREATE TYPE "verification_status" AS ENUM('UNVERIFIED', 'VERIFIED');--> statement-breakpoint
CREATE TABLE "casbin_rule" (
	"ptype" varchar(8),
	"v0" varchar(64),
	"v1" varchar(254),
	"v2" varchar(64) DEFAULT '',
	"v3" varchar(64) DEFAULT '' NOT NULL,
	"v4" varchar(64) DEFAULT '' NOT NULL,
	"v5" varchar(64) DEFAULT '' NOT NULL,
	CONSTRAINT "casbin_rule_pkey" PRIMARY KEY("ptype","v0","v1","v2")
);
--> statement-breakpoint
CREATE TABLE "system_dicts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp,
	"created_by" varchar(64),
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"code" varchar(64) NOT NULL UNIQUE,
	"name" varchar(128) NOT NULL,
	"description" text,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"status" "status" DEFAULT 'ENABLED'::"status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_params" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp,
	"created_by" varchar(64),
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"key" varchar(128) NOT NULL UNIQUE,
	"value" text NOT NULL,
	"value_type" "param_value_type" DEFAULT 'STRING'::"param_value_type" NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"status" "status" DEFAULT 'ENABLED'::"status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_roles" (
	"id" varchar(64) PRIMARY KEY,
	"created_at" timestamp,
	"created_by" varchar(64),
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"name" varchar(64) NOT NULL,
	"description" text,
	"status" "status" DEFAULT 'ENABLED'::"status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_user_roles" (
	"user_id" uuid,
	"role_id" varchar(64),
	CONSTRAINT "system_user_roles_pkey" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "system_users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp,
	"created_by" varchar(64),
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"username" varchar(64) NOT NULL UNIQUE,
	"password" text NOT NULL,
	"built_in" boolean DEFAULT false,
	"avatar" text,
	"nick_name" varchar(64) NOT NULL,
	"status" "status" DEFAULT 'ENABLED'::"status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp,
	"created_by" varchar(64),
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"username" varchar(64) NOT NULL UNIQUE,
	"password" varchar(128) NOT NULL,
	"password_secret_version" integer DEFAULT 1,
	"nickname" varchar(64),
	"gender" "gender" DEFAULT 'UNKNOWN'::"gender",
	"status" "user_status" DEFAULT 'NORMAL'::"user_status",
	"mobile" varchar(20) UNIQUE,
	"mobile_confirmed" "verification_status" DEFAULT 'UNVERIFIED'::"verification_status",
	"email" varchar(128) UNIQUE,
	"email_confirmed" "verification_status" DEFAULT 'UNVERIFIED'::"verification_status",
	"avatar" text,
	"department_ids" jsonb DEFAULT '[]',
	"enterprise_ids" jsonb DEFAULT '[]',
	"role_ids" jsonb DEFAULT '[]',
	"wx_unionid" varchar(64) UNIQUE,
	"wx_openid" jsonb,
	"qq_openid" jsonb,
	"qq_unionid" varchar(64) UNIQUE,
	"ali_openid" varchar(64) UNIQUE,
	"apple_openid" varchar(64) UNIQUE,
	"dcloud_appids" jsonb DEFAULT '[]',
	"comment" text,
	"third_party" jsonb,
	"register_env" jsonb,
	"realname_auth" jsonb,
	"score" integer DEFAULT 0,
	"register_date" timestamp,
	"register_ip" varchar(45),
	"last_login_date" timestamp,
	"last_login_ip" varchar(45),
	"tokens" jsonb DEFAULT '[]',
	"inviter_uids" jsonb DEFAULT '[]',
	"invite_time" timestamp,
	"my_invite_code" varchar(32) UNIQUE,
	"identities" jsonb DEFAULT '[]'
);
--> statement-breakpoint
CREATE INDEX "idx_casbin_g_v0" ON "casbin_rule" ("ptype","v0","v1");--> statement-breakpoint
CREATE INDEX "idx_casbin_v1" ON "casbin_rule" ("ptype","v1");--> statement-breakpoint
CREATE INDEX "system_dicts_status_idx" ON "system_dicts" ("status");--> statement-breakpoint
CREATE INDEX "system_params_status_idx" ON "system_params" ("status");--> statement-breakpoint
CREATE INDEX "idx_user_roles_user_id" ON "system_user_roles" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_role_id" ON "system_user_roles" ("role_id");--> statement-breakpoint
CREATE INDEX "system_user_username_idx" ON "system_users" ("username");--> statement-breakpoint
CREATE INDEX "client_users_username_idx" ON "client_users" ("username");--> statement-breakpoint
CREATE INDEX "client_users_mobile_idx" ON "client_users" ("mobile");--> statement-breakpoint
CREATE INDEX "client_users_email_idx" ON "client_users" ("email");--> statement-breakpoint
CREATE INDEX "client_users_status_idx" ON "client_users" ("status");--> statement-breakpoint
CREATE INDEX "client_users_register_date_idx" ON "client_users" ("register_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "client_users_last_login_date_idx" ON "client_users" ("last_login_date" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "system_user_roles" ADD CONSTRAINT "system_user_roles_user_id_system_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "system_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "system_user_roles" ADD CONSTRAINT "system_user_roles_role_id_system_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "system_roles"("id") ON DELETE CASCADE;