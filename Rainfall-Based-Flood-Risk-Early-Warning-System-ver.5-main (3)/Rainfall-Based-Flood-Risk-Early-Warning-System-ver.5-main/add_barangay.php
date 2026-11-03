<?php
header("Content-Type: application/json");
require_once "config.php";
require_once "log_action.php"; // Include your logging function

// 1. Get the raw POST data
$data = json_decode(file_get_contents("php://input"), true);

// 2. Basic Validation
if (empty($data["id"]) || empty($data["name"])) {
    echo json_encode(["success" => false, "message" => "ID and Name are required."]);
    exit;
}

// 3. Prepare the SQL
$sql = "INSERT INTO barangays (id, name, lat, lon, elev, low_land) VALUES (?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
    exit;
}

// 4. Bind parameters
// Note: low_land is usually an integer (i), others are strings (s)
$stmt->bind_param("sssssi",
    $data["id"],
    $data["name"],
    $data["lat"],
    $data["lon"],
    $data["elev"],
    $data["low_land"]
);

// 5. Execute and Log the result
try {
    if ($stmt->execute()) {
        // Success: Log it!
        createLog(
            "Admin", 
            "Add Barangay", 
            "Success", 
            "Added new barangay: " . $data["name"] . " (ID: " . $data["id"] . ")"
        );
        echo json_encode(["success" => true]);
    } else {
        throw new Exception($stmt->error);
    }
} catch (Exception $e) {
    // Failure: Log the error (e.g., duplicate ID)
    createLog(
        "Admin", 
        "Add Barangay", 
        "Failed", 
        "Error adding " . ($data["name"] ?? 'Unknown') . ": " . $e->getMessage()
    );
    
    echo json_encode([
        "success" => false,
        "message" => "Failed to add barangay. It might already exist.",
        "error" => $e->getMessage()
    ]);
}

$stmt->close();
$conn->close();