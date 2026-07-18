# RocketRide Travel MCP

**Wander** is an AI-powered travel planning app that turns a plain-language request — like *"find scenic hikes with a great lunch nearby"* — into a real, weather-aware itinerary. It's built on a custom [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server, so the same weather and places data it serves to its React frontend is also directly usable by AI agents and pipelines.

### Highlights

- **Natural-language trip planning** — describe a trip in plain English and Wander parses it into the right search categories automatically, including compound requests like *"hiking places, parks, restaurants"*, which return as separate, clearly labeled result sections in one go.
- **Broad intent matching for dining** — anything eating-related (*hungry*, *grab a bite*, *dining*, *cuisine*, *snack*, *brunch*, etc.) routes to restaurant results, not just the literal word "restaurant."
- **Live, location-aware data** — real-time weather/forecast plus attractions, restaurants, cafes, museums, parks & hiking trails, and beaches, all pulled from live APIs (OpenWeatherMap + OpenStreetMap) with no results hardcoded.
- **Personal itinerary builder** — pick any recommended place, choose the day and time you want to go, and build a custom "My Timetable" schedule that's saved locally and viewable anytime, across sessions.
- **Dual-protocol architecture** — every tool (`getWeather`, `getWeatherForecast`, `getPlaces`) is exposed both as a plain REST API for the web app and as an MCP tool, so the exact same backend can power a human-facing UI and an autonomous AI agent (see the RocketRide CrewAI pipeline below).

## What's in here

- **MCP server** ([server.js](server.js)) — exposes `getWeather`, `getWeatherForecast`, and `getPlaces` as MCP tools (via `/mcp`, streamable HTTP), and mirrors the same data as plain REST endpoints for the frontend.
- **Wander** ([wander-main/](wander-main/)) — a Vite + React chat UI that calls the REST endpoints to build a day-by-day itinerary, with natural-language category detection and a persistent personal timetable builder.
- **RocketRide pipeline** ([travelpipeline.pipe](travelpipeline.pipe)) — a CrewAI travel agent that connects to this server's `/mcp` endpoint as a tool source (weather + places) to answer trip-planning questions. See `.rocketride/docs/` for RocketRide pipeline docs.

## Setup

```bash
npm install
```

Create a `.env` file with:

```
OPENWEATHER_KEY=your_openweathermap_api_key
PORT=3000            # optional, defaults to 3000
```

Get a free key at [openweathermap.org/api](https://openweathermap.org/api). Places lookups use OpenStreetMap's Nominatim API, which is free and requires no key.

Run the server:

```bash
npm start
```

This starts the MCP server at `http://localhost:3000/mcp` and the REST API at `http://localhost:3000/api/*`.

To run the Wander frontend:

```bash
cd wander-main
npm install
npm run dev
```

By default it talks to the API at `http://localhost:3000`; override with `VITE_API_BASE_URL` if the server runs elsewhere.

## REST API

| Endpoint        | Query params           | Description                          |
| ---------------- | ----------------------- | ------------------------------------- |
| `GET /api/weather`  | `city`                   | Current conditions for a city         |
| `GET /api/forecast` | `city`                   | Up to 5-day forecast, grouped by date |
| `GET /api/places`   | `city`, `category?`     | Places matching a category in a city  |

## MCP tools

Same three operations, exposed over MCP at `/mcp` for agents/pipelines (used by [travelpipeline.pipe](travelpipeline.pipe)):

- `getWeather(city)`
- `getWeatherForecast(city)`
- `getPlaces(city, category?)`

## Places & categories

`getPlaces` / `/api/places` is backed by [tools/places.js](tools/places.js), which queries OpenStreetMap's Nominatim search API with `"<category> in <city>"`. Any free-text category works; the ones known to return good results include:

- `attraction` (default)
- `restaurant`, `cafe`
- `museum`
- `park` — also the best category for hikes/trails; Nominatim has no dedicated "hiking trail" tag, but named parks and trail areas come back reliably under `park`
- `beach` — coastal and beach spots (e.g. searching `beach` in Miami returns real named beaches like Hobie Island Beach)

The Wander frontend maps natural-language phrases to the right categories automatically — see `CATEGORY_KEYWORDS` and `categoriesForQuery` in [wander-main/src/App.tsx](wander-main/src/App.tsx). A single prompt can match more than one category at once (e.g. "hiking places, parks, restaurants" returns both a Parks & Hikes section and a Restaurants section), and dining intent is matched broadly — words like "hungry," "dining," "grab a bite," or "cuisine" all route to restaurants, not just the literal word "restaurant."

Nominatim is a shared public service — keep request volume light and don't strip the `User-Agent` header set in `tools/places.js`.

## Project structure

```
server.js              MCP + REST server
tools/
  weather.js            OpenWeatherMap integration
  places.js             OpenStreetMap Nominatim integration
wander-main/            React frontend (Vite)
travelpipeline.pipe     RocketRide CrewAI pipeline definition
.rocketride/docs/       RocketRide pipeline documentation
```
