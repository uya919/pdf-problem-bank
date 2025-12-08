/**
 * Phase 19-C: KaTeX 수식 렌더링 컴포넌트
 *
 * LaTeX 문자열을 KaTeX로 렌더링합니다.
 * - 인라인 수식: $...$ 패턴 자동 감지
 * - 디스플레이 수식: displayMode prop 사용
 */
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathDisplayProps {
  /** LaTeX 문자열 (인라인 $...$ 패턴 포함 가능) */
  latex: string;
  /** 디스플레이 모드 (블록 수식) */
  displayMode?: boolean;
  /** 에러 시 폴백 텍스트 표시 여부 */
  throwOnError?: boolean;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * 단일 LaTeX 수식 렌더링
 */
function renderLatex(latex: string, displayMode: boolean = false): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
      trust: true,
      strict: false,
    });
  } catch (error) {
    console.warn('KaTeX 렌더링 에러:', latex, error);
    return `<span class="text-red-500">${latex}</span>`;
  }
}

/**
 * $...$ 패턴을 찾아서 KaTeX로 변환
 */
function renderMixedContent(text: string): string {
  // $...$ 패턴 매칭 (이스케이프된 \$ 제외)
  const mathPattern = /\$([^$]+)\$/g;

  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = mathPattern.exec(text)) !== null) {
    // 수식 전 일반 텍스트
    if (match.index > lastIndex) {
      result += escapeHtml(text.substring(lastIndex, match.index));
    }

    // 수식 렌더링
    const latex = match[1];
    result += renderLatex(latex, false);

    lastIndex = match.index + match[0].length;
  }

  // 나머지 텍스트
  if (lastIndex < text.length) {
    result += escapeHtml(text.substring(lastIndex));
  }

  return result;
}

/**
 * HTML 특수문자 이스케이프
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * MathDisplay 컴포넌트
 *
 * @example
 * // 인라인 수식 (텍스트 내 $...$ 패턴)
 * <MathDisplay latex="부등식 $\left|x-5\right| < 3$의 해" />
 *
 * @example
 * // 순수 수식 (디스플레이 모드)
 * <MathDisplay latex="\frac{5}{4}" displayMode />
 */
export function MathDisplay({
  latex,
  displayMode = false,
  className = '',
}: MathDisplayProps) {
  const html = useMemo(() => {
    if (!latex) return '';

    if (displayMode) {
      // 디스플레이 모드: 전체를 하나의 수식으로 렌더링
      return renderLatex(latex, true);
    }

    // 인라인 모드: $...$ 패턴 찾아서 렌더링
    if (latex.includes('$')) {
      return renderMixedContent(latex);
    }

    // $ 없으면 일반 텍스트
    return escapeHtml(latex);
  }, [latex, displayMode]);

  if (!latex) {
    return null;
  }

  return (
    <span
      className={`math-display ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * 순수 수식만 렌더링하는 간단한 컴포넌트
 */
export function Math({ children }: { children: string }) {
  const html = useMemo(() => renderLatex(children, false), [children]);

  return (
    <span
      className="math-inline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * 블록 수식 렌더링
 */
export function MathBlock({ children }: { children: string }) {
  const html = useMemo(() => renderLatex(children, true), [children]);

  return (
    <div
      className="math-block my-2"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default MathDisplay;
