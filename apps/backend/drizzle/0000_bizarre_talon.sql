CREATE TYPE "public"."workspace_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."workspace_file_kind" AS ENUM('file', 'folder');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(120) NOT NULL,
	"password_hash" text NOT NULL,
	"github_id" varchar(128),
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"track_key" varchar(64) NOT NULL,
	"description" text,
	"status" "workspace_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(64) NOT NULL,
	"parent_id" uuid,
	"name" varchar(160) NOT NULL,
	"kind" "workspace_file_kind" NOT NULL,
	"path" text NOT NULL,
	"content" jsonb,
	"content_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_files" ADD CONSTRAINT "workspace_files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_github_id_uq" ON "users" USING btree ("github_id");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "workspaces_track_key_idx" ON "workspaces" USING btree ("track_key");--> statement-breakpoint
CREATE INDEX "workspaces_status_idx" ON "workspaces" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspaces_updated_at_idx" ON "workspaces" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_files_path_uq" ON "workspace_files" USING btree ("workspace_id","path");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_files_parent_id_name_uq" ON "workspace_files" USING btree ("parent_id","name","workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_files_workspace_kind_idx" ON "workspace_files" USING btree ("workspace_id","kind");--> statement-breakpoint
CREATE INDEX "workspace_files_workspace_parent_idx" ON "workspace_files" USING btree ("workspace_id","parent_id");