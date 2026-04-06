import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import geminiHandler from "./api/gemini.js";

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  console.log("Environment Check: GEMINI_API_KEY is", process.env.GEMINI_API_KEY ? "SET" : "MISSING");
  console.log("Environment Check: API_KEY is", process.env.API_KEY ? "SET" : "MISSING");
  console.log("Environment Check: GEMINI_KEY is", process.env.GEMINI_KEY ? "SET" : "MISSING");
  console.log("Environment Check: FYP_KEY is", process.env.FYP_KEY ? "SET" : "MISSING");

  // API routes
  app.post("/api/gemini", async (req, res) => {
    try {
      await geminiHandler(req, res);
    } catch (error) {
      console.error("Local API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
