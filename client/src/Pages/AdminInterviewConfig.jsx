import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Code, Layers, Mic, CheckSquare, MessageSquare, Plus, ChevronRight, 
  Search, Edit2, Trash2, Clock, AlertCircle, Check, X, ArrowLeft,
  HelpCircle, Eye, EyeOff, Lock, Unlock, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../api/axios';

// Mode metadata with icons and colors
const INTERVIEW_MODES = [
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
    id: 'discussion',
    label: 'Discussion',
    icon: MessageSquare,
    color: 'text-sky-600',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    desc: 'System architecture, design scenarios, and technical tradeoff analysis.',
  },
];

// Helper to format level title cleanly without duplicate "Level X: Level X: ..."
const formatLevelName = (level) => {
  if (!level) return '';
  const rawName = level.name || '';
  const cleanName = rawName.replace(new RegExp(`^Level\\s*${level.level_number || '\\d+'}\\s*[:\\-]\\s*`, 'i'), '').trim();
  return cleanName || rawName;
};

const formatFullLevelTitle = (level) => {
  if (!level) return '';
  const clean = formatLevelName(level);
  return clean ? `Level ${level.level_number}: ${clean}` : `Level ${level.level_number}`;
};

export default function AdminInterviewConfig() {
  const { trackId, levelId } = useParams();
  const navigate = useNavigate();

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'track'|'level'|'question', data: obj }
  const [expandedQuestions, setExpandedQuestions] = useState({}); // { [questionId]: boolean }

  const toggleQuestionExpand = (qId) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  // Form States
  const [trackForm, setTrackForm] = useState({ id: null, title: '', icon: 'Code', description: '' });
  const [levelForm, setLevelForm] = useState({ id: null, level_number: 1, name: '', description: '', mode: 'coding', duration_minutes: 45 });
  const [questionForm, setQuestionForm] = useState({
    id: null,
    title: '',
    prompt: '',
    difficulty: 'Medium',
    type: 'coding',
    // Coding payload
    starter_code: '',
    open_test_cases: [{ input: '', output: '' }],
    hidden_test_cases: [{ input: '', output: '' }],
    constraints: '',
    // Verbal Q&A payload
    ideal_answer: '',
    rubrics: [''],
    // MCQ payload
    options: [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }],
    correct_option: 'A',
    explanation: '',
    // Discussion payload
    scenario: '',
    talking_points: [''],
    tradeoffs: [''],
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch all Tracks directly from Database
  const fetchTracks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/interviews/tracks');
      if (Array.isArray(res)) {
        setTracks(res);
      } else if (res && res.data && Array.isArray(res.data)) {
        setTracks(res.data);
      } else {
        setTracks([]);
      }
    } catch (err) {
      console.error('Failed to fetch interview tracks from backend:', err);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  // Compute selected track and level from route params
  const selectedTrack = trackId ? tracks.find((t) => String(t.id) === String(trackId)) : null;
  const selectedLevel = levelId && selectedTrack ? selectedTrack.levels?.find((l) => String(l.id) === String(levelId)) : null;

  // Filter Tracks solely by title/description
  const filteredTracks = tracks.filter((t) => {
    return (
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Track Form Handlers
  const handleSaveTrack = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      if (trackForm.id) {
        await api.put(`/admin/interviews/tracks/${trackForm.id}`, trackForm);
      } else {
        await api.post('/admin/interviews/tracks', trackForm);
      }
      setShowTrackModal(false);
      fetchTracks();
    } catch (err) {
      setFormError(err.message || 'Failed to save track');
    } finally {
      setFormLoading(false);
    }
  };

  // Level Form Handlers
  const handleSaveLevel = async (e) => {
    e.preventDefault();
    if (!selectedTrack) return;
    setFormError('');
    setFormLoading(true);
    try {
      if (levelForm.id) {
        await api.put(`/admin/interviews/levels/${levelForm.id}`, levelForm);
      } else {
        await api.post(`/admin/interviews/tracks/${selectedTrack.id}/levels`, levelForm);
      }
      setShowLevelModal(false);
      fetchTracks();
    } catch (err) {
      setFormError(err.message || 'Failed to save level');
    } finally {
      setFormLoading(false);
    }
  };

  // Question Form Handlers
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!selectedLevel) return;
    setFormError('');
    setFormLoading(true);

    try {
      let payloadObj = {};
      if (selectedLevel.mode === 'coding') {
        const openTCs = questionForm.open_test_cases.filter((tc) => tc.input || tc.output);
        const hiddenTCs = questionForm.hidden_test_cases.filter((tc) => tc.input || tc.output);
        payloadObj = {
          starter_code: questionForm.starter_code,
          open_test_cases: openTCs,
          hidden_test_cases: hiddenTCs,
          test_cases: openTCs, // Backward compatibility
          constraints: questionForm.constraints,
        };
      } else if (selectedLevel.mode === 'verbal_qa') {
        payloadObj = {
          ideal_answer: questionForm.ideal_answer,
          rubrics: questionForm.rubrics.filter((r) => r.trim()),
        };
      } else if (selectedLevel.mode === 'mcq') {
        payloadObj = {
          options: questionForm.options,
          correct_option: questionForm.correct_option,
          explanation: questionForm.explanation,
        };
      } else if (selectedLevel.mode === 'discussion') {
        payloadObj = {
          scenario: questionForm.scenario,
          talking_points: questionForm.talking_points.filter((tp) => tp.trim()),
          tradeoffs: questionForm.tradeoffs.filter((to) => to.trim()),
        };
      }

      const postBody = {
        title: questionForm.title,
        prompt: questionForm.prompt,
        difficulty: questionForm.difficulty,
        type: selectedLevel.mode,
        payload_json: JSON.stringify(payloadObj),
      };

      if (questionForm.id) {
        await api.put(`/admin/interviews/questions/${questionForm.id}`, postBody);
      } else {
        await api.post(`/admin/interviews/levels/${selectedLevel.id}/questions`, postBody);
      }

      setShowQuestionModal(false);
      fetchTracks();
    } catch (err) {
      setFormError(err.message || 'Failed to save question');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Action Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setFormLoading(true);
    try {
      if (deleteTarget.type === 'track') {
        await api.delete(`/admin/interviews/tracks/${deleteTarget.data.id}`);
        if (selectedTrack?.id === deleteTarget.data.id) {
          navigate('/admin/interviews');
        }
      } else if (deleteTarget.type === 'level') {
        await api.delete(`/admin/interviews/levels/${deleteTarget.data.id}`);
        if (selectedLevel?.id === deleteTarget.data.id) {
          navigate(`/admin/interviews/${selectedTrack.id}/levels`);
        }
      } else if (deleteTarget.type === 'question') {
        await api.delete(`/admin/interviews/questions/${deleteTarget.data.id}`);
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchTracks();
    } catch (err) {
      alert(err.message || 'Failed to delete item');
    } finally {
      setFormLoading(false);
    }
  };

  // Helper to open Question Form with parsed payload
  const openEditQuestionModal = (q) => {
    let parsed = {};
    try {
      parsed = JSON.parse(q.payload_json || '{}');
    } catch (e) {}

    const openCases = parsed.open_test_cases?.length
      ? parsed.open_test_cases
      : (parsed.test_cases?.length ? parsed.test_cases : [{ input: '', output: '' }]);
    const hiddenCases = parsed.hidden_test_cases?.length
      ? parsed.hidden_test_cases
      : [{ input: '', output: '' }];

    setQuestionForm({
      id: q.id,
      title: q.title || '',
      prompt: q.prompt || '',
      difficulty: q.difficulty || 'Medium',
      type: q.type || selectedLevel.mode,
      starter_code: parsed.starter_code || '',
      open_test_cases: openCases,
      hidden_test_cases: hiddenCases,
      constraints: parsed.constraints || '',
      ideal_answer: parsed.ideal_answer || '',
      rubrics: parsed.rubrics?.length ? parsed.rubrics : [''],
      options: parsed.options?.length ? parsed.options : [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }],
      correct_option: parsed.correct_option || 'A',
      explanation: parsed.explanation || '',
      scenario: parsed.scenario || '',
      talking_points: parsed.talking_points?.length ? parsed.talking_points : [''],
      tradeoffs: parsed.tradeoffs?.length ? parsed.tradeoffs : [''],
    });
    setFormError('');
    setShowQuestionModal(true);
  };

  const openNewQuestionModal = () => {
    setQuestionForm({
      id: null,
      title: '',
      prompt: '',
      difficulty: 'Medium',
      type: selectedLevel.mode,
      starter_code: '',
      open_test_cases: [{ input: '', output: '' }],
      hidden_test_cases: [{ input: '', output: '' }],
      constraints: '',
      ideal_answer: '',
      rubrics: [''],
      options: [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }],
      correct_option: 'A',
      explanation: '',
      scenario: '',
      talking_points: [''],
      tradeoffs: [''],
    });
    setFormError('');
    setShowQuestionModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header with Interactive Breadcrumbs and Deep Links */}
      <div className="pb-5 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb path */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
            <button
              onClick={() => navigate('/admin/interviews')}
              className={`hover:text-[var(--accent)] transition ${!selectedTrack ? 'font-bold text-[var(--accent)]' : ''}`}
            >
              Interview Configuration
            </button>
            {selectedTrack && (
              <>
                <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                <button
                  onClick={() => navigate(`/admin/interviews/${selectedTrack.id}/levels`)}
                  className={`hover:text-[var(--accent)] transition ${!selectedLevel ? 'font-bold text-[var(--accent)]' : ''}`}
                >
                  {selectedTrack.title}
                </button>
              </>
            )}
            {selectedLevel && (
              <>
                <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="font-bold text-[var(--accent)]">
                  Level {selectedLevel.level_number} ({selectedLevel.mode})
                </span>
              </>
            )}
          </div>

          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
            {!selectedTrack
              ? 'Interview Domains & Tracks'
              : !selectedLevel
              ? `${selectedTrack.title} — Levels`
              : formatFullLevelTitle(selectedLevel)}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            {!selectedTrack
              ? 'Configure campus interview domains, progression tiers, and mode-specific assessments.'
              : !selectedLevel
              ? 'Define progression levels, time limits, and select interview assessment mode.'
              : `Manage questions and evaluation rubrics for ${selectedLevel.mode.toUpperCase()} mode.`}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {selectedLevel ? (
            <>
              <button
                onClick={() => navigate(`/admin/interviews/${selectedTrack.id}/levels`)}
                className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Levels</span>
              </button>
              <button
                onClick={openNewQuestionModal}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-[var(--shadow-sm)]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </>
          ) : selectedTrack ? (
            <>
              <button
                onClick={() => navigate('/admin/interviews')}
                className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Tracks</span>
              </button>
              <button
                onClick={() => {
                  setLevelForm({
                    id: null,
                    level_number: (selectedTrack.levels?.length || 0) + 1,
                    name: '',
                    description: '',
                    mode: 'coding',
                    duration_minutes: 45,
                  });
                  setFormError('');
                  setShowLevelModal(true);
                }}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-[var(--shadow-sm)]"
              >
                <Plus className="w-4 h-4" />
                <span>Create Level</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setTrackForm({ id: null, title: '', icon: 'Code', description: '' });
                setFormError('');
                setShowTrackModal(true);
              }}
              className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-[var(--shadow-sm)]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Interview Domain</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: TRACKS OVERVIEW (/admin/interviews) */}
      {/* ============================================================ */}
      {!selectedTrack && (
        <div className="space-y-5">
          {/* Clean Search Bar */}
          <div className="panel-card p-4">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search interview domains (e.g. DSA, System Design)..."
                className="custom-input search-input text-[12px] py-2"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>
          </div>

          {/* Tracks Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTracks.map((track) => {
              const totalQuestions = track.levels?.reduce((sum, l) => sum + (l.questions?.length || 0), 0) || 0;
              const levelsCount = track.levels?.length || 0;

              return (
                <div
                  key={track.id}
                  className="data-card data-card-interactive p-5 flex flex-col justify-between group cursor-pointer"
                  onClick={() => navigate(`/admin/interviews/${track.id}/levels`)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)]">
                        <Code className="w-5 h-5" />
                      </div>

                      <div className="flex items-center gap-1">
                        <div
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTrackForm({
                              id: track.id,
                              title: track.title,
                              icon: track.icon,
                              description: track.description,
                            });
                            setFormError('');
                            setShowTrackModal(true);
                          }}
                          title="Edit Track"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </div>
                        <div
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] rounded hover:bg-[var(--red-bg)] transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ type: 'track', data: track });
                            setShowDeleteModal(true);
                          }}
                          title="Delete Track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {track.title}
                      </h3>
                      <p className="text-[12px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                        {track.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <div className="flex items-center gap-3">
                      <span>{levelsCount} {levelsCount === 1 ? 'Level' : 'Levels'}</span>
                      <span>•</span>
                      <span>{totalQuestions} {totalQuestions === 1 ? 'Question' : 'Questions'}</span>
                    </div>
                    <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Configure &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 2: LEVELS OVERVIEW FOR SELECTED TRACK (/admin/interviews/:trackId/levels) */}
      {/* ============================================================ */}
      {selectedTrack && !selectedLevel && (
        <div className="space-y-6">
          {/* Track Summary Banner */}
          <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
                {selectedTrack.title}
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)]">
                {selectedTrack.description || 'Define progression levels and assessment modes for this domain.'}
              </p>
            </div>

            <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-3 sm:pt-0 sm:pl-6 text-center shrink-0">
              <div>
                <p className="text-[20px] font-bold font-mono text-[var(--text-primary)]">
                  {selectedTrack.levels?.length || 0}
                </p>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">Progression Levels</p>
              </div>
            </div>
          </div>

          {/* Level Cards List */}
          <div className="space-y-3.5">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center justify-between">
              <span>Configured Progression Tiers</span>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Click any level to view and upload questions
              </span>
            </h3>

            {(!selectedTrack.levels || selectedTrack.levels.length === 0) ? (
              <div className="panel-card p-8 text-center space-y-3">
                <p className="text-[13px] text-[var(--text-muted)]">
                  No levels created for this interview domain yet.
                </p>
                <button
                  onClick={() => {
                    setLevelForm({
                      id: null,
                      level_number: 1,
                      name: '',
                      description: '',
                      mode: 'coding',
                      duration_minutes: 45,
                    });
                    setFormError('');
                    setShowLevelModal(true);
                  }}
                  className="btn btn-primary text-xs py-2 px-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Level 1</span>
                </button>
              </div>
            ) : (
              selectedTrack.levels.map((level) => {
                const modeMeta = INTERVIEW_MODES.find((m) => m.id === level.mode) || INTERVIEW_MODES[0];
                const ModeIcon = modeMeta.icon;
                const questionsCount = level.questions?.length || 0;

                return (
                  <div
                    key={level.id}
                    onClick={() => navigate(`/admin/interviews/${selectedTrack.id}/levels/${level.id}/questions`)}
                    className="panel-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border)] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-mono uppercase text-[var(--text-muted)] font-semibold">Lvl</span>
                        <span className="text-[18px] font-bold font-mono text-[var(--text-primary)] leading-none">
                          {level.level_number}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[15px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                            {formatFullLevelTitle(level)}
                          </h4>

                          {/* Mode Badge */}
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${modeMeta.bg} ${modeMeta.color} ${modeMeta.border}`}>
                            <ModeIcon className="w-3 h-3" />
                            <span>{modeMeta.label}</span>
                          </span>
                        </div>

                        <p className="text-[12px] text-[var(--text-secondary)] line-clamp-1">
                          {level.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0">
                      <div className="flex items-center gap-3 text-[12px] font-mono text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {level.duration_minutes || 45} mins
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {questionsCount} {questionsCount === 1 ? 'Question' : 'Questions'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLevelForm({
                              id: level.id,
                              level_number: level.level_number,
                              name: level.name,
                              description: level.description,
                              mode: level.mode,
                              duration_minutes: level.duration_minutes,
                            });
                            setFormError('');
                            setShowLevelModal(true);
                          }}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded"
                          title="Edit Level"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ type: 'level', data: level });
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] rounded"
                          title="Delete Level"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 3: QUESTIONS MANAGEMENT (/admin/interviews/:trackId/levels/:levelId/questions) */}
      {/* ============================================================ */}
      {selectedTrack && selectedLevel && (
        <div className="space-y-6">
          {/* Level Mode Callout Banner */}
          {(() => {
            const modeMeta = INTERVIEW_MODES.find((m) => m.id === selectedLevel.mode) || INTERVIEW_MODES[0];
            const ModeIcon = modeMeta.icon;
            return (
              <div className={`p-4 rounded-[var(--radius-md)] border ${modeMeta.bg} ${modeMeta.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] ${modeMeta.color} shadow-[var(--shadow-sm)]`}>
                    <ModeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-muted)]">
                      Level Assessment Mode
                    </span>
                    <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                      {modeMeta.label}
                    </h3>
                    <p className="text-[12px] text-[var(--text-secondary)]">
                      {modeMeta.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--text-secondary)]">
                  <span className="bg-[var(--bg-card)] px-2.5 py-1 rounded border border-[var(--border)]">
                    ⏱ {selectedLevel.duration_minutes || 45} mins allotted
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Questions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                Questions Bank ({selectedLevel.questions?.length || 0})
              </h3>
            </div>

            {(!selectedLevel.questions || selectedLevel.questions.length === 0) ? (
              <div className="panel-card p-10 text-center space-y-3">
                <HelpCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                <p className="text-[13px] text-[var(--text-muted)]">
                  No questions uploaded for this level yet.
                </p>
                <button
                  onClick={openNewQuestionModal}
                  className="btn btn-primary text-xs py-2 px-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Question</span>
                </button>
              </div>
            ) : (
              selectedLevel.questions.map((q, qIndex) => {
                let parsed = {};
                try {
                  parsed = JSON.parse(q.payload_json || '{}');
                } catch (e) {}

                const isExpanded = !!expandedQuestions[q.id];

                return (
                  <div
                    key={q.id}
                    className={`panel-card transition-all duration-200 bg-[var(--bg-card)] border ${
                      isExpanded
                        ? 'border-[var(--accent)] shadow-[var(--shadow-md)] ring-1 ring-[var(--accent)]/20'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {/* Compact Card Header (Clickable to Toggle Full Details) */}
                    <div
                      onClick={() => toggleQuestionExpand(q.id)}
                      className="p-5 cursor-pointer select-none space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="w-6 h-6 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {qIndex + 1}
                          </span>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-[15px] font-bold text-[var(--text-primary)]">
                                {q.title}
                              </h4>
                              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                                q.difficulty === 'Easy' ? 'bg-[var(--green-bg)] text-[var(--green)]' :
                                q.difficulty === 'Hard' ? 'bg-[var(--red-bg)] text-[var(--red)]' :
                                'bg-[var(--amber-bg)] text-[var(--amber)]'
                              }`}>
                                {q.difficulty}
                              </span>
                            </div>
                            <p className="text-[13px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed font-ui">
                              {q.prompt}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons & Expand Toggle */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleQuestionExpand(q.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition ${
                              isExpanded
                                ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]/30'
                                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                            }`}
                            title={isExpanded ? 'Collapse Details' : 'View Full Details'}
                          >
                            <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditQuestionModal(q)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded border border-transparent hover:border-[var(--border)] transition"
                            title="Edit Question"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget({ type: 'question', data: q });
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] rounded border border-transparent hover:border-[var(--red)]/20 transition"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Full Details Section */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-3 border-t border-[var(--border)] bg-[var(--bg-app)]/40 space-y-4 animate-fade-in">
                        {/* 1. CODING MODE DETAILS */}
                        {selectedLevel.mode === 'coding' && (
                          <div className="space-y-3.5 text-[12px]">
                            {parsed.constraints && (
                              <div className="p-2.5 bg-[var(--bg-card)] rounded-[var(--radius-sm)] border border-[var(--border)]">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                                  Constraints:
                                </span>
                                <p className="font-mono text-[11px] text-[var(--text-secondary)] whitespace-pre-line">
                                  {parsed.constraints}
                                </p>
                              </div>
                            )}

                            {parsed.starter_code && (
                              <div className="p-3 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-primary)] overflow-x-auto">
                                <span className="text-[10px] uppercase font-bold text-[var(--accent)] block mb-1">
                                  Starter Template:
                                </span>
                                <pre className="text-[11px] leading-relaxed">{parsed.starter_code}</pre>
                              </div>
                            )}

                            {/* Open Test Cases */}
                            {((parsed.open_test_cases && parsed.open_test_cases.length > 0) || (parsed.test_cases && parsed.test_cases.length > 0)) && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--accent)] font-bold uppercase">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Sample / Open Test Cases (Visible to Candidate):</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(parsed.open_test_cases || parsed.test_cases).map((tc, tcIdx) => (
                                    <div key={tcIdx} className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] font-mono text-[11px] space-y-1 shadow-[var(--shadow-sm)]">
                                      <div className="text-[var(--text-muted)] text-[10px] uppercase font-bold">Case #{tcIdx + 1}</div>
                                      <div><span className="text-[var(--text-muted)] font-semibold">Input:</span> <span className="text-[var(--text-primary)]">{tc.input}</span></div>
                                      <div><span className="text-[var(--accent)] font-semibold">Output:</span> <span className="text-[var(--text-primary)] font-bold">{tc.output}</span></div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Hidden Test Cases */}
                            {parsed.hidden_test_cases && parsed.hidden_test_cases.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--amber)] font-bold uppercase">
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Hidden Test Cases (Grading / Automated Evaluation):</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {parsed.hidden_test_cases.map((tc, tcIdx) => (
                                    <div key={tcIdx} className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--amber-bg)]/30 border border-[var(--amber)]/30 font-mono text-[11px] space-y-1 shadow-[var(--shadow-sm)]">
                                      <div className="text-[var(--amber)] text-[10px] uppercase font-bold">Hidden Case #{tcIdx + 1}</div>
                                      <div><span className="text-[var(--text-muted)] font-semibold">Input:</span> <span className="text-[var(--text-secondary)]">{tc.input}</span></div>
                                      <div><span className="text-[var(--amber)] font-semibold">Output:</span> <span className="text-[var(--text-primary)] font-bold">{tc.output}</span></div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. VERBAL Q&A MODE DETAILS */}
                        {selectedLevel.mode === 'verbal_qa' && (
                          <div className="space-y-3 text-[12px]">
                            {parsed.ideal_answer && (
                              <div className="p-3.5 bg-[var(--amber-bg)]/40 border border-[var(--amber)]/20 rounded-[var(--radius-sm)] text-[12px] text-[var(--text-secondary)]">
                                <strong className="text-[var(--amber)] block mb-1 font-mono uppercase text-[11px]">
                                  Key Evaluator Note / Ideal Answer:
                                </strong>
                                <p className="leading-relaxed">{parsed.ideal_answer}</p>
                              </div>
                            )}
                            {parsed.rubrics?.length > 0 && (
                              <div className="space-y-1.5 p-3 bg-[var(--bg-card)] rounded-[var(--radius-sm)] border border-[var(--border)]">
                                <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase font-bold">
                                  Evaluation Rubrics:
                                </span>
                                <ul className="list-disc pl-5 text-[12px] text-[var(--text-secondary)] space-y-1">
                                  {parsed.rubrics.map((r, rIdx) => (
                                    <li key={rIdx}>{r}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. MCQ MODE DETAILS */}
                        {selectedLevel.mode === 'mcq' && (
                          <div className="space-y-3 text-[12px]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {parsed.options?.map((opt) => (
                                <div
                                  key={opt.id}
                                  className={`p-2.5 rounded-[var(--radius-sm)] border text-[12px] flex items-center gap-2 ${
                                    opt.id === parsed.correct_option
                                      ? 'bg-[var(--green-bg)] border-[var(--green)]/40 text-[var(--green)] font-semibold shadow-[var(--shadow-sm)]'
                                      : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  <span className="font-mono font-bold w-5">{opt.id}.</span>
                                  <span>{opt.text}</span>
                                  {opt.id === parsed.correct_option && (
                                    <span className="ml-auto text-[10px] font-mono uppercase font-bold bg-[var(--green)] text-white px-1.5 py-0.5 rounded">
                                      Correct
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                            {parsed.explanation && (
                              <div className="p-2.5 bg-[var(--bg-card)] rounded-[var(--radius-sm)] border border-[var(--border)]">
                                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase font-bold block mb-0.5">
                                  Explanation:
                                </span>
                                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                                  {parsed.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4. DISCUSSION MODE DETAILS */}
                        {selectedLevel.mode === 'discussion' && (
                          <div className="space-y-3 text-[12px]">
                            {parsed.scenario && (
                              <div className="p-3 bg-[var(--bg-card)] rounded-[var(--radius-sm)] border border-[var(--border)]">
                                <strong className="text-[10px] font-mono uppercase text-[var(--text-muted)] block mb-1">
                                  Scenario Context:
                                </strong>
                                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                                  {parsed.scenario}
                                </p>
                              </div>
                            )}
                            {parsed.talking_points?.length > 0 && (
                              <div>
                                <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase font-bold">
                                  Discussion Talking Points:
                                </span>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {parsed.talking_points.map((tp, tpIdx) => (
                                    <span key={tpIdx} className="px-2.5 py-1 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] text-[11px]">
                                      • {tp}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {parsed.tradeoffs?.length > 0 && (
                              <div>
                                <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase font-bold">
                                  Tradeoffs to Evaluate:
                                </span>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {parsed.tradeoffs.map((to, toIdx) => (
                                    <span key={toIdx} className="px-2.5 py-1 rounded bg-[var(--amber-bg)]/30 text-[var(--text-secondary)] border border-[var(--amber)]/30 text-[11px]">
                                      ⚠️ {to}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CREATE / EDIT TRACK MODAL */}
      {/* ============================================================ */}
      {showTrackModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-md shadow-[var(--shadow-lg)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
                {trackForm.id ? 'Edit Interview Domain' : 'Create Interview Domain'}
              </h3>
              <button onClick={() => setShowTrackModal(false)} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[var(--red-bg)] text-[var(--red)] text-[12px] rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTrack} className="custom-form space-y-3">
              <label>
                <span>Domain Title</span>
                <input
                  type="text"
                  required
                  value={trackForm.title}
                  onChange={(e) => setTrackForm({ ...trackForm, title: e.target.value })}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="custom-input"
                />
              </label>

              <label>
                <span>Description</span>
                <textarea
                  rows="3"
                  value={trackForm.description}
                  onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
                  placeholder="Brief overview of topics covered in this domain..."
                  className="custom-input resize-none"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowTrackModal(false)} className="btn btn-secondary text-xs py-2 px-3.5">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className="btn btn-primary text-xs py-2 px-4">
                  {formLoading ? 'Saving...' : 'Save Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CREATE / EDIT LEVEL MODAL (WITH MODE SELECTOR) */}
      {/* ============================================================ */}
      {showLevelModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-lg shadow-[var(--shadow-lg)] space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <span className="badge-kicker">Progression Setup</span>
                <h3 className="text-[17px] font-bold text-[var(--text-primary)] mt-0.5">
                  {levelForm.id ? 'Edit Progression Level' : 'Add Progression Level'}
                </h3>
              </div>
              <button onClick={() => setShowLevelModal(false)} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[var(--red-bg)] text-[var(--red)] text-[12px] rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLevel} className="custom-form space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-1">
                  <span>Level #</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={levelForm.level_number}
                    onChange={(e) => setLevelForm({ ...levelForm, level_number: parseInt(e.target.value) || 1 })}
                    className="custom-input"
                  />
                </label>

                <label className="col-span-2">
                  <span>Duration (Mins)</span>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={levelForm.duration_minutes}
                    onChange={(e) => setLevelForm({ ...levelForm, duration_minutes: parseInt(e.target.value) || 45 })}
                    className="custom-input"
                  />
                </label>
              </div>

              <label>
                <span>Level Name</span>
                <input
                  type="text"
                  required
                  value={levelForm.name}
                  onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                  placeholder="e.g. Fundamentals & Basic Hashing"
                  className="custom-input"
                />
              </label>

              {/* Mode Selector Cards */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] block mb-2 font-ui">
                  Select Interview Assessment Mode:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {INTERVIEW_MODES.map((mode) => {
                    const ModeIcon = mode.icon;
                    const isSelected = levelForm.mode === mode.id;
                    return (
                      <div
                        key={mode.id}
                        onClick={() => setLevelForm({ ...levelForm, mode: mode.id })}
                        className={`p-3 rounded-[var(--radius-sm)] border cursor-pointer transition-all ${
                          isSelected
                            ? `${mode.bg} border-[var(--accent)] shadow-[0_0_0_1.5px_var(--accent)]`
                            : 'bg-[var(--bg-input)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <ModeIcon className={`w-4 h-4 ${mode.color}`} />
                            <span className="text-[13px] font-bold text-[var(--text-primary)]">
                              {mode.label}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          {mode.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <label>
                <span>Description (Optional)</span>
                <textarea
                  rows="2"
                  value={levelForm.description}
                  onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
                  placeholder="Scope or expectations for candidate in this level..."
                  className="custom-input resize-none"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowLevelModal(false)} className="btn btn-secondary text-xs py-2 px-3.5">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className="btn btn-primary text-xs py-2 px-4">
                  {formLoading ? 'Saving...' : 'Save Level'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CREATE / EDIT QUESTION MODAL (DYNAMIC BASED ON MODE) */}
      {/* ============================================================ */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-2xl shadow-[var(--shadow-lg)] space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <span className="badge-kicker">Question Configuration • {selectedLevel.mode.toUpperCase()}</span>
                <h3 className="text-[17px] font-bold text-[var(--text-primary)] mt-0.5">
                  {questionForm.id ? 'Edit Question' : 'Upload Question'}
                </h3>
              </div>
              <button onClick={() => setShowQuestionModal(false)} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[var(--red-bg)] text-[var(--red)] text-[12px] rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="custom-form space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="sm:col-span-2">
                  <span>Question Title</span>
                  <input
                    type="text"
                    required
                    value={questionForm.title}
                    onChange={(e) => setQuestionForm({ ...questionForm, title: e.target.value })}
                    placeholder="e.g. Reverse Linked List / Rate Limiter Design"
                    className="custom-input"
                  />
                </label>

                <label className="sm:col-span-1">
                  <span>Difficulty</span>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    className="custom-input"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </label>
              </div>

              <label>
                <span>Problem Statement / Prompt Description</span>
                <textarea
                  rows="3"
                  required
                  value={questionForm.prompt}
                  onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                  placeholder="Full question statement or scenario prompt given to the candidate..."
                  className="custom-input font-mono text-[12px]"
                />
              </label>

              {/* DYNAMIC FORM FIELDS BY LEVEL MODE */}

              {/* 1. CODING MODE */}
              {selectedLevel.mode === 'coding' && (
                <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-bold text-[var(--accent)] font-mono uppercase tracking-wider">
                      Coding Mode Specifications
                    </h4>
                  </div>

                  <label>
                    <span>Starter Code Boilerplate</span>
                    <textarea
                      rows="4"
                      value={questionForm.starter_code}
                      onChange={(e) => setQuestionForm({ ...questionForm, starter_code: e.target.value })}
                      placeholder="func solution(nums []int) int {\n    // Code here\n}"
                      className="custom-input font-mono text-[12px]"
                    />
                  </label>

                  <label>
                    <span>Constraints</span>
                    <input
                      type="text"
                      value={questionForm.constraints}
                      onChange={(e) => setQuestionForm({ ...questionForm, constraints: e.target.value })}
                      placeholder="e.g. 1 <= nums.length <= 10^5"
                      className="custom-input font-mono text-[12px]"
                    />
                  </label>

                  {/* Open / Sample Test Cases */}
                  <div className="p-3.5 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border)] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-[var(--accent)]" />
                        <span className="text-[12px] font-bold text-[var(--text-primary)] font-ui">
                          Open Test Cases
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                          Visible to candidate
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, open_test_cases: [...questionForm.open_test_cases, { input: '', output: '' }] })}
                        className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add Open Case
                      </button>
                    </div>

                    <div className="space-y-2">
                      {questionForm.open_test_cases.map((tc, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={`Open Input ${idx + 1} (e.g. nums = [2,7,11], target = 9)`}
                            value={tc.input}
                            onChange={(e) => {
                              const updated = [...questionForm.open_test_cases];
                              updated[idx].input = e.target.value;
                              setQuestionForm({ ...questionForm, open_test_cases: updated });
                            }}
                            className="custom-input font-mono text-[11px] py-1.5 flex-1 bg-[var(--bg-card)]"
                          />
                          <input
                            type="text"
                            placeholder="Expected Output (e.g. [0,1])"
                            value={tc.output}
                            onChange={(e) => {
                              const updated = [...questionForm.open_test_cases];
                              updated[idx].output = e.target.value;
                              setQuestionForm({ ...questionForm, open_test_cases: updated });
                            }}
                            className="custom-input font-mono text-[11px] py-1.5 flex-1 bg-[var(--bg-card)]"
                          />
                          {questionForm.open_test_cases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = questionForm.open_test_cases.filter((_, i) => i !== idx);
                                setQuestionForm({ ...questionForm, open_test_cases: updated });
                              }}
                              className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                              title="Remove Test Case"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hidden Test Cases */}
                  <div className="p-3.5 bg-[var(--amber-bg)]/20 rounded-[var(--radius-sm)] border border-[var(--amber)]/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-[var(--amber)]" />
                        <span className="text-[12px] font-bold text-[var(--text-primary)] font-ui">
                          Hidden Test Cases
                        </span>
                        <span className="text-[10px] font-mono text-[var(--amber)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--amber)]/30 font-semibold">
                          Private / Evaluation only
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, hidden_test_cases: [...questionForm.hidden_test_cases, { input: '', output: '' }] })}
                        className="text-[11px] text-[var(--amber)] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add Hidden Case
                      </button>
                    </div>

                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Hidden test cases are not revealed to students during the interview. They evaluate edge cases, boundary conditions, and large inputs during final test runs.
                    </p>

                    <div className="space-y-2">
                      {questionForm.hidden_test_cases.map((tc, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={`Hidden Input ${idx + 1} (e.g. nums = [-1,-2], target = -3)`}
                            value={tc.input}
                            onChange={(e) => {
                              const updated = [...questionForm.hidden_test_cases];
                              updated[idx].input = e.target.value;
                              setQuestionForm({ ...questionForm, hidden_test_cases: updated });
                            }}
                            className="custom-input font-mono text-[11px] py-1.5 flex-1 bg-[var(--bg-card)]"
                          />
                          <input
                            type="text"
                            placeholder="Expected Output (e.g. [0,1])"
                            value={tc.output}
                            onChange={(e) => {
                              const updated = [...questionForm.hidden_test_cases];
                              updated[idx].output = e.target.value;
                              setQuestionForm({ ...questionForm, hidden_test_cases: updated });
                            }}
                            className="custom-input font-mono text-[11px] py-1.5 flex-1 bg-[var(--bg-card)]"
                          />
                          {questionForm.hidden_test_cases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = questionForm.hidden_test_cases.filter((_, i) => i !== idx);
                                setQuestionForm({ ...questionForm, hidden_test_cases: updated });
                              }}
                              className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                              title="Remove Test Case"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. VERBAL Q&A MODE */}
              {selectedLevel.mode === 'verbal_qa' && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <h4 className="text-[13px] font-bold text-[var(--amber)] font-mono uppercase tracking-wider">
                    Verbal Q&A Evaluation Rubrics
                  </h4>

                  <label>
                    <span>Ideal Answer / Key Concepts</span>
                    <textarea
                      rows="3"
                      value={questionForm.ideal_answer}
                      onChange={(e) => setQuestionForm({ ...questionForm, ideal_answer: e.target.value })}
                      placeholder="Summary of what strong candidate should explain..."
                      className="custom-input text-[12px]"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Evaluation Checkpoints:</span>
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, rubrics: [...questionForm.rubrics, ''] })}
                        className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add Rubric Point
                      </button>
                    </div>

                    {questionForm.rubrics.map((rubric, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Evaluation criterion #${idx + 1}`}
                          value={rubric}
                          onChange={(e) => {
                            const updated = [...questionForm.rubrics];
                            updated[idx] = e.target.value;
                            setQuestionForm({ ...questionForm, rubrics: updated });
                          }}
                          className="custom-input text-[12px] py-1.5 flex-1"
                        />
                        {questionForm.rubrics.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = questionForm.rubrics.filter((_, i) => i !== idx);
                              setQuestionForm({ ...questionForm, rubrics: updated });
                            }}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. MCQ MODE */}
              {selectedLevel.mode === 'mcq' && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <h4 className="text-[13px] font-bold text-[var(--green)] font-mono uppercase tracking-wider">
                    MCQ Options & Correct Answer
                  </h4>

                  <div className="space-y-2">
                    {questionForm.options.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-[var(--bg-input)] font-mono font-bold text-[11px] flex items-center justify-center shrink-0 border border-[var(--border)]">
                          {opt.id}
                        </span>
                        <input
                          type="text"
                          required
                          placeholder={`Option ${opt.id} text`}
                          value={opt.text}
                          onChange={(e) => {
                            const updated = [...questionForm.options];
                            updated[idx].text = e.target.value;
                            setQuestionForm({ ...questionForm, options: updated });
                          }}
                          className="custom-input text-[12px] py-1.5 flex-1"
                        />
                        <label className="flex items-center gap-1 cursor-pointer shrink-0 text-[11px] font-mono font-semibold text-[var(--text-secondary)]">
                          <input
                            type="radio"
                            name="correct_option"
                            checked={questionForm.correct_option === opt.id}
                            onChange={() => setQuestionForm({ ...questionForm, correct_option: opt.id })}
                            className="accent-[var(--accent)]"
                          />
                          <span>Correct</span>
                        </label>
                      </div>
                    ))}
                  </div>

                  <label>
                    <span>Explanation (Shown after answering)</span>
                    <textarea
                      rows="2"
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      placeholder="Why this option is correct..."
                      className="custom-input text-[12px] resize-none"
                    />
                  </label>
                </div>
              )}

              {/* 4. DISCUSSION MODE */}
              {selectedLevel.mode === 'discussion' && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <h4 className="text-[13px] font-bold text-sky-600 font-mono uppercase tracking-wider">
                    System Design Discussion Points
                  </h4>

                  <label>
                    <span>Scenario Overview</span>
                    <input
                      type="text"
                      value={questionForm.scenario}
                      onChange={(e) => setQuestionForm({ ...questionForm, scenario: e.target.value })}
                      placeholder="e.g. Multi-region high throughput API gateway"
                      className="custom-input text-[12px]"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Key Talking Points:</span>
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, talking_points: [...questionForm.talking_points, ''] })}
                        className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add Point
                      </button>
                    </div>

                    {questionForm.talking_points.map((tp, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Talking point #${idx + 1}`}
                          value={tp}
                          onChange={(e) => {
                            const updated = [...questionForm.talking_points];
                            updated[idx] = e.target.value;
                            setQuestionForm({ ...questionForm, talking_points: updated });
                          }}
                          className="custom-input text-[12px] py-1.5 flex-1"
                        />
                        {questionForm.talking_points.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = questionForm.talking_points.filter((_, i) => i !== idx);
                              setQuestionForm({ ...questionForm, talking_points: updated });
                            }}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowQuestionModal(false)} className="btn btn-secondary text-xs py-2 px-3.5">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className="btn btn-primary text-xs py-2 px-4">
                  {formLoading ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-md shadow-[var(--shadow-lg)] space-y-4">
            <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
              Confirm Deletion
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to delete this {deleteTarget?.type} <strong className="text-[var(--text-primary)]">{deleteTarget?.data?.title || deleteTarget?.data?.name}</strong>?
              {deleteTarget?.type === 'track' && ' All nested levels and questions will also be deleted.'}
              {deleteTarget?.type === 'level' && ' All questions in this level will also be deleted.'}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary text-xs py-2 px-3.5">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} disabled={formLoading} className="btn btn-danger text-xs py-2 px-4">
                {formLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
