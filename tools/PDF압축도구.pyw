"""
PDF 압축 도구 GUI
Hyeyum 백오피스용 로컬 PDF 압축 앱

기능:
- 드래그앤드롭으로 PDF 파일 추가
- JPEG 품질 조절 (70-95)
- 멀티 파일 일괄 처리
- 진행률 표시
- 압축 결과 요약

사용법:
1. pip install -r requirements.txt
2. python pdf_compressor_gui.py
"""

import os
import io
import threading
from pathlib import Path
from typing import List, Callable, Optional, Tuple, Dict, Any

import fitz  # PyMuPDF
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

# 드래그앤드롭 지원 (설치 안됐으면 무시)
try:
    from tkinterdnd2 import DND_FILES, TkinterDnD
    HAS_DND = True
except ImportError:
    HAS_DND = False
    print("[경고] tkinterdnd2 미설치 - 드래그앤드롭 비활성화")
    print("설치: pip install tkinterdnd2")


# =====================================================
# PDF 압축 로직 (railway-worker/pdf_compressor.py 기반)
# =====================================================

def compress_pdf(
    input_path: str,
    output_path: str,
    jpeg_quality: int = 85,
    on_progress: Optional[Callable[[int, str], None]] = None
) -> Dict[str, Any]:
    """
    PDF 압축 수행 (v2 - 버그 수정)

    전략:
    - JPEG 이미지: 이미 최적화된 경우 스킵, 품질 낮춰서 재압축
    - PNG 이미지: JPEG로 변환 (투명도 없는 경우)
    - 무손실 최적화: garbage=4, deflate

    Args:
        input_path: 원본 PDF 경로
        output_path: 출력 PDF 경로
        jpeg_quality: JPEG 압축 품질 (1-100, 기본 85)
        on_progress: 진행률 콜백 (percent, message)

    Returns:
        압축 통계 정보
    """
    on_progress = on_progress or (lambda p, m: None)

    # 파일 읽기
    on_progress(5, "PDF 파일 읽는 중...")

    original_size = os.path.getsize(input_path)
    stats = {
        'original_size': original_size,
        'jpeg_quality': jpeg_quality,
        'images_processed': 0,
        'images_skipped': 0,
        'pages': 0,
    }

    # PDF 문서 열기
    on_progress(10, "PDF 분석 중...")
    doc = fitz.open(input_path)
    stats['pages'] = doc.page_count

    # 이미지 압축
    total_pages = doc.page_count
    for page_num in range(total_pages):
        progress = 10 + int((page_num / total_pages) * 70)
        on_progress(progress, f"페이지 {page_num + 1}/{total_pages} 처리 중...")

        page = doc[page_num]
        image_list = page.get_images(full=True)

        for img_info in image_list:
            xref = img_info[0]

            try:
                # 이미지 정보 추출
                base_image = doc.extract_image(xref)
                if not base_image:
                    stats['images_skipped'] += 1
                    continue

                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                width = base_image["width"]
                height = base_image["height"]

                # 작은 이미지는 스킵 (아이콘 등)
                if width < 100 or height < 100:
                    stats['images_skipped'] += 1
                    continue

                # 이미 JPEG이고 품질이 낮으면 스킵 (재압축 효과 없음)
                if image_ext == "jpeg" and len(image_bytes) < 100 * 1024:  # 100KB 이하
                    stats['images_skipped'] += 1
                    continue

                # Pixmap 생성
                pix = fitz.Pixmap(doc, xref)

                # 알파 채널이 있으면 스킵 (PNG 유지)
                if pix.alpha:
                    stats['images_skipped'] += 1
                    continue

                # CMYK -> RGB 변환
                if pix.n > 3:
                    pix = fitz.Pixmap(fitz.csRGB, pix)

                # JPEG로 압축
                jpeg_bytes = pix.tobytes("jpeg", jpg_quality=jpeg_quality)

                # 압축 후 더 작아진 경우만 교체
                if len(jpeg_bytes) >= len(image_bytes):
                    stats['images_skipped'] += 1
                    continue

                # 올바른 이미지 교체 방법: replace_image 사용
                # PyMuPDF 1.24.0+에서 지원
                try:
                    page.replace_image(xref, stream=jpeg_bytes)
                    stats['images_processed'] += 1
                except AttributeError:
                    # 구버전 PyMuPDF - 스킵
                    stats['images_skipped'] += 1

            except Exception as e:
                stats['images_skipped'] += 1
                continue

    # 무손실 최적화 + 저장
    on_progress(85, "PDF 저장 중...")
    doc.save(
        output_path,
        garbage=4,           # 최대 정리
        deflate=True,        # 스트림 압축
        deflate_images=True, # 이미지 스트림 압축
        deflate_fonts=True,  # 폰트 스트림 압축
        clean=True,          # 구문 정리
    )

    doc.close()

    # 결과 확인
    on_progress(95, "결과 확인 중...")
    compressed_size = os.path.getsize(output_path)

    # 압축 실패 시 (더 커졌으면) 원본 복사
    if compressed_size >= original_size:
        import shutil
        shutil.copy(input_path, output_path)
        compressed_size = original_size
        stats['note'] = '압축 효과 없음 - 원본 유지'

    stats['compressed_size'] = compressed_size
    stats['compression_ratio'] = round(
        (1 - compressed_size / original_size) * 100, 1
    )

    on_progress(100, "완료!")
    return stats


