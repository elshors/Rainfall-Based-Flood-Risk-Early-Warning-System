<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/config.php';

// 1. Fetch barangays with their elevation info
$sql = "SELECT id, name, lat, lon, elev FROM barangays";
$result = $conn->query($sql);

if (!$result) {
    echo json_encode(["error" => "Barangay query failed: " . $conn->error]);
    exit;
}

$output = [];

while ($row = $result->fetch_assoc()) {
    $barangayId = $row['id'];

    // 2. Fetch the 4 most recent 3-hour intervals for this barangay
    // We select forecast_time to ensure the JS can display the specific block
    $stmt = $conn->prepare("
        SELECT 
            forecast_date, 
            day_name, 
            forecast_time, 
            rainfall_mm, 
            intensity, 
            duration, 
            risk_level
        FROM 3hr_barangay_forecasts
        WHERE barangay_id = ?
        ORDER BY forecast_date ASC, forecast_time ASC
        LIMIT 4
    ");

    $stmt->bind_param("s", $barangayId);
    $stmt->execute();
    $forecastResult = $stmt->get_result();

    $forecasts = [];

    while ($f = $forecastResult->fetch_assoc()) {
        $forecasts[] = [
            "date"      => $f['forecast_date'],
            "day"       => $f['day_name'],
            "time"      => $f['forecast_time'], // Crucial for your 3h table
            "rainfall"  => round((float)$f['rainfall_mm'], 2),
            "intensity" => round((float)$f['intensity'], 2),
            "duration"  => (int)$f['duration'],
            "risk"      => $f['risk_level']
        ];
    }

    $output[] = [
        "id"        => $row['id'],
        "name"      => $row['name'],
        "lat"       => (float)$row['lat'],
        "lon"       => (float)$row['lon'],
        "elevation" => (float)($row['elev'] ?? 0),
        "forecast"  => $forecasts
    ];

    $stmt->close();
}

echo json_encode($output);

$conn->close();