/**
 * Admin PC 전용 데이터 훅 (호환성 유지용 re-export)
 *
 * 실제 구현은 hooks/admin/ 폴더에 분리됨
 * 기존 import 경로 호환성을 위해 re-export
 *
 * @deprecated 새 코드에서는 hooks/admin/에서 직접 import 권장
 */
export * from './admin';
