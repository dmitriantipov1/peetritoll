CREATE TABLE "dish_dish_labels" (
	"dish_id" integer NOT NULL,
	"label_id" integer NOT NULL,
	CONSTRAINT "dish_dish_labels_dish_id_label_id_pk" PRIMARY KEY("dish_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "dish_label_translations" (
	"label_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "dish_label_translations_label_id_locale_pk" PRIMARY KEY("label_id","locale"),
	CONSTRAINT "dish_label_translations_locale" CHECK ("locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "dish_labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dish_labels_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "dish_dish_labels" ADD CONSTRAINT "dish_dish_labels_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_dish_labels" ADD CONSTRAINT "dish_dish_labels_label_id_dish_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."dish_labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_label_translations" ADD CONSTRAINT "dish_label_translations_label_id_dish_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."dish_labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Перенос данных: поля «Новинка» и «Детское» становятся отметками справочника (дописано вручную)
INSERT INTO "dish_labels" ("key", "sort") VALUES ('new', 0), ('kids', 1);--> statement-breakpoint
INSERT INTO "dish_label_translations" ("label_id", "locale", "name")
SELECT l.id, t.locale, t.name FROM "dish_labels" l JOIN (VALUES
  ('new', 'ru', 'Новинка'), ('new', 'et', 'Uus'), ('new', 'en', 'New'),
  ('kids', 'ru', 'Детское'), ('kids', 'et', 'Lastele'), ('kids', 'en', 'For kids')
) AS t(key, locale, name) ON t.key = l.key;--> statement-breakpoint
INSERT INTO "dish_dish_labels" ("dish_id", "label_id")
SELECT d.id, l.id FROM "dishes" d JOIN "dish_labels" l ON l.key = 'new' WHERE d.is_new;--> statement-breakpoint
INSERT INTO "dish_dish_labels" ("dish_id", "label_id")
SELECT d.id, l.id FROM "dishes" d JOIN "dish_labels" l ON l.key = 'kids' WHERE d.is_kids;--> statement-breakpoint
ALTER TABLE "dishes" DROP COLUMN "is_new";--> statement-breakpoint
ALTER TABLE "dishes" DROP COLUMN "is_kids";