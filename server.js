import dotenv from "dotenv";
dotenv.config();

import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import { z } from "zod";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { getWeatherData, getWeatherForecastData } from "./tools/weather.js";
import { getPlacesData } from "./tools/places.js";

const app = express();

app.use(cors({
  origin: "*",
  exposedHeaders: ["mcp-session-id"],
  allowedHeaders: [
    "Content-Type",
    "Accept",
    "mcp-session-id",
  ],
}));

app.use(express.json());

const server = new McpServer({
  name: "rocketride-travel",
  version: "1.0.0",
});

server.tool(
  "getWeather",
  "Get the current weather for a given city.",
  {
    city: z.string(),
  },
  async ({ city }) => {
    const weather = await getWeatherData(city);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(weather, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "getWeatherForecast",
  "Get a multi-day weather forecast (up to 5 days) for a given city.",
  {
    city: z.string(),
  },
  async ({ city }) => {
    const forecast = await getWeatherForecastData(city);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(forecast, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "getPlaces",
  "Get places of a given category (e.g. attraction, restaurant, cafe, museum, park, beach) for a given city. Use 'park' for hiking/trail spots and 'beach' for coastal/beach spots.",
  {
    city: z.string(),
    category: z.string().optional(),
  },
  async ({ city, category }) => {
    const places = await getPlacesData(city, category);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(places, null, 2),
        },
      ],
    };
  }
);

// Plain REST endpoints for the Wander frontend (kept separate from the MCP /mcp endpoint,
// which speaks the MCP protocol for agent/pipeline clients).
app.get("/api/weather", async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({ error: "city query parameter is required" });
  }

  try {
    const weather = await getWeatherData(city);
    res.json(weather);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get("/api/forecast", async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({ error: "city query parameter is required" });
  }

  try {
    const forecast = await getWeatherForecastData(city);
    res.json(forecast);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get("/api/places", async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({ error: "city query parameter is required" });
  }

  try {
    const places = await getPlacesData(city, req.query.category);
    res.json(places);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Store transports by session ID
const transports = new Map();

app.all("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"];

    let transport;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId);
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),

        onsessioninitialized: (id) => {
          transports.set(id, transport);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId);
        }
      };

      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error(err);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal MCP Server Error",
      });
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 MCP Server running`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔧 MCP Endpoint: http://localhost:${PORT}/mcp`);
});