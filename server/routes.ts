import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Fast management endpoints
  app.post("/api/fasts/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const activeFast = await storage.getActiveFast(req.user!.id);
    if (activeFast) {
      return res.status(400).send("Already have an active fast");
    }

    const fast = await storage.createFast(req.user!.id, new Date());
    res.status(201).json(fast);
  });

  app.post("/api/fasts/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const fast = await storage.endFast(parseInt(req.params.id), new Date());
    res.json(fast);
  });

  app.get("/api/fasts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const fasts = await storage.getFasts(req.user!.id);
    res.json(fasts);
  });

  app.post("/api/fasts/:id/meals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const meal = await storage.createMeal(
      parseInt(req.params.id),
      req.body.description
    );
    res.status(201).json(meal);
  });

  app.get("/api/fasts/:id/meals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const meals = await storage.getMealsForFast(parseInt(req.params.id));
    res.json(meals);
  });

  const httpServer = createServer(app);
  return httpServer;
}
