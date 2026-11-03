<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../vendor/autoload.php';


$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();
$API_KEY = $_ENV['API_KEY'] ?? getenv('API_KEY');


$lat = 8.2325; 
$lon = 124.6019;
$name = "Talakag/Libona (Headwaters)";


$url = "https://api.openweathermap.org/data/2.5/forecast?lat=$lat&lon=$lon&appid=$API_KEY&units=metric";
$response = @file_get_contents($url);
$data = $response ? json_decode($response, true) : null;


$rain = $data['list'][0]['rain']['3h'] ?? 0;
$status = "NORMAL";
$advice = "No river surge expected.";

if ($rain > 15) {
    $status = "SURGE WARNING";
    $advice = "Heavy rain upstream.";
} elseif ($rain > 5) {
    $status = "MONITORING";
    $advice = "Light rain upstream.";
}


echo json_encode([
    "name" => $name,
    "rain" => $rain,
    "status" => $status,
    "advice" => $advice
]);