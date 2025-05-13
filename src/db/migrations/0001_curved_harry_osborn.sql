CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" text,
	"updated_at" text,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
