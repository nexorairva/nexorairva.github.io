<?php
/*
 * NEXORA AIR · envío de correos desde tu hosting (cPanel)
 *
 * 1. Crea en cPanel la cuenta de correo altas@tudominio.
 * 2. Sube este archivo por el Administrador de archivos a public_html/nexora-mail/enviar-correo.php
 * 3. Cambia $TOKEN por una clave larga y secreta (por ejemplo 40 caracteres al azar) y $FROM por tu dirección.
 * 4. En Staff › Integraciones de la web añade una integración con:
 *      Dirección: https://tudominio/nexora-mail/enviar-correo.php
 *      Credencial: la misma clave que $TOKEN
 *      Remitente: NEXORA AIR <altas@tudominio>
 */
$TOKEN = 'CAMBIA-ESTA-CLAVE-POR-UNA-LARGA-Y-SECRETA';
$FROM  = 'altas@tudominio.com';          // debe ser una cuenta de TU dominio
$NAME  = 'NEXORA AIR';

header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('{"ok":false}'); }
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
if (!hash_equals('Bearer ' . $TOKEN, $auth)) { http_response_code(401); exit('{"ok":false}'); }
$in = json_decode(file_get_contents('php://input'), true);
$to = trim($in['to'][0] ?? ($in['to'] ?? ''));
$subject = trim((string)($in['subject'] ?? ''));
$html = (string)($in['html'] ?? '');
if (!filter_var($to, FILTER_VALIDATE_EMAIL) || $subject === '' || $html === '' || strlen($subject) > 200 || strlen($html) > 20000) {
  http_response_code(400); exit('{"ok":false}');
}
$subject = str_replace(["\r", "\n"], ' ', $subject);
$headers = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n"
         . 'From: ' . mb_encode_mimeheader($NAME) . " <$FROM>\r\nReply-To: $FROM\r\n";
$ok = mail($to, mb_encode_mimeheader($subject, 'UTF-8'), $html, $headers, "-f$FROM");
http_response_code($ok ? 200 : 500);
echo json_encode(['ok' => $ok]);
