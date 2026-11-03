<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/config.php';

// 1. Updated: Get all barangays INCLUDING elevation (elev)
$sql = "SELECT id, name, lat, lon, elev FROM barangays";
$result = $conn->query($sql);

if (!$result) {
    echo json_encode(["error" => $conn->error]);
    exit;
}

$output = [];

while ($row = $result->fetch_assoc()) {

    $barangayId = $row['id'];

    // 2. Updated: Select new columns (intensity, duration, day_name) from the database
    $stmt = $conn->prepare("
        SELECT forecast_date, day_name, rainfall_mm, intensity, duration, risk_level
        FROM 5d_barangay_forecasts
        WHERE barangay_id = ?
        ORDER BY forecast_date ASC
        LIMIT 5
    ");

    $stmt->bind_param("s", $barangayId);
    $stmt->execute();
    $forecastResult = $stmt->get_result();

    $forecast = [];

    while ($f = $forecastResult->fetch_assoc()) {

        $forecast[] = [
            "date" => $f['forecast_date'],
            "day" => $f['day_name'], // Added day name
            "rainfall" => round((float)$f['rainfall_mm'], 2),
            "intensity" => round((float)($f['intensity'] ?? 0), 2), // Added Intensity
            "duration" => (int)($f['duration'] ?? 0),               // Added Duration
            "risk" => $f['risk_level']
        ];
    }

    $output[] = [
        "id" => $row['id'],
        "name" => $row['name'],
        "lat" => (float)$row['lat'],
        "lon" => (float)$row['lon'],
        "elevation" => (float)($row['elev'] ?? 0), // Added Elevation for JS Highland/Lowland check
        "forecast" => $forecast
    ];

    $stmt->close();
}

echo json_encode($output);

$conn->close();