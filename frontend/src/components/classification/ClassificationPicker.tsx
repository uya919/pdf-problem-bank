/**
 * 분류 선택기 컴포넌트
 *
 * Phase 21+ A-3: 분류 선택 컴포넌트
 *
 * 바텀시트 형태로 5단계 분류를 단계별로 선택할 수 있는 컴포넌트
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, ChevronLeft, Check, X } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { useGrades, useClassificationSearch } from '../../api/classification';
import type {
  ClassificationNode,
  ClassificationPath,
} from '../../types/classification';

interface ClassificationPickerProps {
  /** 현재 선택된 분류 */
  value?: ClassificationPath | null;

  /** 선택 변경 콜백 */
  onChange: (classification: ClassificationPath | null) => void;

  /** 열림 상태 (선택사항 - 없으면 내부 상태 사용) */
  open?: boolean;

  /** 닫기 콜백 (선택사항 - 없으면 내부 상태 사용) */
  onClose?: () => void;

  /** 선택 가능한 최소 레벨 (기본: 3 = 중단원까지) */
  minSelectLevel?: number;

  /** 타이틀 */
  title?: string;

  /** Phase 62-A: 인라인 모드용 placeholder */
  placeholder?: string;
}

export function ClassificationPicker({
  value,
  onChange,
  open: controlledOpen,
  onClose: controlledOnClose,
  minSelectLevel = 3,
  title = '분류 선택',
  placeholder = '분류를 선택하세요',
}: ClassificationPickerProps) {
  // Phase 62-A: 내부 상태 (인라인 모드용)
  const [internalOpen, setInternalOpen] = useState(false);

  // controlled vs uncontrolled
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onClose = isControlled ? controlledOnClose! : () => setInternalOpen(false);

  // 검색어
  const [searchQuery, setSearchQuery] = useState('');

  // 선택 경로 (노드 배열)
  const [selectedNodes, setSelectedNodes] = useState<ClassificationNode[]>([]);

  // 현재 보여줄 노드 목록
  const [currentNodes, setCurrentNodes] = useState<ClassificationNode[]>([]);

  // 학년 목록 조회
  const { data: grades, isLoading: gradesLoading } = useGrades();

  // 검색 결과
  const { data: searchResults } = useClassificationSearch(searchQuery);

  // 초기화: 열릴 때 값 설정
  useEffect(() => {
    if (open && grades) {
      if (value) {
        // 기존 값이 있으면 해당 경로로 초기화
        rebuildPathFromValue(value, grades);
      } else {
        // 없으면 학년 목록으로 시작
        setSelectedNodes([]);
        setCurrentNodes(grades);
      }
      setSearchQuery('');
    }
  }, [open, grades, value]);

  // 값에서 경로 재구성
  const rebuildPathFromValue = (
    path: ClassificationPath,
    gradeList: ClassificationNode[]
  ) => {
    const nodes: ClassificationNode[] = [];
    let currentList = gradeList;

    // 학년
    if (path.gradeId) {
      const grade = currentList.find((n) => n.id === path.gradeId);
      if (grade) {
        nodes.push(grade);
        currentList = grade.children || [];
      }
    }

    // 대단원
    if (path.majorUnitId) {
      const major = currentList.find((n) => n.id === path.majorUnitId);
      if (major) {
        nodes.push(major);
        currentList = major.children || [];
      }
    }

    // 중단원
    if (path.middleUnitId) {
      const middle = currentList.find((n) => n.id === path.middleUnitId);
      if (middle) {
        nodes.push(middle);
        currentList = middle.children || [];
      }
    }

    // 소단원
    if (path.minorUnitId) {
      const minor = currentList.find((n) => n.id === path.minorUnitId);
      if (minor) {
        nodes.push(minor);
        currentList = minor.children || [];
      }
    }

    // 유형
    if (path.typeId) {
      const type = currentList.find((n) => n.id === path.typeId);
      if (type) {
        nodes.push(type);
        currentList = type.children || [];
      }
    }

    setSelectedNodes(nodes);
    setCurrentNodes(currentList);
  };

  // 현재 레벨
  const currentLevel = selectedNodes.length + 1;

  // 레벨 이름
  const levelNames = ['학년', '대단원', '중단원', '소단원', '유형'];

  // 노드 선택
  const handleSelectNode = (node: ClassificationNode) => {
    const newNodes = [...selectedNodes, node];
    setSelectedNodes(newNodes);

    if (node.children && node.children.length > 0) {
      setCurrentNodes(node.children);
    } else {
      setCurrentNodes([]);
    }
  };

  // 뒤로 가기
  const handleBack = () => {
    if (selectedNodes.length === 0) return;

    const newNodes = selectedNodes.slice(0, -1);
    setSelectedNodes(newNodes);

    if (newNodes.length === 0) {
      setCurrentNodes(grades || []);
    } else {
      const lastNode = newNodes[newNodes.length - 1];
      setCurrentNodes(lastNode.children || []);
    }
  };

  // 브레드크럼 레벨 클릭
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // "전체" 클릭
      setSelectedNodes([]);
      setCurrentNodes(grades || []);
    } else {
      const newNodes = selectedNodes.slice(0, index + 1);
      setSelectedNodes(newNodes);
      const lastNode = newNodes[newNodes.length - 1];
      setCurrentNodes(lastNode.children || []);
    }
  };

  // 선택 완료
  const handleConfirm = () => {
    if (selectedNodes.length < minSelectLevel) return;

    const path: ClassificationPath = {
      fullPath: selectedNodes.map((n) => n.name).join(' > '),
    };

    selectedNodes.forEach((node, i) => {
      switch (i) {
        case 0:
          path.gradeId = node.id;
          path.gradeName = node.name;
          break;
        case 1:
          path.majorUnitId = node.id;
          break;
        case 2:
          path.middleUnitId = node.id;
          break;
        case 3:
          path.minorUnitId = node.id;
          break;
        case 4:
          path.typeId = node.id;
          break;
      }
    });

    onChange(path);
    onClose();
  };

  // 검색 결과 선택
  const handleSearchSelect = (result: any) => {
    // 검색 결과의 경로 ID로 노드 재구성
    if (grades) {
      const path: ClassificationPath = {};

      // pathIds를 사용하여 경로 구성
      const pathIds = result.pathIds;
      let currentList = grades;
      const nodes: ClassificationNode[] = [];

      for (let i = 0; i < pathIds.length; i++) {
        const node = currentList.find((n) => n.id === pathIds[i]);
        if (node) {
          nodes.push(node);
          currentList = node.children || [];
        }
      }

      setSelectedNodes(nodes);

      // 마지막 노드의 자식을 현재 노드로 설정
      const lastNode = nodes[nodes.length - 1];
      if (lastNode?.children && lastNode.children.length > 0) {
        setCurrentNodes(lastNode.children);
      } else {
        setCurrentNodes([]);
      }
    }

    setSearchQuery('');
  };

  // 선택 가능 여부
  const canConfirm = selectedNodes.length >= minSelectLevel;

  // Phase 62-A: 인라인 모드용 트리거 버튼
  const TriggerButton = !isControlled ? (
    <button
      type="button"
      onClick={() => setInternalOpen(true)}
      className="w-full flex items-center justify-between px-3 py-2.5 border border-grey-300 rounded-lg
        text-left hover:border-grey-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
    >
      <span className={value?.fullPath ? 'text-grey-900' : 'text-grey-400'}>
        {value?.fullPath || placeholder}
      </span>
      <ChevronRight className="w-4 h-4 text-grey-400" />
    </button>
  ) : null;

  return (
    <>
      {TriggerButton}
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        height="85vh"
      showCloseButton
    >
      <div className="flex flex-col h-full">
        {/* 검색바 */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="분류 검색..."
              className="w-full pl-10 pr-4 py-2.5 bg-grey-100 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white
                transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-grey-200 rounded-full"
              >
                <X className="w-3 h-3 text-grey-400" />
              </button>
            )}
          </div>
        </div>

        {/* 브레드크럼 */}
        {!searchQuery && selectedNodes.length > 0 && (
          <div className="px-4 py-2 border-b bg-grey-50">
            <div className="flex items-center gap-1 text-sm overflow-x-auto scrollbar-hide">
              <button
                onClick={() => handleBreadcrumbClick(-1)}
                className="text-grey-500 hover:text-blue-600 whitespace-nowrap transition-colors"
              >
                전체
              </button>
              {selectedNodes.map((node, i) => (
                <React.Fragment key={node.id}>
                  <ChevronRight className="w-4 h-4 text-grey-300 flex-shrink-0" />
                  <button
                    onClick={() => handleBreadcrumbClick(i)}
                    className={`whitespace-nowrap transition-colors ${
                      i === selectedNodes.length - 1
                        ? 'text-blue-600 font-medium'
                        : 'text-grey-500 hover:text-blue-600'
                    }`}
                  >
                    {node.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery ? (
            // 검색 결과
            <div className="p-4 space-y-2">
              {searchResults?.map((result) => (
                <button
                  key={result.node.id}
                  onClick={() => handleSearchSelect(result)}
                  className="w-full text-left p-3 bg-grey-50 hover:bg-grey-100 rounded-xl
                    transition-colors duration-150"
                >
                  <div className="font-medium text-grey-900">{result.node.name}</div>
                  <div className="text-xs text-grey-500 mt-1">{result.path}</div>
                </button>
              ))}
              {searchResults?.length === 0 && (
                <div className="text-center text-grey-500 py-12">
                  검색 결과가 없습니다
                </div>
              )}
            </div>
          ) : gradesLoading ? (
            // 로딩
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : currentNodes.length > 0 ? (
            // 노드 목록
            <div className="p-2">
              {/* 뒤로가기 버튼 */}
              {selectedNodes.length > 0 && (
                <button
                  onClick={handleBack}
                  className="w-full flex items-center gap-3 p-3 text-grey-500 hover:bg-grey-50
                    rounded-xl transition-colors mb-1"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>뒤로</span>
                </button>
              )}

              {/* 레벨 표시 */}
              <div className="px-3 py-2 text-xs font-medium text-grey-400 uppercase">
                {levelNames[currentLevel - 1]} 선택
              </div>

              {/* 노드 목록 */}
              {currentNodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleSelectNode(node)}
                  className="w-full flex items-center justify-between p-3 rounded-xl
                    hover:bg-grey-50 transition-colors duration-150"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-grey-400 w-6">{node.code}</span>
                    <span className="text-grey-900">{node.name}</span>
                    {node.problemCount > 0 && (
                      <span className="text-xs text-grey-400">
                        ({node.problemCount})
                      </span>
                    )}
                  </div>
                  {node.children && node.children.length > 0 ? (
                    <ChevronRight className="w-5 h-5 text-grey-300" />
                  ) : (
                    <Check className="w-5 h-5 text-transparent" />
                  )}
                </button>
              ))}
            </div>
          ) : selectedNodes.length > 0 ? (
            // 선택 완료 (하위 항목 없음)
            <div className="flex flex-col items-center justify-center py-12 text-grey-500">
              <Check className="w-12 h-12 text-green-500 mb-3" />
              <p>선택 완료</p>
              <p className="text-sm text-grey-400 mt-1">
                더 이상 하위 분류가 없습니다
              </p>
            </div>
          ) : (
            // 빈 상태
            <div className="flex items-center justify-center py-12 text-grey-500">
              분류 데이터가 없습니다
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t p-4 bg-white">
          {/* 선택된 경로 미리보기 */}
          {selectedNodes.length > 0 && (
            <div className="mb-3 p-3 bg-blue-50 rounded-xl">
              <div className="text-xs text-blue-600 mb-1">선택된 분류</div>
              <div className="text-sm font-medium text-blue-900">
                {selectedNodes.map((n) => n.name).join(' > ')}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-grey-300 rounded-xl
                text-grey-700 font-medium hover:bg-grey-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                canConfirm
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-grey-200 text-grey-400 cursor-not-allowed'
              }`}
            >
              선택 완료
            </button>
          </div>

          {!canConfirm && (
            <p className="text-xs text-center text-grey-500 mt-2">
              {levelNames[minSelectLevel - 1]}까지 선택해주세요
            </p>
          )}
        </div>
      </div>
    </BottomSheet>
    </>
  );
}

export default ClassificationPicker;
