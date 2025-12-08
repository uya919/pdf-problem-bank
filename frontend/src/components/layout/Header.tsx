/**
 * Header Component
 *
 * Top navigation bar with branding and user actions
 */
import { Search, Moon, Sun, Bell, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

export function Header() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // TODO: Implement dark mode toggle
  };

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-grey-200 bg-white/80 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo & Brand */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
              PDF Labeling
            </h1>
            <p className="text-xs text-grey-500">Phase 6: Modern UI</p>
          </div>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-400" />
            <input
              type="text"
              placeholder="문서, 문제 검색..."
              className="w-full rounded-lg border border-grey-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            title="다크모드 전환"
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" title="알림">
            <div className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                3
              </span>
            </div>
          </Button>

          {/* User Menu */}
          <Button variant="ghost" size="icon" title="사용자 메뉴">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
