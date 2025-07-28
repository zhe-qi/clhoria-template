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
