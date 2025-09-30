import { tool, type ToolSet } from "ai";
import { z } from "zod/v3";

// Tool: Get weather information for any city
const getWeatherInformation = tool({
  description: "Get current weather information for any city in the world",
  inputSchema: z.object({ 
    city: z.string().describe("The city name to get weather for")
  }),
  execute: async ({ city }) => {
    try {
      // First, geocode the city name to get coordinates
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      if (!geoResponse.ok) throw new Error("Geocoding failed");
      
      const geoData = await geoResponse.json() as {
        results?: Array<{ name: string; latitude: number; longitude: number; country: string; admin1?: string; }>;
      };
      
      if (!geoData.results || geoData.results.length === 0) {
        return `❌ Unable to find location: ${city}. Please try a different city name.`;
      }
      
      const location = geoData.results[0];
      const { latitude, longitude, name, country, admin1 } = location;
      
      // Fetch weather data using coordinates
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`
      );
      
      if (!weatherResponse.ok) throw new Error("Weather API failed");
      
      const weatherData = await weatherResponse.json() as {
        current: {
          temperature_2m: number;
          relative_humidity_2m: number;
          apparent_temperature: number;
          precipitation: number;
          weather_code: number;
          wind_speed_10m: number;
        };
      };
      
      const current = weatherData.current;
      const weatherDescriptions: Record<number, string> = {
        0: "☀️ Clear sky", 1: "🌤️ Mainly clear", 2: "⛅ Partly cloudy", 3: "☁️ Overcast", 
        45: "🌫️ Foggy", 48: "🌫️ Depositing rime fog",
        51: "🌧️ Light drizzle", 53: "🌧️ Moderate drizzle", 55: "🌧️ Dense drizzle", 
        61: "🌧️ Slight rain", 63: "🌧️ Moderate rain", 65: "🌧️ Heavy rain", 
        71: "❄️ Slight snow", 73: "❄️ Moderate snow", 75: "❄️ Heavy snow", 77: "❄️ Snow grains",
        80: "🌦️ Slight rain showers", 81: "🌦️ Moderate rain showers", 82: "⛈️ Violent rain showers", 
        85: "🌨️ Slight snow showers", 86: "🌨️ Heavy snow showers", 
        95: "⛈️ Thunderstorm", 96: "⛈️ Thunderstorm with slight hail", 99: "⛈️ Thunderstorm with heavy hail"
      };
      
      const weatherDescription = weatherDescriptions[current.weather_code] || "Unknown conditions";
      const locationName = admin1 ? `${name}, ${admin1}, ${country}` : `${name}, ${country}`;
      
      return `🌍 Weather in **${locationName}**:
- ${weatherDescription}
- 🌡️ Temperature: ${current.temperature_2m}°F (feels like ${current.apparent_temperature}°F)
- 💧 Humidity: ${current.relative_humidity_2m}%
- 💨 Wind Speed: ${current.wind_speed_10m} mph
- 🌧️ Precipitation: ${current.precipitation} mm`;
    } catch (error) {
      return `❌ Sorry, I couldn't fetch the weather information for ${city}. Please try again or use a different city name.`;
    }
  }
});

