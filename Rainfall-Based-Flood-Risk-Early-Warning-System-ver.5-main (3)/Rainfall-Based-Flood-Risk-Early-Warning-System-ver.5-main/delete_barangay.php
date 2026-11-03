<?php
header("Content-Type: application/json");
require_once __DIR__ . "/config.php";
require_once __DIR__ . "/log_action.php"; 

if(!isset($_GET['id']) || empty($_GET['id'])){
    echo json_encode(["success"=>false,"message"=>"ID missing"]);
    exit;
}

$id = trim($_GET['id']);

// 1. Fetch the Name FIRST (for better logging)
$barangayName = "Unknown (ID: $id)";
$getName = $conn->prepare("SELECT name FROM barangays WHERE id = ?");
$getName->bind_param("s", $id);
$getName->execute();
$res = $getName->get_result();
if($row = $res->fetch_assoc()) {
    $barangayName = $row['name'];
}
$getName->close();

// 2. Perform the Delete
$stmt = $conn->prepare("DELETE FROM barangays WHERE id = ?");
$stmt->bind_param("s", $id);

if($stmt->execute()){
    if($stmt->affected_rows > 0) {
        createLog("Admin", "Deleted Barangay", "Success", "Deleted barangay: $barangayName");
        echo json_encode(["success"=>true]);
    } else {
        echo json_encode(["success"=>false, "message"=>"Barangay not found"]);
    }
} else {
    createLog("Admin", "Deleted Barangay", "Failed", "Attempted to delete $barangayName: " . $stmt->error);
    echo json_encode(["success"=>false, "error"=>$stmt->error]);
}

$stmt->close();
$conn->close();
?>