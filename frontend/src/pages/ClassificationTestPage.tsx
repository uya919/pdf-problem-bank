/**
 * 분류 컴포넌트 테스트 페이지
 *
 * Phase 21+ A-3: 분류 선택 컴포넌트 테스트
 */

import React, { useState } from 'react';
import {
  ClassificationTree,
  ClassificationPicker,
  ClassificationBreadcrumb,
} from '../components/classification';
import { useGrades, useClassificationStats } from '../api/classification';
import type {
  ClassificationPath,
  ClassificationNode,
} from '../types/classification';

export function ClassificationTestPage() {
  // 선택된 분류
  const [selectedPath, setSelectedPath] = useState<ClassificationPath | null>(null);

  // 트리에서 선택된 노드
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  // Picker 열림 상태
  const [pickerOpen, setPickerOpen] = useState(false);

  // API 데이터
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: stats } = useClassificationStats();

  const handleTreeSelect = (node: ClassificationNode) => {
    setSelectedNodeId(node.id);
    console.log('Tree selected:', node);
  };

  const handlePickerChange = (path: ClassificationPath | null) => {
    setSelectedPath(path);
    console.log('Picker selected:', path);
  };

  return (
    <div className="min-h-screen bg-grey-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-grey-900">
            분류 컴포넌트 테스트
          </h1>
          <p className="text-grey-500 mt-1">Phase 21+ A-3: 분류 선택 컴포넌트</p>
        </div>

        {/* 통계 */}
        {stats && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">분류 통계</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-grey-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-grey-500">전체</div>
              </div>
              <div className="text-center p-3 bg-grey-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.byLevel.grade}
                </div>
                <div className="text-sm text-grey-500">학년</div>
              </div>
              <div className="text-center p-3 bg-grey-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.byLevel.majorUnit}
                </div>
                <div className="text-sm text-grey-500">대단원</div>
              </div>
              <div className="text-center p-3 bg-grey-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.byLevel.middleUnit}
                </div>
                <div className="text-sm text-grey-500">중단원</div>
              </div>
              <div className="text-center p-3 bg-grey-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.byLevel.minorUnit}
                </div>
                <div className="text-sm text-grey-500">소단원</div>
              </div>
              <div className="text-center p-3 bg-grey-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.byLevel.type}
                </div>
                <div className="text-sm text-grey-500">유형</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ClassificationTree 테스트 */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">ClassificationTree</h2>
            <p className="text-sm text-grey-500 mb-4">
              트리 형태로 분류 체계를 표시합니다. 클릭하여 선택하세요.
            </p>

            {gradesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : grades ? (
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <ClassificationTree
                  data={grades}
                  selectedId={selectedNodeId}
                  onSelect={handleTreeSelect}
                  showCounts
                />
              </div>
            ) : (
              <div className="text-center py-12 text-grey-500">
                데이터를 불러올 수 없습니다
              </div>
            )}

            {selectedNodeId && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600">선택된 노드 ID</div>
                <div className="font-mono font-bold text-blue-900">
                  {selectedNodeId}
                </div>
              </div>
            )}
          </div>

          {/* ClassificationPicker & Breadcrumb 테스트 */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">
              ClassificationPicker & Breadcrumb
            </h2>
            <p className="text-sm text-grey-500 mb-4">
              바텀시트 형태의 분류 선택기입니다. 아래 버튼을 클릭하세요.
            </p>

            {/* Breadcrumb */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-grey-700 mb-2">
                선택된 분류
              </label>
              <ClassificationBreadcrumb
                value={selectedPath}
                onEdit={() => setPickerOpen(true)}
                onClear={() => setSelectedPath(null)}
                placeholder="분류를 선택하세요"
              />
            </div>

            {/* 테스트 버튼 */}
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full py-3 px-4 bg-blue-500 text-white rounded-xl font-medium
                hover:bg-blue-600 transition-colors"
            >
              분류 선택하기
            </button>

            {/* 선택 결과 JSON */}
            {selectedPath && (
              <div className="mt-4 p-3 bg-grey-100 rounded-lg">
                <div className="text-sm text-grey-600 mb-2">선택 결과 (JSON)</div>
                <pre className="text-xs font-mono text-grey-800 overflow-x-auto">
                  {JSON.stringify(selectedPath, null, 2)}
                </pre>
              </div>
            )}

            {/* Breadcrumb 컴팩트 모드 */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-grey-700 mb-2">
                컴팩트 모드
              </label>
              <ClassificationBreadcrumb
                value={selectedPath}
                onEdit={() => setPickerOpen(true)}
                compact
              />
            </div>

            {/* 읽기 전용 모드 */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-grey-700 mb-2">
                읽기 전용 모드
              </label>
              <ClassificationBreadcrumb value={selectedPath} readOnly />
            </div>
          </div>
        </div>

        {/* ClassificationPicker 모달 */}
        <ClassificationPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          value={selectedPath}
          onChange={handlePickerChange}
          minSelectLevel={3}
          title="분류 선택"
        />
      </div>
    </div>
  );
}

export default ClassificationTestPage;
