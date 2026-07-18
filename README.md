# RocketRide Travel MCP

An MCP server that gives an AI travel-planning agent live weather and places data, plus a small React frontend (Wander) for trying it out directly.

## What's in here

- **MCP server** ([server.js](server.js)) — exposes `getWeather`, `getWeatherForecast`, and `getPlaces` as MCP tools (via `/mcp`, streamable HTTP), and mirrors the same data as plain REST endpoints for the frontend.
- **Wander** ([wander-main/](wander-main/)) — a Vite + React chat UI that calls the REST endpoints to build a day-by-day itinerary.
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

The Wander frontend maps natural-language phrases (e.g. "scenic hikes", "beach day") to the right category automatically — see `CATEGORY_KEYWORDS` in [wander-main/src/App.tsx](wander-main/src/App.tsx).

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
