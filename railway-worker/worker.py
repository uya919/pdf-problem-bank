"""
Railway Python Worker - 메이크에듀 동기화, PDF 압축, NAS 프록시 서버

이 서버는 Vercel에서 실행할 수 없는 Python 작업을 처리합니다.
- 메이크에듀 동기화 (Playwright)
- PDF 압축 (PyMuPDF)
- NAS 교재 프록시 (Stage 47)
"""

import os
import json
import uuid
import asyncio
import threading
import subprocess
from datetime import datetime
from flask import Flask, request, jsonify, make_response, Response
from flask_cors import CORS
from dotenv import load_dotenv
import requests
from xml.etree import ElementTree as ET
from urllib.parse import quote, unquote

# PDF 압축 모듈
from pdf_compressor import compress_pdf, get_pdf_info

# 환경변수 로드
load_dotenv()

app = Flask(__name__)
# Stage 35-D: Vercel 배포 시 CORS 허용 (모든 origin 허용)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": "*"}})

# 작업 상태 저장소 (메모리, 추후 Redis 권장)
jobs = {}

# 환경변수 확인
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
MAKEEDU_USERNAME = os.getenv('MAKEEDU_USERNAME', 'cyeyum')
MAKEEDU_PASSWORD = os.getenv('MAKEEDU_PASSWORD', 'cyeyum')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("⚠️  경고: SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 설정되지 않았습니다.")


