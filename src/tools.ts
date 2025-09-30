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

// Tool: Generate color palettes
const generateColorPalette = tool({
  description: "Generate a beautiful color palette for design projects",
  inputSchema: z.object({
    mood: z.enum(["warm", "cool", "pastel", "vibrant", "monochrome", "random"]).optional().describe("The mood/style of the color palette")
  }),
  execute: async ({ mood = "random" }) => {
    try {
      // Using the Colormind API for color palettes
      const model = mood === "random" ? "default" : "default";
      const response = await fetch("http://colormind.io/api/", {
        method: "POST",
        body: JSON.stringify({ model })
      });
      
      if (!response.ok) throw new Error("Color API failed");
      
      const data = await response.json() as { result: number[][] };
      const colors = data.result.map(rgb => {
        const hex = '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');
        return hex;
      });
      
      return `🎨 **Generated Color Palette** (${mood} style):

${colors.map((color, i) => `${i + 1}. ${color} ████`).join('\n')}

Perfect for your next design project! 🖌️`;
    } catch (error) {
      // Fallback color palettes
      const palettes = {
        warm: ['#FF6B6B', '#FFA07A', '#FFD93D', '#F4A460', '#FF8C42'],
        cool: ['#6C5CE7', '#74B9FF', '#00B894', '#00CEC9', '#A29BFE'],
        pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF'],
        vibrant: ['#E94B3C', '#6F4C9B', '#00A8E8', '#00FF87', '#FFB400'],
        monochrome: ['#0A0A0A', '#404040', '#757575', '#BFBFBF', '#F0F0F0'],
        random: ['#FF6B9D', '#C44569', '#FFC048', '#3F72AF', '#112D4E']
      };
      
      const selectedPalette = palettes[mood as keyof typeof palettes] || palettes.random;
      
      return `🎨 **Generated Color Palette** (${mood} style):

${selectedPalette.map((color, i) => `${i + 1}. ${color} ████`).join('\n')}

Perfect for your next design project! 🖌️`;
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
  description: "Get real-time stock market data for any publicly traded company",
  inputSchema: z.object({
    symbol: z.string().describe("Stock ticker symbol (e.g., AAPL, GOOGL, MSFT)"),
    interval: z.enum(["1min", "5min", "15min", "30min", "1h", "1day", "1week", "1month"]).optional().describe("Time interval for data points")
  }),
  execute: async ({ symbol, interval = "1day" }) => {
    try {
      const response = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${symbol.toUpperCase()}&interval=${interval}&outputsize=5&apikey=demo`
      );
      
      if (!response.ok) throw new Error("Stock API failed");
      
      const data = await response.json() as {
        meta?: {
          symbol: string;
          interval: string;
          currency?: string;
          exchange?: string;
          type?: string;
        };
        values?: Array<{
          datetime: string;
          open: string;
          high: string;
          low: string;
          close: string;
          volume?: string;
        }>;
        status?: string;
        message?: string;
      };
      
      if (data.status === "error" || !data.values || data.values.length === 0) {
        return `❌ Unable to fetch data for symbol "${symbol}". Please check the ticker symbol and try again.`;
      }
      
      const latest = data.values[0];
      const previous = data.values[1];
      const change = previous ? (parseFloat(latest.close) - parseFloat(previous.close)).toFixed(2) : "N/A";
      const changePercent = previous ? (((parseFloat(latest.close) - parseFloat(previous.close)) / parseFloat(previous.close)) * 100).toFixed(2) : "N/A";
      
      const changeEmoji = change === "N/A" ? "➖" : parseFloat(change) >= 0 ? "📈" : "📉";
      
      return `💹 **Stock Data: ${data.meta?.symbol || symbol}**
${data.meta?.exchange ? `🏦 Exchange: ${data.meta.exchange}` : ''}
${data.meta?.currency ? `💵 Currency: ${data.meta.currency}` : ''}

📊 **Latest (${latest.datetime})**
- Open: $${latest.open}
- High: $${latest.high}
- Low: $${latest.low}
- Close: $${latest.close}
${latest.volume ? `- Volume: ${latest.volume}` : ''}

${changeEmoji} **Change:** ${change !== "N/A" ? `$${change} (${changePercent}%)` : 'N/A'}

📉 **Recent History (${interval} intervals):**
${data.values.slice(0, 5).map(v => `- ${v.datetime}: $${v.close}`).join('\n')}`;
    } catch (error) {
      return `❌ Sorry, I couldn't fetch stock data for ${symbol}. Please verify the ticker symbol and try again.`;
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

// Tool: Generate charts using QuickChart
const generateChart = tool({
  description: "Generate a chart image (bar, line, pie, etc.) from data using QuickChart API",
  inputSchema: z.object({
    type: z.enum(["bar", "line", "pie", "doughnut", "radar", "polarArea"]).describe("Type of chart to generate"),
    labels: z.array(z.string()).describe("Labels for the data points"),
    data: z.array(z.number()).describe("Data values corresponding to the labels"),
    title: z.string().optional().describe("Chart title")
  }),
  execute: ({ type, labels, data, title }) => {
    console.log('🎨 generateChart called with:', { type, labels, data, title });
    
    try {
      // Build simplified Chart.js configuration
      const chartConfig = {
        type: type,
        data: {
          labels: labels,
          datasets: [{
            label: title || "Dataset",
            data: data
          }]
        },
        options: {
          plugins: {
            title: {
              display: !!title,
              text: title || ''
            }
          }
        }
      };
      
      const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
      const chartUrl = `https://quickchart.io/chart?c=${encodedConfig}&width=600&height=400`;
      
      console.log('📊 Chart URL generated:', chartUrl);
      
      const result = `📊 **${title || 'Chart'} Generated**

![${title || 'Chart'}](${chartUrl})

**Type:** ${type.charAt(0).toUpperCase() + type.slice(1)} | **Labels:** ${labels.join(", ")} | **Data:** ${data.join(", ")}`;
      
      console.log('✅ Chart result generated successfully');
      return result;
    } catch (error) {
      console.error('❌ Chart generation error:', error);
      return `❌ Sorry, I couldn't generate the chart. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

export const tools = {
  getWeatherInformation,
  getLocalTime,
  getRandomFact,
  generateColorPalette,
  getNasaAPOD,
  getStockData,
  getCountryInfo,
  generateChart
} satisfies ToolSet;

// No executions needed - all tools have execute functions now
export const executions = {};
