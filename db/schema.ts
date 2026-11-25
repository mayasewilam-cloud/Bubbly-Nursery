import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const clubs = sqliteTable("clubs", {
  owner: text("owner").primaryKey(),
  revision: integer("revision").notNull(),
  document: text("document").notNull(),
});

export const clubAccess = sqliteTable("club_access", {
  email: text("email").primaryKey(),
  owner: text("owner").notNull(),
  assignment: text("assignment").notNull(),
});
