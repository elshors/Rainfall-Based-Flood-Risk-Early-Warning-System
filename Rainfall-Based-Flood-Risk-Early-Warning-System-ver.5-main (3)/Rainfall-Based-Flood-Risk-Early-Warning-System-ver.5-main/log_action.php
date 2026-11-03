<?php
// log_action.php
require_once __DIR__ . '/config.php';

function createLog($user, $action, $status, $details) {
    global $conn; // This pulls the connection from config.php

    if (!$conn) {
        // If connection is lost, we can't log to DB
        error_log("Logging failed: No database connection.");
        return false;
    }

    $stmt = $conn->prepare("INSERT INTO logs (user, action, status, details) VALUES (?, ?, ?, ?)");
    
    if (!$stmt) {
        error_log("Prepare failed for logging: " . $conn->error);
        return false;
    }

    $stmt->bind_param("ssss", $user, $action, $status, $details);
    $result = $stmt->execute();
    $stmt->close();
    
    return $result;
}
?>