CREATE TABLE "gallery_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_category_translations" (
	"category_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "gallery_category_translations_category_id_locale_pk" PRIMARY KEY("category_id","locale"),
	CONSTRAINT "gallery_category_translations_locale" CHECK ("gallery_category_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "gallery_photo_translations" (
	"photo_id" integer NOT NULL,
	"locale" text NOT NULL,
	"caption" text NOT NULL,
	CONSTRAINT "gallery_photo_translations_photo_id_locale_pk" PRIMARY KEY("photo_id","locale"),
	CONSTRAINT "gallery_photo_translations_locale" CHECK ("gallery_photo_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "gallery_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"media_id" uuid NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gallery_category_translations" ADD CONSTRAINT "gallery_category_translations_category_id_gallery_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."gallery_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_photo_translations" ADD CONSTRAINT "gallery_photo_translations_photo_id_gallery_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."gallery_photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_category_id_gallery_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."gallery_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gallery_photos_sort" ON "gallery_photos" USING btree ("sort");--> statement-breakpoint
-- Четыре категории из прототипа (restaurant.html, звонок 06.11.2026)
INSERT INTO "gallery_categories" ("id", "sort") VALUES (1, 0), (2, 1), (3, 2), (4, 3);--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('gallery_categories', 'id'), 4);--> statement-breakpoint
INSERT INTO "gallery_category_translations" ("category_id", "locale", "name") VALUES
  (1, 'et', 'Interjöör ja eksterjöör'), (1, 'en', 'Interior and exterior'), (1, 'ru', 'Интерьер и экстерьер'),
  (2, 'et', 'Meie road'), (2, 'en', 'Our dishes'), (2, 'ru', 'Наши блюда'),
  (3, 'et', 'Banketid ja furšeed'), (3, 'en', 'Banquets and buffets'), (3, 'ru', 'Банкеты и фуршеты'),
  (4, 'et', 'Üritused ja külalised'), (4, 'en', 'Events and guests'), (4, 'ru', 'Мероприятия и гости');
