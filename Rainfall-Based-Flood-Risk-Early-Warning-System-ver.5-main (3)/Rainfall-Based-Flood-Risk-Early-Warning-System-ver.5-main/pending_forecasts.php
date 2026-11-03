<?php
header('Content-Type: application/json');

require_once __DIR__ . '/config.php'; //  same folder

if (!isset($conn)) {
    http_response_code(500);
    echo json_encode([]);
    exit;
}

$sql = "SELECT f.forecast_id AS id, f.barangay_id, b.name, f.rain_3h, f.risk_level
        FROM forecasts f
        JOIN barangays b ON f.barangay_id = b.id
        WHERE f.status = 'pending'
        ORDER BY f.created_at DESC";

$result = $conn->query($sql);

$data = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
}

echo json_encode($data);
exit;