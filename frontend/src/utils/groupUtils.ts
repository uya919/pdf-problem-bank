/**
 * Group Utility Functions (Phase 63)
 *
 * 그룹 데이터 처리 유틸리티
 * - enrichGroupsWithLinks: 세션 링크 정보를 그룹에 주입
 */
import type { ProblemGroup, WorkSession, GroupLink } from '../api/client';

/**
 * 세션의 링크 정보를 문제 그룹에 주입
 *
 * 문제 그룹에 해설 연결 정보(link 필드)를 추가합니다.
 * session.links 배열에서 problemGroupId를 기준으로 매칭합니다.
 *
 * @param groups - 원본 그룹 배열
 * @param session - 현재 작업 세션 (null 가능)
 * @returns link 정보가 추가된 그룹 배열
 *
 * @example
 * ```typescript
 * const enrichedGroups = enrichGroupsWithLinks(localGroups, currentSession);
 * // 각 그룹에 group.link 필드가 추가됨 (연결된 경우)
 * ```
 */
export function enrichGroupsWithLinks(
  groups: ProblemGroup[],
  session: WorkSession | null
): ProblemGroup[] {
  // 세션이 없거나 링크가 없으면 원본 반환
  if (!session?.links || session.links.length === 0) {
    return groups;
  }

  // problemGroupId → GroupLink 맵핑 생성
  const linkMap = new Map<string, GroupLink>(
    session.links.map((link) => [
      link.problemGroupId,
      {
        linkType: 'problem' as const,
        linkedGroupId: link.solutionGroupId,
        linkedDocumentId: link.solutionDocumentId,
        linkedPageIndex: link.solutionPageIndex,
        linkedName: `해설 p${link.solutionPageIndex + 1}`,
        linkedAt: link.linkedAt,
      },
    ])
  );

  // 그룹에 링크 정보 주입
  return groups.map((group) => {
    const sessionLink = linkMap.get(group.id);

    // 세션 링크가 있으면 사용, 없으면 기존 link 유지
    if (sessionLink) {
      return {
        ...group,
        link: sessionLink,
      };
    }

    return group;
  });
}

/**
 * 그룹이 해설과 연결되어 있는지 확인
 *
 * @param group - 확인할 그룹
 * @param session - 현재 작업 세션
 * @returns 연결 여부
 */
export function isGroupLinked(
  group: ProblemGroup,
  session: WorkSession | null
): boolean {
  if (!session?.links) return false;
  return session.links.some((link) => link.problemGroupId === group.id);
}

/**
 * 특정 그룹의 연결 정보 가져오기
 *
 * @param groupId - 그룹 ID
 * @param session - 현재 작업 세션
 * @returns 연결 정보 또는 null
 */
export function getGroupLinkInfo(
  groupId: string,
  session: WorkSession | null
): GroupLink | null {
  if (!session?.links) return null;

  const link = session.links.find((l) => l.problemGroupId === groupId);
  if (!link) return null;

  return {
    linkType: 'problem',
    linkedGroupId: link.solutionGroupId,
    linkedDocumentId: link.solutionDocumentId,
    linkedPageIndex: link.solutionPageIndex,
    linkedName: `해설 p${link.solutionPageIndex + 1}`,
    linkedAt: link.linkedAt,
  };
}
