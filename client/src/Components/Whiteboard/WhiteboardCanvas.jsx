import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Server,
  Database,
  Globe,
  Smartphone,
  Shield,
  Layers,
  HardDrive,
  Cpu,
  Radio,
  Zap,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Link2,
  Check,
  X,
  Box,
  Cloud,
  MessageSquare,
  FileText,
  MousePointer,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  FolderPlus,
  Activity
} from 'lucide-react';

// Preset component definitions with icons and themes
export const COMPONENT_CATALOG = [
  {
    type: 'client_web',
    label: 'Web Client',
    category: 'Client',
    icon: Globe,
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#93c5fd',
    defaultTech: 'React / Next.js',
    desc: 'Browser-based user interface',
  },
  {
    type: 'client_mobile',
    label: 'Mobile App',
    category: 'Client',
    icon: Smartphone,
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#a5b4fc',
    defaultTech: 'iOS / Android App',
    desc: 'Native mobile client',
  },
  {
    type: 'load_balancer',
    label: 'Load Balancer',
    category: 'Gateway',
    icon: Radio,
    color: '#0ea5e9',
    bg: '#f0f9ff',
    border: '#7dd3fc',
    defaultTech: 'AWS ALB / Nginx',
    desc: 'Distributes traffic across replicas',
  },
  {
    type: 'api_gateway',
    label: 'API Gateway',
    category: 'Gateway',
    icon: Shield,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#c4b5fd',
    defaultTech: 'Kong / Envoy / Express',
    desc: 'Authentication, rate limiting, routing',
  },
  {
    type: 'microservice',
    label: 'Backend Service',
    category: 'Compute',
    icon: Server,
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#6ee7b7',
    defaultTech: 'Go / Node.js / Java',
    desc: 'Business logic & domain processing',
  },
  {
    type: 'worker',
    label: 'Async Worker',
    category: 'Compute',
    icon: Cpu,
    color: '#14b8a6',
    bg: '#f0fdfa',
    border: '#5eead4',
    defaultTech: 'Celery / BullMQ',
    desc: 'Background task executor',
  },
  {
    type: 'sql_db',
    label: 'Relational DB',
    category: 'Database',
    icon: Database,
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fcd34d',
    defaultTech: 'PostgreSQL / MySQL',
    desc: 'ACID compliant structured store',
  },
  {
    type: 'nosql_db',
    label: 'NoSQL DB',
    category: 'Database',
    icon: Layers,
    color: '#f97316',
    bg: '#fff7ed',
    border: '#fdba74',
    defaultTech: 'MongoDB / DynamoDB',
    desc: 'Document / key-value store',
  },
  {
    type: 'cache',
    label: 'Cache Store',
    category: 'Database',
    icon: Zap,
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fca5a5',
    defaultTech: 'Redis / Memcached',
    desc: 'In-memory fast lookup cache',
  },
  {
    type: 'message_queue',
    label: 'Message Queue',
    category: 'Queue',
    icon: MessageSquare,
    color: '#ec4899',
    bg: '#fdf2f8',
    border: '#f472b6',
    defaultTech: 'Apache Kafka / RabbitMQ',
    desc: 'Decoupled asynchronous event broker',
  },
  {
    type: 'object_storage',
    label: 'Object Storage',
    category: 'Storage',
    icon: Cloud,
    color: '#06b6d4',
    bg: '#ecfeff',
    border: '#67e8f9',
    defaultTech: 'AWS S3 / Cloudflare R2',
    desc: 'Unstructured file & media storage',
  },
  {
    type: 'custom_note',
    label: 'System Note / Block',
    category: 'Custom',
    icon: FileText,
    color: '#64748b',
    bg: '#f8fafc',
    border: '#cbd5e1',
    defaultTech: 'Custom / Note',
    desc: 'Annotations, tradeoffs, or metrics',
  },
];

const CONNECTION_TYPES = [
  'HTTPS / REST',
  'gRPC',
  'Async Event / Queue',
  'SQL Query',
  'Cache Get/Set',
  'WebSocket',
  'Read Replica Sync',
  'Direct TCP',
];

