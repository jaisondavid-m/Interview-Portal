import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Sparkles,
  Layers,
  Table as TableIcon,
  Info,
  Database,
  ArrowRight
} from 'lucide-react';
import api from '../../api/axios';
import SearchableSelect from '../SearchableSelect';

export default function ERDiagramCanvas({
  diagramData = null,
  isEditable = true,
  candidateName = 'Candidate',
  databases = [],
  selectedDatabase = '',
  onSelectDatabase = null,
  onSwitchToSQL = null,
  onTablePositionChange = null, // callback(updatedTables) for real-time sync
}) {
  const [tables, setTables] = useState(() => {
    if (diagramData && typeof diagramData === 'object' && Array.isArray(diagramData.tables)) {
      return diagramData.tables;
    }
    return [];
  });

  const [relationships, setRelationships] = useState(() => {
    if (diagramData && typeof diagramData === 'object' && Array.isArray(diagramData.relationships)) {
      return diagramData.relationships;
    }
    return [];
  });

  // Sync external diagramData updates when SQL query execution returns new schema or candidate moves tables
  useEffect(() => {
    if (diagramData && typeof diagramData === 'object') {
      if (Array.isArray(diagramData.tables)) {
        setTables((prev) => {
          const posMap = {};
          // Only preserve local position cache if current user is candidate (isEditable)
          if (isEditable) {
            prev.forEach((t) => {
              posMap[t.name] = { x: t.x, y: t.y };
            });
          }

          return diagramData.tables.map((t, idx) => {
            const existingPos = isEditable ? posMap[t.name] : null;
            return {
              ...t,
              x: existingPos && existingPos.x !== undefined ? existingPos.x : (t.x !== undefined ? t.x : 60 + (idx % 3) * 360),
              y: existingPos && existingPos.y !== undefined ? existingPos.y : (t.y !== undefined ? t.y : 60 + Math.floor(idx / 3) * 280),
              color: t.color || ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'][idx % 6],
            };
          });
        });
      } else {
        setTables([]);
      }
      if (Array.isArray(diagramData.relationships)) {
        setRelationships(diagramData.relationships);
      } else {
        setRelationships([]);
      }
    }
  }, [diagramData, isEditable]);

  // Ref to always access latest tables array in async handlers
  const tablesRef = useRef(tables);
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  // Canvas Transform state (Pan & Zoom)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Dragging Table state
  const [draggingTableId, setDraggingTableId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);

  // Table Drag handlers
  const handleTableMouseDown = (e, table) => {
    if (!isEditable) return;
    e.stopPropagation();
    setDraggingTableId(table.id || table.name);
    const rect = containerRef.current?.getBoundingClientRect();
    const mouseX = (e.clientX - (rect?.left || 0) - pan.x) / zoom;
    const mouseY = (e.clientY - (rect?.top || 0) - pan.y) / zoom;
    setDragOffset({
      x: mouseX - table.x,
      y: mouseY - table.y,
    });
  };

  const handleMouseMove = (e) => {
    if (draggingTableId) {
      const rect = containerRef.current?.getBoundingClientRect();
      const mouseX = (e.clientX - (rect?.left || 0) - pan.x) / zoom;
      const mouseY = (e.clientY - (rect?.top || 0) - pan.y) / zoom;
      const newX = Math.max(20, Math.round(mouseX - dragOffset.x));
      const newY = Math.max(20, Math.round(mouseY - dragOffset.y));

      setTables((prev) =>
        prev.map((t) => ((t.id || t.name) === draggingTableId ? { ...t, x: newX, y: newY } : t))
      );
    } else if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (draggingTableId && onTablePositionChange && isEditable) {
      // Emit updated table positions for real-time sync to interviewer
      onTablePositionChange(tablesRef.current);
    }
    setDraggingTableId(null);
    setIsPanning(false);
  };

  const handleCanvasMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.tagName === 'svg' || e.target.classList.contains('canvas-bg')) {
      setIsPanning(true);
      setStartPan({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
    }
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom((z) => Math.min(2, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, Math.round((z - 0.15) * 100) / 100));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Auto-arrange tables in a clean grid layout
  const handleAutoLayout = () => {
    if (!isEditable) return;
    const updated = tables.map((t, i) => ({
      ...t,
      x: 60 + (i % 3) * 360,
      y: 60 + Math.floor(i / 3) * 280,
    }));
    setTables(updated);
    if (onTablePositionChange) {
      onTablePositionChange(updated);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] rounded-[var(--radius-md)] overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-2 flex-wrap text-xs">
        {/* Left Toolbar: Schema Info & DB Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 font-mono text-[11px]">
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive ER Diagram</span>
          </div>

          {/* Database Selector Dropdown — candidate-only, interviewer observes only */}
          {databases && databases.length > 0 && isEditable && (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <SearchableSelect
                label="DB:"
                options={databases.map((dbName) => ({
                  value: dbName,
                  label: dbName.startsWith('apiportal_sandbox_') ? `${dbName} (Default)` : dbName,
                }))}
                value={selectedDatabase}
                onChange={(val) => onSelectDatabase && onSelectDatabase(val)}
                menuWidth="w-60"
              />
            </div>
          )}
          {/* Interviewer: show selected DB as read-only label */}
          {!isEditable && selectedDatabase && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] font-mono text-[11px]">
              <span className="text-[var(--text-muted)] font-bold text-[10px] uppercase">Active DB:</span>
              <span className="text-[var(--accent)] font-bold">
                {selectedDatabase.startsWith('apiportal_sandbox_') ? `${selectedDatabase} (Default)` : selectedDatabase}
              </span>
            </div>
          )}

          <span className="text-[11px] font-mono text-[var(--text-muted)] hidden sm:inline">
            {tables.length} {tables.length === 1 ? 'table' : 'tables'} • {relationships.length} relationships
          </span>

          {!isEditable && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-[10px] font-mono font-bold border border-[var(--border-accent)]">
              <Eye className="w-3 h-3" />
              <span>Observing {candidateName}'s Schema (View-Only)</span>
            </div>
          )}
        </div>

        {/* Right Toolbar: Auto-layout, Zoom Controls */}
        <div className="flex items-center gap-1.5">
          {isEditable && (
            <button
              type="button"
              onClick={handleAutoLayout}
              className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
              title="Auto-arrange entity tables in clean grid"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-4 w-px bg-[var(--border)] mx-0.5" />

          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Zoom Out (-15%)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-[var(--text-muted)] w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Zoom In (+15%)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Reset Zoom & Pan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="canvas-bg flex-1 relative overflow-hidden select-none cursor-grab active:cursor-grabbing min-h-[520px]"
        style={{
          backgroundImage: `radial-gradient(circle, var(--border) 1px, transparent 1px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Empty State: Guide user to write SQL */}
        {tables.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 pointer-events-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-lg">
              <Database className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                No Database Tables Detected Yet
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                The ER diagram is <strong>automatically generated from your SQL code</strong>. Switch to the <strong>SQL Query Editor</strong>, write a <code>CREATE TABLE</code> query with primary/foreign keys, and click <strong>Run Query</strong>.
              </p>
            </div>
            {onSwitchToSQL && (
              <button
                type="button"
                onClick={onSwitchToSQL}
                className="btn btn-primary text-xs py-2 px-4 font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <span>Go to SQL Query Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Scaled & Panned Canvas Viewport */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {/* SVG Relationship Connector Lines Layer */}
          <svg className="absolute inset-0 w-[5000px] h-[5000px] overflow-visible pointer-events-none">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
              </marker>
              <marker id="crowfoot" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 12 6 L 0 12 M 12 0 L 12 12" fill="none" stroke="#3b82f6" strokeWidth="2" />
              </marker>
            </defs>

            {relationships.map((rel) => {
              const fromTbl = tables.find((t) => t.id === rel.fromTable || t.name === rel.fromTable);
              const toTbl = tables.find((t) => t.id === rel.toTable || t.name === rel.toTable);
              if (!fromTbl || !toTbl) return null;

              // Approximate center connector points for tables
              const tableWidth = 310;
              const fromHeaderHeight = 36 + ((fromTbl.columns?.length || 1) * 30) / 2;
              const toHeaderHeight = 36 + ((toTbl.columns?.length || 1) * 30) / 2;

              let x1 = fromTbl.x + tableWidth;
              let y1 = fromTbl.y + fromHeaderHeight;
              let x2 = toTbl.x;
              let y2 = toTbl.y + toHeaderHeight;

              if (fromTbl.x > toTbl.x) {
                x1 = fromTbl.x;
                x2 = toTbl.x + tableWidth;
              }

              const dx = Math.abs(x2 - x1) / 2;
              const pathD = `M ${x1} ${y1} C ${x1 + (x2 > x1 ? dx : -dx)} ${y1}, ${x2 - (x2 > x1 ? dx : -dx)} ${y2}, ${x2} ${y2}`;

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={rel.id} className="pointer-events-auto">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeDasharray={rel.type === 'N:M' ? '4 4' : 'none'}
                    markerEnd="url(#crowfoot)"
                    className="opacity-80 hover:opacity-100 transition"
                  />
                  {/* Relationship Label Pill */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-50"
                      y="-12"
                      width="100"
                      height="24"
                      rx="12"
                      fill="var(--bg-card)"
                      stroke="#3b82f6"
                      strokeWidth="1.5"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fontSize="10"
                      fontWeight="bold"
                      fill="var(--text-primary)"
                      className="font-mono select-none"
                    >
                      {rel.type || '1:N'} {rel.label ? `• ${rel.label}` : ''}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Table Entity Cards Layer */}
          {tables.map((table) => {
            return (
              <div
                key={table.id || table.name}
                className={`absolute bg-[var(--bg-card)] rounded-[var(--radius-md)] border-2 shadow-xl overflow-hidden transition-shadow ${
                  (draggingTableId === table.id || draggingTableId === table.name)
                    ? 'shadow-2xl ring-2 ring-blue-500/50'
                    : 'hover:shadow-2xl'
                }`}
                style={{
                  borderColor: table.color || '#3b82f6',
                  transform: `translate(${table.x}px, ${table.y}px)`,
                  width: '310px',
                  pointerEvents: 'auto',
                }}
              >
                {/* Table Header */}
                <div
                  onMouseDown={isEditable ? (e) => handleTableMouseDown(e, table) : undefined}
                  className={`flex items-center justify-between px-3 py-2 bg-[var(--bg-raised)] border-b border-[var(--border)] ${isEditable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                  style={{ backgroundColor: `${table.color || '#3b82f6'}22` }}
                >
                  <div className="flex items-center gap-1.5 flex-1 mr-2">
                    <TableIcon className="w-4 h-4 shrink-0" style={{ color: table.color || '#3b82f6' }} />
                    <span className="font-mono font-bold text-[13px] text-[var(--text-primary)] truncate">
                      {table.name}
                    </span>
                  </div>

                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[var(--bg-card)]/80 text-[var(--text-muted)] border border-[var(--border)]">
                    {table.rowCount !== undefined ? table.rowCount : 0} rows
                  </span>
                </div>

                {/* Table Columns List */}
                <div className="p-2 space-y-1.5 max-h-[320px] overflow-y-auto font-mono text-[11px]">
                  {table.columns && table.columns.map((col, cIdx) => (
                    <div
                      key={col.id || `${table.name}_${col.name}_${cIdx}`}
                      className="flex items-center justify-between gap-1 px-2 py-1 rounded bg-[var(--bg-raised)]/60 hover:bg-[var(--bg-raised)] border border-[var(--border)]/50"
                    >
                      {/* Column Name & Key Badges */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {col.isPk && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[var(--accent)] text-white shrink-0" title="Primary Key">
                            PK
                          </span>
                        )}
                        {col.isFk && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] shrink-0" title="Foreign Key">
                            FK
                          </span>
                        )}
                        {col.isUnique && !col.isPk && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] shrink-0" title="Unique Constraint">
                            UQ
                          </span>
                        )}
                        {!col.isNullable && !col.isPk && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)] shrink-0" title="Not Null">
                            NN
                          </span>
                        )}

                        <span className="font-bold text-[var(--text-primary)] truncate">{col.name}</span>
                      </div>

                      {/* Data Type */}
                      <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                        {col.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
