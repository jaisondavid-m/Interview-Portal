import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import MobileSidebar from '../Components/MobileSidebar';

export default function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Check if current route is a focused full-width workspace (e.g., Lab Experiment assessment workspace)
  const isLabWorkspace = location.pathname.includes('/labs/') && location.pathname.includes('/experiment/');
  const isInterviewRoom = location.pathname.includes('/interview/room') || location.pathname.includes('/interviews/room');
  const isFocusedWorkspace = isLabWorkspace || isInterviewRoom;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Clean Top Bar with Mobile Hamburger & Profile */}
      <Navbar 
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)} 
        isMobileMenuOpen={isMobileMenuOpen}
        hideSidebarToggle={isFocusedWorkspace}
        isFullWidth={isFocusedWorkspace}
      />

      {/* Mobile Slide-out Drawer (Hidden in focused workspace) */}
      {!isFocusedWorkspace && (
        <MobileSidebar 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
        />
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Desktop Sidebar (Fixed & Non-scrolling - Hidden in focused workspace) */}
        {!isFocusedWorkspace && (
          <div className="hidden md:block h-full shrink-0">
            <Sidebar />
          </div>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 h-full min-w-0 ${
          isFocusedWorkspace 
            ? 'overflow-hidden bg-[var(--bg)] p-0' 
            : 'overflow-y-auto overflow-x-hidden custom-scrollbar p-3.5 sm:p-5 md:p-8 bg-[var(--bg)]'
        }`}>
          <div className={isFocusedWorkspace ? 'w-full h-full min-w-0' : 'max-w-[1280px] w-full min-w-0 mx-auto pb-8'}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
