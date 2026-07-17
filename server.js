import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { z } from "zod";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { getWeatherData } from "./tools/weather.js";

// Create the MCP server
const server = new McpServer({
  name: "rocketride-travel",
  version: "1.0.0",
});

// Register weather tool
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

const app = express();
app.use(express.json());

// Create a new transport for each client session
app.all("/mcp", async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    res.on("close", () => {
      transport.close();
    });

    await server.connect(transport);
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