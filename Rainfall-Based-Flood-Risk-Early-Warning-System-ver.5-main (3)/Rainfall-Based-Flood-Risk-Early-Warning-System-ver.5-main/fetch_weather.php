<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/log_action.php'; // 1. Include your log function

$API_KEY = $_ENV['API_KEY'] ?? getenv('API_KEY');
if (!$API_KEY) {
    // Log the configuration error
    createLog("System", "Weather Sync", "Failed", "API_KEY not found in environment.");
    die(json_encode(["error" => "API_KEY not found"]));
}

// 1. Fetch Central Weather for CDO
$cdo_lat = 8.4542; 
$cdo_lon = 124.6319;
$url = "https://api.openweathermap.org/data/2.5/forecast?lat=$cdo_lat&lon=$cdo_lon&appid=$API_KEY&units=metric";

$response = @file_get_contents($url);
$data = $response ? json_decode($response, true) : null;

if (!$data || !isset($data['list'])) {
    // Log the network/API error
    createLog("System", "Weather Sync", "Failed", "Failed to fetch weather data from OpenWeather API.");
    die(json_encode(["error" => "Failed to fetch weather data"]));
}

// 2. Extract 24-hour Weather Metrics (Optimization)
$totalRain24h = 0.0;
$rainyPeriods = 0;
$maxIntensity = 0.0;

foreach (array_slice($data['list'], 0, 8) as $entry) {
    $r3 = (float)($entry['rain']['3h'] ?? 0);
    $totalRain24h += $r3;
    if ($r3 > 0) {
        $rainyPeriods++;
        $intensity = $r3 / 3.0;
        if ($intensity > $maxIntensity) $maxIntensity = $intensity;
    }
}

// 3. Process Each Barangay
$barangays = $conn->query("SELECT * FROM barangays");
$weatherUpdates = [];
$recordsInserted = 0;

while ($row = $barangays->fetch_assoc()) {
    $name = $row['name'];
    $elev = (float)$row['elev'];
    $isLowland = (int)$row['low_land'] === 1;

    // --- SCORING LOGIC ---
    $geoFactor = ($isLowland || $elev < 10) ? 1.6 : 1.0;
    $upstreamExtra = (stripos($name, 'Iponan') !== false || stripos($name, 'Carmen') !== false) ? 12.0 : 0.0;

    $riskScore = 0;
    $adjustedRain = ($totalRain24h + $upstreamExtra) * $geoFactor;
    $riskScore += min(40, ($adjustedRain / 50) * 40);
    $riskScore += min(35, ($maxIntensity / 15) * 35);
    $riskScore += min(15, ($rainyPeriods / 8) * 15);
    if ($geoFactor > 1.0) $riskScore += 10;

    $risk = 'SAFE';
    if ($riskScore >= 75) $risk = 'CRITICAL';
    elseif ($riskScore >= 50) $risk = 'ALERT';
    elseif ($riskScore >= 25) $risk = 'MONITOR';

    $weatherUpdates[] = [
        'barangay_id' => $row['id'],
        'barangay_name' => $name,
        'risk_level' => $risk,
        'score' => round($riskScore, 2)
    ];

    // 4. Smart Database Update
    $stmt_check = $conn->prepare("SELECT rain_3h, risk_level FROM forecasts WHERE barangay_id = ? ORDER BY created_at DESC LIMIT 1");
    $stmt_check->bind_param("s", $row['id']);
    $stmt_check->execute();
    $stmt_check->bind_result($prevRain, $prevRisk);
    $exists = $stmt_check->fetch();
    $stmt_check->close();

    if (!$exists || $prevRisk !== $risk || abs($prevRain - $totalRain24h) > 1.0) {
        $stmt_ins = $conn->prepare("INSERT INTO forecasts (barangay_id, rain_3h, intensity, risk_level, rain_duration) VALUES (?, ?, ?, ?, ?)");
        $stmt_ins->bind_param("sddsi", $row['id'], $totalRain24h, $maxIntensity, $risk, $rainyPeriods);
        $stmt_ins->execute();
        $stmt_ins->close();
        $recordsInserted++;
    }
}

// 5. Final Log Entry (Success)
$barangayCount = count($weatherUpdates);
createLog(
    "System", 
    "Weather Sync", 
    "Success", 
    "Processed $barangayCount barangays. $recordsInserted new forecast records added to database."
);

echo json_encode($weatherUpdates);