import dotenv from "dotenv";
dotenv.config();

import { getWeatherData } from "./tools/weather.js";

const weather = await getWeatherData("Seattle");
console.log(weather);