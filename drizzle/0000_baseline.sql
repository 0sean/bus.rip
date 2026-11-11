-- Adopt the existing operator table without deleting or recreating its data.
CREATE TABLE IF NOT EXISTS "NocLine" (
	"id" serial PRIMARY KEY NOT NULL,
	"lineNo" integer NOT NULL,
	"nocCode" text NOT NULL,
	"publicName" text NOT NULL,
	"referenceName" text NOT NULL,
	"hasMissingLocationData" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "NocLine_lineNo_key" ON "NocLine" USING btree ("lineNo");
--> statement-breakpoint
-- Existing databases may predate the location-data flag.
ALTER TABLE "NocLine" ADD COLUMN IF NOT EXISTS "hasMissingLocationData" boolean DEFAULT false NOT NULL;
