import { IStorage } from "./types";
import { users, type User, type InsertUser, type Fast, type Meal, fasts, meals } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    console.log('Getting user by id:', id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    console.log('Found user:', user ? user.username : 'not found');
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log('Getting user by username:', username);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()));
    console.log('Found user:', user ? user.username : 'not found');
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log('Creating user:', {...insertUser, password: '[REDACTED]'});
    const [user] = await db
      .insert(users)
      .values({...insertUser, username: insertUser.username.toLowerCase()})
      .returning();
    console.log('Created user:', user.username, 'with ID:', user.id);
    return user;
  }

  async getFastById(id: number): Promise<Fast | undefined> {
    console.log('Getting fast by id:', id);
    const [fast] = await db.select().from(fasts).where(eq(fasts.id, id));
    console.log('Found fast:', fast ? {id: fast.id, userId: fast.userId} : 'not found');
    return fast;
  }

  async createFast(userId: number, startTime: Date): Promise<Fast> {
    userId = Number(userId); // Ensure userId is numeric
    console.log('Creating fast for user:', userId);
    const [fast] = await db
      .insert(fasts)
      .values({
        userId,
        startTime,
        isActive: true,
      })
      .returning();
    console.log('Created fast:', {id: fast.id, userId: fast.userId});
    return fast;
  }

  async getActiveFast(userId: number): Promise<Fast | undefined> {
    userId = Number(userId); // Ensure userId is numeric
    console.log('Getting active fast for user:', userId);
    const [fast] = await db
      .select()
      .from(fasts)
      .where(
        and(
          eq(fasts.userId, userId),
          eq(fasts.isActive, true)
        )
      );
    console.log('Found active fast:', fast ? {id: fast.id, userId: fast.userId} : 'not found');
    return fast;
  }

  async endFast(id: number, endTime: Date, note?: string): Promise<Fast> {
    console.log('Ending fast:', id);
    const [fast] = await db
      .update(fasts)
      .set({ endTime, isActive: false, note: note || null })
      .where(eq(fasts.id, id))
      .returning();
    console.log('Updated fast:', {id: fast.id, userId: fast.userId});
    return fast;
  }

  async getFasts(userId: number): Promise<Fast[]> {
    userId = Number(userId); // Ensure userId is numeric
    console.log('Getting all fasts for user:', userId);
    const userFasts = await db
      .select()
      .from(fasts)
      .where(eq(fasts.userId, userId))
      .orderBy(fasts.startTime);
    console.log('Found fasts:', userFasts.map(f => ({id: f.id, userId: f.userId})));
    return userFasts;
  }

  async createMeal(fastId: number, description: string): Promise<Meal> {
    console.log('Creating meal for fast:', fastId);
    const [meal] = await db
      .insert(meals)
      .values({
        fastId,
        description,
        timestamp: new Date(),
      })
      .returning();
    console.log('Created meal:', {id: meal.id, fastId: meal.fastId});
    return meal;
  }

  async getMealsForFast(fastId: number): Promise<Meal[]> {
    console.log('Getting meals for fast:', fastId);
    const fastMeals = await db
      .select()
      .from(meals)
      .where(eq(meals.fastId, fastId))
      .orderBy(meals.timestamp);
    console.log('Found meals:', fastMeals.map(m => ({
      id: m.id,
      fastId: m.fastId,
      timestamp: m.timestamp.toISOString(),
      description: m.description
    })));
    return fastMeals;
  }
}

export const storage = new DatabaseStorage();