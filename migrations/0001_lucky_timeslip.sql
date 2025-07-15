CREATE TYPE "public"."status" AS ENUM('ENABLED', 'DISABLED', 'BANNED');--> statement-breakpoint
CREATE TYPE "public"."menu_type" AS ENUM('directory', 'menu');--> statement-breakpoint
CREATE TABLE "sys_access_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" varchar(64) NOT NULL,
	"access_key_id" varchar(128) NOT NULL,
	"access_key_secret" varchar(256) NOT NULL,
	"status" "status" DEFAULT 'ENABLED' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(64) NOT NULL,
	CONSTRAINT "sys_access_key_access_key_id_unique" UNIQUE("access_key_id"),
	CONSTRAINT "sys_access_key_access_key_secret_unique" UNIQUE("access_key_secret")
);
--> statement-breakpoint
CREATE TABLE "sys_domain" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"status" "status" DEFAULT 'ENABLED' NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	CONSTRAINT "sys_domain_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sys_endpoint" (
	"id" uuid PRIMARY KEY NOT NULL,
	"path" varchar(255) NOT NULL,
	"method" varchar(16) NOT NULL,
	"action" varchar(64) NOT NULL,
	"resource" varchar(128) NOT NULL,
	"controller" varchar(128) NOT NULL,
	"summary" text,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sys_login_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"username" varchar(64) NOT NULL,
	"domain" varchar(64) NOT NULL,
	"login_time" timestamp DEFAULT now() NOT NULL,
	"ip" varchar(64) NOT NULL,
	"port" integer,
	"address" varchar(255) NOT NULL,
	"user_agent" varchar(512) NOT NULL,
	"request_id" varchar(64) NOT NULL,
	"type" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_menu" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_type" "menu_type" NOT NULL,
	"menu_name" varchar(64) NOT NULL,
	"icon_type" integer DEFAULT 1,
	"icon" varchar(64),
	"route_name" varchar(64) NOT NULL,
	"route_path" varchar(128) NOT NULL,
	"component" varchar(64) NOT NULL,
	"path_param" varchar(64),
	"status" "status" DEFAULT 'ENABLED' NOT NULL,
	"active_menu" varchar(64),
	"hide_in_menu" boolean DEFAULT false,
	"pid" integer DEFAULT 0 NOT NULL,
	"order" integer NOT NULL,
	"i18n_key" varchar(64),
	"keep_alive" boolean DEFAULT false,
	"constant" boolean DEFAULT false NOT NULL,
	"href" varchar(64),
	"multi_tab" boolean DEFAULT false,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	CONSTRAINT "sys_menu_route_name_unique" UNIQUE("route_name")
);
--> statement-breakpoint
CREATE TABLE "sys_operation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"username" varchar(64) NOT NULL,
	"domain" varchar(64) NOT NULL,
	"module_name" varchar(128) NOT NULL,
	"description" varchar(512) NOT NULL,
	"request_id" varchar(64) NOT NULL,
	"method" varchar(16) NOT NULL,
	"url" varchar(512) NOT NULL,
	"ip" varchar(64) NOT NULL,
	"user_agent" varchar(512),
	"params" jsonb,
	"body" jsonb,
	"response" jsonb,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_organization" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"pid" varchar(64) DEFAULT '0' NOT NULL,
	"status" "status" DEFAULT 'ENABLED' NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	CONSTRAINT "sys_organization_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sys_role" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" text,
	"pid" varchar(64) DEFAULT '0' NOT NULL,
	"status" "status" DEFAULT 'ENABLED' NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	CONSTRAINT "sys_role_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sys_role_menu" (
	"role_id" uuid NOT NULL,
	"menu_id" integer NOT NULL,
	"domain" varchar(64) NOT NULL,
	CONSTRAINT "sys_role_menu_role_id_menu_id_domain_pk" PRIMARY KEY("role_id","menu_id","domain")
);
--> statement-breakpoint
CREATE TABLE "sys_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"access_token" varchar(512) NOT NULL,
	"refresh_token" varchar(512) NOT NULL,
	"status" varchar(32) NOT NULL,
	"user_id" uuid NOT NULL,
	"username" varchar(64) NOT NULL,
	"domain" varchar(64) NOT NULL,
	"login_time" timestamp DEFAULT now() NOT NULL,
	"ip" varchar(64) NOT NULL,
	"port" integer,
	"address" varchar(255) NOT NULL,
	"user_agent" varchar(512) NOT NULL,
	"request_id" varchar(64) NOT NULL,
	"type" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(64) NOT NULL,
	CONSTRAINT "sys_tokens_access_token_unique" UNIQUE("access_token"),
	CONSTRAINT "sys_tokens_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE "sys_user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(64) NOT NULL,
	"password" text NOT NULL,
	"domain" varchar(64) NOT NULL,
	"built_in" boolean DEFAULT false,
	"avatar" text,
	"email" varchar(128),
	"phone_number" varchar(32),
	"nick_name" varchar(64) NOT NULL,
	"status" "status" DEFAULT 'ENABLED' NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	CONSTRAINT "sys_user_username_unique" UNIQUE("username"),
	CONSTRAINT "sys_user_email_unique" UNIQUE("email"),
	CONSTRAINT "sys_user_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "sys_user_role" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "sys_user_role_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "admin_users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "menu" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_to_roles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "admin_users" CASCADE;--> statement-breakpoint
DROP TABLE "menu" CASCADE;--> statement-breakpoint
DROP TABLE "roles" CASCADE;--> statement-breakpoint
DROP TABLE "user_to_roles" CASCADE;--> statement-breakpoint
ALTER TABLE "client_users" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "client_users" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_ptype_v3" ON "casbin_rule" USING btree ("ptype","v3");