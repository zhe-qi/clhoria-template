CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "casbin_rule" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "client_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DROP TABLE "users" CASCADE;