// Tool: Get local time for any location
const getLocalTime = tool({
  description: "Get the current local time for any city, country, or timezone",
  inputSchema: z.object({ 
    location: z.string().describe("The city, country, or timezone to get the time for")
  }),
  execute: async ({ location }) => {
    try {
      // Fetch all available timezones
      const timezoneResponse = await fetch(`https://worldtimeapi.org/api/timezone`);
      if (!timezoneResponse.ok) throw new Error("Timezone API failed");
      
      const timezones = await timezoneResponse.json() as string[];
      const normalizedLocation = location.toLowerCase().replace(/\s+/g, "_");
      
      // Try to find matching timezone by searching through available timezones
      let matchingTimezone = timezones.find(tz => {
        const tzLower = tz.toLowerCase();
        return tzLower.includes(normalizedLocation) || 
               normalizedLocation.includes(tzLower.split('/')[1]?.toLowerCase() || '') ||
               tzLower.split('/').some(part => part === normalizedLocation);
      });
      
      // Fallback to UTC if no match found
      if (!matchingTimezone) {
        matchingTimezone = "UTC";
      }
      
      // Fetch time for the matched timezone
      const timeResponse = await fetch(`https://worldtimeapi.org/api/timezone/${matchingTimezone}`);
      if (!timeResponse.ok) throw new Error("Time API failed");
      
      const timeData = await timeResponse.json() as { 
        datetime: string; 
        timezone: string; 
        day_of_week: number;
        day_of_year: number;
      };
      
      const dateTime = new Date(timeData.datetime);
      const timeString = dateTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true, 
        timeZone: matchingTimezone 
      });
      const dateString = dateTime.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        timeZone: matchingTimezone 
      });
      
      return `🕐 **${location}** (${timeData.timezone})
⏰ Current Time: ${timeString}
📅 Date: ${dateString}`;
    } catch (error) {
      const now = new Date();
      const utcTime = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true, 
        timeZone: 'UTC' 
      });
      return `⚠️ Unable to determine exact timezone for "${location}". Current UTC time is ${utcTime}. Please try with a more specific location or major city name.`;
    }
  }
});

// Tool: Generate random interesting facts
const getRandomFact = tool({
  description: "Get a random interesting fact about science, history, nature, or general knowledge",
  inputSchema: z.object({
    category: z.enum(["random", "science", "history", "nature"]).optional().describe("Category of fact to retrieve")
  }),
  execute: async ({ category }) => {
    try {
      // Using a free API for random facts
      const apiUrl = category && category !== "random" 
        ? `https://uselessfacts.jsph.pl/api/v2/facts/random?language=en`
        : `https://uselessfacts.jsph.pl/api/v2/facts/random?language=en`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Facts API failed");
      
      const data = await response.json() as { text: string; source?: string; source_url?: string; };
      
      return `💡 **Interesting Fact:**

${data.text}

${data.source ? `\n📚 Source: ${data.source}` : ''}`;
    } catch (error) {
      // Fallback facts if API fails
      const fallbackFacts = [
        "🐙 Octopuses have three hearts and blue blood!",
        "🌍 The Earth's core is as hot as the surface of the Sun!",
        "🐝 Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that's still edible!",
        "🧠 The human brain uses about 20% of the body's energy despite being only 2% of body mass!",
        "🌌 There are more stars in the universe than grains of sand on all of Earth's beaches!",
        "🦒 A giraffe's tongue can be up to 20 inches long and is blue-black in color!",
        "💎 Diamonds rain on Jupiter and Saturn!",
        "🐌 A snail can sleep for three years!",
      ];
      
      const randomFact = fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
      return `💡 **Interesting Fact:**\n\n${randomFact}`;
    }
  }
});

// Tool: Get NASA Astronomy Picture of the Day
const getNasaAPOD = tool({
  description: "Get NASA's Astronomy Picture of the Day - a daily space photo with scientific explanation",
  inputSchema: z.object({
    date: z.string().optional().describe("Optional date in YYYY-MM-DD format. If not provided, returns today's picture")
  }),
  execute: async ({ date }) => {
    try {
      const dateParam = date ? `&date=${date}` : '';
      const response = await fetch(
        `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY${dateParam}`
      );
      
      if (!response.ok) throw new Error("NASA API failed");
      
      const data = await response.json() as {
        title: string;
        url: string;
        hdurl?: string;
        explanation: string;
        date: string;
        media_type: string;
        copyright?: string;
      };
      
      if (data.media_type !== 'image') {
        return `🎥 **${data.title}**
📅 Date: ${data.date}

This is a video! Watch it here: ${data.url}

📝 ${data.explanation}`;
      }
      
      return `🌌 **NASA Astronomy Picture of the Day**

📸 **${data.title}**
📅 Date: ${data.date}

![${data.title}](${data.hdurl || data.url})

📝 **Explanation:**
${data.explanation}

${data.copyright ? `📷 Copyright: ${data.copyright}` : ''}`;
    } catch (error) {
      return `❌ Sorry, I couldn't fetch NASA's picture of the day. Please try again later.`;
    }
  }
});