# =====================================================
# GUI 앱
# =====================================================

class PdfCompressorApp:
    """PDF 압축 GUI 앱"""

    def __init__(self):
        # 드래그앤드롭 지원 여부에 따라 윈도우 생성
        if HAS_DND:
            self.root = TkinterDnD.Tk()
        else:
            self.root = tk.Tk()

        self.root.title("PDF 압축 도구 v1.0 - Hyeyum")
        self.root.geometry("700x600")
        self.root.resizable(True, True)

        # 상태
        self.files: List[str] = []
        self.is_compressing = False
        self.output_folder: Optional[str] = None

        # UI 구성
        self._setup_ui()

    def _setup_ui(self):
        """UI 구성"""
        # 메인 프레임
        main_frame = ttk.Frame(self.root, padding=20)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # 제목
        title_label = ttk.Label(
            main_frame,
            text="PDF 압축 도구",
            font=("맑은 고딕", 18, "bold")
        )
        title_label.pack(pady=(0, 5))

        subtitle_label = ttk.Label(
            main_frame,
            text="Supabase 50MB 제한 해결용 로컬 압축",
            font=("맑은 고딕", 10),
            foreground="gray"
        )
        subtitle_label.pack(pady=(0, 15))

        # ─────────────────────────────────────
        # 드래그앤드롭 영역
        # ─────────────────────────────────────
        drop_frame = ttk.LabelFrame(main_frame, text="파일 선택", padding=10)
        drop_frame.pack(fill=tk.X, pady=(0, 15))

        self.drop_label = ttk.Label(
            drop_frame,
            text="PDF 파일을 여기에 드래그하거나\n아래 버튼으로 선택하세요",
            font=("맑은 고딕", 11),
            anchor="center",
            justify="center",
            background="#f0f0f0",
            padding=30
        )
        self.drop_label.pack(fill=tk.X, pady=(0, 10))

        # 드래그앤드롭 바인딩
        if HAS_DND:
            self.drop_label.drop_target_register(DND_FILES)
            self.drop_label.dnd_bind('<<Drop>>', self._on_drop)
            self.drop_label.dnd_bind('<<DragEnter>>', self._on_drag_enter)
            self.drop_label.dnd_bind('<<DragLeave>>', self._on_drag_leave)

        # 버튼 프레임
        btn_frame = ttk.Frame(drop_frame)
        btn_frame.pack(fill=tk.X)

        ttk.Button(
            btn_frame,
            text="파일 선택",
            command=self._select_files
        ).pack(side=tk.LEFT, padx=(0, 10))

        ttk.Button(
            btn_frame,
            text="폴더 선택",
            command=self._select_folder
        ).pack(side=tk.LEFT, padx=(0, 10))

        ttk.Button(
            btn_frame,
            text="목록 지우기",
            command=self._clear_files
        ).pack(side=tk.LEFT)

        # 파일 목록
        self.file_listbox = tk.Listbox(
            drop_frame,
            height=4,
            font=("맑은 고딕", 9),
            selectmode=tk.EXTENDED
        )
        self.file_listbox.pack(fill=tk.X, pady=(10, 0))

        # ─────────────────────────────────────
        # 옵션
        # ─────────────────────────────────────
        option_frame = ttk.LabelFrame(main_frame, text="압축 옵션", padding=10)
        option_frame.pack(fill=tk.X, pady=(0, 15))

        # JPEG 품질 슬라이더
        quality_frame = ttk.Frame(option_frame)
        quality_frame.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(quality_frame, text="JPEG 품질:").pack(side=tk.LEFT)

        self.quality_var = tk.IntVar(value=90)
        self.quality_slider = ttk.Scale(
            quality_frame,
            from_=70,
            to=95,
            variable=self.quality_var,
            orient=tk.HORIZONTAL,
            command=self._on_quality_change
        )
        self.quality_slider.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=10)

        self.quality_label = ttk.Label(quality_frame, text="90", width=3)
        self.quality_label.pack(side=tk.LEFT)

        # 저장 위치
        save_frame = ttk.Frame(option_frame)
        save_frame.pack(fill=tk.X)

        self.save_same_folder_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            save_frame,
            text="원본과 같은 폴더에 저장 (파일명_compressed.pdf)",
            variable=self.save_same_folder_var,
            command=self._on_save_option_change
        ).pack(anchor=tk.W)

        self.output_folder_frame = ttk.Frame(save_frame)
        self.output_folder_label = ttk.Label(
            self.output_folder_frame,
            text="출력 폴더: (선택 안됨)",
            foreground="gray"
        )
        self.output_folder_label.pack(side=tk.LEFT)
        ttk.Button(
            self.output_folder_frame,
            text="폴더 선택",
            command=self._select_output_folder
        ).pack(side=tk.LEFT, padx=(10, 0))

        # ─────────────────────────────────────
        # 압축 버튼
        # ─────────────────────────────────────
        self.compress_btn = ttk.Button(
            main_frame,
            text="압축 시작",
            command=self._start_compression
        )
        self.compress_btn.pack(fill=tk.X, pady=(0, 15))

        # ─────────────────────────────────────
        # 진행률
        # ─────────────────────────────────────
        progress_frame = ttk.LabelFrame(main_frame, text="진행 상태", padding=10)
        progress_frame.pack(fill=tk.X, pady=(0, 15))

        self.progress_var = tk.DoubleVar(value=0)
        self.progress_bar = ttk.Progressbar(
            progress_frame,
            variable=self.progress_var,
            maximum=100
        )
        self.progress_bar.pack(fill=tk.X, pady=(0, 5))

        self.status_label = ttk.Label(
            progress_frame,
            text="대기 중...",
            foreground="gray"
        )
        self.status_label.pack(anchor=tk.W)

        # ─────────────────────────────────────
        # 결과
        # ─────────────────────────────────────
        result_frame = ttk.LabelFrame(main_frame, text="압축 결과", padding=10)
        result_frame.pack(fill=tk.BOTH, expand=True)

        # 결과 텍스트
        self.result_text = tk.Text(
            result_frame,
            height=6,
            font=("Consolas", 9),
            state=tk.DISABLED
        )
        self.result_text.pack(fill=tk.BOTH, expand=True)

        # 결과 폴더 열기 버튼
        self.open_folder_btn = ttk.Button(
            result_frame,
            text="결과 폴더 열기",
            command=self._open_result_folder,
            state=tk.DISABLED
        )
        self.open_folder_btn.pack(anchor=tk.E, pady=(10, 0))

    # ─────────────────────────────────────
    # 이벤트 핸들러
    # ─────────────────────────────────────

    def _on_drop(self, event):
        """드래그앤드롭 처리"""
        # 파일 경로 파싱 (공백 포함 경로 처리)
        files = self.root.tk.splitlist(event.data)
        self._add_files(files)
        self.drop_label.configure(background="#f0f0f0")

    def _on_drag_enter(self, event):
        """드래그 진입"""
        self.drop_label.configure(background="#d0e0ff")

    def _on_drag_leave(self, event):
        """드래그 이탈"""
        self.drop_label.configure(background="#f0f0f0")

    def _on_quality_change(self, value):
        """품질 슬라이더 변경"""
        quality = int(float(value))
        self.quality_label.configure(text=str(quality))

    def _on_save_option_change(self):
        """저장 옵션 변경"""
        if self.save_same_folder_var.get():
            self.output_folder_frame.pack_forget()
        else:
            self.output_folder_frame.pack(fill=tk.X, pady=(5, 0))

    def _select_files(self):
        """파일 선택 대화상자"""
        files = filedialog.askopenfilenames(
            title="PDF 파일 선택",
            filetypes=[("PDF 파일", "*.pdf"), ("모든 파일", "*.*")]
        )
        if files:
            self._add_files(files)

    def _select_folder(self):
        """폴더 선택 (내부 PDF 모두 추가)"""
        folder = filedialog.askdirectory(title="PDF가 있는 폴더 선택")
        if folder:
            pdf_files = list(Path(folder).glob("*.pdf"))
            if pdf_files:
                self._add_files([str(f) for f in pdf_files])
            else:
                messagebox.showinfo("알림", "선택한 폴더에 PDF 파일이 없습니다.")

    def _select_output_folder(self):
        """출력 폴더 선택"""
        folder = filedialog.askdirectory(title="출력 폴더 선택")
        if folder:
            self.output_folder = folder
            self.output_folder_label.configure(
                text=f"출력 폴더: {folder}",
                foreground="black"
            )

    def _add_files(self, files: List[str]):
        """파일 목록에 추가"""
        for f in files:
            if f.lower().endswith('.pdf') and f not in self.files:
                self.files.append(f)
                self.file_listbox.insert(tk.END, os.path.basename(f))

        self._update_drop_label()

    def _clear_files(self):
        """파일 목록 초기화"""
        self.files.clear()
        self.file_listbox.delete(0, tk.END)
        self._update_drop_label()

    def _update_drop_label(self):
        """드롭 라벨 업데이트"""
        count = len(self.files)
        if count == 0:
            self.drop_label.configure(
                text="PDF 파일을 여기에 드래그하거나\n아래 버튼으로 선택하세요"
            )
        else:
            total_size = sum(os.path.getsize(f) for f in self.files)
            size_mb = total_size / (1024 * 1024)
            self.drop_label.configure(
                text=f"{count}개 파일 선택됨 (총 {size_mb:.1f}MB)"
            )

    def _start_compression(self):
        """압축 시작"""
        if not self.files:
            messagebox.showwarning("경고", "압축할 PDF 파일을 선택하세요.")
            return

        if self.is_compressing:
            return

        # 출력 폴더 확인
        if not self.save_same_folder_var.get() and not self.output_folder:
            messagebox.showwarning("경고", "출력 폴더를 선택하세요.")
            return

        self.is_compressing = True
        self.compress_btn.configure(state=tk.DISABLED)
        self.result_text.configure(state=tk.NORMAL)
        self.result_text.delete(1.0, tk.END)
        self.result_text.configure(state=tk.DISABLED)

        # 스레드에서 압축 실행
        thread = threading.Thread(target=self._compress_files, daemon=True)
        thread.start()

    def _compress_files(self):
        """파일 압축 (스레드)"""
        quality = self.quality_var.get()
        total_files = len(self.files)
        results = []
        last_output_folder = None

        for idx, input_path in enumerate(self.files):
            file_name = os.path.basename(input_path)

            # 출력 경로 결정
            if self.save_same_folder_var.get():
                folder = os.path.dirname(input_path)
                name, ext = os.path.splitext(file_name)
                output_path = os.path.join(folder, f"{name}_compressed{ext}")
            else:
                name, ext = os.path.splitext(file_name)
                output_path = os.path.join(
                    self.output_folder,
                    f"{name}_compressed{ext}"
                )

            last_output_folder = os.path.dirname(output_path)

            # 진행률 콜백
            def on_progress(percent, message):
                overall = ((idx + percent / 100) / total_files) * 100
                self.root.after(0, lambda p=overall, m=f"[{idx+1}/{total_files}] {file_name}: {message}":
                    self._update_progress(p, m))

            try:
                stats = compress_pdf(
                    input_path,
                    output_path,
                    jpeg_quality=quality,
                    on_progress=on_progress
                )

                original_mb = stats['original_size'] / (1024 * 1024)
                compressed_mb = stats['compressed_size'] / (1024 * 1024)
                ratio = stats['compression_ratio']

                result = f"✓ {file_name}: {original_mb:.1f}MB → {compressed_mb:.1f}MB ({ratio}% 감소)"
                results.append((True, result))

            except Exception as e:
                result = f"✗ {file_name}: 오류 - {str(e)}"
                results.append((False, result))

        # 결과 표시
        self.root.after(0, lambda: self._show_results(results, last_output_folder))

    def _update_progress(self, percent: float, message: str):
        """진행률 업데이트 (메인 스레드)"""
        self.progress_var.set(percent)
        self.status_label.configure(text=message, foreground="black")

    def _show_results(self, results: List[Tuple[bool, str]], output_folder: Optional[str]):
        """결과 표시 (메인 스레드)"""
        self.is_compressing = False
        self.compress_btn.configure(state=tk.NORMAL)
        self.progress_var.set(100)

        success_count = sum(1 for r in results if r[0])
        total_count = len(results)

        self.status_label.configure(
            text=f"완료! {success_count}/{total_count}개 파일 압축 성공",
            foreground="green" if success_count == total_count else "orange"
        )

        # 결과 텍스트
        self.result_text.configure(state=tk.NORMAL)
        self.result_text.delete(1.0, tk.END)
        for success, msg in results:
            self.result_text.insert(tk.END, msg + "\n")
        self.result_text.configure(state=tk.DISABLED)

        # 폴더 열기 버튼 활성화
        if output_folder:
            self._last_output_folder = output_folder
            self.open_folder_btn.configure(state=tk.NORMAL)

        # 완료 알림
        if success_count == total_count:
            messagebox.showinfo(
                "완료",
                f"{success_count}개 파일 압축 완료!\n\n"
                f"압축된 파일은 '_compressed' 접미사가 붙어 저장되었습니다."
            )

    def _open_result_folder(self):
        """결과 폴더 열기"""
        if hasattr(self, '_last_output_folder') and self._last_output_folder:
            os.startfile(self._last_output_folder)

    def run(self):
        """앱 실행"""
        self.root.mainloop()


# =====================================================
# 메인
# =====================================================

if __name__ == "__main__":
    app = PdfCompressorApp()
    app.run()
