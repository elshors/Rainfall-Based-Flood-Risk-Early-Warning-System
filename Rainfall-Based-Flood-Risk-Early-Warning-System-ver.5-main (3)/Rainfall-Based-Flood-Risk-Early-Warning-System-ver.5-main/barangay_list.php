<?php
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/config.php';

if (!isset($conn)) {
    http_response_code(500);
    echo json_encode([]);
    exit;
}

$sql = "SELECT * FROM barangays ORDER BY name ASC";

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
