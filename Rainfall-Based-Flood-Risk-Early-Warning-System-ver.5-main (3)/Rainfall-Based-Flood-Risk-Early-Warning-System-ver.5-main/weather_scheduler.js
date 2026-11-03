// Weather update interval (15 minutes)
const WEATHER_INTERVAL = 15 * 60 * 1000;

// Function that calls your PHP weather pipeline
async function updateWeather() {

    const status = document.getElementById("weatherStatus");

    try {

        status.textContent = "Updating weather data...";

        const response = await fetch("api/fetch_weather.php");
        const data = await response.json();

        const now = new Date().toLocaleTimeString();
        status.textContent = "Last update: " + now;

        if (typeof loadForecasts === "function") {
            loadForecasts();
        }

    } catch (error) {

        status.textContent = "Weather update failed.";
        console.error(error);

    }
}

// Run immediately when page loads
updateWeather();

// Then repeat every 15 minutes
setInterval(updateWeather, WEATHER_INTERVAL);