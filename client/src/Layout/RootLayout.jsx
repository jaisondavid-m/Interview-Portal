import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import Footer from '../Components/Footer';

export default function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text-primary)]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
