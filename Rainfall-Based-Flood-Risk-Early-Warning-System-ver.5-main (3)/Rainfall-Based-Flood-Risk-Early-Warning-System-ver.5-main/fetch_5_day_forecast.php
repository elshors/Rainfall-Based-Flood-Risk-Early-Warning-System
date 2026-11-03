<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/log_action.php'; // 1. Include the logger

$API_KEY = $_ENV['API_KEY'] ?? 'YOUR_ACTUAL_API_KEY'; 

// 1. Fetch weather once for CDO Center
$cdo_lat = 8.4542; 
$cdo_lon = 124.6319;
$url = "https://api.openweathermap.org/data/2.5/forecast?lat=$cdo_lat&lon=$cdo_lon&appid=$API_KEY&units=metric";

$response = @file_get_contents($url);
$weather_data = $response ? json_decode($response, true) : null;

if (!$weather_data) {
    // 2. Log API Failure
    createLog("System", "Weather Update", "Failed", "Could not reach OpenWeather API.");
    die(json_encode(["error" => "Weather API unreachable"]));
}

// 2. Pre-process weather (logic remains same)
$daily_weather = [];
foreach ($weather_data['list'] as $item) {
    $date = substr($item['dt_txt'], 0, 10);
    $rain = $item['rain']['3h'] ?? 0;
    if (!isset($daily_weather[$date])) {
        $daily_weather[$date] = ['rain' => 0, 'intensity' => 0, 'periods' => 0];
    }
    $daily_weather[$date]['rain'] += $rain;
    if ($rain > 0) {
        $daily_weather[$date]['periods']++;
        $current_intensity = $rain / 3.0;
        if ($current_intensity > $daily_weather[$date]['intensity']) {
            $daily_weather[$date]['intensity'] = $current_intensity;
        }
    }
}

// 3. Process Barangays
// Clean old data
if($conn->query("DELETE FROM 5d_barangay_forecasts")) {
    // Optional: Log the cleanup
}

$barangays = $conn->query("SELECT id, name, lat, lon, elev, low_land FROM barangays");
$output = [];
$total_processed = 0;

while ($row = $barangays->fetch_assoc()) {
    $barangay_id = $row['id'];
    $name = $row['name'];
    $elev = (float)$row['elev'];
    $isLowland = (int)$row['low_land'] === 1;
    $geoFactor = ($isLowland || $elev < 10) ? 1.6 : 1.0;
    $upstreamExtra = (stripos($name, 'Iponan') !== false || stripos($name, 'Carmen') !== false) ? 12.0 : 0.0;

    $barangay_forecasts = [];
    $day_count = 0;

    foreach ($daily_weather as $date => $w) {
        if ($day_count >= 5) break;

        // Scoring Logic (simplified for brevity, keep your original math here)
        $score = (($w['rain'] + $upstreamExtra) * $geoFactor); // ... your full score formula ...
        
        $risk = "SAFE";
        if ($score >= 75) $risk = "CRITICAL";
        elseif ($score >= 50) $risk = "ALERT";
        elseif ($score >= 25) $risk = "MONITOR";

        $day_name = date("l", strtotime($date));

        // Save to DB
        $stmt = $conn->prepare("INSERT INTO 5d_barangay_forecasts (barangay_id, forecast_date, day_name, rainfall_mm, intensity, duration, elevation, risk_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $duration_hrs = $w['periods'] * 3;
        $stmt->bind_param("sssddids", $barangay_id, $date, $day_name, $w['rain'], $w['intensity'], $duration_hrs, $elev, $risk);
        $stmt->execute();
        $stmt->close();

        $barangay_forecasts[] = ["date" => $date, "risk" => $risk];
        $day_count++;
    }
    $output[] = ["name" => $name, "forecast" => $barangay_forecasts];
    $total_processed++;
}

// 4. LOG SUCCESSFUL SYNC
createLog(
    "System", 
    "5 Day-Forecast Sync", 
    "Success", 
    "5-Day Forecast updated for $total_processed barangays via OpenWeather API."
);

echo json_encode($output);
$conn->close();
