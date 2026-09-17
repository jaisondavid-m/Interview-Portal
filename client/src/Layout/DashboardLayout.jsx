import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import MobileSidebar from '../Components/MobileSidebar';

export default function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Clean Top Bar with Mobile Hamburger & Profile */}
      <Navbar 
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)} 
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Mobile Slide-out Drawer */}
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Desktop Sidebar (Fixed & Non-scrolling with page - 100% UNTOUCHED) */}
        <div className="hidden md:block h-full shrink-0">
          <Sidebar />
        </div>

        {/* Main Content Area (Independently Scrollable with compact mobile padding) */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden custom-scrollbar p-3.5 sm:p-5 md:p-8 bg-[var(--bg)] min-w-0">
          <div className="max-w-[1280px] w-full min-w-0 mx-auto pb-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
