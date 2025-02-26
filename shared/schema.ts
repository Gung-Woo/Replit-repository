import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull(),
  avatar: text("avatar").notNull(),
});

export const fasts = pgTable("fasts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  isActive: boolean("isActive").notNull().default(true),
  note: text("note"),
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  fastId: integer("fastId").notNull(),
  description: text("description").notNull(),
  mealTime: timestamp("mealTime").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertFastSchema = createInsertSchema(fasts);
export const insertMealSchema = createInsertSchema(meals);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Fast = typeof fasts.$inferSelect;
export type Meal = typeof meals.$inferSelect;