CREATE TYPE "public"."menu_type" AS ENUM('directory', 'menu');--> statement-breakpoint
CREATE TABLE "client_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "client_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "casbin_rule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ptype" varchar(8),
	"v0" varchar(64),
	"v1" varchar(254),
	"v2" varchar(64),
	"v3" varchar(64),
	"v4" varchar(64),
	"v5" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "sys_global_params" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"type" varchar(20) DEFAULT 'string' NOT NULL,
	"description" text,
	"is_public" integer DEFAULT 1 NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "sys_global_params_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sys_dictionaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" varchar(500),
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(50),
	"updated_by" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "sys_domain" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"status" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "sys_domain_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sys_endpoint" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"path" varchar(255) NOT NULL,
	"method" varchar(16) NOT NULL,
	"action" varchar(64) NOT NULL,
	"resource" varchar(128) NOT NULL,
	"controller" varchar(128) NOT NULL,
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "sys_login_log" (
	"id" uuid PRIMARY KEY NOT NULL,
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
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sys_menu" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"menu_type" "menu_type" NOT NULL,
	"menu_name" varchar(64) NOT NULL,
	"icon_type" integer DEFAULT 1,
	"icon" varchar(64),
	"route_name" varchar(64) NOT NULL,
	"route_path" varchar(128) NOT NULL,
	"component" varchar(64) NOT NULL,
	"path_param" varchar(64),
	"status" integer DEFAULT 1 NOT NULL,
	"active_menu" varchar(64),
	"hide_in_menu" boolean DEFAULT false,
	"pid" uuid,
	"order" integer NOT NULL,
	"i18n_key" varchar(64),
	"keep_alive" boolean DEFAULT false,
	"constant" boolean DEFAULT false NOT NULL,
	"href" varchar(64),
	"multi_tab" boolean DEFAULT false,
	"domain" varchar(64) DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_operation_log" (
	"id" uuid PRIMARY KEY NOT NULL,
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
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sys_organization" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"pid" uuid,
	"status" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "sys_organization_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sys_role" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"code" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" text,
	"pid" uuid,
	"status" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "sys_role_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sys_role_menu" (
	"role_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"domain" varchar(64) NOT NULL,
	CONSTRAINT "sys_role_menu_role_id_menu_id_domain_pk" PRIMARY KEY("role_id","menu_id","domain")
);
--> statement-breakpoint
CREATE TABLE "sys_job_execution_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"job_id" varchar(64) NOT NULL,
	"execution_id" varchar(128) NOT NULL,
	"status" varchar(32) NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"duration_ms" integer,
	"result" jsonb,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_job_handlers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"name" varchar(128) NOT NULL,
	"description" text,
	"file_path" varchar(512),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_scheduled_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"domain" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"handler_name" varchar(128) NOT NULL,
	"cron_expression" varchar(64) NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Shanghai',
	"status" integer DEFAULT 1 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retry_attempts" integer DEFAULT 3 NOT NULL,
	"retry_delay" integer DEFAULT 5000 NOT NULL,
	"timeout" integer DEFAULT 300000 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"access_token" varchar(512) NOT NULL,
	"refresh_token" varchar(512) NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
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
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp,
	CONSTRAINT "sys_tokens_accessToken_unique" UNIQUE("access_token"),
	CONSTRAINT "sys_tokens_refreshToken_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE "sys_user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"username" varchar(64) NOT NULL,
	"password" text NOT NULL,
	"domain" varchar(64) NOT NULL,
	"built_in" boolean DEFAULT false,
	"avatar" text,
	"nick_name" varchar(64) NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "sys_user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "sys_user_role" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "sys_user_role_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"name" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_ptype_v0" ON "casbin_rule" USING btree ("ptype","v0");--> statement-breakpoint
CREATE INDEX "idx_ptype_v0_v1_v2" ON "casbin_rule" USING btree ("ptype","v0","v1","v2");--> statement-breakpoint
CREATE INDEX "idx_ptype_v3" ON "casbin_rule" USING btree ("ptype","v3");