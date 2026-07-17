import axios from "axios";

export async function getWeatherData(city) {
    try {
        const apiKey = process.env.OPENWEATHER_KEY;
            if (!apiKey) {
                throw new Error("Missing OPENWEATHER_KEY in environment variables");
            }

        const response = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
            params: {
                q: city,
                appid: apiKey,
                units: "imperial",
            },
        });

        const data = response.data;

        return {
            city: data.name,
            temperature: data.main.temp,
            weather: data.weather[0].description,
        };
    } catch (error) {
        console.error("Weather API error: ", error.message);

        throw new Error(`Unable to retrieve weather for "${city}".`);
    }
}

// OpenWeatherMap's free tier has no daily-forecast endpoint, only 3-hour steps up to 5 days out.
// This groups those steps by calendar date and picks the reading closest to noon as the
// representative condition for that day, so callers can show a different forecast per day.
export async function getWeatherForecastData(city) {
    try {
        const apiKey = process.env.OPENWEATHER_KEY;
        if (!apiKey) {
            throw new Error("Missing OPENWEATHER_KEY in environment variables");
        }

        const response = await axios.get("https://api.openweathermap.org/data/2.5/forecast", {
            params: {
                q: city,
                appid: apiKey,
                units: "imperial",
            },
        });

        const byDate = new Map();

        for (const entry of response.data.list) {
            const date = entry.dt_txt.slice(0, 10);
            const hour = Number(entry.dt_txt.slice(11, 13));
            const hourDistanceFromNoon = Math.abs(hour - 12);

            const existing = byDate.get(date);

            if (!existing) {
                byDate.set(date, {
                    date,
                    tempMin: entry.main.temp_min,
                    tempMax: entry.main.temp_max,
                    weather: entry.weather[0].description,
                    hourDistanceFromNoon,
                });
                continue;
            }

            existing.tempMin = Math.min(existing.tempMin, entry.main.temp_min);
            existing.tempMax = Math.max(existing.tempMax, entry.main.temp_max);

            if (hourDistanceFromNoon < existing.hourDistanceFromNoon) {
                existing.weather = entry.weather[0].description;
                existing.hourDistanceFromNoon = hourDistanceFromNoon;
            }
        }

        return Array.from(byDate.values()).map(({ date, tempMin, tempMax, weather }) => ({
            date,
            tempMin,
            tempMax,
            weather,
        }));
    } catch (error) {
        console.error("Weather forecast API error: ", error.message);

        throw new Error(`Unable to retrieve weather forecast for "${city}".`);
    }
}