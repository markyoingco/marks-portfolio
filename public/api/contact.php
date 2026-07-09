<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$configPath = __DIR__ . '/config.php';
if (!is_readable($configPath)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Contact form is not configured yet. Please use email or social links.',
    ]);
    exit;
}

/** @var array<string, string> $config */
$config = require $configPath;

/**
 * @return never
 */
function respond(bool $success, string $message, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

/**
 * @param mixed $value
 */
function cleanText($value, int $maxLength): string
{
    $text = trim(strip_tags((string) $value));
    $text = preg_replace('/\s+/u', ' ', $text) ?? '';

    if ($text === '') {
        return '';
    }

    if (mb_strlen($text) > $maxLength) {
        respond(false, 'One or more fields exceed the allowed length.', 400);
    }

    return $text;
}

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody ?: '', true);

if (!is_array($data)) {
    respond(false, 'Invalid request payload.', 400);
}

$firstName = cleanText($data['firstName'] ?? '', 100);
$lastName = cleanText($data['lastName'] ?? '', 100);
$email = trim((string) ($data['email'] ?? ''));
$phone = cleanText($data['phone'] ?? '', 50);
$message = cleanText($data['message'] ?? '', 5000);

if ($firstName === '' || $lastName === '') {
    respond(false, 'First name and last name are required.', 400);
}

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'A valid email address is required.', 400);
}

if (mb_strlen($email) > 255) {
    respond(false, 'Email is too long.', 400);
}

if ($message === '') {
    respond(false, 'Message is required.', 400);
}

$email = filter_var($email, FILTER_SANITIZE_EMAIL) ?: $email;

$requiredConfigKeys = ['db_host', 'db_name', 'db_user', 'db_pass'];
foreach ($requiredConfigKeys as $key) {
    if (empty($config[$key])) {
        error_log('Contact form config missing key: ' . $key);
        respond(false, 'Contact form is not configured correctly.', 500);
    }
}

try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $config['db_host'],
        $config['db_name']
    );

    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $stmt = $pdo->prepare(
        'INSERT INTO contact_submissions
            (first_name, last_name, email, phone, message, ip_address, user_agent)
         VALUES
            (:first_name, :last_name, :email, :phone, :message, :ip_address, :user_agent)'
    );

    $stmt->execute([
        ':first_name' => $firstName,
        ':last_name' => $lastName,
        ':email' => $email,
        ':phone' => $phone !== '' ? $phone : null,
        ':message' => $message,
        ':ip_address' => isset($_SERVER['REMOTE_ADDR'])
            ? substr((string) $_SERVER['REMOTE_ADDR'], 0, 45)
            : null,
        ':user_agent' => isset($_SERVER['HTTP_USER_AGENT'])
            ? substr((string) $_SERVER['HTTP_USER_AGENT'], 0, 512)
            : null,
    ]);
} catch (PDOException $exception) {
    error_log('Contact form DB error: ' . $exception->getMessage());
    respond(false, 'Unable to save your message right now. Please try again later.', 500);
}

$notifyEmail = trim((string) ($config['notify_email'] ?? ''));
if ($notifyEmail !== '') {
    $subject = sprintf(
        'Portfolio contact from %s %s',
        $firstName,
        $lastName
    );

    $bodyLines = [
        'New contact form submission',
        '',
        'Name: ' . $firstName . ' ' . $lastName,
        'Email: ' . $email,
        'Phone: ' . ($phone !== '' ? $phone : 'Not provided'),
        '',
        'Message:',
        $message,
    ];

    $headers = [
        'From: noreply@markyoingco.com',
        'Reply-To: ' . $email,
        'Content-Type: text/plain; charset=UTF-8',
    ];

    @mail($notifyEmail, $subject, implode("\n", $bodyLines), implode("\r\n", $headers));
}

respond(true, 'Thank you! Your message has been sent successfully.');
