<?php
header("Content-Type: application/json");
require_once "config.php";
require_once "log_action.php"; // Include your logging function

// 1. Get the raw POST data
$data = json_decode(file_get_contents("php://input"), true);

// 2. Validate that we have an ID
if (!isset($data["id"]) || empty($data["id"])) {
    echo json_encode(["success" => false, "message" => "Missing Barangay ID"]);
    exit;
}

// 3. Prepare the update statement
$sql = "UPDATE barangays SET name=?, lat=?, lon=?, elev=?, low_land=? WHERE id=?";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}

// 4. Bind parameters
// Note: low_land is usually an integer (0 or 1), hence the "i" in "ssssis"
$stmt->bind_param(
    "ssssis",
    $data["name"],
    $data["lat"],
    $data["lon"],
    $data["elev"],
    $data["low_land"],
    $data["id"]
);

// 5. Execute and Log
if ($stmt->execute()) {
    // Check if any rows were actually changed
    if ($stmt->affected_rows >= 0) { 
        createLog(
            "Admin", 
            "Update Barangay", 
            "Success", 
            "Updated info for " . $data["name"] . " (ID: " . $data["id"] . ")"
        );
        echo json_encode(["success" => true]);
    }
} else {
    createLog(
        "Admin", 
        "Update Barangay", 
        "Failed", 
        "Error updating ID " . $data["id"] . ": " . $stmt->error
    );
    echo json_encode([
        "success" => false,
        "error" => $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>