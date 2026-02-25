import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";
import generalRouter from "./routes/index.mjs";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8000;

const allowedOrigins = ["http://localhost:3000", "https://efaa-two.vercel.app"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    exposedHeaders: ["token", "Authorization"],
    credentials: true,
  }),
);

app.use(generalRouter);

app.get("/", (_, response) => response.send("Emergency Service is live"));

// Listening on 0.0.0.0 is essential for cloud discovery
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Emergency service is live on PORT: ${PORT}`);
});