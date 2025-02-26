import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import express, { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Configure multer for file upload
const multerStorage = multer.diskStorage({
  destination: function (_req: any, _file: any, cb: any) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (_req: any, file: any, cb: any) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: multerStorage });

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Ensure uploads directory exists at startup
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  // Ensure we have a strong session secret
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          console.log('Login failed for username:', username);
          return done(null, false, { message: "Invalid username or password" });
        }
        console.log('Login successful for user:', user.id);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user to session:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user from session:', id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }
      console.log('User deserialized successfully:', user.id);
      done(null, user);
    } catch (err) {
      console.error('Error deserializing user:', err);
      done(err);
    }
  });

  app.get("/api/user", (req, res) => {
    console.log('GET /api/user - isAuthenticated:', req.isAuthenticated(), 'user:', req.user?.id);
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        console.log('POST /api/login - Successful login for user:', user.id);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log('POST /api/logout - Logging out user:', userId);
    req.logout((err) => {
      if (err) return next(err);
      console.log('Logout successful for user:', userId);
      res.sendStatus(200);
    });
  });

  app.post("/api/register", upload.single('avatar'), async (req, res, next) => {
    try {
      const { username, password, firstName, lastName, city, state, country } = req.body;

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          message: "Username already exists",
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      //Create new user
      if (!req.file) {
        return res.status(400).send("Avatar image is required");
      }
      const avatarPath = `/uploads/${req.file.filename}`;

      const user = await storage.createUser({
        username: username.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        city,
        state,
        country,
        avatar: avatarPath
      });

      console.log('POST /api/register - Created new user:', user.id);

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        console.log('Auto-login successful for new user:', user.id);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });
}