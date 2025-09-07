CREATE TYPE "public"."task_type" AS ENUM('SYSTEM', 'BUSINESS');--> statement-breakpoint
CREATE TABLE "system_job_execution_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64),
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"scheduled_job_id" varchar(36) NOT NULL,
	"job_name" varchar(128) NOT NULL,
	"queue_name" varchar(64) NOT NULL,
	"bull_job_id" varchar(128),
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"started_at" varchar(32),
	"completed_at" varchar(32),
	"duration_ms" integer,
	"job_data" jsonb DEFAULT '{}'::jsonb,
	"result_data" jsonb,
	"error_message" text,
	"error_stack" text,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 0,
	"is_manual_trigger" integer DEFAULT 0,
	"triggered_by" varchar(36),
	"progress" integer DEFAULT 0,
	"progress_description" text,
	"execution_node" varchar(128),
	"memory_usage_kb" integer,
	"cpu_time_ms" integer
);
--> statement-breakpoint
CREATE TABLE "system_scheduled_job" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp,
	"created_by" varchar(64),
	"updated_at" timestamp,
	"updated_by" varchar(64),
	"name" varchar(128) NOT NULL,
	"description" text,
	"cron_expression" varchar(64),
	"interval_ms" integer,
	"task_type" "task_type" DEFAULT 'BUSINESS' NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"queue_name" varchar(64) NOT NULL,
	"job_name" varchar(128) NOT NULL,
	"job_data" jsonb DEFAULT '{}'::jsonb,
	"is_deletable" integer DEFAULT 1 NOT NULL,
	"priority" integer DEFAULT 5,
	"max_retries" integer DEFAULT 3,
	"timeout_seconds" integer DEFAULT 300,
	"next_run_at" varchar(32),
	"last_run_at" varchar(32),
	"last_run_status" varchar(16),
	"last_run_error" text,
	"total_runs" integer DEFAULT 0,
	"success_runs" integer DEFAULT 0,
	"failed_runs" integer DEFAULT 0,
	CONSTRAINT "system_scheduled_job_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX "system_job_execution_log_scheduled_job_id_idx" ON "system_job_execution_log" USING btree ("scheduled_job_id");--> statement-breakpoint
CREATE INDEX "system_job_execution_log_job_name_idx" ON "system_job_execution_log" USING btree ("job_name");--> statement-breakpoint
CREATE INDEX "system_job_execution_log_status_idx" ON "system_job_execution_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "system_job_execution_log_started_at_idx" ON "system_job_execution_log" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "system_job_execution_log_queue_name_idx" ON "system_job_execution_log" USING btree ("queue_name");--> statement-breakpoint
CREATE INDEX "system_job_execution_log_bull_job_id_idx" ON "system_job_execution_log" USING btree ("bull_job_id");--> statement-breakpoint
CREATE INDEX "system_job_execution_log_job_time_idx" ON "system_job_execution_log" USING btree ("scheduled_job_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "system_scheduled_job_name_idx" ON "system_scheduled_job" USING btree ("name");--> statement-breakpoint
CREATE INDEX "system_scheduled_job_task_type_idx" ON "system_scheduled_job" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "system_scheduled_job_status_idx" ON "system_scheduled_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "system_scheduled_job_queue_name_idx" ON "system_scheduled_job" USING btree ("queue_name");--> statement-breakpoint
CREATE INDEX "system_scheduled_job_next_run_at_idx" ON "system_scheduled_job" USING btree ("next_run_at");