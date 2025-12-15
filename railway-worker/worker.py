"""
Railway Python Worker - 메이크에듀 동기화 백그라운드 작업 서버

이 서버는 Vercel에서 실행할 수 없는 Python/Playwright 작업을 처리합니다.

엔드포인트:
  - GET  /health           : 헬스체크
  - POST /sync/preview     : 동기화 미리보기 (DB 변경 없음)
  - POST /sync/execute     : 동기화 실행 (DB 반영)
  - GET  /sync/status/<id> : 작업 상태 조회
"""

import os
import json
import uuid
import threading
import subprocess
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

app = Flask(__name__)
CORS(app)  # 외부에서 접근 가능하도록

# 작업 상태 저장소 (메모리, 프로덕션에서는 Redis 권장)
jobs = {}

# 환경변수 확인
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
MAKEEDU_USERNAME = os.getenv('MAKEEDU_USERNAME', 'cyeyum')
MAKEEDU_PASSWORD = os.getenv('MAKEEDU_PASSWORD', 'cyeyum')


@app.route('/health', methods=['GET'])
def health_check():
    """
    헬스체크 엔드포인트
    Railway/Docker 등에서 서버 상태 확인용
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'jobs_count': len(jobs),
        'env_check': {
            'supabase_url': bool(SUPABASE_URL),
            'supabase_key': bool(SUPABASE_SERVICE_KEY),
            'makeedu_username': MAKEEDU_USERNAME,
        }
    })


@app.route('/sync/preview', methods=['POST'])
def sync_preview():
    """
    동기화 미리보기 (변경사항만 확인, DB 변경 없음)

    Returns:
        { jobId: string }
    """
    job_id = str(uuid.uuid4())

    jobs[job_id] = {
        'status': 'started',
        'progress': 0,
        'message': '작업 시작',
        'preview': True,
        'started_at': datetime.now().isoformat(),
    }

    # 백그라운드 스레드에서 작업 실행
    thread = threading.Thread(target=run_sync_task, args=(job_id, True))
    thread.daemon = True
    thread.start()

    return jsonify({'jobId': job_id})


@app.route('/sync/execute', methods=['POST'])
def sync_execute():
    """
    동기화 실행 (실제 DB 변경)

    Returns:
        { jobId: string }
    """
    job_id = str(uuid.uuid4())

    jobs[job_id] = {
        'status': 'started',
        'progress': 0,
        'message': '작업 시작',
        'preview': False,
        'started_at': datetime.now().isoformat(),
    }

    # 백그라운드 스레드에서 작업 실행
    thread = threading.Thread(target=run_sync_task, args=(job_id, False))
    thread.daemon = True
    thread.start()

    return jsonify({'jobId': job_id})


@app.route('/sync/status/<job_id>', methods=['GET'])
def sync_status(job_id):
    """
    작업 진행 상태 조회

    Args:
        job_id: 작업 ID

    Returns:
        { status, progress, message, result? }
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
            timeout=90,  # 최대 90초
            cwd=os.path.dirname(__file__) or '.',
            env={
                **os.environ,
                'MAKEEDU_USERNAME': MAKEEDU_USERNAME,
                'MAKEEDU_PASSWORD': MAKEEDU_PASSWORD,
            }
        )

        if scrape_result.returncode != 0:
            raise Exception(f"스크래핑 실패: {scrape_result.stderr}")

        # scrape_makeedu.py의 stdout에서 JSON 파싱
        stdout = scrape_result.stdout
        marker = "STEP:5:완료!"

        if marker not in stdout:
            raise Exception(f"스크래핑 완료 마커를 찾을 수 없습니다.")

        # 마커 이후의 JSON 추출
        json_start = stdout.index(marker) + len(marker)
        json_output = stdout[json_start:].strip()

        if not json_output:
            raise Exception("스크래핑 결과 JSON이 비어있습니다")

        # JSON 파싱
        decoder = json.JSONDecoder()
        scraping_data, _ = decoder.raw_decode(json_output)

        # 결과를 임시 파일로 저장
        os.makedirs('temp', exist_ok=True)
        with open('temp/scraping_result.json', 'w', encoding='utf-8') as f:
            json.dump(scraping_data, f, indent=2, ensure_ascii=False)

        update_job(job_id, 'scraping', 50, f"학생 데이터 수집 완료 ({len(scraping_data.get('students', []))}명)")

        # 2단계: 동기화 처리
        update_job(job_id, 'syncing', 60, '데이터 비교 중...')

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
            timeout=60,
            cwd=os.path.dirname(__file__) or '.',
            env={
                **os.environ,
                'SUPABASE_URL': SUPABASE_URL,
                'SUPABASE_SERVICE_KEY': SUPABASE_SERVICE_KEY,
            }
        )

        if sync_result.returncode != 0:
            error_msg = sync_result.stderr or sync_result.stdout or "알 수 없는 에러"
            raise Exception(f"동기화 실패: {error_msg}")

        # JSON 파싱
        result = json.loads(sync_result.stdout)

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

        print(f"[SYNC] 작업 완료: {job_id}")

    except subprocess.TimeoutExpired:
        jobs[job_id] = {
            'status': 'failed',
            'error': '작업 시간 초과 (90초)',
            'message': '스크래핑 시간이 너무 오래 걸립니다.',
        }
        print(f"[SYNC] 타임아웃: {job_id}")

    except Exception as e:
        jobs[job_id] = {
            'status': 'failed',
            'error': str(e),
            'message': '작업 실패',
        }
        print(f"[SYNC] 실패: {job_id} - {e}")


def update_job(job_id: str, status: str, progress: int, message: str):
    """
    작업 상태 업데이트

    Args:
        job_id: 작업 ID
        status: 상태 (started, scraping, syncing, completed, failed)
        progress: 진행률 (0-100)
        message: 상태 메시지
    """
    if job_id in jobs:
        jobs[job_id]['status'] = status
        jobs[job_id]['progress'] = progress
        jobs[job_id]['message'] = message
        print(f"[{job_id[:8]}] {progress}% - {message}")


if __name__ == '__main__':
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
    """)

    app.run(host='0.0.0.0', port=port, debug=False)
