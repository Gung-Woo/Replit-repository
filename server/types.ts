import { User, InsertUser, Fast, Meal } from "@shared/schema";
import type { Store } from "express-session";

export interface IStorage {
  sessionStore: Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Fast operations
  createFast(userId: number, startTime: Date): Promise<Fast>;
  getActiveFast(userId: number): Promise<Fast | undefined>;
  endFast(id: number, endTime: Date): Promise<Fast>;
  getFasts(userId: number): Promise<Fast[]>;
  
  // Meal operations
  createMeal(fastId: number, description: string): Promise<Meal>;
  getMealsForFast(fastId: number): Promise<Meal[]>;
}
