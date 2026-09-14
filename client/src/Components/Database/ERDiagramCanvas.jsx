import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Key,
  Link2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Download,
  Code2,
  Eye,
  Lock,
  Sparkles,
  Layers,
  ChevronRight,
  Move,
  Table as TableIcon,
  Check,
  X,
  Edit2
} from 'lucide-react';

const DATA_TYPES = [
  'INTEGER',
  'BIGINT',
  'VARCHAR(255)',
  'VARCHAR(100)',
  'TEXT',
  'BOOLEAN',
  'TIMESTAMP',
  'DATE',
  'DECIMAL(10,2)',
  'FLOAT',
  'JSON'
];

const DEFAULT_TABLES = [
  {
    id: 'tbl_users',
    name: 'users',
    x: 60,
    y: 60,
    color: '#3b82f6',
    columns: [
      { id: 'c1', name: 'id', type: 'INTEGER', isPk: true, isFk: false, isNullable: false, isUnique: true },
      { id: 'c2', name: 'username', type: 'VARCHAR(100)', isPk: false, isFk: false, isNullable: false, isUnique: true },
      { id: 'c3', name: 'email', type: 'VARCHAR(255)', isPk: false, isFk: false, isNullable: false, isUnique: true },
      { id: 'c4', name: 'created_at', type: 'TIMESTAMP', isPk: false, isFk: false, isNullable: true, isUnique: false },
    ],
  },
  {
    id: 'tbl_orders',
    name: 'orders',
    x: 460,
    y: 60,
    color: '#10b981',
    columns: [
      { id: 'c5', name: 'id', type: 'INTEGER', isPk: true, isFk: false, isNullable: false, isUnique: true },
      { id: 'c6', name: 'user_id', type: 'INTEGER', isPk: false, isFk: true, isNullable: false, isUnique: false },
      { id: 'c7', name: 'total_amount', type: 'DECIMAL(10,2)', isPk: false, isFk: false, isNullable: false, isUnique: false },
      { id: 'c8', name: 'status', type: 'VARCHAR(50)', isPk: false, isFk: false, isNullable: false, isUnique: false },
      { id: 'c9', name: 'created_at', type: 'TIMESTAMP', isPk: false, isFk: false, isNullable: true, isUnique: false },
    ],
  },
];

const DEFAULT_RELATIONSHIPS = [
  {
    id: 'rel_1',
    fromTable: 'tbl_users',
    fromColumn: 'id',
    toTable: 'tbl_orders',
    toColumn: 'user_id',
    type: '1:N', // '1:1' | '1:N' | 'N:M'
    label: 'places'
  }
];

