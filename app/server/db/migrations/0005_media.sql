CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sizes" integer[] NOT NULL,
	"source" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_folder_unique" UNIQUE("folder")
);
--> statement-breakpoint
ALTER TABLE "dishes" ADD COLUMN "photo_id" uuid;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;