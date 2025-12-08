/**
 * Phase 17-C: 수식 렌더링 컴포넌트
 *
 * LaTeX 수식을 KaTeX를 사용하여 렌더링합니다.
 */
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  /** LaTeX 수식 문자열 */
  latex: string;
  /** 블록(display) 모드 vs 인라인 모드 */
  display?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 에러 시 폴백 텍스트 표시 여부 */
  showErrorFallback?: boolean;
}

/**
 * LaTeX 수식을 렌더링하는 컴포넌트
 */
export function MathRenderer({
  latex,
  display = false,
  className = '',
  showErrorFallback = true,
}: MathRendererProps) {
  const html = useMemo(() => {
    if (!latex) return '';

    try {
      return katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        errorColor: '#cc0000',
        trust: true,
        strict: false,
      });
    } catch (error) {
      console.warn('KaTeX 렌더링 오류:', error);
      return showErrorFallback ? `<span class="text-red-500">${latex}</span>` : '';
    }
  }, [latex, display, showErrorFallback]);

  if (!html) return null;

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * 텍스트 내의 LaTeX 수식($...$, $$...$$)을 찾아 렌더링
 */
interface MathTextProps {
  /** 수식을 포함할 수 있는 텍스트 */
  text: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

export function MathText({ text, className = '' }: MathTextProps) {
  const rendered = useMemo(() => {
    if (!text) return '';

    // 수식 패턴: $$...$$  (display) 또는 $...$ (inline)
    // 주의: $ 단독 사용과 구분하기 위해 내용이 있어야 함
    const parts: Array<{ type: 'text' | 'math'; content: string; display?: boolean }> = [];
    let lastIndex = 0;

    // Display math: $$...$$
    const displayPattern = /\$\$(.+?)\$\$/g;
    // Inline math: $...$
    const inlinePattern = /\$([^$]+?)\$/g;

    // 먼저 display math 처리
    let match;
    const displayMatches: Array<{ start: number; end: number; latex: string }> = [];

    while ((match = displayPattern.exec(text)) !== null) {
      displayMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        latex: match[1],
      });
    }

    // 텍스트를 부분으로 분할
    let currentPos = 0;
    for (const dm of displayMatches) {
      if (dm.start > currentPos) {
        // display math 이전 텍스트 (inline math 포함 가능)
        const beforeText = text.slice(currentPos, dm.start);
        // inline math 처리
        processInlineMath(beforeText, parts);
      }
      // display math
      parts.push({ type: 'math', content: dm.latex, display: true });
      currentPos = dm.end;
    }

    // 남은 텍스트 처리
    if (currentPos < text.length) {
      processInlineMath(text.slice(currentPos), parts);
    }

    return parts;
  }, [text]);

  if (!rendered || rendered.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {rendered.map((part, index) => {
        if (part.type === 'math') {
          return (
            <MathRenderer
              key={index}
              latex={part.content}
              display={part.display}
            />
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
}

/**
 * 텍스트에서 inline math ($...$) 처리
 */
function processInlineMath(
  text: string,
  parts: Array<{ type: 'text' | 'math'; content: string; display?: boolean }>
) {
  const inlinePattern = /\$([^$]+?)\$/g;
  let lastIndex = 0;
  let match;

  while ((match = inlinePattern.exec(text)) !== null) {
    // 수식 이전 텍스트
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    // inline math
    parts.push({ type: 'math', content: match[1], display: false });
    lastIndex = match.index + match[0].length;
  }

  // 남은 텍스트
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
}

/**
 * 문제 내용 렌더링 (수식 포함)
 *
 * content_text와 content_equations를 결합하여 렌더링
 */
interface ProblemContentProps {
  /** 문제 텍스트 */
  text: string;
  /** LaTeX 수식 배열 */
  equations?: string[];
  /** 추가 CSS 클래스 */
  className?: string;
}

export function ProblemContent({ text, equations, className = '' }: ProblemContentProps) {
  // 현재는 text를 그대로 표시 (Unicode 수식 포함)
  // 추후 equations 배열의 LaTeX를 인라인으로 삽입하는 로직 추가 가능

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {text}
    </div>
  );
}

export default MathRenderer;
