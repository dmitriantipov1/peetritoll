CREATE TABLE "request_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"kind" text NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"user_id" integer,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "request_history_kind" CHECK ("request_history"."kind" in ('created', 'status', 'changed', 'notified'))
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"source" text NOT NULL,
	"locale" text NOT NULL,
	"visit_date" date,
	"visit_time" text,
	"guests" integer,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"comment" text,
	"staff_note" text,
	"details" jsonb NOT NULL,
	"calc" jsonb,
	"original" jsonb NOT NULL,
	"consent_at" timestamp with time zone,
	"policy_version" text,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requests_type" CHECK ("requests"."type" in ('table', 'banquet', 'group', 'lunch', 'tour', 'event')),
	CONSTRAINT "requests_status" CHECK ("requests"."status" in ('new', 'in_progress', 'confirmed', 'cancelled')),
	CONSTRAINT "requests_source" CHECK ("requests"."source" in ('site', 'admin')),
	CONSTRAINT "requests_locale" CHECK ("requests"."locale" in ('et', 'en', 'ru')),
	CONSTRAINT "requests_guests_positive" CHECK ("requests"."guests" is null or "requests"."guests" > 0),
	CONSTRAINT "requests_site_consent" CHECK ("requests"."source" <> 'site' or ("requests"."consent_at" is not null and "requests"."policy_version" is not null))
);
--> statement-breakpoint
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "request_history_request_at" ON "request_history" USING btree ("request_id","at");--> statement-breakpoint
CREATE INDEX "requests_status_created" ON "requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "requests_type_created" ON "requests" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "requests_visit_date" ON "requests" USING btree ("visit_date");--> statement-breakpoint
-- Номера заявок начинаются с 1001: «№ 1001» выглядит как номер заявки, а не как «№ 3»
ALTER SEQUENCE "requests_id_seq" RESTART WITH 1001;
