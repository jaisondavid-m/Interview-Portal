import { 
  Code, Mic, CheckSquare, Layout, AppWindow, Server, Database 
} from 'lucide-react';

// Mode metadata with icons, styling, and descriptions
export const INTERVIEW_MODES = [
  {
    id: 'coding',
    label: 'Coding',
    icon: Code,
    color: 'text-[var(--accent)]',
    bg: 'bg-[var(--accent-dim)]',
    border: 'border-[var(--border-accent)]',
    desc: 'Live code editor, starter boilerplate, and test cases execution.',
  },
  {
    id: 'verbal_qa',
    label: 'Verbal Q&A',
    icon: Mic,
    color: 'text-[var(--amber)]',
    bg: 'bg-[var(--amber-bg)]',
    border: 'border-[var(--amber)]/20',
    desc: 'Conceptual & theoretical questions with model answers and evaluation rubrics.',
  },
  {
    id: 'mcq',
    label: 'MCQ',
    icon: CheckSquare,
    color: 'text-[var(--green)]',
    bg: 'bg-[var(--green-bg)]',
    border: 'border-[var(--green)]/20',
    desc: 'Objective multiple-choice questions with answer choices and explanations.',
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    icon: Layout,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    desc: 'System architecture whiteboard with draggable components, connections, and live sync preview.',
  },
  {
    id: 'frontend',
    label: 'Frontend',
    icon: AppWindow,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    desc: 'Interactive React/HTML/CSS live code editor with real-time responsive preview and viewport testing.',
  },
  {
    id: 'backend',
    label: 'Backend',
    icon: Server,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    desc: 'Backend service & API logic in Go, Java, Node.js, Python with server-side test case execution and benchmarking.',
  },
  {
    id: 'database',
    label: 'Database',
    icon: Database,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    desc: 'Visual ER diagram modeling and interactive SQL query execution against seeded relational database tables.',
  },
];

// Helper to format level title cleanly without duplicate "Level X: Level X: ..."
export const formatLevelName = (level) => {
  if (!level) return '';
  const rawName = level.name || '';
  const cleanName = rawName.replace(new RegExp(`^Level\\s*${level.level_number || '\\d+'}\\s*[:\\-]\\s*`, 'i'), '').trim();
  return cleanName || rawName;
};

export const formatFullLevelTitle = (level) => {
  if (!level) return '';
  const clean = formatLevelName(level);
  return clean ? `Level ${level.level_number}: ${clean}` : `Level ${level.level_number}`;
};

export const getModeMeta = (modeId) => {
  return INTERVIEW_MODES.find((m) => m.id === modeId) || INTERVIEW_MODES[0];
};
