CREATE TABLE "raw_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"url" text NOT NULL,
	"status" integer NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "raw_responses" ADD CONSTRAINT "raw_responses_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "raw_responses_source_fetched_at" ON "raw_responses" USING btree ("source_id","fetched_at");