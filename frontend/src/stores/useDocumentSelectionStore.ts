/**
 * Phase 27-A: 문서 선택 상태 관리 Store
 *
 * 문제집-해설집 페어링을 위한 전역 선택 상태 관리
 * zustand를 사용하여 컴포넌트 간 상태 공유
 */
import { create } from 'zustand';
import type { Document } from '@/api/client';

interface DocumentInfo {
  id: string;
  name: string;
}

interface DocumentSelectionState {
  // 선택된 문서
  problemDocument: DocumentInfo | null;
  solutionDocument: DocumentInfo | null;

  // 페어링 모달 상태
  showPairConfirmDialog: boolean;

  // 애니메이션 상태
  isPairing: boolean;
  pairingComplete: boolean;

  // Actions
  selectAsProblem: (doc: Document | null) => void;
  selectAsSolution: (doc: Document | null) => void;
  clearSelection: () => void;

  // 페어링 플로우
  openPairConfirmDialog: () => void;
  closePairConfirmDialog: () => void;
  startPairing: () => void;
  completePairing: () => void;
  resetPairingState: () => void;

  // 유틸리티
  isReadyToPair: () => boolean;
  isDocumentSelected: (documentId: string) => 'problem' | 'solution' | null;
}

export const useDocumentSelectionStore = create<DocumentSelectionState>((set, get) => ({
  // Initial State
  problemDocument: null,
  solutionDocument: null,
  showPairConfirmDialog: false,
  isPairing: false,
  pairingComplete: false,

  // Select document as problem
  selectAsProblem: (doc) => {
    if (doc === null) {
      set({ problemDocument: null });
      return;
    }

    const current = get().problemDocument;

    // Toggle: 이미 선택된 문서면 해제
    if (current?.id === doc.document_id) {
      set({ problemDocument: null });
      return;
    }

    // 해설로 이미 선택된 문서면 해제하고 문제로 설정
    const solutionDoc = get().solutionDocument;
    if (solutionDoc?.id === doc.document_id) {
      set({ solutionDocument: null });
    }

    set({
      problemDocument: {
        id: doc.document_id,
        name: doc.document_id
      }
    });

    // 양쪽 다 선택되면 확인 다이얼로그 열기
    const state = get();
    if (state.problemDocument && state.solutionDocument) {
      set({ showPairConfirmDialog: true });
    }

    console.log('[Phase 27-A] Problem document selected:', doc.document_id);
  },

  // Select document as solution
  selectAsSolution: (doc) => {
    if (doc === null) {
      set({ solutionDocument: null });
      return;
    }

    const current = get().solutionDocument;

    // Toggle: 이미 선택된 문서면 해제
    if (current?.id === doc.document_id) {
      set({ solutionDocument: null });
      return;
    }

    // 문제로 이미 선택된 문서면 해제하고 해설로 설정
    const problemDoc = get().problemDocument;
    if (problemDoc?.id === doc.document_id) {
      set({ problemDocument: null });
    }

    set({
      solutionDocument: {
        id: doc.document_id,
        name: doc.document_id
      }
    });

    // 양쪽 다 선택되면 확인 다이얼로그 열기
    const state = get();
    if (state.problemDocument && state.solutionDocument) {
      set({ showPairConfirmDialog: true });
    }

    console.log('[Phase 27-A] Solution document selected:', doc.document_id);
  },

  // Clear all selection
  clearSelection: () => {
    set({
      problemDocument: null,
      solutionDocument: null,
      showPairConfirmDialog: false,
      isPairing: false,
      pairingComplete: false
    });
    console.log('[Phase 27-A] Selection cleared');
  },

  // Dialog controls
  openPairConfirmDialog: () => set({ showPairConfirmDialog: true }),
  closePairConfirmDialog: () => set({ showPairConfirmDialog: false }),

  // Pairing flow
  startPairing: () => {
    set({ isPairing: true, showPairConfirmDialog: false });
    console.log('[Phase 27-A] Pairing started');
  },

  completePairing: () => {
    set({ isPairing: false, pairingComplete: true });
    console.log('[Phase 27-A] Pairing complete');

    // 3초 후 상태 리셋
    setTimeout(() => {
      get().resetPairingState();
    }, 3000);
  },

  resetPairingState: () => {
    set({
      problemDocument: null,
      solutionDocument: null,
      isPairing: false,
      pairingComplete: false
    });
    console.log('[Phase 27-A] Pairing state reset');
  },

  // Utility: Check if ready to pair
  isReadyToPair: () => {
    const { problemDocument, solutionDocument } = get();
    return problemDocument !== null && solutionDocument !== null;
  },

  // Utility: Check if document is selected
  isDocumentSelected: (documentId: string) => {
    const { problemDocument, solutionDocument } = get();
    if (problemDocument?.id === documentId) return 'problem';
    if (solutionDocument?.id === documentId) return 'solution';
    return null;
  }
}));
