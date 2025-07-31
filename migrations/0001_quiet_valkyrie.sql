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
	"domain" varchar(64) NOT NULL,
	"remark" text,
	CONSTRAINT "system_post_domain_postCode_unique" UNIQUE("domain","post_code")
);
--> statement-breakpoint
CREATE TABLE "system_user_post" (
	"user_id" varchar(64) NOT NULL,
	"post_id" varchar(64) NOT NULL,
	CONSTRAINT "system_user_post_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