export default function ERDiagramCanvas({
  diagramData = null,
  onChange = null,
  isEditable = true,
  candidateName = 'Candidate',
  onApplyDDL = null,
}) {
  // Parse state from props or fallback
  const [tables, setTables] = useState(() => {
    if (diagramData && typeof diagramData === 'object' && Array.isArray(diagramData.tables)) {
      return diagramData.tables;
    }
    return DEFAULT_TABLES;
  });

  const [relationships, setRelationships] = useState(() => {
    if (diagramData && typeof diagramData === 'object' && Array.isArray(diagramData.relationships)) {
      return diagramData.relationships;
    }
    return DEFAULT_RELATIONSHIPS;
  });

  // Sync external diagramData updates when interviewer observes
  useEffect(() => {
    if (diagramData && typeof diagramData === 'object') {
      if (Array.isArray(diagramData.tables)) {
        setTables(diagramData.tables);
      }
      if (Array.isArray(diagramData.relationships)) {
        setRelationships(diagramData.relationships);
      }
    }
  }, [diagramData]);

  // Notify parent of updates
  const notifyChange = useCallback((newTables, newRelationships) => {
    if (onChange && isEditable) {
      onChange({
        tables: newTables,
        relationships: newRelationships,
      });
    }
  }, [onChange, isEditable]);

  // Canvas Transform state (Pan & Zoom)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Dragging Table state
  const [draggingTableId, setDraggingTableId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Modal / Drawer state
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [showRelModal, setShowRelModal] = useState(false);
  const [newRel, setNewRel] = useState({ fromTable: '', fromColumn: '', toTable: '', toColumn: '', type: '1:N', label: '' });
  const [editingTableId, setEditingTableId] = useState(null);
  const [editingTableName, setEditingTableName] = useState('');
  const [showDDLModal, setShowDDLModal] = useState(false);
  const [copiedDDL, setCopiedDDL] = useState(false);

  const containerRef = useRef(null);

  // Table Drag handlers
  const handleTableMouseDown = (e, table) => {
    e.stopPropagation();
    if (!isEditable) return;
    setDraggingTableId(table.id);
    const rect = containerRef.current?.getBoundingClientRect();
    const mouseX = (e.clientX - (rect?.left || 0) - pan.x) / zoom;
    const mouseY = (e.clientY - (rect?.top || 0) - pan.y) / zoom;
    setDragOffset({
      x: mouseX - table.x,
      y: mouseY - table.y,
    });
  };

  const handleMouseMove = (e) => {
    if (draggingTableId && isEditable) {
      const rect = containerRef.current?.getBoundingClientRect();
      const mouseX = (e.clientX - (rect?.left || 0) - pan.x) / zoom;
      const mouseY = (e.clientY - (rect?.top || 0) - pan.y) / zoom;
      const newX = Math.max(20, Math.round(mouseX - dragOffset.x));
      const newY = Math.max(20, Math.round(mouseY - dragOffset.y));

      setTables((prev) => {
        const updated = prev.map((t) => (t.id === draggingTableId ? { ...t, x: newX, y: newY } : t));
        notifyChange(updated, relationships);
        return updated;
      });
    } else if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
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

  // Add Table
  const handleAddTable = (e) => {
    e && e.preventDefault();
    if (!newTableName.trim() || !isEditable) return;
    const cleanName = newTableName.trim().toLowerCase().replace(/\s+/g, '_');
    const newTbl = {
      id: `tbl_${Date.now()}`,
      name: cleanName,
      x: 100 + (tables.length % 3) * 60,
      y: 100 + (tables.length % 3) * 60,
      color: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'][tables.length % 6],
      columns: [
        { id: `c_${Date.now()}_1`, name: 'id', type: 'INTEGER', isPk: true, isFk: false, isNullable: false, isUnique: true },
      ],
    };
    const updated = [...tables, newTbl];
    setTables(updated);
    notifyChange(updated, relationships);
    setNewTableName('');
    setShowAddTableModal(false);
  };

  // Delete Table
  const handleDeleteTable = (tableId) => {
    if (!isEditable) return;
    const updatedTables = tables.filter((t) => t.id !== tableId);
    const updatedRels = relationships.filter((r) => r.fromTable !== tableId && r.toTable !== tableId);
    setTables(updatedTables);
    setRelationships(updatedRels);
    notifyChange(updatedTables, updatedRels);
  };

  // Rename Table
  const handleRenameTable = (tableId) => {
    if (!isEditable || !editingTableName.trim()) return;
    const updated = tables.map((t) => (t.id === tableId ? { ...t, name: editingTableName.trim().toLowerCase().replace(/\s+/g, '_') } : t));
    setTables(updated);
    notifyChange(updated, relationships);
    setEditingTableId(null);
    setEditingTableName('');
  };

  // Add Column
  const handleAddColumn = (tableId) => {
    if (!isEditable) return;
    const updated = tables.map((t) => {
      if (t.id !== tableId) return t;
      const colNum = t.columns.length + 1;
      return {
        ...t,
        columns: [
          ...t.columns,
          {
            id: `c_${Date.now()}_${colNum}`,
            name: `column_${colNum}`,
            type: 'VARCHAR(255)',
            isPk: false,
            isFk: false,
            isNullable: true,
            isUnique: false,
          },
        ],
      };
    });
    setTables(updated);
    notifyChange(updated, relationships);
  };

  // Update Column
  const handleUpdateColumn = (tableId, colId, field, value) => {
    if (!isEditable) return;
    const updated = tables.map((t) => {
      if (t.id !== tableId) return t;
      return {
        ...t,
        columns: t.columns.map((col) => {
          if (col.id !== colId) return col;
          const updatedCol = { ...col, [field]: value };
          if (field === 'isPk' && value === true) {
            updatedCol.isNullable = false;
            updatedCol.isUnique = true;
          }
          return updatedCol;
        }),
      };
    });
    setTables(updated);
    notifyChange(updated, relationships);
  };

  // Delete Column
  const handleDeleteColumn = (tableId, colId) => {
    if (!isEditable) return;
    const updated = tables.map((t) => {
      if (t.id !== tableId) return t;
      if (t.columns.length <= 1) return t;
      return {
        ...t,
        columns: t.columns.filter((c) => c.id !== colId),
      };
    });
    setTables(updated);
    notifyChange(updated, relationships);
  };

  // Add Relationship
  const handleAddRelationship = (e) => {
    e && e.preventDefault();
    if (!isEditable || !newRel.fromTable || !newRel.toTable || !newRel.fromColumn || !newRel.toColumn) return;
    const createdRel = {
      id: `rel_${Date.now()}`,
      ...newRel,
    };
    const updated = [...relationships, createdRel];
    setRelationships(updated);
    notifyChange(tables, updated);
    setShowRelModal(false);
    setNewRel({ fromTable: '', fromColumn: '', toTable: '', toColumn: '', type: '1:N', label: '' });
  };

  // Delete Relationship
  const handleDeleteRelationship = (relId) => {
    if (!isEditable) return;
    const updated = relationships.filter((r) => r.id !== relId);
    setRelationships(updated);
    notifyChange(tables, updated);
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom((z) => Math.min(2, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, Math.round((z - 0.15) * 100) / 100));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Auto-arrange tables in a clean grid
  const handleAutoLayout = () => {
    if (!isEditable) return;
    const updated = tables.map((t, i) => ({
      ...t,
      x: 60 + (i % 3) * 360,
      y: 60 + Math.floor(i / 3) * 280,
    }));
    setTables(updated);
    notifyChange(updated, relationships);
  };

  // Generate DDL SQL
  const generatedDDL = useMemo(() => {
    let sql = `-- Auto-generated DDL from ER Diagram\n\n`;
    tables.forEach((t) => {
      sql += `CREATE TABLE ${t.name} (\n`;
      const colLines = t.columns.map((c) => {
        let line = `  ${c.name} ${c.type}`;
        if (c.isPk) line += ` PRIMARY KEY`;
        if (!c.isNullable && !c.isPk) line += ` NOT NULL`;
        if (c.isUnique && !c.isPk) line += ` UNIQUE`;
        return line;
      });

      // Add Foreign Key constraints from relationships
      const fks = relationships.filter((r) => r.toTable === t.id);
      fks.forEach((fk) => {
        const fromT = tables.find((tb) => tb.id === fk.fromTable);
        if (fromT) {
          colLines.push(`  FOREIGN KEY (${fk.toColumn}) REFERENCES ${fromT.name}(${fk.fromColumn}) ON DELETE CASCADE`);
        }
      });

      sql += colLines.join(',\n');
      sql += `\n);\n\n`;
    });
    return sql;
  }, [tables, relationships]);

  const handleCopyDDL = () => {
    navigator.clipboard.writeText(generatedDDL);
    setCopiedDDL(true);
    setTimeout(() => setCopiedDDL(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden shadow-md">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-2 flex-wrap text-xs">
        {/* Left Toolbar: Role Info & Add Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 font-mono text-[11px]">
            <Layers className="w-3.5 h-3.5" />
            <span>ER Diagram Modeler</span>
          </div>

          {!isEditable && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold border border-amber-500/20">
              <Eye className="w-3 h-3" />
              <span>Observing {candidateName}'s Schema (View-Only)</span>
            </div>
          )}

          {isEditable && (
            <>
              <button
                type="button"
                onClick={() => setShowAddTableModal(true)}
                className="btn btn-primary text-xs py-1 px-2.5 flex items-center gap-1 font-bold shadow-xs cursor-pointer"
                title="Add new entity table to diagram"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Table</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRelModal(true)}
                disabled={tables.length < 2}
                className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Define foreign key relationship"
              >
                <Link2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Add Relationship</span>
              </button>
            </>
          )}
        </div>

        {/* Right Toolbar: View, Zoom, Auto-layout, DDL */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAutoLayout}
            disabled={!isEditable}
            className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer disabled:opacity-40"
            title="Auto-arrange entity tables in clean grid"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

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

          <div className="h-4 w-px bg-[var(--border)] mx-0.5" />

          <button
            type="button"
            onClick={() => setShowDDLModal(true)}
            className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 font-mono text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 cursor-pointer"
            title="View & Export Generated DDL SQL"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Generate DDL</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="canvas-bg flex-1 relative overflow-hidden select-none cursor-grab active:cursor-grabbing min-h-[500px]"
        style={{
          backgroundImage: `radial-gradient(circle, var(--border) 1px, transparent 1px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
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
          <svg className="absolute inset-0 w-[4000px] h-[4000px] overflow-visible pointer-events-none">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
              </marker>
              <marker id="crowfoot" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 12 6 L 0 12 M 12 0 L 12 12" fill="none" stroke="#3b82f6" strokeWidth="2" />
              </marker>
            </defs>

            {relationships.map((rel) => {
              const fromTbl = tables.find((t) => t.id === rel.fromTable);
              const toTbl = tables.find((t) => t.id === rel.toTable);
              if (!fromTbl || !toTbl) return null;

              // Approximate center connector points for tables
              const tableWidth = 310;
              const fromHeaderHeight = 36 + (fromTbl.columns.length * 30) / 2;
              const toHeaderHeight = 36 + (toTbl.columns.length * 30) / 2;

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
                      x="-45"
                      y="-12"
                      width="90"
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
                      {rel.type} {rel.label ? `• ${rel.label}` : ''}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Table Entity Cards Layer */}
          {tables.map((table) => {
            const isEditingName = editingTableId === table.id;
            return (
              <div
                key={table.id}
                className={`absolute bg-[var(--bg-card)] rounded-[var(--radius-md)] border-2 shadow-xl overflow-hidden transition-shadow ${
                  draggingTableId === table.id ? 'shadow-2xl ring-2 ring-blue-500/50' : 'hover:shadow-2xl'
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
                  onMouseDown={(e) => handleTableMouseDown(e, table)}
                  className="flex items-center justify-between px-3 py-2 bg-[var(--bg-raised)] border-b border-[var(--border)] cursor-grab active:cursor-grabbing"
                  style={{ backgroundColor: `${table.color}22` }}
                >
                  <div className="flex items-center gap-1.5 flex-1 mr-2">
                    <TableIcon className="w-4 h-4 shrink-0" style={{ color: table.color }} />
                    {isEditingName && isEditable ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={editingTableName}
                          onChange={(e) => setEditingTableName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameTable(table.id)}
                          autoFocus
                          className="px-1.5 py-0.5 text-xs font-bold font-mono bg-[var(--bg-card)] border border-[var(--border)] rounded text-[var(--text-primary)] w-full"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameTable(table.id)}
                          className="p-1 text-green-500 hover:bg-green-500/20 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span
                        onDoubleClick={() => {
                          if (isEditable) {
                            setEditingTableId(table.id);
                            setEditingTableName(table.name);
                          }
                        }}
                        className="font-mono font-bold text-[13px] text-[var(--text-primary)] truncate cursor-pointer"
                        title={isEditable ? 'Double click to rename' : table.name}
                      >
                        {table.name}
                      </span>
                    )}
                  </div>

                  {isEditable && !isEditingName && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTableId(table.id);
                          setEditingTableName(table.name);
                        }}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                        title="Rename Table"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTable(table.id)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                        title="Delete Table"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Table Columns List */}
                <div className="p-2 space-y-1.5 max-h-[300px] overflow-y-auto font-mono text-[11px]">
                  {table.columns.map((col) => (
                    <div
                      key={col.id}
                      className="flex items-center justify-between gap-1 px-2 py-1 rounded bg-[var(--bg-raised)]/60 hover:bg-[var(--bg-raised)] border border-[var(--border)]/50 group"
                    >
                      {/* Column Name & Key Badges */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {col.isPk && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0" title="Primary Key">
                            PK
                          </span>
                        )}
                        {col.isFk && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-500 border border-blue-500/30 shrink-0" title="Foreign Key">
                            FK
                          </span>
                        )}
                        {col.isUnique && !col.isPk && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-500 border border-purple-500/30 shrink-0" title="Unique Constraint">
                            UQ
                          </span>
                        )}

                        {isEditable ? (
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) => handleUpdateColumn(table.id, col.id, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                            className="bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-[var(--bg-card)] px-1 py-0.5 text-[11px] font-bold text-[var(--text-primary)] w-full outline-none"
                          />
                        ) : (
                          <span className="font-bold text-[var(--text-primary)] truncate">{col.name}</span>
                        )}
                      </div>

                      {/* Data Type & Flags Selector */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isEditable ? (
                          <select
                            value={col.type}
                            onChange={(e) => handleUpdateColumn(table.id, col.id, 'type', e.target.value)}
                            className="bg-[var(--bg-card)] text-[10px] text-[var(--text-secondary)] border border-[var(--border)] rounded px-1 py-0.5 outline-none cursor-pointer"
                          >
                            {DATA_TYPES.map((dt) => (
                              <option key={dt} value={dt}>
                                {dt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">{col.type}</span>
                        )}

                        {isEditable && (
                          <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => handleUpdateColumn(table.id, col.id, 'isPk', !col.isPk)}
                              className={`p-0.5 rounded text-[9px] ${col.isPk ? 'text-amber-500 font-bold' : 'text-[var(--text-muted)] hover:text-amber-500'}`}
                              title="Toggle Primary Key"
                            >
                              <Key className="w-2.5 h-2.5" />
                            </button>
                            {table.columns.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteColumn(table.id, col.id)}
                                className="p-0.5 rounded text-[var(--text-muted)] hover:text-red-500"
                                title="Remove Column"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Column Button */}
                {isEditable && (
                  <div className="px-2 py-1.5 border-t border-[var(--border)] bg-[var(--bg-card)]">
                    <button
                      type="button"
                      onClick={() => handleAddColumn(table.id)}
                      className="w-full text-center text-[10px] font-mono text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 py-1 rounded transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Column</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: ADD TABLE */}
      {showAddTableModal && isEditable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="panel-card w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-blue-500" />
                <span>Create Entity Table</span>
              </h3>
              <button onClick={() => setShowAddTableModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Table Name (e.g. products, order_items)
                </label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g. products"
                  autoFocus
                  required
                  className="custom-input text-[12px] font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTableModal(false)}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs py-1.5 px-3 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Table</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD RELATIONSHIP */}
      {showRelModal && isEditable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="panel-card w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-500" />
                <span>Define Relationship / Foreign Key</span>
              </h3>
              <button onClick={() => setShowRelModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRelationship} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Source Table (Parent / Primary Key) */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                    Parent Table (1)
                  </label>
                  <select
                    value={newRel.fromTable}
                    onChange={(e) => {
                      const selTable = tables.find((t) => t.id === e.target.value);
                      const pkCol = selTable?.columns.find((c) => c.isPk)?.name || selTable?.columns[0]?.name || '';
                      setNewRel((prev) => ({ ...prev, fromTable: e.target.value, fromColumn: pkCol }));
                    }}
                    required
                    className="custom-input text-[11px] font-mono cursor-pointer"
                  >
                    <option value="">Select Parent Table</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Table (Child / Foreign Key) */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                    Child Table (N)
                  </label>
                  <select
                    value={newRel.toTable}
                    onChange={(e) => {
                      const selTable = tables.find((t) => t.id === e.target.value);
                      const fkCol = selTable?.columns.find((c) => c.isFk)?.name || selTable?.columns[0]?.name || '';
                      setNewRel((prev) => ({ ...prev, toTable: e.target.value, toColumn: fkCol }));
                    }}
                    required
                    className="custom-input text-[11px] font-mono cursor-pointer"
                  >
                    <option value="">Select Child Table</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cardinality & Label */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                    Cardinality
                  </label>
                  <select
                    value={newRel.type}
                    onChange={(e) => setNewRel((prev) => ({ ...prev, type: e.target.value }))}
                    className="custom-input text-[11px] font-mono cursor-pointer"
                  >
                    <option value="1:N">1:N (One to Many)</option>
                    <option value="1:1">1:1 (One to One)</option>
                    <option value="N:M">N:M (Many to Many)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                    Relationship Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={newRel.label}
                    onChange={(e) => setNewRel((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g. contains, has"
                    className="custom-input text-[11px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowRelModal(false)}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs py-1.5 px-3 font-bold flex items-center gap-1"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Connect Relationship</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GENERATED DDL SQL */}
      {showDDLModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="panel-card w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-500" />
                <span>Generated Schema DDL (SQL)</span>
              </h3>
              <button onClick={() => setShowDDLModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 text-cyan-300 font-mono text-xs rounded-[var(--radius-md)] max-h-[350px] overflow-y-auto whitespace-pre-wrap border border-slate-800">
              {generatedDDL}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[var(--text-muted)]">
                {tables.length} tables • {relationships.length} relationships
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDDL}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
                >
                  {copiedDDL ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{copiedDDL ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
                </button>
                {onApplyDDL && isEditable && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyDDL(generatedDDL);
                      setShowDDLModal(false);
                    }}
                    className="btn btn-primary text-xs py-1.5 px-3 font-bold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Send to SQL Editor</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
