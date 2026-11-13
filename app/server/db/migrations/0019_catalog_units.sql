-- Единица блюда банкетного каталога (решение 13.11.2026): «1 кг салата на 10 гостей», а не 10 кг.
-- По умолчанию — порция на одного гостя, как было.
ALTER TABLE "catalog_dishes" ADD COLUMN "unit" text DEFAULT 'portion' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_dishes" ADD COLUMN "serves_guests" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_dishes" ADD CONSTRAINT "catalog_dishes_unit" CHECK ("catalog_dishes"."unit" in ('portion', 'kg', 'pcs', 'l', 'dish'));--> statement-breakpoint
ALTER TABLE "catalog_dishes" ADD CONSTRAINT "catalog_dishes_serves" CHECK ("catalog_dishes"."serves_guests" >= 1);