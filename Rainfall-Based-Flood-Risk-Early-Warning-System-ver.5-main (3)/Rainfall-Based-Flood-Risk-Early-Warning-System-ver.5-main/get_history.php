<?php
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/config.php';

if (!isset($conn)) {
    http_response_code(500);
    echo json_encode([]);
    exit;
}

$sql = "
    SELECT f.*, b.name AS barangay_name
FROM forecasts f
JOIN barangays b ON f.barangay_id = b.id
INNER JOIN (
    SELECT barangay_id, MAX(created_at) AS latest_ts
    FROM forecasts
    GROUP BY barangay_id
) latest
ON f.barangay_id = latest.barangay_id
AND f.created_at = latest.latest_ts
ORDER BY f.created_at DESC
";

$result = $conn->query($sql);

if (!$result) {
    http_response_code(500);
    echo json_encode([]);
    exit;
}

$data = [];

while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode($data);
