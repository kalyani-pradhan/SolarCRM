<?php

declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

require_once __DIR__ . '/../src/Config.php';

$config = Config::load();
$allowedOrigins = array_values(array_filter(array_map('trim', (array) ($config['cors']['allowed_origins'] ?? []))));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Response.php';
require_once __DIR__ . '/../src/Router.php';
require_once __DIR__ . '/../src/SessionManager.php';
require_once __DIR__ . '/../src/RateLimiter.php';
require_once __DIR__ . '/../src/Middleware/AuthMiddleware.php';
require_once __DIR__ . '/../src/Middleware/CsrfMiddleware.php';
require_once __DIR__ . '/../src/Controllers/HealthController.php';
require_once __DIR__ . '/../src/Controllers/AuthController.php';
require_once __DIR__ . '/../src/Controllers/LeadController.php';
require_once __DIR__ . '/../src/Controllers/CallLogController.php';
require_once __DIR__ . '/../src/Controllers/FollowUpController.php';
require_once __DIR__ . '/../src/Controllers/DashboardController.php';
require_once __DIR__ . '/../src/Controllers/ReportController.php';

SessionManager::initialize();

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH) ?: '/';

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS' && $path !== '/api/auth/login') {
    CsrfMiddleware::verify();
}

$router = new Router();
$router->get('/api', static fn () => Response::success([
    'name' => 'SolarCRM API',
    'status' => 'ready',
], 'API ready.'));
$router->get('/api/health', [new HealthController(), 'index']);
$router->post('/api/auth/login', [new AuthController(), 'login']);
$router->post('/api/auth/logout', [new AuthController(), 'logout']);
$router->get('/api/auth/me', [new AuthController(), 'me']);
$router->get('/api/auth/csrf', [new AuthController(), 'csrf']);
$router->get('/api/dashboard/summary', [new DashboardController(), 'summary']);
$router->get('/api/reports/summary', [new ReportController(), 'summary']);
$router->get('/api/leads', [new LeadController(), 'index']);
$router->get('/api/leads/{id}', [new LeadController(), 'show']);
$router->post('/api/leads', [new LeadController(), 'create']);
$router->patch('/api/leads/{id}', [new LeadController(), 'update']);
$router->delete('/api/leads/{id}', [new LeadController(), 'archive']);
$router->post('/api/leads/{id}/restore', [new LeadController(), 'restore']);
$router->get('/api/call-logs', [new CallLogController(), 'index']);
$router->post('/api/call-logs', [new CallLogController(), 'create']);
$router->get('/api/follow-ups', [new FollowUpController(), 'index']);
$router->patch('/api/follow-ups/{id}', [new FollowUpController(), 'update']);

$router->dispatch($_SERVER['REQUEST_METHOD'], $path);
