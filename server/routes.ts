import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Fast management endpoints
  app.post("/api/fasts/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    console.log('Starting fast for user:', req.user!.id);

    const activeFast = await storage.getActiveFast(req.user!.id);
    if (activeFast) {
      return res.status(400).send("Already have an active fast");
    }

    const fast = await storage.createFast(req.user!.id, new Date());
    res.status(201).json(fast);
  });

  app.post("/api/fasts/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    console.log('Ending fast for user:', req.user!.id, 'fast id:', req.params.id);

    // Verify fast belongs to user
    const fast = await storage.getFastById(parseInt(req.params.id));
    if (!fast || fast.userId !== req.user!.id) {
      console.log('Fast not found or unauthorized:', fast?.userId, 'vs user:', req.user!.id);
      return res.status(403).send("Not authorized to end this fast");
    }

    const updatedFast = await storage.endFast(
      parseInt(req.params.id), 
      new Date(),
      req.body.note
    );
    res.json(updatedFast);
  });

  app.get("/api/fasts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    console.log('Getting fasts for user:', req.user!.id);

    const fasts = await storage.getFasts(req.user!.id);
    console.log('Found fasts:', fasts.length, 'for user:', req.user!.id);
    res.json(fasts);
  });

  app.post("/api/fasts/:id/meals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    console.log('Adding meal for user:', req.user!.id, 'fast id:', req.params.id);

    // Verify fast belongs to user
    const fast = await storage.getFastById(parseInt(req.params.id));
    if (!fast || fast.userId !== req.user!.id) {
      console.log('Fast not found or unauthorized:', fast?.userId, 'vs user:', req.user!.id);
      return res.status(403).send("Not authorized to add meals to this fast");
    }

    const meal = await storage.createMeal(
      parseInt(req.params.id),
      req.body.description
    );
    res.status(201).json(meal);
  });

  app.get("/api/fasts/:id/meals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    console.log('Getting meals for user:', req.user!.id, 'fast id:', req.params.id);

    // Verify fast belongs to user
    const fast = await storage.getFastById(parseInt(req.params.id));
    if (!fast || fast.userId !== req.user!.id) {
      console.log('Fast not found or unauthorized:', fast?.userId, 'vs user:', req.user!.id);
      return res.status(403).send("Not authorized to view meals for this fast");
    }

    const meals = await storage.getMealsForFast(parseInt(req.params.id));
    console.log('Found meals:', meals.length, 'for fast:', req.params.id);
    res.json(meals);
  });

  const httpServer = createServer(app);
  return httpServer;
}