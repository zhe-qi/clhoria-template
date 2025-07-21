CREATE TABLE "global_params" (
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
	"domain" varchar(50) NOT NULL,
	CONSTRAINT "global_params_key_unique" UNIQUE("key")
);
