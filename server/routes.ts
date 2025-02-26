import { setupAuth } from "./auth";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Fast management endpoints
  app.get("/api/fasts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = Number(req.user!.id); // Ensure userId is a number
    console.log('GET /api/fasts - User:', {
      id: userId,
      idType: typeof userId,
      username: req.user!.username
    });

    try {
      const fasts = await storage.getFasts(userId);
      console.log(`Found ${fasts.length} fasts for user ${userId}`);
      res.json(fasts);
    } catch (error) {
      console.error('Error getting fasts:', error);
      res.status(500).json({ message: "Failed to get fasts" });
    }
  });

  app.post("/api/fasts/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = Number(req.user!.id);
    console.log('POST /api/fasts/start - User:', {
      id: userId,
      idType: typeof userId,
      username: req.user!.username
    });

    try {
      const activeFast = await storage.getActiveFast(userId);
      if (activeFast) {
        return res.status(400).json({ message: "Already have an active fast" });
      }

      const fast = await storage.createFast(userId, new Date());
      console.log('Created new fast:', fast.id, 'for user:', userId);
      res.json(fast);
    } catch (error) {
      console.error('Error starting fast:', error);
      res.status(500).json({ message: "Failed to start fast" });
    }
  });

  app.post("/api/fasts/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = Number(req.user!.id);
    const fastId = Number(req.params.id);
    console.log('POST /api/fasts/end - User:', {
      id: userId,
      idType: typeof userId,
      username: req.user!.username,
      fastId: fastId
    });

    try {
      const fast = await storage.getFastById(fastId);

      if (!fast) {
        return res.status(404).json({ message: "Fast not found" });
      }

      if (fast.userId !== userId) {
        console.log('Unauthorized: fast belongs to user', fast.userId, 'but requested by', userId);
        return res.status(403).json({ message: "Not authorized to end this fast" });
      }

      const updatedFast = await storage.endFast(fastId, new Date(), req.body.note);
      console.log('Ended fast:', updatedFast.id);
      res.json(updatedFast);
    } catch (error) {
      console.error('Error ending fast:', error);
      res.status(500).json({ message: "Failed to end fast" });
    }
  });

  app.get("/api/fasts/:id/meals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = Number(req.user!.id);
    const fastId = Number(req.params.id);
    console.log('GET /api/fasts/meals - User:', {
      id: userId,
      idType: typeof userId,
      username: req.user!.username,
      fastId: fastId
    });

    try {
      const fast = await storage.getFastById(fastId);

      if (!fast) {
        return res.status(404).json({ message: "Fast not found" });
      }

      if (fast.userId !== userId) {
        console.log('Unauthorized: fast belongs to user', fast.userId, 'but requested by', userId);
        return res.status(403).json({ message: "Not authorized to view meals for this fast" });
      }

      const meals = await storage.getMealsForFast(fastId);
      console.log('Found', meals.length, 'meals for fast:', fastId);
      res.json(meals);
    } catch (error) {
      console.error('Error getting meals:', error);
      res.status(500).json({ message: "Failed to get meals" });
    }
  });

  app.post("/api/fasts/:id/meals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = Number(req.user!.id);
    const fastId = Number(req.params.id);
    console.log('POST /api/fasts/meals - User:', {
      id: userId,
      idType: typeof userId,
      username: req.user!.username,
      fastId: fastId
    });

    try {
      const fast = await storage.getFastById(fastId);

      if (!fast) {
        return res.status(404).json({ message: "Fast not found" });
      }

      if (fast.userId !== userId) {
        console.log('Unauthorized: fast belongs to user', fast.userId, 'but requested by', userId);
        return res.status(403).json({ message: "Not authorized to add meals to this fast" });
      }

      const meal = await storage.createMeal(fastId, req.body.description);
      console.log('Created meal for fast:', fastId);
      res.json(meal);
    } catch (error) {
      console.error('Error creating meal:', error);
      res.status(500).json({ message: "Failed to create meal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}