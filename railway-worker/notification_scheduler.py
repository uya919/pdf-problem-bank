"""
등원 알림 스케줄러
Stage 33: 상담 관리 시스템

D-1, D-day 알림을 처리합니다.
"""

import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

# 환경변수 로드
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')


def get_supabase_client() -> Client:
    """Supabase 클라이언트 생성"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise Exception("SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 설정되지 않았습니다.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_pending_notifications() -> list:
    """
    발송 대기 중인 알림 조회

    조건:
    - is_sent = False
    - scheduled_at <= 현재 시간
    """
    supabase = get_supabase_client()

    now = datetime.now().isoformat()

    result = supabase.table('enrollment_notifications') \
        .select('*') \
        .eq('is_sent', False) \
        .lte('scheduled_at', now) \
        .order('scheduled_at') \
        .limit(100) \
        .execute()

    return result.data


def mark_notification_sent(notification_id: str) -> bool:
    """알림 발송 완료 표시"""
    supabase = get_supabase_client()

    result = supabase.table('enrollment_notifications') \
        .update({
            'is_sent': True,
            'sent_at': datetime.now().isoformat()
        }) \
        .eq('id', notification_id) \
        .execute()

    return len(result.data) > 0


def send_notification(notification: dict) -> bool:
    """
    알림 발송 처리

    TODO: 실제 알림 발송 구현 (FCM, Slack, 카카오톡 등)
    현재는 로깅만 수행
    """
    print(f"""
📢 등원 알림 발송
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  👤 학생: {notification['student_name']}
  📅 등원일: {notification['enrollment_date']}
  🏫 반: {notification['class_name'] or '미배정'}
  📚 과목: {notification['subject_name'] or '전체'}
  🔔 알림 유형: {notification['notification_type']}
  👨‍🏫 수신자: {notification['recipient_type']}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    """)

    # TODO: 실제 알림 발송 로직 구현
    # - FCM 푸시 알림
    # - Slack 웹훅
    # - 카카오 알림톡

    return True


def process_notifications() -> dict:
    """
    대기 중인 알림 일괄 처리

    Returns:
        dict: 처리 결과 (processed: 처리 수, failed: 실패 수)
    """
    try:
        notifications = get_pending_notifications()

        if not notifications:
            print("📭 발송 대기 중인 알림이 없습니다.")
            return {'processed': 0, 'failed': 0, 'pending': 0}

        print(f"📬 발송 대기 알림: {len(notifications)}건")

        processed = 0
        failed = 0

        for notification in notifications:
            try:
                if send_notification(notification):
                    if mark_notification_sent(notification['id']):
                        processed += 1
                    else:
                        failed += 1
                        print(f"❌ DB 업데이트 실패: {notification['id']}")
                else:
                    failed += 1
                    print(f"❌ 알림 발송 실패: {notification['id']}")
            except Exception as e:
                failed += 1
                print(f"❌ 처리 오류: {notification['id']} - {e}")

        print(f"""
✅ 알림 처리 완료
   - 성공: {processed}건
   - 실패: {failed}건
        """)

        return {
            'processed': processed,
            'failed': failed,
            'pending': len(notifications) - processed - failed
        }

    except Exception as e:
        print(f"❌ 알림 처리 오류: {e}")
        return {'error': str(e)}


def get_upcoming_enrollments(days: int = 7) -> list:
    """
    향후 N일 내 등원 예정 학생 조회

    Args:
        days: 조회할 기간 (기본 7일)

    Returns:
        list: 등원 예정 상담 목록
    """
    supabase = get_supabase_client()

    today = datetime.now().date()
    end_date = today + timedelta(days=days)

    result = supabase.table('consultations') \
        .select('*, consultation_subjects(*, subjects(*), classes(*))') \
        .eq('enrollment_status', 'confirmed') \
        .gte('enrollment_date', today.isoformat()) \
        .lte('enrollment_date', end_date.isoformat()) \
        .order('enrollment_date') \
        .execute()

    return result.data


def create_scheduled_notifications():
    """
    예정된 알림 생성 (D-1, D-day)

    매일 1회 실행하여 누락된 알림 생성
    (confirm_enrollment RPC에서 이미 생성하지만, 백업용)
    """
    supabase = get_supabase_client()

    # 내일 등원 예정자 조회 (D-1 알림 생성)
    tomorrow = (datetime.now() + timedelta(days=1)).date()

    result = supabase.table('consultations') \
        .select('*, consultation_subjects(*, subjects(*), classes(*))') \
        .eq('enrollment_status', 'confirmed') \
        .eq('enrollment_date', tomorrow.isoformat()) \
        .execute()

    enrollments = result.data
    created_count = 0

    for enrollment in enrollments:
        for cs in enrollment.get('consultation_subjects', []):
            class_info = cs.get('classes')
            subject_info = cs.get('subjects')

            if class_info and class_info.get('teacher_id'):
                # 담당 선생님에게 D-1 알림
                try:
                    supabase.table('enrollment_notifications').insert({
                        'consultation_id': enrollment['id'],
                        'recipient_id': class_info['teacher_id'],
                        'recipient_type': 'teacher',
                        'student_name': enrollment['student_name'],
                        'enrollment_date': enrollment['enrollment_date'],
                        'class_name': class_info.get('name'),
                        'subject_name': subject_info.get('name') if subject_info else None,
                        'notification_type': 'd-1',
                        'scheduled_at': datetime.now().isoformat(),
                    }).execute()
                    created_count += 1
                except Exception as e:
                    # 중복 알림 무시 (UNIQUE 제약조건)
                    if 'duplicate' not in str(e).lower():
                        print(f"⚠️ 알림 생성 실패: {e}")

    print(f"📅 D-1 알림 생성: {created_count}건")
    return created_count


if __name__ == '__main__':
    print("""
╔════════════════════════════════════════════════════════╗
║  등원 알림 스케줄러                                     ║
║  Stage 33: 상담 관리 시스템                             ║
╚════════════════════════════════════════════════════════╝
    """)

    # 알림 처리 실행
    result = process_notifications()
    print(json.dumps(result, indent=2, ensure_ascii=False))
