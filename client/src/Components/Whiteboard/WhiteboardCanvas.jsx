import React, { useState, useEffect, useRef, useCallback } from 'react';
import ConfirmModal from '../ConfirmModal';
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
  Undo2,
  Redo2,
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
  Activity,
  Compass,
  Lightbulb,
  Eye,
  Sliders,
  ChevronRight,
  BookOpen
} from 'lucide-react';

// Preset component definitions with icons and themes
export const COMPONENT_CATALOG = [
  {
    type: 'client_web',
    label: 'Web Client',
    category: 'Client',
    icon: Globe,
    color: '#2563eb',
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
    color: '#4f46e5',
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
    color: '#0284c7',
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
    color: '#7c3aed',
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
    color: '#059669',
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
    color: '#0d9488',
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
    color: '#d97706',
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
    color: '#ea580c',
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
    color: '#dc2626',
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
    color: '#db2777',
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
    color: '#0891b2',
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
    color: '#475569',
    bg: '#f8fafc',
    border: '#cbd5e1',
    defaultTech: 'Custom / Note',
    desc: 'Annotations, tradeoffs, or metrics',
  },
];

const QUICK_COMPONENTS = [
  COMPONENT_CATALOG[0], // Web Client
  COMPONENT_CATALOG[3], // API Gateway
  COMPONENT_CATALOG[4], // Backend Service
  COMPONENT_CATALOG[6], // Relational DB
  COMPONENT_CATALOG[8], // Cache
  COMPONENT_CATALOG[9], // Message Queue
  COMPONENT_CATALOG[10], // Object Storage
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
  question = null,
  payload = null,
  currentUserRole = 'interviewee',
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
  const [showClearModal, setShowClearModal] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState('All');
  const [showRequirements, setShowRequirements] = useState(false);

  // Undo & Redo state management
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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
  const lastEmittedJsonRef = useRef('');

  // Dispatch state change to parent in real-time
  const emitChange = useCallback((updatedNodes, updatedConnections, pushToHist = true) => {
    const payloadStr = JSON.stringify({
      nodes: updatedNodes,
      connections: updatedConnections,
      updatedAt: new Date().toISOString(),
    });
    lastEmittedJsonRef.current = payloadStr;

    if (pushToHist && isEditable) {
      const newSnapshot = {
        nodes: JSON.parse(JSON.stringify(updatedNodes)),
        connections: JSON.parse(JSON.stringify(updatedConnections)),
      };
      const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
      trimmed.push(newSnapshot);
      if (trimmed.length > 50) trimmed.shift();
      historyRef.current = trimmed;
      historyIndexRef.current = trimmed.length - 1;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);
    }

    if (onWhiteboardChange) {
      onWhiteboardChange(payloadStr);
    }
  }, [onWhiteboardChange, isEditable]);

  // Undo Action
  const handleUndo = useCallback(() => {
    if (!isEditable || historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const target = historyRef.current[historyIndexRef.current];
    if (target) {
      setNodes(target.nodes);
      setConnections(target.connections);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      emitChange(target.nodes, target.connections, false);
    }
  }, [isEditable, emitChange]);

  // Redo Action
  const handleRedo = useCallback(() => {
    if (!isEditable || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const target = historyRef.current[historyIndexRef.current];
    if (target) {
      setNodes(target.nodes);
      setConnections(target.connections);
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      emitChange(target.nodes, target.connections, false);
    }
  }, [isEditable, emitChange]);

  // Keyboard shortcuts (Undo/Redo, Fullscreen, Escape, Delete)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in text inputs or textareas
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          setIsFullscreen((prev) => !prev);
        }
      } else if (e.key === 'Escape') {
        if (showCatalogModal) {
          setShowCatalogModal(false);
        } else if (editingNode) {
          setEditingNode(null);
        } else if (showRequirements) {
          setShowRequirements(false);
        } else if (connectSourceId || activeTool === 'connect') {
          setConnectSourceId(null);
          setActiveTool('select');
        } else if (selectedNodeId || selectedConnectionId) {
          setSelectedNodeId(null);
          setSelectedConnectionId(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId || selectedConnectionId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFullscreen,
    showCatalogModal,
    editingNode,
    showRequirements,
    connectSourceId,
    activeTool,
    selectedNodeId,
    selectedConnectionId,
    handleUndo,
    handleRedo,
  ]);

  // Parse incoming whiteboardData (real-time stream update)
  useEffect(() => {
    // If incoming data matches what we just sent out, skip re-render to avoid loop
    if (typeof whiteboardData === 'string' && whiteboardData === lastEmittedJsonRef.current) {
      return;
    }

    if (!whiteboardData) {
      // Set default starter template if empty and in candidate editable mode
      if (isEditable && nodes.length === 0 && historyRef.current.length === 0) {
        const defaultNodes = [
          {
            id: 'node-client-1',
            type: 'client_web',
            label: 'Web Client',
            tech: 'React / Next.js',
            description: 'User requests via browser',
            x: 80,
            y: 180,
            color: '#2563eb',
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
            color: '#7c3aed',
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
            color: '#059669',
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
            color: '#d97706',
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

        // Seed initial history entry
        historyRef.current = [{ nodes: defaultNodes, connections: defaultConnections }];
        historyIndexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);

        emitChange(defaultNodes, defaultConnections, false);
      }
      return;
    }

    try {
      const parsed = typeof whiteboardData === 'string' ? JSON.parse(whiteboardData) : whiteboardData;
      if (parsed && Array.isArray(parsed.nodes)) {
        // Do not overwrite position while actively dragging
        if (!draggingNodeId) {
          setNodes(parsed.nodes);
          setConnections(Array.isArray(parsed.connections) ? parsed.connections : []);

          // If history was empty (e.g. initial load from peer), seed history
          if (historyRef.current.length === 0) {
            historyRef.current = [{
              nodes: parsed.nodes,
              connections: Array.isArray(parsed.connections) ? parsed.connections : [],
            }];
            historyIndexRef.current = 0;
          }
        }
      }
    } catch (e) {
      // Ignore parse errors on partial streams
    }
  }, [whiteboardData, isEditable, draggingNodeId, nodes.length, emitChange]);

  // Add Component to Canvas
  const handleAddComponent = (catalogItem) => {
    if (!isEditable) return;

    // Calculate viewport center
    const spawnX = Math.max(50, Math.floor(-pan.x / zoom + 220 + Math.random() * 80));
    const spawnY = Math.max(50, Math.floor(-pan.y / zoom + 160 + Math.random() * 80));

    const newNode = {
      id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
    emitChange(nextNodes, connections, true);
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
          emitChange(nodes, nextConns, true);
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
      emitChange(nodes, connections, true);
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
      emitChange(nextNodes, nextConns, true);
    } else if (selectedConnectionId) {
      const nextConns = connections.filter((c) => c.id !== selectedConnectionId);
      setConnections(nextConns);
      setSelectedConnectionId(null);
      emitChange(nodes, nextConns, true);
    }
  };

  // Update Node Details
  const handleSaveNodeEdit = (updatedProps) => {
    if (!isEditable || !editingNode) return;
    const nextNodes = nodes.map((n) => (n.id === editingNode.id ? { ...n, ...updatedProps } : n));
    setNodes(nextNodes);
    setEditingNode(null);
    emitChange(nextNodes, connections, true);
  };

  // Update Connection Label
  const handleUpdateConnectionLabel = (connId, newLabel) => {
    if (!isEditable) return;
    const nextConns = connections.map((c) => (c.id === connId ? { ...c, label: newLabel } : c));
    setConnections(nextConns);
    emitChange(nodes, nextConns, true);
  };

  // Reset Canvas View
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Fit all nodes into screen view
  const handleFitToScreen = () => {
    if (nodes.length === 0) {
      handleResetView();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + 200 > maxX) maxX = n.x + 200;
      if (n.y + 120 > maxY) maxY = n.y + 120;
    });

    const padding = 80;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const containerWidth = canvasRef.current ? canvasRef.current.clientWidth : 800;
    const containerHeight = canvasRef.current ? canvasRef.current.clientHeight : 600;

    const scaleX = containerWidth / width;
    const scaleY = containerHeight / height;
    const newZoom = Math.min(1.4, Math.max(0.4, Math.min(scaleX, scaleY)));

    const newPanX = (containerWidth - width * newZoom) / 2 - minX * newZoom + padding * newZoom;
    const newPanY = (containerHeight - height * newZoom) / 2 - minY * newZoom + padding * newZoom;

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (!isEditable) return;
    setShowClearModal(true);
  };

  const handleConfirmClearCanvas = () => {
    setShowClearModal(false);
    setNodes([]);
    setConnections([]);
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    emitChange([], [], true);
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

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedConnection = connections.find((c) => c.id === selectedConnectionId);

  const filteredCatalog = catalogFilter === 'All'
    ? COMPONENT_CATALOG
    : COMPONENT_CATALOG.filter((c) => c.category === catalogFilter);

  // Compact Room View Launcher Card (When not in Fullscreen)
  if (!isFullscreen) {
    return (
      <div className="panel-card p-6 border-2 border-[var(--border)] bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-md flex flex-col justify-between space-y-6 animate-fadeIn min-h-[460px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>Architecture Whiteboard Studio</span>
                  <span className="text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-mono font-bold uppercase border border-blue-500/30">
                    Studio Mode
                  </span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Interactive System Design & Distributed Architecture Workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md font-mono text-[11px] font-bold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Live Whiteboard</span>
              </span>
            </div>
          </div>

          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            Access the complete system design studio in full-screen mode to architect distributed systems, connect microservices, load balancers, databases, caches, and message queues in real time.
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Layers className="w-4 h-4 text-blue-500" />
                <span>Cloud Component Catalog</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Full palette of clients, API gateways, microservices, databases, queues, caches, and storage primitives.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Link2 className="w-4 h-4 text-indigo-500" />
                <span>Smart Directional Connections</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Draw arrows with protocol annotations (HTTPS, gRPC, Async Queue, SQL Query) and live sync.
              </p>
            </div>
          </div>

          {/* Architecture Status Info */}
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs font-mono flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Canvas Architecture:</span>
              <strong className="text-blue-600 dark:text-blue-400">
                {nodes.length} {nodes.length === 1 ? 'Node' : 'Nodes'} • {connections.length} {connections.length === 1 ? 'Link' : 'Links'}
              </strong>
            </div>
            {nodes.length > 0 && (
              <span className="text-[11px] text-[var(--text-muted)]">
                Real-time canvas stream active
              </span>
            )}
          </div>
        </div>

        {/* Action Dock */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Click below or press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] text-[10px] font-bold text-[var(--text-primary)]">F</kbd> for full screen</span>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            title="Open Whiteboard Studio in Full Screen (Shortcut: F)"
          >
            <Layers className="w-4 h-4" />
            <span>Open Whiteboard Studio</span>
            <Maximize2 className="w-3.5 h-3.5 opacity-80 ml-0.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 rounded-none w-screen h-screen flex flex-col bg-[var(--bg-card)] border-none overflow-hidden transition-all"
    >
      {/* ============================================================ */}
      {/* TOP CONTROLS & STATUS TOOLBAR */}
      {/* ============================================================ */}
      <div className="h-14 px-3 sm:px-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between gap-3 shrink-0 z-20 select-none overflow-x-auto custom-scrollbar">
        {/* Left Section: Brand & Problem Requirements */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Role Status Badge */}
          {isEditable ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[var(--text-primary)] font-bold">Whiteboard</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-bold uppercase border border-blue-500/20">
                Editor
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#6e56cf] animate-pulse" />
              <span className="text-[var(--text-primary)] font-bold">Live Observer</span>
              <span className="text-[10px] bg-[var(--accent-dim)] text-[var(--accent)] px-1.5 py-0.5 rounded font-bold uppercase border border-[var(--border-accent)]">
                {candidateName}
              </span>
            </div>
          )}

          {/* Problem Prompt / Requirements Toggle Button */}
          {question && (
            <button
              type="button"
              onClick={() => setShowRequirements((prev) => !prev)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border shadow-xs ${
                showRequirements
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              }`}
              title="View Challenge Scenario & Scale Requirements"
            >
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden sm:inline">Requirements</span>
              {payload?.scenario && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#6e56cf] animate-pulse" />
              )}
            </button>
          )}
        </div>

        {/* Center Section: Primary Authoring Tools */}
        {isEditable && (
          <div className="flex items-center gap-1.5 bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border)] shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => setShowCatalogModal(true)}
              className="h-7.5 px-3 rounded-md bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Add New Component (or browse catalog)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool(activeTool === 'connect' ? 'select' : 'connect');
                setConnectSourceId(null);
              }}
              className={`h-7.5 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                activeTool === 'connect'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                  : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]'
              }`}
              title="Click two components to draw a directional connection arrow"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{activeTool === 'connect' ? 'Connecting...' : 'Connect'}</span>
            </button>

            <div className="w-[1px] h-4 bg-[var(--border)] mx-0.5" />

            {/* Undo and Redo Action Buttons */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className="w-7.5 h-7.5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className="w-7.5 h-7.5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
                title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Contextual Selection Action (Edit / Delete) */}
            {(selectedNode || selectedConnectionId) && (
              <>
                <div className="w-[1px] h-4 bg-[var(--border)] mx-0.5" />
                {selectedNode && (
                  <button
                    type="button"
                    onClick={() => setEditingNode(selectedNode)}
                    className="h-7.5 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 bg-[var(--bg-raised)] text-[var(--text-primary)] hover:bg-[var(--border)] transition cursor-pointer"
                    title="Edit component properties"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="h-7.5 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20 transition cursor-pointer"
                  title="Delete selected item (Delete/Backspace)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Right Section: Viewport Controls, Stats & Fullscreen Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Diagram Stats Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)] shadow-xs">
            <Layers className="w-3 h-3 text-blue-500" />
            <span>{nodes.length} Nodes</span>
            <span>•</span>
            <span>{connections.length} Links</span>
          </div>

          {/* Zoom & Viewport Segmented Group */}
          <div className="flex items-center bg-[var(--bg-card)] p-0.5 rounded-lg border border-[var(--border)] shadow-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
              className="w-7.5 h-7.5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetView}
              className="px-2 h-7.5 font-mono text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(1))))}
              className="w-7.5 h-7.5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-3.5 bg-[var(--border)] mx-0.5" />

            <button
              type="button"
              onClick={handleFitToScreen}
              className="w-7.5 h-7.5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition cursor-pointer"
              title="Fit Diagram to View"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetView}
              className="w-7.5 h-7.5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition cursor-pointer"
              title="Reset Pan & Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {isEditable && (
              <>
                <div className="w-[1px] h-3.5 bg-[var(--border)] mx-0.5" />
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  className="w-7.5 h-7.5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                  title="Clear Whiteboard"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Exit Fullscreen Studio Mode Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 transition cursor-pointer"
            title="Exit Studio Mode (Press Esc or F)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="font-mono">Exit Studio</span>
            <kbd className="hidden sm:inline-block text-[9px] font-mono px-1 py-0.2 rounded bg-black/20 uppercase ml-0.5">
              Esc
            </kbd>
          </button>
        </div>
      </div>

      {/* Helper Bar / Banner for Active Connect Action */}
      {isEditable && activeTool === 'connect' && (
        <div className="bg-[var(--accent-dim)] border-b border-[var(--border-accent)] px-4 py-1.5 text-xs text-[var(--accent)] flex items-center justify-between font-mono z-10 shrink-0">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {connectSourceId
                ? 'Source component selected! Now click the target component to establish connection arrow.'
                : 'Click the source component to start connection arrow.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTool('select');
              setConnectSourceId(null);
            }}
            className="text-[11px] underline hover:no-underline font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* INTERACTIVE CANVAS WORKSPACE */}
      {/* ============================================================ */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex">
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
              width: '4000px',
              height: '4000px',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {/* SVG Connection Layer with High-Contrast Crisp Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
              <defs>
                <marker
                  id="arrowhead-default"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
                </marker>
                <marker
                  id="arrowhead-selected"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
                </marker>
                <filter id="line-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#1e3a8a" floodOpacity="0.3" />
                </filter>
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
                    {/* Wide transparent hover/click target */}
                    <path
                      d={pathData}
                      stroke="transparent"
                      strokeWidth="24"
                      fill="none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConnectionId(conn.id);
                        setSelectedNodeId(null);
                      }}
                    />
                    {/* Crisp, high-contrast, visible connecting line */}
                    <path
                      d={pathData}
                      stroke={isConnSelected ? '#6366f1' : '#3b82f6'}
                      strokeWidth={isConnSelected ? '3.5' : '2.5'}
                      strokeDasharray={conn.label?.toLowerCase().includes('async') || conn.label?.toLowerCase().includes('event') ? '6 4' : 'none'}
                      fill="none"
                      filter="url(#line-shadow)"
                      markerEnd={isConnSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead-default)'}
                      className="transition-all"
                    />
                    {/* High-visibility protocol pill */}
                    <foreignObject
                      x={midX - 75}
                      y={midY - 14}
                      width="150"
                      height="28"
                      className="overflow-visible pointer-events-auto"
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConnectionId(conn.id);
                          setSelectedNodeId(null);
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold text-center truncate border shadow-md transition-all cursor-pointer ${
                          isConnSelected
                            ? 'bg-indigo-600 text-white border-indigo-400 scale-105 ring-2 ring-indigo-400/40'
                            : 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-500/50 hover:border-blue-600 hover:scale-105'
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
                      ? 'border-[var(--accent)] ring-4 ring-[var(--accent-dim)] shadow-lg'
                      : isConnectSource
                      ? 'border-[var(--accent)] ring-4 ring-[var(--accent-dim)] animate-pulse'
                      : 'border-[var(--border)] hover:border-[var(--border-accent)]'
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
                      backgroundColor: node.bg || 'var(--accent-dim)',
                      color: node.color || 'var(--accent)',
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
                        className="p-1 rounded hover:bg-black/10 text-current transition shrink-0 cursor-pointer"
                        title="Edit component details"
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
                        title="Click to connect"
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
                        title="Click to connect"
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

          {/* FLOATING QUICK COMPONENT PALETTE (Candidate Workspace) */}
          {isEditable && (
            <div className="absolute top-4 left-4 z-30 flex flex-col gap-1.5 p-1.5 rounded-xl bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border)] shadow-xl transition-all">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 py-0.5 border-b border-[var(--border)]">
                Quick Add
              </div>
              <div className="flex flex-col gap-1">
                {QUICK_COMPONENTS.map((item) => {
                  const ItemIcon = item.icon || Server;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleAddComponent(item)}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition flex items-center gap-2 text-xs font-medium cursor-pointer group"
                      title={`Add ${item.label}`}
                    >
                      <div
                        className="p-1 rounded group-hover:scale-110 transition"
                        style={{ backgroundColor: item.bg, color: item.color }}
                      >
                        <ItemIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="hidden sm:inline text-[11px] font-semibold">{item.label}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setShowCatalogModal(true)}
                  className="p-1.5 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition flex items-center gap-2 text-xs font-bold cursor-pointer mt-1"
                  title="Browse All Components"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">More...</span>
                </button>
              </div>
            </div>
          )}

          {/* FLOATING QUICK FULLSCREEN ACTION BUTTON ON CANVAS */}
          {!isFullscreen && (
            <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="px-3 py-2 rounded-xl bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-xl transition flex items-center gap-2 font-mono text-xs font-bold cursor-pointer hover:scale-105 active:scale-95"
                title="Enter Fullscreen (F)"
              >
                <Maximize2 className="w-4 h-4 text-[var(--accent)]" />
                <span>Expand Fullscreen</span>
              </button>
            </div>
          )}
        </div>

        {/* SLIDE-OVER / SIDE DRAWER FOR PROBLEM REQUIREMENTS */}
        {showRequirements && question && (
          <div className="w-80 md:w-96 bg-[var(--bg-card)] border-l border-[var(--border)] flex flex-col h-full shadow-2xl z-40 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Architecture Challenge
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRequirements(false)}
                className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] transition cursor-pointer"
                title="Close Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)]">
                    {question.difficulty || 'Medium'}
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">
                    System Design
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] mt-1">
                  {question.title || 'System Architecture Design'}
                </h4>
              </div>

              {/* Prompt */}
              {question.prompt && (
                <div className="text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                  {question.prompt}
                </div>
              )}

              {/* Scenario Requirements */}
              {payload?.scenario && (
                <div className="p-3 bg-[var(--bg-raised)] rounded-[var(--radius-sm)] border border-[var(--border)] space-y-1">
                  <span className="font-bold text-[var(--text-primary)] block text-xs">
                    Scenario Requirements:
                  </span>
                  <div className="text-[11px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                    {payload.scenario}
                  </div>
                </div>
              )}

              {/* Scale & Limits */}
              {payload?.constraints && (
                <div className="p-3 bg-[var(--bg-raised)] rounded-[var(--radius-sm)] border border-[var(--border)] font-mono text-[11px] space-y-1">
                  <span className="font-bold text-[var(--text-primary)] block">Scale & Limits:</span>
                  <div className="text-[var(--text-muted)] whitespace-pre-line">
                    {payload.constraints}
                  </div>
                </div>
              )}

              {/* Evaluation Rubrics for Interviewer */}
              {currentUserRole === 'interviewer' && payload?.rubrics && (
                <div className="p-3 bg-[var(--accent-dim)] rounded-[var(--radius-sm)] border border-[var(--border-accent)] space-y-1">
                  <span className="font-bold text-[var(--accent)] block text-xs">
                    Evaluation Rubrics:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[var(--text-secondary)]">
                    {payload.rubrics.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Expected Architecture for Interviewer */}
              {currentUserRole === 'interviewer' && payload?.expected_approach && (
                <div className="p-3 bg-[var(--accent-dim)] rounded-[var(--radius-sm)] border border-[var(--border-accent)] space-y-1">
                  <span className="font-bold text-[var(--accent)] block text-xs">
                    Expected Approach:
                  </span>
                  <div className="text-[11px] text-[var(--text-secondary)] whitespace-pre-line">
                    {payload.expected_approach}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CONNECTION PROPERTY DRAWER (When connection selected) */}
      {selectedConnection && isEditable && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 shadow-2xl flex items-center gap-3 z-30 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--accent)]">
            <Link2 className="w-4 h-4" />
            <span>Link Protocol:</span>
          </div>
          <select
            value={selectedConnection.label || 'HTTPS / REST'}
            onChange={(e) => handleUpdateConnectionLabel(selectedConnection.id, e.target.value)}
            className="input text-xs py-1 px-2.5 bg-[var(--bg-raised)] font-mono cursor-pointer"
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
            className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition cursor-pointer"
            title="Delete Connection"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedConnectionId(null)}
            className="p-1.5 rounded hover:bg-[var(--bg-raised)] text-[var(--text-muted)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* COMPONENT CATALOG MODAL */}
      {showCatalogModal && (
        <div 
          onClick={() => setShowCatalogModal(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Add Architecture Component
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] transition cursor-pointer"
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
                      ? 'bg-blue-600 text-white shadow-xs'
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
                    className="p-3.5 rounded-xl border border-[var(--border)] hover:border-blue-500 hover:shadow-md bg-[var(--bg-card)] hover:bg-[var(--bg-raised)] transition text-left flex items-start gap-3 cursor-pointer group"
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
                      <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 mt-0.5 truncate">
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

      {/* EDIT COMPONENT MODAL / PROPERTIES */}
      {editingNode && (
        <div 
          onClick={() => setEditingNode(null)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Edit Component Properties
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="p-1 rounded hover:bg-[var(--bg-raised)] text-[var(--text-muted)] transition cursor-pointer"
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
                  className="btn btn-secondary text-xs py-2 px-3 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs py-2 px-4 font-bold cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear Canvas Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleConfirmClearCanvas}
        title="Clear Architecture Whiteboard?"
        message="Are you sure you want to clear all architecture components and connections from the canvas?"
        confirmText="Clear Whiteboard"
        cancelText="Keep Canvas"
        variant="danger"
      />
    </div>
  );
}
