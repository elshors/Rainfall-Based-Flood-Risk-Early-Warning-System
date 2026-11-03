<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/log_action.php'; // 1. Link your logging function

// Fetch API Key
$API_KEY = $_ENV['API_KEY'] ?? 'YOUR_ACTUAL_API_KEY'; 

// Cagayan de Oro Central Coordinates
$cdo_lat = 8.4542; 
$cdo_lon = 124.6319;
$url = "https://api.openweathermap.org/data/2.5/forecast?lat={$cdo_lat}&lon={$cdo_lon}&appid={$API_KEY}&units=metric";

$response = @file_get_contents($url);

if (!$response) {
    // 2. LOG API FAILURE
    createLog("System", "3H Weather Sync", "Failed", "OpenWeather API unreachable or network error.");
    die(json_encode(["status" => "error", "message" => "Failed to fetch weather data from API."]));
}

$data = json_decode($response, true);
if (!isset($data['list'])) {
    createLog("System", "3H Weather Sync", "Failed", "Invalid API response structure.");
    die(json_encode(["status" => "error", "message" => "Invalid API response structure."]));
}

// Fetch all barangays
$query = "SELECT id, name, lat, lon, elev, low_land FROM barangays";
$result = $conn->query($query);

// Clear OLD forecasts
$conn->query("DELETE FROM 3hr_barangay_forecasts");

// Prepare INSERT
$stmt = $conn->prepare("
    INSERT INTO 3hr_barangay_forecasts 
    (barangay_id, forecast_date, day_name, forecast_time, rainfall_mm, intensity, duration, elevation, risk_level) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

$barangays_processed = 0;

while ($row = $result->fetch_assoc()) {
    $barangay_id = $row['id'];
    $name = $row['name'];
    $elevation = (float)$row['elev'];
    $is_lowland = (int)$row['low_land'];

    $geo_factor = ($is_lowland == 1 || $elevation < 10) ? 1.6 : 1.0;
    $upstream_extra = (stripos($name, 'Iponan') !== false || stripos($name, 'Carmen') !== false) ? 12.0 : 0.0;

    $entry_count = 0; 

    foreach ($data['list'] as $item) {
        if ($entry_count >= 4) break;

        $dt_parts = explode(" ", $item['dt_txt']);
        $date = $dt_parts[0]; 
        $time = $dt_parts[1]; 
        $day_name = date("l", strtotime($date));

        $rain = (float)($item['rain']['3h'] ?? 0);
        $intensity = $rain / 3.0; 

        // Risk Calculation Logic
        $risk_score = 0;
        $adjusted_rain = ($rain + $upstream_extra) * $geo_factor;
        $risk_score += min(40, ($adjusted_rain / 50) * 40);
        $risk_score += min(35, ($intensity / 15) * 35);
        $risk_score += ($rain > 0) ? (15 / 8) : 0; 
        if ($geo_factor > 1.0) $risk_score += 10;

        $risk_level = "SAFE";
        if ($risk_score >= 75) $risk_level = "CRITICAL";
        elseif ($risk_score >= 50) $risk_level = "ALERT";
        elseif ($risk_score >= 25) $risk_level = "MONITOR";

        $duration = 3; 
        $stmt->bind_param("ssssddids", 
            $barangay_id, $date, $day_name, $time, $rain, $intensity, $duration, $elevation, $risk_level);
            
        $stmt->execute();
        $entry_count++;
    }
    $barangays_processed++;
}

// 3. LOG SUCCESSFUL BULK UPDATE
createLog(
    "System", 
    "3H Weather Sync", 
    "Success", 
    "Successfully refreshed 3-hour forecasts for {$barangays_processed} barangays."
);

$stmt->close();
$conn->close();

echo json_encode(["status" => "success", "message" => "Forecasts updated for {$barangays_processed} barangays."]);
?>