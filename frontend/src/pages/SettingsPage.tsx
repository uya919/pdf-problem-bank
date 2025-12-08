/**
 * Settings Page (Phase 6-9)
 *
 * App configuration and preferences
 */
import { useState, useEffect } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Clock,
  Keyboard,
  Save,
  Database,
  AlertCircle,
  Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/Toast';

// Settings interface
interface AppSettings {
  darkMode: boolean;
  autoSaveInterval: number; // in seconds
}

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  autoSaveInterval: 2, // 2 seconds
};

export function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to parse settings:', error);
      }
    }
  }, []);

  // Handle settings change
  const handleSettingChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save settings
  const handleSave = () => {
    try {
      localStorage.setItem('app_settings', JSON.stringify(settings));
      setHasChanges(false);
      showToast('설정이 저장되었습니다', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('설정 저장에 실패했습니다', 'error');
    }
  };

  // Reset settings
  const handleReset = () => {
    if (confirm('모든 설정을 초기화하시겠습니까?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem('app_settings');
      setHasChanges(false);
      showToast('설정이 초기화되었습니다', 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-grey-600 to-slate-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">설정</h1>
              <p className="mt-2 text-grey-200">
                시스템 설정 및 환경을 구성하세요
              </p>
            </div>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-2 rounded-lg border border-amber-400/30">
              <AlertCircle className="w-5 h-5 text-amber-200" />
              <span className="text-sm font-medium text-amber-100">저장되지 않은 변경사항</span>
            </div>
          )}
        </div>
      </div>

      {/* Save/Reset Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-5 h-5" />
          변경사항 저장
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-6 py-3 bg-grey-200 text-grey-700 rounded-lg font-medium hover:bg-grey-300 transition-colors"
        >
          초기화
        </button>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings.darkMode ? (
                <Moon className="w-5 h-5 text-indigo-600" />
              ) : (
                <Sun className="w-5 h-5 text-amber-600" />
              )}
              화면 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-grey-50 rounded-lg">
              <div>
                <h3 className="font-medium text-grey-900">다크 모드</h3>
                <p className="text-sm text-grey-600 mt-1">
                  어두운 테마로 전환 (개발 중)
                </p>
              </div>
              <button
                onClick={() => handleSettingChange('darkMode', !settings.darkMode)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  settings.darkMode ? 'bg-blue-600' : 'bg-grey-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    settings.darkMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">개발 중인 기능</p>
                  <p className="mt-1">다크 모드는 향후 버전에서 지원될 예정입니다.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto Save Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              자동 저장
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-grey-900">자동 저장 간격</h3>
                <p className="text-sm text-grey-600 mt-1">
                  라벨링 작업 시 자동으로 저장되는 간격 (초 단위)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-grey-700">
                    {settings.autoSaveInterval}초
                  </span>
                  <Badge variant="secondary">{settings.autoSaveInterval === 2 ? '기본값' : '사용자 설정'}</Badge>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={settings.autoSaveInterval}
                  onChange={(e) => handleSettingChange('autoSaveInterval', parseInt(e.target.value))}
                  className="w-full h-2 bg-grey-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-grey-500">
                  <span>1초</span>
                  <span>10초</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-800">
                  <p className="font-medium">현재 설정: {settings.autoSaveInterval}초</p>
                  <p className="mt-1">
                    짧은 간격은 더 자주 저장하지만 성능에 영향을 줄 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keyboard Shortcuts Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-purple-600" />
            키보드 단축키
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-grey-600">
              라벨링 작업 시 사용 가능한 키보드 단축키 목록입니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Navigation */}
              <div className="space-y-3">
                <h4 className="font-semibold text-grey-900">페이지 이동</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-grey-50 rounded">
                    <span className="text-sm text-grey-700">이전 페이지</span>
                    <Badge variant="outline">←</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-grey-50 rounded">
                    <span className="text-sm text-grey-700">다음 페이지</span>
                    <Badge variant="outline">→</Badge>
                  </div>
                </div>
              </div>

              {/* Selection */}
              <div className="space-y-3">
                <h4 className="font-semibold text-grey-900">블록 선택</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-grey-50 rounded">
                    <span className="text-sm text-grey-700">다중 선택</span>
                    <Badge variant="outline">Ctrl + 클릭</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-grey-50 rounded">
                    <span className="text-sm text-grey-700">선택 해제</span>
                    <Badge variant="outline">Esc</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-grey-50 rounded">
                    <span className="text-sm text-grey-700">그룹 삭제</span>
                    <Badge variant="outline">Delete</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">커스텀 단축키</p>
                  <p className="mt-1">단축키 커스터마이징 기능은 향후 버전에서 추가될 예정입니다.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Features */}
      <Card className="bg-gradient-to-br from-grey-50 to-grey-100 border-grey-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-grey-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-grey-900">향후 추가될 설정</h3>
              <p className="mt-2 text-sm text-grey-600">
                다음 기능들이 향후 버전에서 추가될 예정입니다:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-grey-600 list-disc list-inside">
                <li>문제 메타데이터 기본값 설정 (난이도, 유형 등)</li>
                <li>데이터 백업 및 복원</li>
                <li>작업 내역 및 히스토리</li>
                <li>알림 설정</li>
                <li>언어 설정</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
