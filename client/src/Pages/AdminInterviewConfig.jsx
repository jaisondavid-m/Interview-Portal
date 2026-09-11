import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Code, Layers, Mic, CheckSquare, MessageSquare, Plus, ChevronRight, 
  Search, Edit2, Trash2, Clock, AlertCircle, Check, X, ArrowLeft,
  HelpCircle, Eye, EyeOff, Lock, Unlock, ChevronDown, ChevronUp, Copy,
  Lightbulb, Target, Sparkles, BookOpen
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
  const { trackId, levelId, questionId } = useParams();
  const navigate = useNavigate();

  // On-demand isolated state per view layer
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'track'|'level'|'question', data: obj }

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
    hints: [''],
    expected_approach: '',
    expected_complexity: '',
    // Interview tips (all modes)
    interview_tips: [''],
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

  // ============================================================
  // ON-DEMAND DATA FETCHING FUNCTIONS (SPLIT ENDPOINTS)
  // ============================================================

  // 1. Fetch only tracks overview
  const loadTracks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/interviews/tracks');
      setTracks(Array.isArray(res) ? res : (res?.data || []));
    } catch (err) {
      console.error('Failed to load tracks:', err);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch track info and its levels on demand
  const loadTrackLevels = async (tId) => {
    setLoading(true);
    try {
      const [trackRes, levelsRes] = await Promise.all([
        api.get(`/admin/interviews/tracks/${tId}`),
        api.get(`/admin/interviews/tracks/${tId}/levels`),
      ]);
      setCurrentTrack(trackRes?.data || trackRes);
      setLevels(Array.isArray(levelsRes) ? levelsRes : (levelsRes?.data || []));
    } catch (err) {
      console.error('Failed to load track levels:', err);
      setLevels([]);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch track, level, and questions on demand
  const loadLevelQuestions = async (tId, lId) => {
    setLoading(true);
    try {
      const [trackRes, levelRes, questionsRes] = await Promise.all([
        api.get(`/admin/interviews/tracks/${tId}`),
        api.get(`/admin/interviews/levels/${lId}`),
        api.get(`/admin/interviews/levels/${lId}/questions`),
      ]);
      setCurrentTrack(trackRes?.data || trackRes);
      setCurrentLevel(levelRes?.data || levelRes);
      setQuestions(Array.isArray(questionsRes) ? questionsRes : (questionsRes?.data || []));
    } catch (err) {
      console.error('Failed to load level questions:', err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // 4. Fetch track, level, and single question on demand
  const loadQuestionDetails = async (tId, lId, qId) => {
    setLoading(true);
    try {
      const [trackRes, levelRes, questionRes] = await Promise.all([
        api.get(`/admin/interviews/tracks/${tId}`),
        api.get(`/admin/interviews/levels/${lId}`),
        api.get(`/admin/interviews/questions/${qId}`),
      ]);
      setCurrentTrack(trackRes?.data || trackRes);
      setCurrentLevel(levelRes?.data || levelRes);
      setCurrentQuestion(questionRes?.data || questionRes);
    } catch (err) {
      console.error('Failed to load question details:', err);
      setCurrentQuestion(null);
    } finally {
      setLoading(false);
    }
  };

  // Trigger granular fetch when route params change
  useEffect(() => {
    if (trackId && levelId && questionId) {
      loadQuestionDetails(trackId, levelId, questionId);
    } else if (trackId && levelId) {
      loadLevelQuestions(trackId, levelId);
    } else if (trackId) {
      loadTrackLevels(trackId);
    } else {
      loadTracks();
    }
  }, [trackId, levelId, questionId]);

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
      loadTracks();
    } catch (err) {
      setFormError(err.message || 'Failed to save track');
    } finally {
      setFormLoading(false);
    }
  };

  // Level Form Handlers
  const handleSaveLevel = async (e) => {
    e.preventDefault();
    if (!trackId) return;
    setFormError('');
    setFormLoading(true);
    try {
      const cleanName = levelForm.name.replace(new RegExp(`^Level\\s*${levelForm.level_number}\\s*:\\s*`, 'i'), '').trim();
      const payload = { ...levelForm, name: cleanName };

      if (levelForm.id) {
        await api.put(`/admin/interviews/levels/${levelForm.id}`, payload);
      } else {
        await api.post(`/admin/interviews/tracks/${trackId}/levels`, payload);
      }
      setShowLevelModal(false);
      loadTrackLevels(trackId);
    } catch (err) {
      setFormError(err.message || 'Failed to save level');
    } finally {
      setFormLoading(false);
    }
  };

  // Question Form Handlers
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!levelId || !currentLevel) return;
    setFormError('');
    setFormLoading(true);

    try {
      let payloadObj = {};
      const tips = (questionForm.interview_tips || []).filter((t) => t.trim());

      if (currentLevel.mode === 'coding') {
        const openTCs = questionForm.open_test_cases.filter((tc) => tc.input || tc.output);
        const hiddenTCs = questionForm.hidden_test_cases.filter((tc) => tc.input || tc.output);
        const hints = (questionForm.hints || []).filter((h) => h.trim());

        payloadObj = {
          starter_code: questionForm.starter_code,
          open_test_cases: openTCs,
          hidden_test_cases: hiddenTCs,
          test_cases: openTCs, // Backward compatibility
          constraints: questionForm.constraints,
          hints: hints,
          expected_approach: questionForm.expected_approach,
          expected_complexity: questionForm.expected_complexity,
          interview_tips: tips,
        };
      } else if (currentLevel.mode === 'verbal_qa') {
        payloadObj = {
          ideal_answer: questionForm.ideal_answer,
          rubrics: questionForm.rubrics.filter((r) => r.trim()),
          interview_tips: tips,
        };
      } else if (currentLevel.mode === 'mcq') {
        payloadObj = {
          options: questionForm.options,
          correct_option: questionForm.correct_option,
          explanation: questionForm.explanation,
          interview_tips: tips,
        };
      } else if (currentLevel.mode === 'discussion') {
        payloadObj = {
          scenario: questionForm.scenario,
          talking_points: questionForm.talking_points.filter((tp) => tp.trim()),
          tradeoffs: questionForm.tradeoffs.filter((to) => to.trim()),
          interview_tips: tips,
        };
      }

      const postBody = {
        title: questionForm.title,
        prompt: questionForm.prompt,
        difficulty: questionForm.difficulty,
        type: currentLevel.mode,
        payload_json: JSON.stringify(payloadObj),
      };

      if (questionForm.id) {
        await api.put(`/admin/interviews/questions/${questionForm.id}`, postBody);
      } else {
        await api.post(`/admin/interviews/levels/${levelId}/questions`, postBody);
      }

      setShowQuestionModal(false);
      if (questionId) {
        loadQuestionDetails(trackId, levelId, questionId);
      } else {
        loadLevelQuestions(trackId, levelId);
      }
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
        setShowDeleteModal(false);
        setDeleteTarget(null);
        if (trackId) {
          navigate('/admin/interviews');
        } else {
          loadTracks();
        }
      } else if (deleteTarget.type === 'level') {
        await api.delete(`/admin/interviews/levels/${deleteTarget.data.id}`);
        setShowDeleteModal(false);
        setDeleteTarget(null);
        if (levelId) {
          navigate(`/admin/interviews/${trackId}/levels`);
        } else {
          loadTrackLevels(trackId);
        }
      } else if (deleteTarget.type === 'question') {
        await api.delete(`/admin/interviews/questions/${deleteTarget.data.id}`);
        setShowDeleteModal(false);
        setDeleteTarget(null);
        if (questionId) {
          navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions`);
        } else {
          loadLevelQuestions(trackId, levelId);
        }
      }
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

    const hints = parsed.hints?.length ? parsed.hints : [''];
    const tips = parsed.interview_tips?.length ? parsed.interview_tips : [''];

    setQuestionForm({
      id: q.id,
      title: q.title || '',
      prompt: q.prompt || '',
      difficulty: q.difficulty || 'Medium',
      type: q.type || currentLevel?.mode || 'coding',
      starter_code: parsed.starter_code || '',
      open_test_cases: openCases,
      hidden_test_cases: hiddenCases,
      constraints: parsed.constraints || '',
      hints: hints,
      expected_approach: parsed.expected_approach || '',
      expected_complexity: parsed.expected_complexity || '',
      interview_tips: tips,
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
      type: currentLevel?.mode || 'coding',
      starter_code: '',
      open_test_cases: [{ input: '', output: '' }],
      hidden_test_cases: [{ input: '', output: '' }],
      constraints: '',
      hints: [''],
      expected_approach: '',
      expected_complexity: '',
      interview_tips: [''],
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
      <div className={`${questionId ? 'pb-2' : 'pb-5 border-b border-[var(--border)]'} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          {/* Breadcrumb path */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1 flex-wrap">
            <button
              onClick={() => navigate('/admin/interviews')}
              className={`hover:text-[var(--accent)] transition ${!trackId ? 'font-bold text-[var(--accent)]' : ''}`}
            >
              Interview Configuration
            </button>
            {trackId && currentTrack && (
              <>
                <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                <button
                  onClick={() => navigate(`/admin/interviews/${trackId}/levels`)}
                  className={`hover:text-[var(--accent)] transition ${!levelId ? 'font-bold text-[var(--accent)]' : ''}`}
                >
                  {currentTrack.title}
                </button>
              </>
            )}
            {levelId && currentLevel && (
              <>
                <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                <button
                  onClick={() => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions`)}
                  className={`hover:text-[var(--accent)] transition ${!questionId ? 'font-bold text-[var(--accent)]' : ''}`}
                >
                  Level {currentLevel.level_number} ({currentLevel.mode?.toUpperCase()})
                </button>
              </>
            )}
            {questionId && currentQuestion && (
              <>
                <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                <span className="font-bold text-[var(--accent)] truncate max-w-[250px]">
                  {currentQuestion.title}
                </span>
              </>
            )}
          </div>

          {!questionId && (
            <>
              <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
                {!trackId
                  ? 'Interview Domains & Tracks'
                  : !levelId
                  ? `${currentTrack?.title || 'Loading...'} — Levels`
                  : formatFullLevelTitle(currentLevel)}
              </h1>
              <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                {!trackId
                  ? 'Configure campus interview domains, progression tiers, and mode-specific assessments.'
                  : !levelId
                  ? 'Define progression levels, time limits, and select interview assessment mode.'
                  : `Manage questions and evaluation rubrics for ${currentLevel?.mode?.toUpperCase()} mode.`}
              </p>
            </>
          )}
        </div>

        {/* Primary Action Button (Only for Views 1, 2, 3) */}
        {!questionId && (
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {levelId ? (
              <>
                <button
                  onClick={() => navigate(`/admin/interviews/${trackId}/levels`)}
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
            ) : trackId ? (
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
                      level_number: (levels?.length || 0) + 1,
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
        )}
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: TRACKS OVERVIEW (/admin/interviews) */}
      {/* ============================================================ */}
      {!trackId && (
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
              const totalQuestions = track.questions_count || 0;
              const levelsCount = track.levels_count || 0;

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
      {trackId && !levelId && (
        <div className="space-y-6">
          {/* Track Summary Banner */}
          <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
                {currentTrack?.title || 'Loading Domain...'}
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)]">
                {currentTrack?.description || 'Define progression levels and assessment modes for this domain.'}
              </p>
            </div>

            <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-3 sm:pt-0 sm:pl-6 text-center shrink-0">
              <div>
                <p className="text-[20px] font-bold font-mono text-[var(--text-primary)]">
                  {levels?.length || 0}
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

            {(!levels || levels.length === 0) ? (
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
              levels.map((level) => {
                const modeMeta = INTERVIEW_MODES.find((m) => m.id === level.mode) || INTERVIEW_MODES[0];
                const ModeIcon = modeMeta.icon;
                const questionsCount = level.questions_count || 0;

                return (
                  <div
                    key={level.id}
                    onClick={() => navigate(`/admin/interviews/${trackId}/levels/${level.id}/questions`)}
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
                              name: formatLevelName(level),
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
      {trackId && levelId && !questionId && (
        <div className="space-y-6">
          {/* Level Mode Callout Banner */}
          {(() => {
            const modeMeta = INTERVIEW_MODES.find((m) => m.id === currentLevel?.mode) || INTERVIEW_MODES[0];
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
                    ⏱ {currentLevel?.duration_minutes || 45} mins allotted
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Questions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                Questions Bank ({questions?.length || 0})
              </h3>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Click any question to view full specifications
              </span>
            </div>

            {(!questions || questions.length === 0) ? (
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
              questions.map((q, qIndex) => {
                return (
                  <div
                    key={q.id}
                    onClick={() => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions/${q.id}`)}
                    className="panel-card p-5 cursor-pointer hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all group bg-[var(--bg-card)] border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {qIndex + 1}
                      </span>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-[15px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
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
                        <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed font-ui">
                          {q.prompt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditQuestionModal(q);
                        }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded border border-transparent hover:border-[var(--border)] transition"
                        title="Edit Question"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ type: 'question', data: q });
                          setShowDeleteModal(true);
                        }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] rounded border border-transparent hover:border-[var(--red)]/20 transition"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 4: QUESTION DETAILS PAGE (/admin/interviews/:trackId/levels/:levelId/questions/:questionId) */}
      {/* ============================================================ */}
      {trackId && levelId && questionId && (
        <div className="space-y-6">
          {!currentQuestion ? (
            <div className="panel-card p-10 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
              <p className="text-[14px] text-[var(--text-secondary)]">Question not found or still loading...</p>
              <button
                onClick={() => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions`)}
                className="btn btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Questions</span>
              </button>
            </div>
          ) : (() => {
            let parsed = {};
            try {
              parsed = JSON.parse(currentQuestion.payload_json || '{}');
            } catch (e) {}

            const modeMeta = INTERVIEW_MODES.find((m) => m.id === currentLevel?.mode) || INTERVIEW_MODES[0];
            const ModeIcon = modeMeta.icon;
            const openCases = parsed.open_test_cases?.length
              ? parsed.open_test_cases
              : (parsed.test_cases?.length ? parsed.test_cases : []);
            const hiddenCases = parsed.hidden_test_cases || [];

            return (
              <div className="space-y-6">
                {/* Question Overview Header Card */}
                <div className="panel-card p-6 bg-[var(--bg-raised)] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1 rounded-full border ${modeMeta.bg} ${modeMeta.color} ${modeMeta.border}`}>
                        <ModeIcon className="w-3.5 h-3.5" />
                        <span>{modeMeta.label} Assessment</span>
                      </span>
                      <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded ${
                        currentQuestion.difficulty === 'Easy' ? 'bg-[var(--green-bg)] text-[var(--green)]' :
                        currentQuestion.difficulty === 'Hard' ? 'bg-[var(--red-bg)] text-[var(--red)]' :
                        'bg-[var(--amber-bg)] text-[var(--amber)]'
                      }`}>
                        {currentQuestion.difficulty} Difficulty
                      </span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-2.5 py-1 rounded border border-[var(--border)]">
                        Level {currentLevel?.level_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions`)}
                        className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Questions</span>
                      </button>
                      <button
                        onClick={() => openEditQuestionModal(currentQuestion)}
                        className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget({ type: 'question', data: currentQuestion });
                          setShowDeleteModal(true);
                        }}
                        className="btn btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-[20px] font-bold text-[var(--text-primary)]">
                      {currentQuestion.title}
                    </h2>
                  </div>
                </div>

                {/* Problem Statement Card */}
                <div className="panel-card p-6 space-y-3">
                  <h3 className="text-[13px] font-bold font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Problem Statement
                  </h3>
                  <div className="text-[14px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-ui">
                    {currentQuestion.prompt}
                  </div>
                </div>

                {/* 1. CODING MODE SPECIFICATIONS */}
                {currentLevel?.mode === 'coding' && (
                  <div className="space-y-6">
                    {/* Constraints */}
                    {parsed.constraints && (
                      <div className="panel-card p-5 space-y-2 border-l-4 border-l-[var(--accent)]">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                          Constraints & Limits
                        </span>
                        <div className="font-mono text-[12px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                          {parsed.constraints}
                        </div>
                      </div>
                    )}

                    {/* Expected Solution Approach */}
                    {parsed.expected_approach && (
                      <div className="panel-card p-5 space-y-2 border-l-4 border-l-[var(--accent)] bg-[var(--bg-raised)]">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                          <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--accent)]">
                            Solution Expected Approach
                          </span>
                        </div>
                        <div className="text-[13px] text-[var(--text-primary)] whitespace-pre-line leading-relaxed font-ui">
                          {parsed.expected_approach}
                        </div>
                      </div>
                    )}

                    {/* Expected Complexity */}
                    {parsed.expected_complexity && (
                      <div className="panel-card p-4 space-y-1.5 bg-[var(--bg-card)] border border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Expected Complexity Target
                          </span>
                        </div>
                        <div className="font-mono text-[12px] text-[var(--text-primary)] whitespace-pre-line font-semibold">
                          {parsed.expected_complexity}
                        </div>
                      </div>
                    )}

                    {/* Progressive Hints */}
                    {parsed.hints?.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                          <Lightbulb className="w-4 h-4 text-[var(--amber)]" />
                          <span>Progressive Hints</span>
                          <span className="text-[10px] font-mono bg-[var(--amber-bg)] text-[var(--amber)] px-2 py-0.5 rounded font-semibold">
                            {parsed.hints.length} {parsed.hints.length === 1 ? 'Hint' : 'Hints'} Available
                          </span>
                        </div>
                        <div className="space-y-2">
                          {parsed.hints.map((h, hIdx) => (
                            <div key={hIdx} className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] flex items-start gap-3 shadow-[var(--shadow-sm)]">
                              <span className="w-6 h-6 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                {hIdx + 1}
                              </span>
                              <div className="space-y-0.5 flex-1">
                                <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">
                                  Hint {hIdx + 1}
                                </span>
                                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                                  {h}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interview Tips for Coding Mode */}
                    {parsed.interview_tips?.length > 0 && (
                      <div className="panel-card p-5 space-y-3 bg-[var(--bg-card)] border border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-emerald-500" />
                          <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            Interview Tips & Evaluator Probing Questions
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {parsed.interview_tips.map((tip, tipIdx) => (
                            <li key={tipIdx} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Starter Code */}
                    {parsed.starter_code && (
                      <div className="panel-card overflow-hidden border border-[var(--border)]">
                        <div className="p-3 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent)]">
                            Starter Template (Candidate Editor Default)
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(parsed.starter_code);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                          </button>
                        </div>
                        <div className="p-4 bg-[var(--bg-input)] font-mono text-[12px] text-[var(--text-primary)] overflow-x-auto">
                          <pre className="leading-relaxed">{parsed.starter_code}</pre>
                        </div>
                      </div>
                    )}

                    {/* Open / Sample Test Cases */}
                    {openCases.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                            <Eye className="w-4 h-4 text-[var(--accent)]" />
                            <span>Sample / Open Test Cases</span>
                            <span className="text-[10px] font-mono bg-[var(--accent-dim)] text-[var(--accent)] px-2 py-0.5 rounded font-semibold">
                              Visible to Candidate
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {openCases.length} {openCases.length === 1 ? 'Case' : 'Cases'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {openCases.map((tc, tcIdx) => (
                            <div key={tcIdx} className="panel-card p-4 bg-[var(--bg-card)] border border-[var(--border)] space-y-2">
                              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                                <span className="text-[11px] font-mono font-bold text-[var(--text-muted)]">
                                  Test Case #{tcIdx + 1}
                                </span>
                              </div>
                              <div className="space-y-1.5 font-mono text-[12px]">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Input:</span>
                                  <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-primary)] overflow-x-auto">
                                    {tc.input || '(empty)'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-[var(--accent)] block">Expected Output:</span>
                                  <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-primary)] font-bold overflow-x-auto">
                                    {tc.output || '(empty)'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hidden Test Cases */}
                    {hiddenCases.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                            <Lock className="w-4 h-4 text-[var(--amber)]" />
                            <span>Hidden Test Cases</span>
                            <span className="text-[10px] font-mono bg-[var(--amber-bg)] text-[var(--amber)] px-2 py-0.5 rounded font-semibold">
                              Grading & Auto-Evaluation Only
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {hiddenCases.length} {hiddenCases.length === 1 ? 'Hidden Case' : 'Hidden Cases'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {hiddenCases.map((tc, tcIdx) => (
                            <div key={tcIdx} className="panel-card p-4 bg-[var(--amber-bg)]/20 border border-[var(--amber)]/30 space-y-2">
                              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--amber)]/20">
                                <span className="text-[11px] font-mono font-bold text-[var(--amber)]">
                                  Hidden Case #{tcIdx + 1}
                                </span>
                              </div>
                              <div className="space-y-1.5 font-mono text-[12px]">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Input:</span>
                                  <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-secondary)] overflow-x-auto">
                                    {tc.input || '(empty)'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-[var(--amber)] block">Expected Output:</span>
                                  <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-primary)] font-bold overflow-x-auto">
                                    {tc.output || '(empty)'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. VERBAL Q&A SPECIFICATIONS */}
                {currentLevel?.mode === 'verbal_qa' && (
                  <div className="space-y-6">
                    {parsed.ideal_answer && (
                      <div className="panel-card p-5 bg-[var(--amber-bg)]/30 border border-[var(--amber)]/30 space-y-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--amber)] block">
                          Key Evaluator Note / Model Answer:
                        </span>
                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                          {parsed.ideal_answer}
                        </p>
                      </div>
                    )}

                    {parsed.rubrics?.length > 0 && (
                      <div className="panel-card p-5 space-y-3">
                        <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                          Scoring Rubrics & Evaluation Criteria:
                        </span>
                        <ul className="space-y-2">
                          {parsed.rubrics.map((r, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                              <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {parsed.interview_tips?.length > 0 && (
                      <div className="panel-card p-5 space-y-3 bg-[var(--bg-card)] border border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-emerald-500" />
                          <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            Interview Tips & Probing Questions
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {parsed.interview_tips.map((tip, tipIdx) => (
                            <li key={tipIdx} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. MCQ SPECIFICATIONS */}
                {currentLevel?.mode === 'mcq' && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Answer Choices:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {parsed.options?.map((opt) => {
                          const isCorrect = opt.id === parsed.correct_option;
                          return (
                            <div
                              key={opt.id}
                              className={`p-4 rounded-[var(--radius-md)] border flex items-center justify-between gap-3 ${
                                isCorrect
                                  ? 'bg-[var(--green-bg)] border-[var(--green)]/50 text-[var(--green)] font-semibold shadow-[var(--shadow-sm)]'
                                  : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-[12px] ${
                                  isCorrect
                                    ? 'bg-[var(--green)] text-white'
                                    : 'bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]'
                                }`}>
                                  {opt.id}
                                </span>
                                <span className="text-[13px]">{opt.text}</span>
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] font-mono uppercase font-bold bg-[var(--green)] text-white px-2 py-0.5 rounded shrink-0">
                                  Correct Option
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {parsed.explanation && (
                      <div className="panel-card p-5 space-y-2 bg-[var(--bg-raised)]">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                          Answer Explanation & Reference:
                        </span>
                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                          {parsed.explanation}
                        </p>
                      </div>
                    )}

                    {parsed.interview_tips?.length > 0 && (
                      <div className="panel-card p-5 space-y-3 bg-[var(--bg-card)] border border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-emerald-500" />
                          <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            Key Concepts & Diagnostic Tips
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {parsed.interview_tips.map((tip, tipIdx) => (
                            <li key={tipIdx} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. DISCUSSION SPECIFICATIONS */}
                {currentLevel?.mode === 'discussion' && (
                  <div className="space-y-6">
                    {parsed.scenario && (
                      <div className="panel-card p-5 space-y-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                          Architecture / Scenario Context:
                        </span>
                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                          {parsed.scenario}
                        </p>
                      </div>
                    )}

                    {parsed.talking_points?.length > 0 && (
                      <div className="panel-card p-5 space-y-3">
                        <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                          Key Discussion Talking Points:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {parsed.talking_points.map((tp, tpIdx) => (
                            <span key={tpIdx} className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] text-[12px]">
                              • {tp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {parsed.tradeoffs?.length > 0 && (
                      <div className="panel-card p-5 space-y-3 bg-[var(--amber-bg)]/20 border border-[var(--amber)]/30">
                        <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--amber)] block">
                          Tradeoffs & Edge Cases to Challenge:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {parsed.tradeoffs.map((to, toIdx) => (
                            <span key={toIdx} className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--amber)]/40 text-[12px]">
                              ⚠️ {to}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {parsed.interview_tips?.length > 0 && (
                      <div className="panel-card p-5 space-y-3 bg-[var(--bg-card)] border border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-emerald-500" />
                          <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            Interviewer Facilitation & Probing Guide
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {parsed.interview_tips.map((tip, tipIdx) => (
                            <li key={tipIdx} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
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
      {showQuestionModal && currentLevel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-2xl shadow-[var(--shadow-lg)] space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <span className="badge-kicker">Question Configuration • {currentLevel.mode?.toUpperCase()}</span>
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
              {currentLevel.mode === 'coding' && (
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
                      placeholder="e.g. 1 <= nums.length <= 10^5, -10^9 <= nums[i] <= 10^9"
                      className="custom-input font-mono text-[12px]"
                    />
                  </label>

                  <label>
                    <span>Solution Expected Approach</span>
                    <textarea
                      rows="3"
                      value={questionForm.expected_approach}
                      onChange={(e) => setQuestionForm({ ...questionForm, expected_approach: e.target.value })}
                      placeholder="Optimal algorithmic steps (e.g. Single-Pass Hash Map, complement lookup O(N))..."
                      className="custom-input font-ui text-[12px]"
                    />
                  </label>

                  <label>
                    <span>Expected Complexity Target</span>
                    <input
                      type="text"
                      value={questionForm.expected_complexity}
                      onChange={(e) => setQuestionForm({ ...questionForm, expected_complexity: e.target.value })}
                      placeholder="e.g. Time: O(N), Space: O(N)"
                      className="custom-input font-mono text-[12px]"
                    />
                  </label>

                  {/* Progressive Hints */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                        Progressive Hints (Hint 1, Hint 2, ...):
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, hints: [...questionForm.hints, ''] })}
                        className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add Hint
                      </button>
                    </div>

                    {questionForm.hints.map((hint, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[var(--text-muted)] font-bold w-14 shrink-0">
                          Hint #{idx + 1}:
                        </span>
                        <input
                          type="text"
                          placeholder={`Hint ${idx + 1} (e.g. Consider using a Hash Map for O(1) complement lookups)`}
                          value={hint}
                          onChange={(e) => {
                            const updated = [...questionForm.hints];
                            updated[idx] = e.target.value;
                            setQuestionForm({ ...questionForm, hints: updated });
                          }}
                          className="custom-input text-[12px] py-1.5 flex-1"
                        />
                        {questionForm.hints.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = questionForm.hints.filter((_, i) => i !== idx);
                              setQuestionForm({ ...questionForm, hints: updated });
                            }}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Interview Tips for Coding Mode */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                        Interview Tips & Evaluator Notes:
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, interview_tips: [...questionForm.interview_tips, ''] })}
                        className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add Tip
                      </button>
                    </div>

                    {questionForm.interview_tips.map((tip, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Tip ${idx + 1} (e.g. Ask candidate to clarify input constraints before coding)`}
                          value={tip}
                          onChange={(e) => {
                            const updated = [...questionForm.interview_tips];
                            updated[idx] = e.target.value;
                            setQuestionForm({ ...questionForm, interview_tips: updated });
                          }}
                          className="custom-input text-[12px] py-1.5 flex-1"
                        />
                        {questionForm.interview_tips.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = questionForm.interview_tips.filter((_, i) => i !== idx);
                              setQuestionForm({ ...questionForm, interview_tips: updated });
                            }}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

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
              {currentLevel.mode === 'verbal_qa' && (
                <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                  <h4 className="text-[13px] font-bold text-[var(--amber)] font-mono uppercase tracking-wider">
                    Verbal Q&A Specifications
                  </h4>

                  <label>
                    <span>Ideal / Reference Answer (Evaluator Notes)</span>
                    <textarea
                      rows="3"
                      value={questionForm.ideal_answer}
                      onChange={(e) => setQuestionForm({ ...questionForm, ideal_answer: e.target.value })}
                      placeholder="Expected key concepts, technical accuracy points, and architectural tradeoffs..."
                      className="custom-input"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Evaluation Rubrics / Checklist:</span>
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
                          placeholder={`Rubric item ${idx + 1} (e.g. Explains user vs kernel space)`}
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

                  {/* Interview Tips */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Interview Tips & Probing Questions:</span>
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, interview_tips: [...questionForm.interview_tips, ''] })}
                        className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add Tip
                      </button>
                    </div>

                    {questionForm.interview_tips.map((tip, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Tip ${idx + 1} (e.g. Follow up on M:N scheduler work stealing)`}
                          value={tip}
                          onChange={(e) => {
                            const updated = [...questionForm.interview_tips];
                            updated[idx] = e.target.value;
                            setQuestionForm({ ...questionForm, interview_tips: updated });
                          }}
                          className="custom-input text-[12px] py-1.5 flex-1"
                        />
                        {questionForm.interview_tips.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = questionForm.interview_tips.filter((_, i) => i !== idx);
                              setQuestionForm({ ...questionForm, interview_tips: updated });
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
              {currentLevel.mode === 'mcq' && (
                <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                  <h4 className="text-[13px] font-bold text-[var(--green)] font-mono uppercase tracking-wider">
                    MCQ Multiple-Choice Specifications
                  </h4>

                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase block">Answer Choices & Correct Key:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {questionForm.options.map((opt, idx) => (
                        <div key={opt.id} className="flex items-center gap-2 p-2 rounded bg-[var(--bg-input)] border border-[var(--border)]">
                          <input
                            type="radio"
                            name="correct_option"
                            checked={questionForm.correct_option === opt.id}
                            onChange={() => setQuestionForm({ ...questionForm, correct_option: opt.id })}
                            className="accent-[var(--green)]"
                          />
                          <span className="font-mono font-bold text-[12px] text-[var(--text-primary)]">{opt.id}.</span>
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
                            className="custom-input text-[12px] py-1 flex-1 bg-[var(--bg-card)]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <label>
                    <span>Explanation / Solution Rationale</span>
                    <textarea
                      rows="2"
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      placeholder="Why the correct option is right and others are incorrect..."
                      className="custom-input text-[12px]"
                    />
                  </label>

                  {/* Interview Tips */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Diagnostic Tips & Key Takeaways:</span>
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, interview_tips: [...questionForm.interview_tips, ''] })}
                        className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add Tip
                      </button>
                    </div>

                    {questionForm.interview_tips.map((tip, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Tip ${idx + 1} (e.g. Highlight amortized vs worst-case distinction)`}
                          value={tip}
                          onChange={(e) => {
                            const updated = [...questionForm.interview_tips];
                            updated[idx] = e.target.value;
                            setQuestionForm({ ...questionForm, interview_tips: updated });
                          }}
                          className="custom-input text-[12px] py-1.5 flex-1"
                        />
                        {questionForm.interview_tips.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = questionForm.interview_tips.filter((_, i) => i !== idx);
                              setQuestionForm({ ...questionForm, interview_tips: updated });
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

              {/* 4. DISCUSSION MODE */}
              {currentLevel.mode === 'discussion' && (
                <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                  <h4 className="text-[13px] font-bold text-sky-600 font-mono uppercase tracking-wider">
                    Discussion & System Design Specifications
                  </h4>

                  <label>
                    <span>Scenario Context / Scale Target</span>
                    <textarea
                      rows="2"
                      value={questionForm.scenario}
                      onChange={(e) => setQuestionForm({ ...questionForm, scenario: e.target.value })}
                      placeholder="e.g. 100k requests/sec, 99.99% availability SLA, multi-region..."
                      className="custom-input text-[12px]"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Key Discussion Talking Points:</span>
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, talking_points: [...questionForm.talking_points, ''] })}
                        className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add Talking Point
                      </button>
                    </div>

                    {questionForm.talking_points.map((tp, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Talking Point ${idx + 1} (e.g. Consistent Hashing ring & virtual nodes)`}
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Architectural Tradeoffs to Evaluate:</span>
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, tradeoffs: [...questionForm.tradeoffs, ''] })}
                        className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add Tradeoff
                      </button>
                    </div>

                    {questionForm.tradeoffs.map((to, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Tradeoff ${idx + 1} (e.g. Strong Consistency vs High Availability under network partition)`}
                          value={to}
                          onChange={(e) => {
                            const updated = [...questionForm.tradeoffs];
                            updated[idx] = e.target.value;
                            setQuestionForm({ ...questionForm, tradeoffs: updated });
                          }}
                          className="custom-input text-[12px] py-1.5 flex-1"
                        />
                        {questionForm.tradeoffs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = questionForm.tradeoffs.filter((_, i) => i !== idx);
                              setQuestionForm({ ...questionForm, tradeoffs: updated });
                            }}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Interview Tips */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Interviewer Facilitation & Probing Guide:</span>
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, interview_tips: [...questionForm.interview_tips, ''] })}
                        className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" /> Add Tip
                      </button>
                    </div>

                    {questionForm.interview_tips.map((tip, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Tip ${idx + 1} (e.g. Probe on clock skew drift with distributed Redis instances)`}
                          value={tip}
                          onChange={(e) => {
                            const updated = [...questionForm.interview_tips];
                            updated[idx] = e.target.value;
                            setQuestionForm({ ...questionForm, interview_tips: updated });
                          }}
                          className="custom-input text-[12px] py-1.5 flex-1"
                        />
                        {questionForm.interview_tips.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = questionForm.interview_tips.filter((_, i) => i !== idx);
                              setQuestionForm({ ...questionForm, interview_tips: updated });
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
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-sm shadow-[var(--shadow-lg)] space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--red-bg)] text-[var(--red)] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
                Delete {deleteTarget.type === 'track' ? 'Domain' : deleteTarget.type === 'level' ? 'Level' : 'Question'}?
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                Are you sure you want to delete <span className="font-semibold text-[var(--text-primary)]">"{deleteTarget.data.title || deleteTarget.data.name}"</span>?
                {deleteTarget.type === 'track' && ' All levels and questions under this domain will also be deleted.'}
                {deleteTarget.type === 'level' && ' All questions in this level will also be deleted.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={formLoading}
                className="btn text-xs py-2 px-4 bg-[var(--red)] hover:opacity-90 text-white font-semibold rounded-[var(--radius-sm)]"
              >
                {formLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
