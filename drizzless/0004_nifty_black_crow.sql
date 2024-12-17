CREATE TABLE IF NOT EXISTS "code" (
	"id" text PRIMARY KEY NOT NULL,
	"totalTemplates" integer NOT NULL,
	"usedTemplates" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "codesAndUsers" (
	"codeId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "codeId" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "codesAndUsers" ADD CONSTRAINT "codesAndUsers_codeId_code_id_fk" FOREIGN KEY ("codeId") REFERENCES "public"."code"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "codesAndUsers" ADD CONSTRAINT "codesAndUsers_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project" ADD CONSTRAINT "project_codeId_code_id_fk" FOREIGN KEY ("codeId") REFERENCES "public"."code"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN IF EXISTS "pages";