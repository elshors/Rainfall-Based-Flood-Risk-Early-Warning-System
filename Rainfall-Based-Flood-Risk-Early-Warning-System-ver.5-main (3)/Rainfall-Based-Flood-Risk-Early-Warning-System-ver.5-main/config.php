<?php

// config.php

require_once __DIR__ . '/../vendor/autoload.php';


$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();


$API_KEY = $_ENV['API_KEY'] ?? getenv('API_KEY');


$host = "localhost";
$user = "root";
$pass = "";
$db   = "rainfall_based_system";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("DB Connection Failed");
}



?>