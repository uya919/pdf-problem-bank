/**
 * Main Layout Component
 *
 * App-wide layout with header and sidebar
 */
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-grey-50">
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="ml-64 flex-1 pt-16">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
