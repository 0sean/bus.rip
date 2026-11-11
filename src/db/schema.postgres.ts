import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Preserve the existing PostgreSQL table and column names.
export const nocLines = pgTable(
  "NocLine",
  {
    id: serial("id").primaryKey(),
    lineNo: integer("lineNo").notNull(),
    nocCode: text("nocCode").notNull(),
    publicName: text("publicName").notNull(),
    referenceName: text("referenceName").notNull(),
    hasMissingLocationData: boolean("hasMissingLocationData")
      .notNull()
      .default(false),
  },
  (table) => [uniqueIndex("NocLine_lineNo_key").on(table.lineNo)],
);

export type NocLine = typeof nocLines.$inferSelect;
export type NewNocLine = typeof nocLines.$inferInsert;