export default function WhiteboardCanvas({
  whiteboardData,
  onWhiteboardChange,
  isEditable = true,
  candidateName = 'Candidate',
}) {
  // Parsed canvas state: { nodes: [], connections: [] }
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  
  // Selection & interaction modes
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'connect'
  const [connectSourceId, setConnectSourceId] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState('All');

  // Canvas viewport navigation & Fullscreen
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const isInternalChangeRef = useRef(false);

  // Listen to Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Parse external whiteboard JSON or initial state
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    if (!whiteboardData) {
      // Set default starter template if empty and in editable mode
      if (isEditable && nodes.length === 0) {
        const defaultNodes = [
          {
            id: 'node-client-1',
            type: 'client_web',
            label: 'Web Client',
            tech: 'React / Next.js',
            description: 'User requests via browser',
            x: 80,
            y: 180,
            color: '#3b82f6',
            bg: '#eff6ff',
            border: '#93c5fd',
          },
          {
            id: 'node-gw-1',
            type: 'api_gateway',
            label: 'API Gateway',
            tech: 'Kong / Nginx',
            description: 'Rate limiting & Auth verification',
            x: 340,
            y: 180,
            color: '#8b5cf6',
            bg: '#f5f3ff',
            border: '#c4b5fd',
          },
          {
            id: 'node-srv-1',
            type: 'microservice',
            label: 'Core Service',
            tech: 'Go / Gin Server',
            description: 'Handles business transactions',
            x: 600,
            y: 180,
            color: '#10b981',
            bg: '#ecfdf5',
            border: '#6ee7b7',
          },
          {
            id: 'node-db-1',
            type: 'sql_db',
            label: 'Primary Database',
            tech: 'PostgreSQL 16',
            description: 'Persistent transactional records',
            x: 860,
            y: 180,
            color: '#f59e0b',
            bg: '#fffbeb',
            border: '#fcd34d',
          },
        ];

        const defaultConnections = [
          {
            id: 'conn-1',
            from: 'node-client-1',
            to: 'node-gw-1',
            label: 'HTTPS / JSON',
          },
          {
            id: 'conn-2',
            from: 'node-gw-1',
            to: 'node-srv-1',
            label: 'gRPC',
          },
          {
            id: 'conn-3',
            from: 'node-srv-1',
            to: 'node-db-1',
            label: 'SQL Query',
          },
        ];

        setNodes(defaultNodes);
        setConnections(defaultConnections);
        if (onWhiteboardChange) {
          onWhiteboardChange(JSON.stringify({ nodes: defaultNodes, connections: defaultConnections }));
        }
      }
      return;
    }

    try {
      const parsed = typeof whiteboardData === 'string' ? JSON.parse(whiteboardData) : whiteboardData;
      if (parsed && Array.isArray(parsed.nodes)) {
        setNodes(parsed.nodes);
        setConnections(Array.isArray(parsed.connections) ? parsed.connections : []);
      }
    } catch (e) {
      // Ignore parse errors on partial keystrokes
    }
  }, [whiteboardData, isEditable]);

  // Dispatch state change to parent
  const emitChange = useCallback((updatedNodes, updatedConnections) => {
    isInternalChangeRef.current = true;
    if (onWhiteboardChange) {
      const payload = JSON.stringify({
        nodes: updatedNodes,
        connections: updatedConnections,
        updatedAt: new Date().toISOString(),
      });
      onWhiteboardChange(payload);
    }
  }, [onWhiteboardChange]);

  // Add Component to Canvas
  const handleAddComponent = (catalogItem) => {
    if (!isEditable) return;

    // Calculate nice viewport center
    const spawnX = Math.max(50, Math.floor(-pan.x / zoom + 200 + Math.random() * 80));
    const spawnY = Math.max(50, Math.floor(-pan.y / zoom + 150 + Math.random() * 80));

    const newNode = {
      id: `node-${Date.now()}`,
      type: catalogItem.type,
      label: catalogItem.label,
      tech: catalogItem.defaultTech,
      description: catalogItem.desc,
      x: spawnX,
      y: spawnY,
      color: catalogItem.color,
      bg: catalogItem.bg,
      border: catalogItem.border,
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    setSelectedNodeId(newNode.id);
    setShowCatalogModal(false);
    emitChange(nextNodes, connections);
  };

  // Node Dragging Handlers
  const handleNodeMouseDown = (e, nodeId) => {
    if (!isEditable) {
      setSelectedNodeId(nodeId);
      return;
    }

    e.stopPropagation();

    if (activeTool === 'connect') {
      if (!connectSourceId) {
        setConnectSourceId(nodeId);
      } else if (connectSourceId !== nodeId) {
        // Create connection between connectSourceId and nodeId
        const exists = connections.some(
          (c) => (c.from === connectSourceId && c.to === nodeId) || (c.from === nodeId && c.to === connectSourceId)
        );

        if (!exists) {
          const newConn = {
            id: `conn-${Date.now()}`,
            from: connectSourceId,
            to: nodeId,
            label: 'HTTPS / REST',
          };
          const nextConns = [...connections, newConn];
          setConnections(nextConns);
          emitChange(nodes, nextConns);
        }
        setConnectSourceId(null);
        setActiveTool('select');
      }
      return;
    }

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setSelectedNodeId(nodeId);
    setSelectedConnectionId(null);
    setDraggingNodeId(nodeId);

    const clientX = e.clientX;
    const clientY = e.clientY;

    setDragOffset({
      x: (clientX / zoom) - node.x,
      y: (clientY / zoom) - node.y,
    });
  };

  const handleCanvasMouseMove = (e) => {
    if (draggingNodeId && isEditable) {
      const nodeX = Math.max(10, Math.round((e.clientX / zoom) - dragOffset.x));
      const nodeY = Math.max(10, Math.round((e.clientY / zoom) - dragOffset.y));

      setNodes((prevNodes) =>
        prevNodes.map((n) => (n.id === draggingNodeId ? { ...n, x: nodeX, y: nodeY } : n))
      );
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingNodeId && isEditable) {
      setDraggingNodeId(null);
      emitChange(nodes, connections);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Background Canvas Pan Start
  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.tagName === 'svg' || e.target.classList.contains('canvas-bg')) {
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
      if (connectSourceId) setConnectSourceId(null);

      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
    }
  };

  // Delete Selected Node or Connection
  const handleDeleteSelected = () => {
    if (!isEditable) return;

    if (selectedNodeId) {
      const nextNodes = nodes.filter((n) => n.id !== selectedNodeId);
      const nextConns = connections.filter((c) => c.from !== selectedNodeId && c.to !== selectedNodeId);
      setNodes(nextNodes);
      setConnections(nextConns);
      setSelectedNodeId(null);
      emitChange(nextNodes, nextConns);
    } else if (selectedConnectionId) {
      const nextConns = connections.filter((c) => c.id !== selectedConnectionId);
      setConnections(nextConns);
      setSelectedConnectionId(null);
      emitChange(nodes, nextConns);
    }
  };

  // Update Node Details
  const handleSaveNodeEdit = (updatedProps) => {
    if (!isEditable || !editingNode) return;
    const nextNodes = nodes.map((n) => (n.id === editingNode.id ? { ...n, ...updatedProps } : n));
    setNodes(nextNodes);
    setEditingNode(null);
    emitChange(nextNodes, connections);
  };

  // Update Connection Label
  const handleUpdateConnectionLabel = (connId, newLabel) => {
    if (!isEditable) return;
    const nextConns = connections.map((c) => (c.id === connId ? { ...c, label: newLabel } : c));
    setConnections(nextConns);
    emitChange(nodes, nextConns);
  };

  // Reset Canvas View
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (!isEditable) return;
    if (window.confirm('Clear all architecture components from the whiteboard?')) {
      setNodes([]);
      setConnections([]);
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
      emitChange([], []);
    }
  };

  // Helper to compute node center coordinates
  const getNodeCenter = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      x: node.x + 95, // Half of 190px width
      y: node.y + 45, // Half of ~90px height
    };
  };

  // Keyboard shortcuts (Delete / Backspace / Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId || selectedConnectionId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedConnectionId(null);
        setConnectSourceId(null);
        setActiveTool('select');
        setEditingNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedConnectionId, isEditable, nodes, connections]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedConnection = connections.find((c) => c.id === selectedConnectionId);

  const filteredCatalog = catalogFilter === 'All'
    ? COMPONENT_CATALOG
    : COMPONENT_CATALOG.filter((c) => c.category === catalogFilter);

  return (
    <div
      className={`select-none flex flex-col font-sans transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[var(--bg-card)] shadow-2xl'
          : 'relative w-full h-[620px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] shadow-inner overflow-hidden'
      }`}
    >
      {/* ============================================================ */}
      {/* TOP CONTROLS & STATUS TOOLBAR */}
      {/* ============================================================ */}
      <div className="h-14 px-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2">
          {/* Mode & Live Indicator */}
          {isEditable ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Whiteboard Editor</span>
              {isFullscreen && (
                <span className="text-[10px] bg-[var(--accent)] text-white px-1.5 py-0.2 rounded ml-1 uppercase">
                  Fullscreen
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Observer Preview • {candidateName}</span>
              {isFullscreen && (
                <span className="text-[10px] bg-[var(--green)] text-white px-1.5 py-0.2 rounded ml-1 uppercase">
                  Fullscreen
                </span>
              )}
            </div>
          )}

          {/* Candidate Action Buttons */}
          {isEditable && (
            <div className="flex items-center gap-1.5 ml-2 border-l border-[var(--border)] pl-3">
              <button
                type="button"
                onClick={() => setShowCatalogModal(true)}
                className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Component</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool(activeTool === 'connect' ? 'select' : 'connect');
                  setConnectSourceId(null);
                }}
                className={`btn text-xs py-1.5 px-3 flex items-center gap-1.5 font-medium transition cursor-pointer ${
                  activeTool === 'connect'
                    ? 'bg-amber-500 text-white hover:bg-amber-600 border border-amber-600 shadow-sm'
                    : 'btn-secondary'
                }`}
                title="Click two components to draw a connection arrow"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{activeTool === 'connect' ? 'Connecting... (Click Target)' : 'Connect Mode'}</span>
              </button>

              {(selectedNodeId || selectedConnectionId) && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="btn btn-danger text-xs py-1.5 px-2.5 flex items-center gap-1 font-medium cursor-pointer animate-in fade-in"
                  title="Delete selected item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}

              {selectedNode && (
                <button
                  type="button"
                  onClick={() => setEditingNode(selectedNode)}
                  className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 font-medium cursor-pointer"
                  title="Edit component properties"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Viewport & Zoom & Fullscreen Controls */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[11px] font-mono text-[var(--text-muted)] mr-2 hidden sm:inline">
            {nodes.length} Components • {connections.length} Links
          </span>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
            className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="font-mono text-[11px] text-[var(--text-secondary)] px-1 min-w-[42px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(1))))}
            className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Reset Zoom & Pan"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {isEditable && (
            <button
              type="button"
              onClick={handleClearCanvas}
              className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition ml-0.5 cursor-pointer"
              title="Clear Whiteboard"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen / Minimize Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded transition flex items-center gap-1.5 ml-1.5 border cursor-pointer ${
              isFullscreen
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]'
            }`}
            title={isFullscreen ? 'Minimize / Exit Fullscreen (Esc)' : 'Expand to Fullscreen View'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-mono font-bold hidden md:inline">
              {isFullscreen ? 'Minimize' : 'Fullscreen'}
            </span>
          </button>
        </div>
      </div>

      {/* Helper Bar / Banner for Active Action */}
      {isEditable && activeTool === 'connect' && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between font-mono z-10">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {connectSourceId
                ? 'Source selected! Now click the target component to establish connection.'
                : 'Click the source component to start connection arrow.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTool('select');
              setConnectSourceId(null);
            }}
            className="text-[11px] underline hover:no-underline font-bold"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* INTERACTIVE CANVAS WORKSPACE */}
      {/* ============================================================ */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        className="relative flex-1 w-full h-full overflow-hidden canvas-bg cursor-grab active:cursor-grabbing bg-slate-950/5 dark:bg-slate-950/40"
        style={{
          backgroundImage: `radial-gradient(circle, var(--border) 1px, transparent 1px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Scaled & Panned Content Container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '3000px',
            height: '3000px',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {/* SVG Connection Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker
                id="arrowhead-default"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
              </marker>
              <marker
                id="arrowhead-selected"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--accent, #6366f1)" />
              </marker>
            </defs>

            {connections.map((conn) => {
              const fromCenter = getNodeCenter(conn.from);
              const toCenter = getNodeCenter(conn.to);
              const isConnSelected = selectedConnectionId === conn.id;

              // Compute smooth Bézier curve midpoint control
              const dx = toCenter.x - fromCenter.x;
              const dy = toCenter.y - fromCenter.y;
              const cx1 = fromCenter.x + dx * 0.5;
              const cy1 = fromCenter.y;
              const cx2 = fromCenter.x + dx * 0.5;
              const cy2 = toCenter.y;
              const pathData = `M ${fromCenter.x} ${fromCenter.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toCenter.x} ${toCenter.y}`;

              const midX = (fromCenter.x + toCenter.x) / 2;
              const midY = (fromCenter.y + toCenter.y) / 2;

              return (
                <g key={conn.id} className="pointer-events-auto cursor-pointer">
                  {/* Invisible wide hover path */}
                  <path
                    d={pathData}
                    stroke="transparent"
                    strokeWidth="18"
                    fill="none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedConnectionId(conn.id);
                      setSelectedNodeId(null);
                    }}
                  />
                  {/* Visible directional line */}
                  <path
                    d={pathData}
                    stroke={isConnSelected ? 'var(--accent, #6366f1)' : '#94a3b8'}
                    strokeWidth={isConnSelected ? '3' : '2'}
                    strokeDasharray={conn.label?.toLowerCase().includes('async') ? '6 4' : 'none'}
                    fill="none"
                    markerEnd={isConnSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead-default)'}
                    className="transition-all"
                  />
                  {/* Connection Label Pill */}
                  <foreignObject
                    x={midX - 70}
                    y={midY - 14}
                    width="140"
                    height="28"
                    className="overflow-visible pointer-events-auto"
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConnectionId(conn.id);
                        setSelectedNodeId(null);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-center truncate border shadow-xs transition-all ${
                        isConnSelected
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)] scale-105 shadow-md'
                          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {conn.label || 'Link'}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>

          {/* Node Components Layer */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isConnectSource = connectSourceId === node.id;
            const catalogItem = COMPONENT_CATALOG.find((c) => c.type === node.type) || COMPONENT_CATALOG[0];
            const NodeIcon = catalogItem.icon || Server;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (isEditable) setEditingNode(node);
                }}
                className={`absolute w-[190px] rounded-xl border-2 shadow-sm transition-shadow z-10 cursor-move ${
                  isSelected
                    ? 'border-[var(--accent)] ring-4 ring-[var(--accent)]/20 shadow-lg'
                    : isConnectSource
                    ? 'border-amber-500 ring-4 ring-amber-500/30 animate-pulse'
                    : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                {/* Node Header Pill */}
                <div
                  className="px-3 py-2 rounded-t-[10px] flex items-center justify-between gap-1.5 border-b border-[var(--border)]"
                  style={{
                    backgroundColor: node.bg || '#f8fafc',
                    color: node.color || '#334155',
                  }}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <NodeIcon className="w-4 h-4 shrink-0" />
                    <span className="text-[12px] font-bold truncate">{node.label}</span>
                  </div>

                  {isEditable && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNode(node);
                      }}
                      className="p-1 rounded hover:bg-black/10 text-current transition shrink-0"
                      title="Edit component"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Node Body Details */}
                <div className="p-2.5 space-y-1 bg-[var(--bg-card)] rounded-b-[10px]">
                  <div className="text-[11px] font-mono font-semibold text-[var(--accent)] truncate">
                    {node.tech || 'Generic Component'}
                  </div>
                  {node.description && (
                    <div className="text-[10px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {node.description}
                    </div>
                  )}
                </div>

                {/* Connector Handle Dots (Left / Right) */}
                {isEditable && (
                  <>
                    <div
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[var(--bg-card)] border-2 border-[var(--accent)] hover:scale-125 transition cursor-crosshair shadow-sm"
                      title="Connection port"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!connectSourceId) {
                          setConnectSourceId(node.id);
                          setActiveTool('connect');
                        } else if (connectSourceId !== node.id) {
                          handleNodeMouseDown(e, node.id);
                        }
                      }}
                    />
                    <div
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[var(--bg-card)] border-2 border-[var(--accent)] hover:scale-125 transition cursor-crosshair shadow-sm"
                      title="Connection port"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!connectSourceId) {
                          setConnectSourceId(node.id);
                          setActiveTool('connect');
                        } else if (connectSourceId !== node.id) {
                          handleNodeMouseDown(e, node.id);
                        }
                      }}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* CONNECTION PROPERTY DRAWER (When connection selected) */}
      {/* ============================================================ */}
      {selectedConnection && isEditable && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 shadow-xl flex items-center gap-3 z-30 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--accent)]">
            <Link2 className="w-4 h-4" />
            <span>Link Protocol:</span>
          </div>
          <select
            value={selectedConnection.label || 'HTTPS / REST'}
            onChange={(e) => handleUpdateConnectionLabel(selectedConnection.id, e.target.value)}
            className="input text-xs py-1 px-2.5 bg-[var(--bg-raised)] font-mono"
          >
            {CONNECTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Custom protocol/event..."
            value={selectedConnection.label || ''}
            onChange={(e) => handleUpdateConnectionLabel(selectedConnection.id, e.target.value)}
            className="input text-xs py-1 px-2 w-36 font-mono"
          />
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition"
            title="Delete Connection"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedConnectionId(null)}
            className="p-1.5 rounded hover:bg-[var(--bg-raised)] text-[var(--text-muted)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* COMPONENT CATALOG MODAL */}
      {/* ============================================================ */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Add Architecture Component
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 p-3 border-b border-[var(--border)] overflow-x-auto text-xs">
              {['All', 'Client', 'Gateway', 'Compute', 'Database', 'Queue', 'Storage', 'Custom'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogFilter(cat)}
                  className={`px-3 py-1 rounded-[var(--radius-sm)] font-medium transition whitespace-nowrap cursor-pointer ${
                    catalogFilter === cat
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[480px]">
              {filteredCatalog.map((item) => {
                const ItemIcon = item.icon || Server;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleAddComponent(item)}
                    className="p-3.5 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:shadow-md bg-[var(--bg-card)] hover:bg-[var(--bg-raised)] transition text-left flex items-start gap-3 cursor-pointer group"
                  >
                    <div
                      className="p-2.5 rounded-lg shrink-0 group-hover:scale-110 transition"
                      style={{ backgroundColor: item.bg, color: item.color }}
                    >
                      <ItemIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)]">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[var(--accent)] mt-0.5 truncate">
                        {item.defaultTech}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT COMPONENT MODAL / PROPERTIES */}
      {/* ============================================================ */}
      {editingNode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Edit Component Properties
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="p-1 rounded hover:bg-[var(--bg-raised)] text-[var(--text-muted)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleSaveNodeEdit({
                  label: formData.get('label'),
                  tech: formData.get('tech'),
                  description: formData.get('description'),
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] mb-1">
                  Component Name
                </label>
                <input
                  type="text"
                  name="label"
                  defaultValue={editingNode.label}
                  required
                  className="input w-full text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] mb-1">
                  Technology / Framework / Protocol
                </label>
                <input
                  type="text"
                  name="tech"
                  defaultValue={editingNode.tech}
                  placeholder="e.g. Node.js + Express, PostgreSQL 16, Redis Cluster"
                  className="input w-full text-xs py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] mb-1">
                  Description / Role & Tradeoffs
                </label>
                <textarea
                  name="description"
                  defaultValue={editingNode.description}
                  rows="3"
                  placeholder="Responsibilities, caching policies, partitioning keys, etc."
                  className="input w-full text-xs py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setEditingNode(null)}
                  className="btn btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs py-2 px-4 font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
