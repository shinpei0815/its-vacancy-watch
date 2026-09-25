import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const watches = sqliteTable(
  "watches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerId: text("owner_id").notNull(),
    facility: text("facility").notNull(),
    facilityLabel: text("facility_label"),
    checkIn: text("check_in").notNull(),
    nights: integer("nights").notNull().default(1),
    guests: integer("guests").notNull().default(2),
    email: text("email").notNull(),
    status: text("status").notNull().default("waiting"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    notified: integer("notified", { mode: "boolean" }).notNull().default(false),
    lastCheckedAt: text("last_checked_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_watches_owner_id").on(table.ownerId),
    index("idx_watches_active").on(table.active),
  ]
);
