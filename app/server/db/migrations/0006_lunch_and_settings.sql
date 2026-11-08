CREATE TABLE "lunch_day_translations" (
	"date" date NOT NULL,
	"locale" text NOT NULL,
	"soup" text,
	"main" text,
	CONSTRAINT "lunch_day_translations_date_locale_pk" PRIMARY KEY("date","locale"),
	CONSTRAINT "lunch_day_translations_locale" CHECK ("lunch_day_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "lunch_days" (
	"date" date PRIMARY KEY NOT NULL,
	"soup_cents" integer,
	"main_cents" integer,
	"full_cents" integer,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lunch_days_prices_positive" CHECK (coalesce("lunch_days"."soup_cents", 0) >= 0 and coalesce("lunch_days"."main_cents", 0) >= 0 and coalesce("lunch_days"."full_cents", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lunch_day_translations" ADD CONSTRAINT "lunch_day_translations_date_lunch_days_date_fk" FOREIGN KEY ("date") REFERENCES "public"."lunch_days"("date") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "lunch_days" ADD CONSTRAINT "lunch_days_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;