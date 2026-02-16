import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";
import generalRouter from "./routes/index.mjs";

const app = express();
app.use(express.json());
const PORT = process.env.PORT

const allowedOrigins = ["http://localhost:3000", "https://efaa-two.vercel.app"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isAllowedFrontend = allowedOrigins.indexOf(origin) !== -1;
      const isVercelPreview = origin.endsWith(".vercel.app");

      if (isAllowedFrontend || isVercelPreview) {
        callback(null, true);
      } else {
        console.error(`CORs Blocked For Origin: ${origin}`);
        callback(new Error("Not Allowed By Cors"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning",
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

app.use(generalRouter);

app.get("/", (_, response) => response.send("Emergency Service is live"));

app.listen(PORT, () => {
  console.log(`Emergency service is live on PORT: ${PORT}`)
})