/**
 * MainPage Component (Phase 34-D)
 *
 * 메인 페이지 - 토스 스타일 리디자인
 * - 단일 목표: 작업 세션 시작
 * - 시각적 계층: Hero > 세션 > 업로드
 * - Progressive Disclosure
 * - Phase 34-D: 사이드바와 함께 표시 (헤더 제거)
 */
import {
  HeroSection,
  ActiveSessionsSection,
  CollapsibleUploadSection,
} from '@/components/main';

export function MainPage() {
  return (
    <div className="min-h-full bg-grey-50">
      {/* Main Content - 사이드바가 있으므로 헤더 제거 */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero Section - 주요 CTA */}
        <HeroSection />

        {/* Active Sessions - 조건부 표시 */}
        <ActiveSessionsSection />

        {/* Collapsible Upload - 보조 기능 */}
        <div data-upload-section>
          <CollapsibleUploadSection />
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-grey-200">
          <p className="text-center text-xs text-grey-400">
            세션은 자동 저장되며, 언제든 이어서 작업할 수 있습니다
          </p>
        </footer>
      </main>
    </div>
  );
}
