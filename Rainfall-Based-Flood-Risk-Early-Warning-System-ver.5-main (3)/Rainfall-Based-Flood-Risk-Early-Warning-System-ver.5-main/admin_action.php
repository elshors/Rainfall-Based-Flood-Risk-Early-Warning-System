<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

$forecast_id = $_POST['forecast_id'] ?? $_GET['forecast_id'] ?? null;
$action = $_POST['action'] ?? $_GET['action'] ?? null;
$manualRain = $_POST['manualRain'] ?? $_POST['manual_rain'] ?? $_GET['manual_rain'] ?? null;

// basic validation
$forecast_id = is_numeric($forecast_id) ? (int)$forecast_id : null;


if ($forecast_id === null || !$action) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing parameters"]);
    exit;
}

$valid = false;

if ($action === "approve") {
    $stmt = $conn->prepare("UPDATE forecasts SET status='approved' WHERE forecast_id=?");
    $stmt->bind_param("i", $forecast_id);
    $valid = $stmt->execute();
}

if ($action === "reject") {
    $stmt = $conn->prepare("UPDATE forecasts SET status='rejected' WHERE forecast_id=?");
    $stmt->bind_param("i", $forecast_id);
    $valid = $stmt->execute();
}

if ($action === "modify") {
    $manual = is_numeric($manualRain) ? (float)$manualRain : 0;
    $stmt = $conn->prepare(
        "UPDATE forecasts SET manual_rain=?, rain_3h=?, status='approved' WHERE forecast_id=?"
    );
    $stmt->bind_param("ddi", $manual, $manual, $forecast_id);
    $valid = $stmt->execute();
}

if (!$valid) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database update failed"]);
    exit;
}

echo json_encode(["status" => "ok"]);
?>