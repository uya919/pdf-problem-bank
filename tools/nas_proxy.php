<?php
/**
 * NAS PDF CORS Proxy (Stage 47)
 *
 * Vercel에서 NAS PDF에 접근할 수 있도록 CORS 헤더를 추가하는 프록시
 *
 * 사용법:
 *   https://hyeyumedu.synology.me/textbooks/proxy.php?file=0.초등/쎈_초6.pdf
 */

// CORS 헤더 설정
header('Access-Control-Allow-Origin: https://hyeyum.vercel.app');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Allow-Headers: Range, Content-Type');
header('Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges');
header('Access-Control-Max-Age: 3600');

// OPTIONS 프리플라이트 요청 처리
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 파일 경로 파라미터 확인
if (!isset($_GET['file']) || empty($_GET['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'file parameter required']);
    exit;
}

// 보안: 경로 조작 방지
$requestedFile = $_GET['file'];
$requestedFile = str_replace('..', '', $requestedFile);
$requestedFile = ltrim($requestedFile, '/');

// 교재 기본 경로
$basePath = '/volume1/학원/0.수학자료/수학교재/';
$filePath = $basePath . $requestedFile;

// 파일 존재 확인
if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found', 'path' => $requestedFile]);
    exit;
}

// PDF 파일만 허용
$ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
if ($ext !== 'pdf') {
    http_response_code(403);
    echo json_encode(['error' => 'Only PDF files allowed']);
    exit;
}

// 파일 정보
$fileSize = filesize($filePath);
$fileName = basename($filePath);

// Range 요청 처리 (PDF.js 지원)
$start = 0;
$end = $fileSize - 1;

if (isset($_SERVER['HTTP_RANGE'])) {
    // Range: bytes=0-1023
    preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $matches);

    if (!empty($matches[1])) {
        $start = intval($matches[1]);
    }
    if (!empty($matches[2])) {
        $end = intval($matches[2]);
    }

    // 206 Partial Content
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$fileSize");
} else {
    http_response_code(200);
}

// 응답 헤더
header('Content-Type: application/pdf');
header('Content-Length: ' . ($end - $start + 1));
header('Accept-Ranges: bytes');
header('Content-Disposition: inline; filename="' . $fileName . '"');
header('Cache-Control: public, max-age=86400'); // 24시간 캐시

// 파일 전송
$fp = fopen($filePath, 'rb');
fseek($fp, $start);
echo fread($fp, $end - $start + 1);
fclose($fp);
