CREATE TABLE "diet_tag_translations" (
	"tag_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "diet_tag_translations_tag_id_locale_pk" PRIMARY KEY("tag_id","locale"),
	CONSTRAINT "diet_tag_translations_locale" CHECK ("locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "diet_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diet_tags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "dish_diet_tags" (
	"dish_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "dish_diet_tags_dish_id_tag_id_pk" PRIMARY KEY("dish_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "dish_portion_translations" (
	"portion_id" integer NOT NULL,
	"locale" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "dish_portion_translations_portion_id_locale_pk" PRIMARY KEY("portion_id","locale"),
	CONSTRAINT "dish_portion_translations_locale" CHECK ("locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "dish_portions" (
	"id" serial PRIMARY KEY NOT NULL,
	"dish_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"price_cents" integer NOT NULL,
	CONSTRAINT "dish_portions_price_positive" CHECK ("dish_portions"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "dish_translations" (
	"dish_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "dish_translations_dish_id_locale_pk" PRIMARY KEY("dish_id","locale"),
	CONSTRAINT "dish_translations_locale" CHECK ("locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "dishes" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"photo" text,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_kids" boolean DEFAULT false NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "menu_category_translations" (
	"category_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "menu_category_translations_category_id_locale_pk" PRIMARY KEY("category_id","locale"),
	CONSTRAINT "menu_category_translations_locale" CHECK ("locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
ALTER TABLE "diet_tag_translations" ADD CONSTRAINT "diet_tag_translations_tag_id_diet_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."diet_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_diet_tags" ADD CONSTRAINT "dish_diet_tags_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_diet_tags" ADD CONSTRAINT "dish_diet_tags_tag_id_diet_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."diet_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_portion_translations" ADD CONSTRAINT "dish_portion_translations_portion_id_dish_portions_id_fk" FOREIGN KEY ("portion_id") REFERENCES "public"."dish_portions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_portions" ADD CONSTRAINT "dish_portions_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_translations" ADD CONSTRAINT "dish_translations_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_category_translations" ADD CONSTRAINT "menu_category_translations_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dish_portions_dish" ON "dish_portions" USING btree ("dish_id");--> statement-breakpoint
CREATE INDEX "dishes_category_sort" ON "dishes" USING btree ("category_id","sort");