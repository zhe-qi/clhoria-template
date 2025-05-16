CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
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
CREATE TABLE "client_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "client_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "menu" (
	"id" uuid PRIMARY KEY NOT NULL,
	"component" varchar(255),
	"meta" jsonb,
	"resource" varchar(255),
	"action" varchar(64),
	"type" integer NOT NULL,
	"parent_id" varchar(64),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" integer DEFAULT 1,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
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
CREATE TABLE "user_to_roles" (
	"user_id" uuid NOT NULL,
	"role_id" varchar(64) NOT NULL,
	CONSTRAINT "user_to_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "user_to_roles" ADD CONSTRAINT "user_to_roles_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_to_roles" ADD CONSTRAINT "user_to_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ptype_v0" ON "casbin_rule" USING btree ("ptype","v0");--> statement-breakpoint
CREATE INDEX "idx_ptype_v0_v1_v2" ON "casbin_rule" USING btree ("ptype","v0","v1","v2");--> statement-breakpoint
CREATE INDEX "status_index" ON "roles" USING btree ("status");