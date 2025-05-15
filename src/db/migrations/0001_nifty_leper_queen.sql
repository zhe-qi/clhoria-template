CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" varchar(64) NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "admin_users" DROP COLUMN "roles";