// Tool: Get stock market data
const getStockData = tool({
  description: "Get real-time stock market data for any publicly traded company using Yahoo Finance API",
  inputSchema: z.object({
    symbol: z.string().describe("Stock ticker symbol (e.g., AAPL, GOOGL, MSFT)"),
    interval: z.enum(["1min", "5min", "15min", "30min", "1h", "1day", "1week", "1month"]).optional().describe("Time interval for data points")
  }),
  execute: async ({ symbol, interval = "1day" }) => {
    try {
      // Using Yahoo Finance API v8 - free and reliable
      const upperSymbol = symbol.toUpperCase();
      
      // Map interval to Yahoo Finance format
      const intervalMap: Record<string, string> = {
        "1min": "1m",
        "5min": "5m",
        "15min": "15m",
        "30min": "30m",
        "1h": "60m",
        "1day": "1d",
        "1week": "1wk",
        "1month": "1mo"
      };
      
      const yahooInterval = intervalMap[interval] || "1d";
      
      // Calculate time range (last 7 days for better data availability)
      const now = Math.floor(Date.now() / 1000);
      const period1 = now - (7 * 24 * 60 * 60); // 7 days ago
      
      // Fetch stock data from Yahoo Finance
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${upperSymbol}?period1=${period1}&period2=${now}&interval=${yahooInterval}&includePrePost=true&events=div%7Csplit%7Cearn`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error("Yahoo Finance API request failed");
      }
      
      const data = await response.json() as {
        chart?: {
          result?: Array<{
            meta?: {
              currency?: string;
              symbol?: string;
              exchangeName?: string;
              fullExchangeName?: string;
              instrumentType?: string;
              regularMarketPrice?: number;
              regularMarketDayHigh?: number;
              regularMarketDayLow?: number;
              regularMarketVolume?: number;
              longName?: string;
              shortName?: string;
              previousClose?: number;
              fiftyTwoWeekHigh?: number;
              fiftyTwoWeekLow?: number;
            };
            timestamp?: number[];
            indicators?: {
              quote?: Array<{
                open?: number[];
                high?: number[];
                low?: number[];
                close?: number[];
                volume?: number[];
              }>;
            };
          }>;
          error?: {
            code: string;
            description: string;
          };
        };
      };
      
      // Check for errors
      if (data.chart?.error || !data.chart?.result || data.chart.result.length === 0) {
        return `❌ Unable to fetch data for symbol "${symbol}". Please check the ticker symbol and try again.`;
      }
      
      const result = data.chart.result[0];
      const meta = result.meta;
      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0];
      
      if (!meta || timestamps.length === 0 || !quotes) {
        return `❌ No data available for symbol "${symbol}".`;
      }
      
      // Get the LAST timestamp (most recent data)
      const lastIndex = timestamps.length - 1;
      const lastTimestamp = timestamps[lastIndex];
      const lastDate = new Date(lastTimestamp * 1000);
      
      // Get data from the last timestamp
      const lastClose = quotes.close?.[lastIndex];
      const lastOpen = quotes.open?.[lastIndex];
      const lastHigh = quotes.high?.[lastIndex];
      const lastLow = quotes.low?.[lastIndex];
      const lastVolume = quotes.volume?.[lastIndex];
      
      // Use regular market price from meta as the most current price
      const currentPrice = meta.regularMarketPrice || lastClose || 0;
      const previousClose = meta.previousClose || 0;
      
      // Calculate change
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? ((change / previousClose) * 100) : 0;
      
      const changeEmoji = change >= 0 ? "📈" : "📉";
      
      // Format date and time
      const dateStr = lastDate.toISOString().split('T')[0];
      const timeStr = lastDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/New_York'
      });
      
      return `💹 **Stock Data: ${meta.symbol || upperSymbol}**
${meta.longName ? `🏢 Company: ${meta.longName}` : ''}
🏦 Exchange: ${meta.fullExchangeName || meta.exchangeName || 'N/A'}
💵 Currency: ${meta.currency || 'USD'}
📊 Type: ${meta.instrumentType || 'EQUITY'}

📊 **Latest (${dateStr} ${timeStr} ET)**
- Current Price: $${currentPrice.toFixed(2)}
- Open: $${(lastOpen || 0).toFixed(2)}
- High: $${(lastHigh || meta.regularMarketDayHigh || 0).toFixed(2)}
- Low: $${(lastLow || meta.regularMarketDayLow || 0).toFixed(2)}
- Previous Close: $${previousClose.toFixed(2)}
${lastVolume ? `- Volume: ${lastVolume.toLocaleString()}` : ''}

${changeEmoji} **Change:** $${change.toFixed(2)} (${changePercent.toFixed(2)}%)

📈 **52-Week Range:** $${(meta.fiftyTwoWeekLow || 0).toFixed(2)} - $${(meta.fiftyTwoWeekHigh || 0).toFixed(2)}

✨ **Data Source:** Yahoo Finance API (Real-time)`;
    } catch (error) {
      return `❌ Sorry, I couldn't fetch stock data for ${symbol}. Please verify the ticker symbol and try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

// Tool: Get country information
const getCountryInfo = tool({
  description: "Get detailed information about any country including population, currency, flags, and more",
  inputSchema: z.object({
    country: z.string().describe("Country name or code (e.g., Japan, USA, FR)")
  }),
  execute: async ({ country }) => {
    try {
      const response = await fetch(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}`
      );
      
      if (!response.ok) throw new Error("Countries API failed");
      
      const data = await response.json() as Array<{
        name: { common: string; official: string; };
        population: number;
        region: string;
        subregion?: string;
        capital?: string[];
        languages?: Record<string, string>;
        currencies?: Record<string, { name: string; symbol: string; }>;
        flags: { png: string; svg: string; };
        area: number;
        timezones: string[];
        continents: string[];
        maps?: { googleMaps: string; };
      }>;
      
      if (!data || data.length === 0) {
        return `❌ Country "${country}" not found. Please check the spelling and try again.`;
      }
      
      const countryData = data[0];
      const currencies = countryData.currencies 
        ? Object.values(countryData.currencies).map(c => `${c.name} (${c.symbol})`).join(", ")
        : "N/A";
      const languages = countryData.languages 
        ? Object.values(countryData.languages).join(", ")
        : "N/A";
      
      return `🌍 **${countryData.name.common}**
📜 Official Name: ${countryData.name.official}

![Flag of ${countryData.name.common}](${countryData.flags.png})

📊 **Statistics:**
- 👥 Population: ${countryData.population.toLocaleString()}
- 📏 Area: ${countryData.area.toLocaleString()} km²
- 🌎 Region: ${countryData.region}${countryData.subregion ? ` (${countryData.subregion})` : ''}
- 🏛️ Capital: ${countryData.capital?.join(", ") || "N/A"}

💰 **Economic & Cultural:**
- 💵 Currencies: ${currencies}
- 🗣️ Languages: ${languages}

🕐 **Timezones:** ${countryData.timezones.join(", ")}
🌐 **Continents:** ${countryData.continents.join(", ")}
${countryData.maps?.googleMaps ? `\n🗺️ Maps: ${countryData.maps.googleMaps}` : ''}`;
    } catch (error) {
      return `❌ Sorry, I couldn't fetch information for "${country}". Please check the country name and try again.`;
    }
  }
});

export const tools = {
  getWeatherInformation,
  getLocalTime,
  getRandomFact,
  getNasaAPOD,
  getStockData,
  getCountryInfo
} satisfies ToolSet;

// No executions needed - all tools have execute functions now
export const executions = {};
