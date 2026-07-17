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