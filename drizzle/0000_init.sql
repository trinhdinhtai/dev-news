CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"content_language" text,
	"published_at" timestamp with time zone,
	"metrics" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "items_source_external_id" UNIQUE("source_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "source_rankings" (
	"source_id" text NOT NULL,
	"time_window" text NOT NULL,
	"filter" text DEFAULT '' NOT NULL,
	"rank" integer NOT NULL,
	"item_id" integer NOT NULL,
	"metrics" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "source_rankings_source_id_time_window_filter_rank_pk" PRIMARY KEY("source_id","time_window","filter","rank")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"regional_language" text,
	"last_succeeded_at" timestamp with time zone,
	"last_error" text,
	"last_error_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_rankings" ADD CONSTRAINT "source_rankings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_rankings" ADD CONSTRAINT "source_rankings_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;