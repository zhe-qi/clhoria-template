CREATE TYPE "public"."type" AS ENUM('dir', 'menu', 'button');--> statement-breakpoint
CREATE TABLE "admin_menu" (
	"id" uuid PRIMARY KEY NOT NULL,
	"path" varchar(100) NOT NULL,
	"name" varchar(50) NOT NULL,
	"type" "type" NOT NULL,
	"parent_id" uuid,
	"method" varchar(10) DEFAULT '',
	"icon" varchar(50),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" integer DEFAULT 1,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"roles" varchar(64)[] DEFAULT '{}',
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "casbin_rule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ptype" varchar(254),
	"v0" varchar(254),
	"v1" varchar(254),
	"v2" varchar(254),
	"v3" varchar(254),
	"v4" varchar(254),
	"v5" varchar(254)
);
--> statement-breakpoint
CREATE TABLE "client_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "client_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "status_index" ON "admin_roles" USING btree ("status");