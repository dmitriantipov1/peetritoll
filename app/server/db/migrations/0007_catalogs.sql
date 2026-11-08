CREATE TABLE "catalog_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_categories_kind" CHECK ("catalog_categories"."kind" in ('banquet', 'group'))
);
--> statement-breakpoint
CREATE TABLE "catalog_category_translations" (
	"category_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "catalog_category_translations_category_id_locale_pk" PRIMARY KEY("category_id","locale"),
	CONSTRAINT "catalog_category_translations_locale" CHECK ("catalog_category_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "catalog_dish_translations" (
	"dish_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "catalog_dish_translations_dish_id_locale_pk" PRIMARY KEY("dish_id","locale"),
	CONSTRAINT "catalog_dish_translations_locale" CHECK ("catalog_dish_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "catalog_dishes" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"price_cents" integer NOT NULL,
	"previous_price_cents" integer,
	"price_changed_at" timestamp with time zone,
	"is_available" boolean DEFAULT true NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_dishes_price_positive" CHECK ("catalog_dishes"."price_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "catalog_category_translations" ADD CONSTRAINT "catalog_category_translations_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_dish_translations" ADD CONSTRAINT "catalog_dish_translations_dish_id_catalog_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."catalog_dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_dishes" ADD CONSTRAINT "catalog_dishes_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_dishes" ADD CONSTRAINT "catalog_dishes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_categories_kind_sort" ON "catalog_categories" USING btree ("kind","sort");--> statement-breakpoint
CREATE INDEX "catalog_dishes_category_sort" ON "catalog_dishes" USING btree ("category_id","sort");