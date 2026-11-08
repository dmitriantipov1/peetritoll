CREATE TABLE "material_events" (
	"material_id" integer PRIMARY KEY NOT NULL,
	"kind" text,
	"date" date NOT NULL,
	"start_time" text,
	"place" text,
	"registration_open" boolean DEFAULT false NOT NULL,
	"capacity" integer,
	"archive_after" boolean DEFAULT true NOT NULL,
	CONSTRAINT "material_events_capacity" CHECK ("material_events"."capacity" is null or "material_events"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "material_translations" (
	"material_id" integer NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"lead" text,
	"body" text DEFAULT '' NOT NULL,
	"price_note" text,
	CONSTRAINT "material_translations_material_id_locale_pk" PRIMARY KEY("material_id","locale"),
	CONSTRAINT "material_translations_locale" CHECK ("material_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"locales" text[] NOT NULL,
	"cover_id" uuid,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_type" CHECK ("materials"."type" in ('news', 'event', 'page')),
	CONSTRAINT "materials_state" CHECK ("materials"."state" in ('draft', 'published', 'archived')),
	CONSTRAINT "materials_locales" CHECK ("materials"."locales" <@ array['et', 'en', 'ru']::text[])
);
--> statement-breakpoint
ALTER TABLE "material_events" ADD CONSTRAINT "material_events_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_translations" ADD CONSTRAINT "material_translations_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "material_events_date" ON "material_events" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "material_translations_locale_slug" ON "material_translations" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "materials_type_publish" ON "materials" USING btree ("type","publish_at");