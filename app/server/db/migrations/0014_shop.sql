CREATE TABLE "product_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" integer NOT NULL,
	"locale" text NOT NULL,
	"path" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"size" bigint NOT NULL,
	"uploaded_by" integer,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_files_locale" CHECK ("product_files"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "product_photos" (
	"product_id" integer NOT NULL,
	"media_id" uuid NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_photos_product_id_media_id_pk" PRIMARY KEY("product_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "product_translations" (
	"product_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"lead" text,
	"description" text,
	"facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "product_translations_product_id_locale_pk" PRIMARY KEY("product_id","locale"),
	CONSTRAINT "product_translations_locale" CHECK ("product_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "product_variant_translations" (
	"variant_id" integer NOT NULL,
	"locale" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "product_variant_translations_variant_id_locale_pk" PRIMARY KEY("variant_id","locale"),
	CONSTRAINT "product_variant_translations_locale" CHECK ("product_variant_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"kind" text NOT NULL,
	"price_cents" integer NOT NULL,
	"stock" integer,
	"delivery" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_kind" CHECK ("product_variants"."kind" in ('physical', 'digital')),
	CONSTRAINT "product_variants_price" CHECK ("product_variants"."price_cents" >= 0),
	CONSTRAINT "product_variants_stock" CHECK ("product_variants"."stock" is null or "product_variants"."stock" >= 0),
	CONSTRAINT "product_variants_delivery" CHECK (("product_variants"."kind" = 'physical') = ("product_variants"."delivery" is not null) and ("product_variants"."delivery" is null or "product_variants"."delivery" in ('pickup', 'shipping')))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"locales" text[] NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_state" CHECK ("products"."state" in ('draft', 'published', 'archived')),
	CONSTRAINT "products_locales" CHECK ("products"."locales" <@ array['et', 'en', 'ru']::text[])
);
--> statement-breakpoint
CREATE TABLE "shop_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shop_category_translations" (
	"category_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "shop_category_translations_category_id_locale_pk" PRIMARY KEY("category_id","locale"),
	CONSTRAINT "shop_category_translations_locale" CHECK ("shop_category_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
ALTER TABLE "product_files" ADD CONSTRAINT "product_files_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_files" ADD CONSTRAINT "product_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_photos" ADD CONSTRAINT "product_photos_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_photos" ADD CONSTRAINT "product_photos_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_translations" ADD CONSTRAINT "product_variant_translations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_shop_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."shop_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_category_translations" ADD CONSTRAINT "shop_category_translations_category_id_shop_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."shop_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_files_variant_locale" ON "product_files" USING btree ("variant_id","locale");--> statement-breakpoint
CREATE INDEX "product_photos_sort" ON "product_photos" USING btree ("product_id","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "product_translations_slug" ON "product_translations" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "product_variants_product_sort" ON "product_variants" USING btree ("product_id","sort");--> statement-breakpoint
CREATE INDEX "products_category_sort" ON "products" USING btree ("category_id","sort");--> statement-breakpoint
CREATE INDEX "shop_categories_sort" ON "shop_categories" USING btree ("sort");