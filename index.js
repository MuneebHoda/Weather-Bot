const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const apiKey = '1a7a7cd3ffd0313cf1a9c743e09d48b5';

app.post('/webhook', async (req, res) => {
    console.log("Received Request");
    const intentName = req.body.queryResult.intent.displayName;
    const city = req.body.queryResult.parameters['city'];
    const startDateStr = req.body.queryResult.parameters['date'];
    let responseText = '';

    try {
        const startDate = new Date(startDateStr);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 5);
        const geoResponse = await axios.get(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`);
        if (geoResponse.data.length === 0) {
            throw new Error(`Could not find location for ${city}`);
        }
        const { lat, lon } = geoResponse.data[0];

        if (intentName === 'Current Weather Intent') {
            const weatherResponse = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`);
            const weather = weatherResponse.data;
            responseText = `The current weather for ${city} is ${weather.weather[0].description} with a temperature of ${(weather.main.temp - 273.15).toFixed(2)}°C.`;
        } else if (intentName === 'Weather Forecast Intent') {
            const forecastResponse = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`);
            const forecast = forecastResponse.data.list;
            responseText = `The forecasted weather from ${startDateStr.split('T')[0]} to ${endDate.toLocaleDateString('en-US')} for ${city} is as follows: `;
            const uniqueDates = new Set();
            forecast.forEach((entry) => {
                const date = new Date(entry.dt * 1000);
                const formattedDate = date.toLocaleDateString('en-US');
                if (date >= startDate && date <= endDate && !uniqueDates.has(formattedDate)) {
                    uniqueDates.add(formattedDate);
                    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
                    responseText += `\n${dayOfWeek} (${formattedDate}): ${(entry.main.temp - 273.15).toFixed(2)}°C`;
                }
            });
        }

        res.json({ fulfillmentText: responseText });
    } catch (error) {
        console.error(error);
        res.json({ fulfillmentText: `I couldn't get the weather for ${city}. Please try again.` });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
