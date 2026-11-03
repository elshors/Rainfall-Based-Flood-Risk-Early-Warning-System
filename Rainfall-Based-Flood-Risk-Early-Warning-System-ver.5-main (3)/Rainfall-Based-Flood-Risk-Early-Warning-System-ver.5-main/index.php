<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../vendor/autoload.php';


$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();
$API_KEY = $_ENV['API_KEY'] ?? getenv('API_KEY');

$lat = $_GET['lat'] ?? null;
$lon = $_GET['lon'] ?? null;

if (!$lat || !$lon) {
    http_response_code(400);
    echo json_encode(["error" => "lat and lon required"]);
    exit;
}


$url = "https://api.openweathermap.org/data/2.5/forecast?lat={$lat}&lon={$lon}&appid={$API_KEY}&units=metric";


$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["error" => "Weather API request failed"]);
    curl_close($ch);
    exit;
}

curl_close($ch);

$data = json_decode($response, true);


echo json_encode($data['list'] ?? []);