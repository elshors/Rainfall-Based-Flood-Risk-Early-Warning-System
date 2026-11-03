<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/log_action.php'; // 1. Include your log function

/*
This API returns historical forecast reports
for the Reports page.
*/

$sql = "
SELECT 
    b.name AS barangay,
    f.rain_3h,
    f.risk_level,
    f.created_at
FROM forecasts f
JOIN barangays b ON b.id = f.barangay_id
ORDER BY f.created_at DESC
";

$result = $conn->query($sql);
$reports = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $reports[] = $row;
    }

    // 2. Log the successful access
    $count = count($reports);
    createLog(
        "System", 
        "Fetch Reports", 
        "Success", 
        "Retrieved $count historical records from the database."
    );

} else {
    // 3. Log the failure if the query breaks
    createLog(
        "System", 
        "Get Reports", 
        "Failed", 
        "Database error: " . $conn->error
    );
}

echo json_encode($reports);