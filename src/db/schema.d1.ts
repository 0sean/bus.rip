import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const nocLines = sqliteTable(
  "NocLine",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lineNo: integer("lineNo").notNull(),
    nocCode: text("nocCode").notNull(),
    publicName: text("publicName").notNull(),
    referenceName: text("referenceName").notNull(),
    hasMissingLocationData: integer("hasMissingLocationData", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
  },
  (table) => [uniqueIndex("NocLine_lineNo_key").on(table.lineNo)],
);

export type NocLine = typeof nocLines.$inferSelect;
export type NewNocLine = typeof nocLines.$inferInsert;
