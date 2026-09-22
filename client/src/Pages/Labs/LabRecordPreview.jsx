import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  Loader2,
  FileText
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function LabRecordPreview() {
  const { courseId = 1 } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const studentId = user?.id || 1;
      const res = await api.get(`/labs/record-pdf/${courseId}/student/${studentId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${user?.roll_no || 'Student'}_Lab_Record.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Could not generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const experimentList = [
    'Online shopping cart: Develop an application to implement an online shopping cart and generate bills',
    'Pocket Bazaar: Develop an application to manage an inventory of products for grocery stores',
    'Vacation Destination Decision Maker: Create an application that helps decide on vacation destination',
    'Temperature monitor: Develop an application for a temperature monitoring system with alerts',
    'Access control system: Simulate granting access to authorized personnel based on ID and PIN codes',
    'Math Quiz Generator: Design a math quiz generator with varying difficulty levels',
    'Maze solver application: Build a maze solver finding a path from entrance to exit',
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/labs')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-[var(--shadow-sm)]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            Back
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] mb-1">
              <ShieldCheck className="w-3 h-3" />
              Verified College Document
            </div>
            <h1 className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight">
              Laboratory Record Preview
            </h1>
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              22AI304 — PRINCIPLES OF PROGRAMMING LABORATORY
            </p>
          </div>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-md)]"
        >
          {downloading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />
          }
          Download Official Record PDF
        </button>
      </div>

      {/* Printable Preview Sheet */}
      <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden">
        {/* College Header Band */}
        <div className="bg-[var(--accent)] px-8 py-5 text-white text-center space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">
            DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE
          </p>
          <h2 className="text-[16px] font-black uppercase tracking-wide">
            LABORATORY RECORD MANUAL
          </h2>
          <p className="text-[11px] opacity-70">
            B.Tech · Semester III · Academic Year 2025–2026
          </p>
          <div className="inline-block mt-2 px-3 py-1 bg-white/15 rounded text-[11px] font-mono font-bold tracking-wider border border-white/20">
            22AI304 — PRINCIPLES OF PROGRAMMING LABORATORY
          </div>
        </div>

        <div className="p-8 space-y-8 font-[system-ui]">
          {/* Student Meta Block */}
          <div className="grid grid-cols-2 gap-4 bg-[var(--bg-raised)] p-4 rounded-[var(--radius-md)] border border-[var(--border)] text-[12px]">
            <div>
              <span className="text-[var(--text-muted)] font-medium">Student Name: </span>
              <span className="font-bold text-[var(--text-primary)]">{user?.name || '—'}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] font-medium">Roll / Reg No: </span>
              <span className="font-bold text-[var(--text-primary)] font-mono">{user?.roll_no || '—'}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] font-medium">Department: </span>
              <span className="font-bold text-[var(--text-primary)]">{user?.department || 'Artificial Intelligence and Data Science'}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] font-medium">Verification: </span>
              <span className="font-mono text-[var(--accent)] text-[11px] font-bold">MOCKMATE-VERIFIED</span>
            </div>
          </div>

          {/* Index Table */}
          <div className="space-y-3">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              List of Experiments (7 Core Tasks)
            </h4>
            <table className="w-full border-collapse text-[12px] border border-[var(--border)]">
              <thead>
                <tr className="bg-[var(--bg-raised)] text-[var(--text-secondary)] font-bold border-b border-[var(--border)]">
                  <th className="p-2.5 text-center border-r border-[var(--border)] w-12">Ex</th>
                  <th className="p-2.5 text-left border-r border-[var(--border)]">Experiment Name</th>
                  <th className="p-2.5 text-center border-r border-[var(--border)] w-24">Marks (10)</th>
                  <th className="p-2.5 text-center w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {experimentList.map((name, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-raised)] transition-colors">
                    <td className="p-2.5 text-center font-mono font-bold text-[var(--accent)] border-r border-[var(--border)]">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="p-2.5 text-[var(--text-primary)] border-r border-[var(--border)]">{name}</td>
                    <td className="p-2.5 text-center font-bold text-[var(--green)] border-r border-[var(--border)]">10 / 10</td>
                    <td className="p-2.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30">
                        VERIFIED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bonafide Certificate */}
          <div className="border-t border-[var(--border)] pt-6 text-center space-y-4">
            <h4 className="text-[13px] font-black uppercase tracking-widest text-[var(--text-primary)]">
              BONAFIDE CERTIFICATE
            </h4>
            <p className="text-[12px] text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed italic">
              Certified to be the bonafide record of work done by{' '}
              <strong className="text-[var(--text-primary)]">{user?.name || 'Student Name'}</strong>{' '}
              (Roll No: <strong className="font-mono">{user?.roll_no || '—'}</strong>) in the{' '}
              <strong>Principles of Programming Laboratory (22AI304)</strong> during the academic year 2025–2026.
            </p>
            <div className="pt-10 flex justify-between px-12 text-[11px] font-bold text-[var(--text-secondary)]">
              <div className="text-center">
                <div className="border-t border-[var(--border-strong)] pt-1 w-40">Staff Incharge</div>
              </div>
              <div className="text-center">
                <div className="border-t border-[var(--border-strong)] pt-1 w-40">Head of Department</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
