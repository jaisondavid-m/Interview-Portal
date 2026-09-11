import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text-primary)]">
      <Navbar />
      <div className="flex-1 flex flex-col md:flex-row">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 p-6 md:p-8 bg-[var(--bg)] overflow-y-auto">
          <div className="max-w-[1280px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
