import { IStorage } from "./types";
import { User, InsertUser, Fast, Meal } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private fasts: Map<number, Fast>;
  private meals: Map<number, Meal>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.fasts = new Map();
    this.meals = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    console.log('Getting user by id:', id);
    const user = this.users.get(id);
    console.log('Found user:', user ? 'yes' : 'no');
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log('Getting user by username:', username);
    const user = Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
    console.log('Found user:', user ? 'yes' : 'no');
    if (user) {
      console.log('User data:', { ...user, password: '[REDACTED]' });
    }
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    console.log('Created new user:', { ...user, password: '[REDACTED]' });
    return user;
  }

  async createFast(userId: number, startTime: Date): Promise<Fast> {
    const id = this.currentId++;
    const fast: Fast = {
      id,
      userId,
      startTime,
      endTime: null,
      isActive: true,
      note: null,
    };
    this.fasts.set(id, fast);
    return fast;
  }

  async getActiveFast(userId: number): Promise<Fast | undefined> {
    return Array.from(this.fasts.values()).find(
      (fast) => fast.userId === userId && fast.isActive
    );
  }

  async endFast(id: number, endTime: Date, note?: string): Promise<Fast> {
    const fast = this.fasts.get(id);
    if (!fast) throw new Error("Fast not found");

    const updatedFast = {
      ...fast,
      endTime,
      isActive: false,
      note: note || null,
    };
    this.fasts.set(id, updatedFast);
    return updatedFast;
  }

  async getFasts(userId: number): Promise<Fast[]> {
    return Array.from(this.fasts.values())
      .filter(fast => fast.userId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async createMeal(fastId: number, description: string): Promise<Meal> {
    const id = this.currentId++;
    const meal: Meal = {
      id,
      fastId,
      description,
      timestamp: new Date(),
    };
    this.meals.set(id, meal);
    return meal;
  }

  async getMealsForFast(fastId: number): Promise<Meal[]> {
    return Array.from(this.meals.values())
      .filter(meal => meal.fastId === fastId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export const storage = new MemStorage();