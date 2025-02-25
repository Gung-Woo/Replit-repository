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

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
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
        console.log('Login attempt for username:', username);
        const user = await storage.getUserByUsername(username);
        console.log('User found:', user ? 'yes' : 'no');

        if (!user) {
          console.log('Login failed: User not found');
          return done(null, false);
        }

        const passwordMatch = await comparePasswords(password, user.password);
        console.log('Password match:', passwordMatch ? 'yes' : 'no');

        if (!passwordMatch) {
          console.log('Login failed: Password mismatch');
          return done(null, false);
        }

        console.log('Login successful');
        return done(null, user);
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id)
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      console.log('Deserialize user:', id, user ? 'found' : 'not found');
      done(null, user);
    } catch (error) {
      console.error('Deserialize error:', error);
      done(error);
    }
  });

  app.post("/api/register", upload.single('avatar'), async (req, res, next) => {
    try {
      // Debug logs
      console.log('Registration request headers:', req.headers);
      console.log('Registration request body:', req.body);
      console.log('Registration file:', req.file);

      // Validate required fields
      const { username, password, firstName, lastName, city, state, country } = req.body;

      if (!username || !password || !firstName || !lastName || !city || !state || !country) {
        console.log('Missing fields:', {
          username: !username,
          password: !password,
          firstName: !firstName,
          lastName: !lastName,
          city: !city,
          state: !state,
          country: !country
        });
        return res.status(400).send("All fields are required");
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      if (!req.file) {
        return res.status(400).send("Avatar image is required");
      }

      const avatarPath = `/uploads/${req.file.filename}`;
      const hashedPassword = await hashPassword(password);

      // Debug log the data being sent to storage
      console.log('Creating user with data:', {
        username,
        firstName,
        lastName,
        city,
        state,
        country,
        avatar: avatarPath
      });

      const user = await storage.createUser({
        username: username.toLowerCase(), // Ensure username is always lowercase
        password: hashedPassword,
        firstName,
        lastName,
        city,
        state,
        country,
        avatar: avatarPath
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error('Registration error:', error);
      // Clean up uploaded file if registration fails
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Failed to clean up uploaded file:', cleanupError);
        }
      }
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    console.log('Login successful, sending user data:', req.user);
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}