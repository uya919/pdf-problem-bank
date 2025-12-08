/**
 * 통계 카드 컴포넌트
 *
 * Phase 21+ B-1: 문제은행 메인 UI
 *
 * 문제은행 통계를 카드 형태로 표시
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Star,
  TrendingUp,
  Clock,
  FileText,
  PenTool,
} from 'lucide-react';
import type { ProblemStats } from '../../types/problem';

interface StatsCardsProps {
  stats: ProblemStats | undefined;
  loading?: boolean;
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subValue?: string;
  color: string;
  delay?: number;
}

function StatCard({ icon, label, value, subValue, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`
        bg-white rounded-2xl p-4 border border-grey-100
        hover:shadow-md transition-shadow
      `}
    >
      <div className="flex items-start justify-between">
        <div
          className={`
            w-10 h-10 rounded-xl flex items-center justify-center
            ${color}
          `}
        >
          {icon}
        </div>
        {subValue && (
          <span className="text-xs text-grey-400">{subValue}</span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-grey-900">{value}</div>
        <div className="text-sm text-grey-500">{label}</div>
      </div>
    </motion.div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-grey-100 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-grey-100" />
      <div className="mt-3 space-y-2">
        <div className="w-16 h-7 bg-grey-100 rounded" />
        <div className="w-20 h-4 bg-grey-100 rounded" />
      </div>
    </div>
  );
}

export function StatsCards({ stats, loading, className = '' }: StatsCardsProps) {
  if (loading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // 가장 많은 문제 유형
  const topQuestionType = Object.entries(stats.byQuestionType)
    .sort(([, a], [, b]) => b - a)[0];

  // 가장 많은 학년
  const topGrade = Object.entries(stats.byGrade)
    .sort(([, a], [, b]) => b - a)[0];

  const questionTypeLabels: Record<string, string> = {
    multiple_choice: '객관식',
    short_answer: '단답형',
    essay: '서술형',
  };

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${className}`}>
      <StatCard
        icon={<BookOpen className="w-5 h-5 text-blue-600" />}
        label="전체 문제"
        value={stats.total.toLocaleString()}
        color="bg-blue-50"
        delay={0}
      />
      <StatCard
        icon={<Star className="w-5 h-5 text-yellow-500" />}
        label="즐겨찾기"
        value={stats.favorites}
        color="bg-yellow-50"
        delay={0.05}
      />
      <StatCard
        icon={<TrendingUp className="w-5 h-5 text-green-600" />}
        label="최근 추가"
        value={stats.recentlyAdded}
        subValue="7일 이내"
        color="bg-green-50"
        delay={0.1}
      />
      <StatCard
        icon={<FileText className="w-5 h-5 text-purple-600" />}
        label="주요 유형"
        value={topQuestionType ? questionTypeLabels[topQuestionType[0]] || '-' : '-'}
        subValue={topQuestionType ? `${topQuestionType[1]}문제` : undefined}
        color="bg-purple-50"
        delay={0.15}
      />
      <StatCard
        icon={<PenTool className="w-5 h-5 text-orange-600" />}
        label="주요 과목"
        value={topGrade ? topGrade[0] : '-'}
        subValue={topGrade ? `${topGrade[1]}문제` : undefined}
        color="bg-orange-50"
        delay={0.2}
      />
      <StatCard
        icon={<Clock className="w-5 h-5 text-cyan-600" />}
        label="난이도 분포"
        value={Object.keys(stats.byDifficulty).length}
        subValue="레벨"
        color="bg-cyan-50"
        delay={0.25}
      />
    </div>
  );
}

/**
 * 간단한 통계 바
 */
export function StatsBar({ stats }: { stats: ProblemStats | undefined }) {
  if (!stats) return null;

  return (
    <div className="flex items-center gap-6 text-sm text-grey-500">
      <span className="flex items-center gap-1.5">
        <BookOpen className="w-4 h-4" />
        <span className="font-medium text-grey-900">{stats.total}</span>
        문제
      </span>
      <span className="flex items-center gap-1.5">
        <Star className="w-4 h-4 text-yellow-400" />
        <span className="font-medium text-grey-900">{stats.favorites}</span>
        즐겨찾기
      </span>
      <span className="flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4 text-green-500" />
        <span className="font-medium text-grey-900">{stats.recentlyAdded}</span>
        최근 추가
      </span>
    </div>
  );
}

export default StatsCards;
