CREATE TABLE "banquet_set_dishes" (
	"tier" text NOT NULL,
	"dish_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "banquet_set_dishes_tier_dish_id_pk" PRIMARY KEY("tier","dish_id"),
	CONSTRAINT "banquet_set_dishes_tier" CHECK ("banquet_set_dishes"."tier" in ('basic', 'middle', 'premium'))
);
--> statement-breakpoint
CREATE TABLE "banquet_set_translations" (
	"tier" text NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "banquet_set_translations_tier_locale_pk" PRIMARY KEY("tier","locale"),
	CONSTRAINT "banquet_set_translations_tier" CHECK ("banquet_set_translations"."tier" in ('basic', 'middle', 'premium')),
	CONSTRAINT "banquet_set_translations_locale" CHECK ("banquet_set_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
ALTER TABLE "banquet_set_dishes" ADD CONSTRAINT "banquet_set_dishes_dish_id_catalog_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."catalog_dishes"("id") ON DELETE cascade ON UPDATE no action;