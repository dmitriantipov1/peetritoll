-- Тема новости (решение 13.11.2026): фильтр «Ресторан / Музей / Мероприятия» на странице «Новости».
-- Необязательна; у мероприятий и страниц пусто.
ALTER TABLE "materials" ADD COLUMN "topic" text;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_topic" CHECK ("materials"."topic" is null or "materials"."topic" in ('restaurant', 'museum', 'events'));