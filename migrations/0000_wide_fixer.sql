CREATE TYPE "public"."notice_type" AS ENUM('NOTIFICATION', 'ANNOUNCEMENT');--> statement-breakpoint
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
CREATE TABLE "cap_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"data" text NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	CONSTRAINT "cap_challenges_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "cap_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	CONSTRAINT "cap_tokens_key_unique" UNIQUE("key")
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
CREATE TABLE "system_dictionaries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"code" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" varchar(500),
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_domain" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"status" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "system_domain_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "system_endpoint" (
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
CREATE TABLE "system_global_params" (
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
	CONSTRAINT "system_global_params_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "system_job_execution_logs" (
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
CREATE TABLE "system_job_handlers" (
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
CREATE TABLE "system_menu" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"name" varchar(64) NOT NULL,
	"path" varchar(128) NOT NULL,
	"component" varchar(128),
	"redirect" varchar(500),
	"status" integer DEFAULT 1 NOT NULL,
	"pid" uuid,
	"meta" jsonb DEFAULT '{"title":"","order":0}'::jsonb,
	"domain" varchar(64) DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_notices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"title" varchar(200) NOT NULL,
	"type" "notice_type" DEFAULT 'NOTIFICATION' NOT NULL,
	"content" text,
	"status" integer DEFAULT 1 NOT NULL,
	"domain" varchar(100) DEFAULT 'default' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_organization" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"domain" varchar(64) DEFAULT 'default' NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"pid" uuid,
	"status" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "system_organization_domain_code_unique" UNIQUE("domain","code")
);
--> statement-breakpoint
CREATE TABLE "system_post" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"post_code" varchar(64) NOT NULL,
	"post_name" varchar(50) NOT NULL,
	"post_sort" integer DEFAULT 0 NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"domain" varchar(64) DEFAULT 'default' NOT NULL,
	"remark" text,
	CONSTRAINT "system_post_domain_postCode_unique" UNIQUE("domain","post_code")
);
--> statement-breakpoint
CREATE TABLE "system_role" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"code" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" text,
	"pid" uuid,
	"domain" varchar(64) DEFAULT 'default' NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "system_role_domain_code_unique" UNIQUE("domain","code")
);
--> statement-breakpoint
CREATE TABLE "system_role_menu" (
	"role_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"domain" varchar(64) DEFAULT 'default' NOT NULL,
	CONSTRAINT "system_role_menu_domain_role_id_menu_id_pk" PRIMARY KEY("domain","role_id","menu_id")
);
--> statement-breakpoint
CREATE TABLE "system_scheduled_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"domain" varchar(64) DEFAULT 'default' NOT NULL,
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
CREATE TABLE "system_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"access_token" varchar(512) NOT NULL,
	"refresh_token" varchar(512) NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"user_id" uuid NOT NULL,
	"username" varchar(64) NOT NULL,
	"domain" varchar(64) DEFAULT 'default' NOT NULL,
	"login_time" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip" varchar(64) NOT NULL,
	"port" integer,
	"address" varchar(255) NOT NULL,
	"user_agent" varchar(512) NOT NULL,
	"request_id" varchar(64) NOT NULL,
	"type" varchar(32) NOT NULL,
	"created_by" varchar(64) NOT NULL,
	"created_at" timestamp,
	CONSTRAINT "system_tokens_accessToken_unique" UNIQUE("access_token"),
	CONSTRAINT "system_tokens_refreshToken_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE "system_user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64) NOT NULL,
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"username" varchar(64) NOT NULL,
	"password" text NOT NULL,
	"domain" varchar(64) DEFAULT 'default' NOT NULL,
	"built_in" boolean DEFAULT false,
	"avatar" text,
	"nick_name" varchar(64) NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "system_user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "system_user_post" (
	"user_id" varchar(64) NOT NULL,
	"post_id" varchar(64) NOT NULL,
	CONSTRAINT "system_user_post_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "system_user_role" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"domain" varchar(64) DEFAULT 'default' NOT NULL,
	CONSTRAINT "system_user_role_domain_user_id_role_id_pk" PRIMARY KEY("domain","user_id","role_id")
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
CREATE TABLE "ts_login_log" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"username" text NOT NULL,
	"domain" text NOT NULL,
	"login_time" timestamp with time zone NOT NULL,
	"ip" text NOT NULL,
	"port" integer,
	"address" text NOT NULL,
	"user_agent" text NOT NULL,
	"request_id" text NOT NULL,
	"type" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone,
	CONSTRAINT "ts_login_log_id_login_time_pk" PRIMARY KEY("id","login_time")
);
--> statement-breakpoint
CREATE TABLE "ts_operation_log" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"username" text NOT NULL,
	"domain" text NOT NULL,
	"module_name" text NOT NULL,
	"description" text NOT NULL,
	"request_id" text NOT NULL,
	"method" text NOT NULL,
	"url" text NOT NULL,
	"ip" text NOT NULL,
	"user_agent" text,
	"params" jsonb,
	"body" jsonb,
	"response" jsonb,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"duration" integer NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone,
	CONSTRAINT "ts_operation_log_id_start_time_pk" PRIMARY KEY("id","start_time")
);
--> statement-breakpoint
CREATE INDEX "cap_challenges_token_expires_idx" ON "cap_challenges" USING btree ("token","expires");--> statement-breakpoint
CREATE INDEX "cap_challenges_expires_idx" ON "cap_challenges" USING btree ("expires");--> statement-breakpoint
CREATE INDEX "cap_tokens_key_expires_idx" ON "cap_tokens" USING btree ("key","expires");--> statement-breakpoint
CREATE INDEX "cap_tokens_expires_idx" ON "cap_tokens" USING btree ("expires");--> statement-breakpoint
CREATE INDEX "idx_ptype_v0_v1_v2_v3" ON "casbin_rule" USING btree ("ptype","v0","v1","v2","v3");--> statement-breakpoint
CREATE INDEX "idx_ptype_v0" ON "casbin_rule" USING btree ("ptype","v0");--> statement-breakpoint
CREATE INDEX "idx_ptype_v3" ON "casbin_rule" USING btree ("ptype","v3");--> statement-breakpoint
CREATE INDEX "idx_ptype_v1" ON "casbin_rule" USING btree ("ptype","v1");--> statement-breakpoint
CREATE INDEX "notices_domain_idx" ON "system_notices" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "notices_type_idx" ON "system_notices" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notices_status_idx" ON "system_notices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notices_created_at_idx" ON "system_notices" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "system_user_domain_status_idx" ON "system_user" USING btree ("domain","status");--> statement-breakpoint
CREATE INDEX "system_user_username_idx" ON "system_user" USING btree ("username");--> statement-breakpoint
CREATE INDEX "ts_login_log_time_idx" ON "ts_login_log" USING btree ("login_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ts_login_log_user_time_idx" ON "ts_login_log" USING btree ("user_id","login_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ts_login_log_domain_time_idx" ON "ts_login_log" USING btree ("domain","login_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ts_operation_log_time_idx" ON "ts_operation_log" USING btree ("start_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ts_operation_log_user_time_idx" ON "ts_operation_log" USING btree ("user_id","start_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ts_operation_log_domain_time_idx" ON "ts_operation_log" USING btree ("domain","start_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ts_operation_log_module_time_idx" ON "ts_operation_log" USING btree ("module_name","start_time" DESC NULLS LAST);