@app.route('/health', methods=['GET'])
def health_check():
    """헬스체크 엔드포인트"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'jobs_count': len(jobs),
        'playwright_installed': check_playwright(),
    })


# ========================================
# Stage 33: 등원 알림 스케줄러 엔드포인트
# ========================================

@app.route('/notifications/process', methods=['POST'])
def process_notifications():
    """
    대기 중인 등원 알림 일괄 처리
    (D-1, D-day 알림 발송)
    """
    try:
        from notification_scheduler import process_notifications as do_process
        result = do_process()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/notifications/upcoming', methods=['GET'])
def get_upcoming_enrollments():
    """
    향후 7일 내 등원 예정 학생 조회
    """
    try:
        from notification_scheduler import get_upcoming_enrollments as do_get
        days = request.args.get('days', 7, type=int)
        result = do_get(days)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/notifications/create-scheduled', methods=['POST'])
def create_scheduled_notifications():
    """
    D-1, D-day 알림 생성 (백업용)
    """
    try:
        from notification_scheduler import create_scheduled_notifications as do_create
        count = do_create()
        return jsonify({'created': count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========================================
# Stage 46: PDF 압축 엔드포인트
# ========================================

@app.route('/compress-pdf', methods=['POST', 'OPTIONS'])
def compress_pdf_endpoint():
    """
    PDF 압축 API

    Request:
        - file: PDF 파일 (multipart/form-data)
        - quality: JPEG 품질 (선택, 기본 90)

    Response:
        - 압축된 PDF 파일 (binary)
        - Headers에 통계 정보 포함
    """
    # CORS preflight 처리
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = '*'
        return response

    try:
        # 파일 검증
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Only PDF files allowed'}), 400

        # 품질 파라미터 (기본 90)
        quality = request.form.get('quality', 90, type=int)
        if not 1 <= quality <= 100:
            quality = 90

        # 파일 읽기
        input_bytes = file.read()
        original_size = len(input_bytes)

        print(f"📥 [COMPRESS] 수신: {file.filename} ({original_size / 1024 / 1024:.1f}MB)")

        # 압축 수행
        compressed_bytes, stats = compress_pdf(input_bytes, jpeg_quality=quality)

        print(f"✅ [COMPRESS] 완료: {stats['compressed_size'] / 1024 / 1024:.1f}MB ({stats['compression_ratio']}% 감소)")

        # 응답 헤더에 통계 정보 추가
        response = make_response(compressed_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename="compressed_{file.filename}"'
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Expose-Headers'] = 'X-Original-Size, X-Compressed-Size, X-Compression-Ratio, X-Images-Processed, X-Page-Count'
        response.headers['X-Original-Size'] = str(stats['original_size'])
        response.headers['X-Compressed-Size'] = str(stats['compressed_size'])
        response.headers['X-Compression-Ratio'] = str(stats['compression_ratio'])
        response.headers['X-Images-Processed'] = str(stats['images_processed'])
        response.headers['X-Page-Count'] = str(stats['pages'])

        return response

    except Exception as e:
        print(f"❌ [COMPRESS] 실패: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/compress-pdf/info', methods=['POST', 'OPTIONS'])
def pdf_info_endpoint():
    """
    PDF 정보 조회 (압축 없이)

    Request:
        - file: PDF 파일 (multipart/form-data)

    Response:
        - pages: 페이지 수
        - images: 이미지 수
        - size: 파일 크기
    """
    # CORS preflight 처리
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = '*'
        return response

    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        input_bytes = file.read()

        info = get_pdf_info(input_bytes)
        return jsonify(info)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def check_playwright():
    """Playwright 브라우저 설치 확인"""
    try:
        result = subprocess.run(
            ['python', '-m', 'playwright', 'install', '--help'],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0
    except:
        return False


@app.route('/sync/preview', methods=['POST'])
def sync_preview():
    """
    동기화 미리보기 (변경사항만 확인, DB 변경 없음)
    """
    job_id = str(uuid.uuid4())

    jobs[job_id] = {
        'status': 'started',
        'progress': 0,
        'message': '작업 시작',
        'preview': True,
        'started_at': datetime.now().isoformat(),
    }

    # 백그라운드 작업 시작
    thread = threading.Thread(target=run_sync_task, args=(job_id, True))
    thread.daemon = True
    thread.start()

    return jsonify({'jobId': job_id})


@app.route('/sync/execute', methods=['POST'])
def sync_execute():
    """
    동기화 실행 (실제 DB 변경)
    """
    job_id = str(uuid.uuid4())

    jobs[job_id] = {
        'status': 'started',
        'progress': 0,
        'message': '작업 시작',
        'preview': False,
        'started_at': datetime.now().isoformat(),
    }

    # 백그라운드 작업 시작
    thread = threading.Thread(target=run_sync_task, args=(job_id, False))
    thread.daemon = True
    thread.start()

    return jsonify({'jobId': job_id})


@app.route('/sync/status/<job_id>', methods=['GET'])
def sync_status(job_id):
    """
    작업 진행 상태 조회
    """
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404

    return jsonify(jobs[job_id])


def run_sync_task(job_id: str, preview: bool = True):
    """
    실제 동기화 작업 실행 (백그라운드 스레드)

    Args:
        job_id: 작업 ID
        preview: True면 미리보기만, False면 실제 DB 반영
    """
    try:
        # 1단계: 스크래핑 시작
        update_job(job_id, 'scraping', 10, '메이크에듀 로그인 중...')

        # scrape_makeedu.py 실행
        scrape_result = subprocess.run(
            ['python', 'scrape_makeedu.py'],
            capture_output=True,
            text=True,
            timeout=60,  # 최대 60초
            cwd=os.path.dirname(__file__),
        )

        if scrape_result.returncode != 0:
            raise Exception(f"스크래핑 실패: {scrape_result.stderr}")

        # scrape_makeedu.py의 stdout에서 JSON 파싱
        try:
            # "STEP:5:완료!" 이후의 모든 텍스트가 JSON
            stdout = scrape_result.stdout
            marker = "STEP:5:완료!"

            if marker not in stdout:
                raise Exception(f"스크래핑 완료 마커를 찾을 수 없습니다. stdout: {stdout[:200]}")

            # 마커 이후의 모든 내용 추출
            json_start = stdout.index(marker) + len(marker)
            json_output = stdout[json_start:].strip()

            if not json_output:
                raise Exception("스크래핑 결과 JSON이 비어있습니다")

            # JSON decoder로 첫 번째 JSON 객체만 파싱 (이후 텍스트 무시)
            import json as json_module
            decoder = json_module.JSONDecoder()
            scraping_data, _ = decoder.raw_decode(json_output)

            # temp/ 디렉토리 생성 (없으면)
            os.makedirs('temp', exist_ok=True)

            # 결과를 scraping_result.json 파일로 저장
            with open('temp/scraping_result.json', 'w', encoding='utf-8') as f:
                json.dump(scraping_data, f, indent=2, ensure_ascii=False)

            print(f"📊 [SCRAPING] 결과 저장됨: {len(scraping_data.get('students', []))}명")

        except json.JSONDecodeError as e:
            raise Exception(f"스크래핑 결과 파싱 실패: {e}")

        update_job(job_id, 'scraping', 40, '학생 데이터 수집 완료')

        # 2단계: 동기화 처리
        update_job(job_id, 'syncing', 50, '데이터 처리 중...')

        # sync_api.py 실행
        sync_args = ['python', 'sync_api.py']
        if preview:
            sync_args.append('--preview')
        else:
            sync_args.append('--execute')

        sync_result = subprocess.run(
            sync_args,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=os.path.dirname(__file__),
        )

        if sync_result.returncode != 0:
            # 에러 상세 로깅
            print(f"🔍 [SYNC] returncode: {sync_result.returncode}")
            print(f"🔍 [SYNC] stderr: {sync_result.stderr}")
            print(f"🔍 [SYNC] stdout: {sync_result.stdout}")

            error_msg = sync_result.stderr or sync_result.stdout or f"Unknown error (exit code: {sync_result.returncode})"
            raise Exception(f"동기화 실패: {error_msg}")

        # JSON 파싱
        try:
            result = json.loads(sync_result.stdout)
        except json.JSONDecodeError as e:
            raise Exception(f"JSON 파싱 실패: {sync_result.stdout[:200]}")

        update_job(job_id, 'syncing', 90, '동기화 완료')

        # 3단계: 완료
        jobs[job_id] = {
            'status': 'completed',
            'progress': 100,
            'message': '작업 완료',
            'preview': preview,
            'result': result,
            'started_at': jobs[job_id]['started_at'],
            'completed_at': datetime.now().isoformat(),
        }

        print(f"✅ 작업 완료: {job_id}")

    except subprocess.TimeoutExpired:
        jobs[job_id] = {
            'status': 'failed',
            'error': '작업 시간 초과 (60초)',
            'message': '스크래핑 시간이 너무 오래 걸립니다.',
        }
        print(f"❌ 작업 타임아웃: {job_id}")

    except Exception as e:
        jobs[job_id] = {
            'status': 'failed',
            'error': str(e),
            'message': '작업 실패',
        }
        print(f"❌ 작업 실패: {job_id} - {e}")


def update_job(job_id: str, status: str, progress: int, message: str):
    """작업 상태 업데이트"""
    if job_id in jobs:
        jobs[job_id]['status'] = status
        jobs[job_id]['progress'] = progress
        jobs[job_id]['message'] = message
        print(f"📊 [{job_id[:8]}] {progress}% - {message}")


if __name__ == '__main__':
    # Railway 환경 감지
    port = int(os.getenv('PORT', 5000))

    print(f"""
╔════════════════════════════════════════════════════════╗
║  Railway Python Worker                                 ║
║  메이크에듀 동기화 백그라운드 서버                      ║
╚════════════════════════════════════════════════════════╝

🚀 서버 시작: http://0.0.0.0:{port}
🔧 환경변수:
   - SUPABASE_URL: {'✅ 설정됨' if SUPABASE_URL else '❌ 미설정'}
   - SUPABASE_SERVICE_KEY: {'✅ 설정됨' if SUPABASE_SERVICE_KEY else '❌ 미설정'}
   - MAKEEDU_USERNAME: {MAKEEDU_USERNAME}

📡 엔드포인트:
   - GET  /health
   - POST /sync/preview
   - POST /sync/execute
   - GET  /sync/status/<job_id>
   - POST /notifications/process
   - GET  /notifications/upcoming
   - POST /notifications/create-scheduled
   - POST /compress-pdf (Stage 46: PDF 압축)
   - POST /compress-pdf/info
    """)

    # Gunicorn으로 실행 (프로덕션)
    # Railway는 자동으로 gunicorn 사용
    app.run(host='0.0.0.0', port=port, debug=False)
