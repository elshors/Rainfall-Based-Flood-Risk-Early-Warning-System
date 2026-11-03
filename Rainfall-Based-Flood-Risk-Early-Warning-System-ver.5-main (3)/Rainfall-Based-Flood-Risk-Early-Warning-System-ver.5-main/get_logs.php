<?php

require_once __DIR__ . '/config.php';

$sql = "SELECT * FROM logs ORDER BY timestamp DESC";
$result = $conn->query($sql);

$logs = [];

while($row = $result->fetch_assoc()){
    $logs[] = $row;
}

echo json_encode($logs);