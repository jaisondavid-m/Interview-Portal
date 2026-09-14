import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Plus } from 'lucide-react';
import api from '../api/axios';
import {
  TrackListView,
  LevelListView,
  QuestionListView,
  QuestionDetailView,
  TrackModal,
  LevelModal,
  QuestionFormModal,
  DeleteConfirmModal,
  formatLevelName,
  formatFullLevelTitle,
} from '../Components/AdminInterview';

export default function AdminInterviewConfig() {
  const { trackId, levelId, questionId } = useParams();
  const navigate = useNavigate();

  // Core Data State
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form States
  const [trackForm, setTrackForm] = useState({ id: null, title: '', icon: 'Code', description: '' });
  const [levelForm, setLevelForm] = useState({ id: null, level_number: 1, name: '', description: '', mode: 'coding', duration_minutes: 45 });
  const [questionForm, setQuestionForm] = useState({
    id: null,
    title: '',
    prompt: '',
    difficulty: 'Medium',
    type: 'coding',
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

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // ============================================================
  // DATA FETCHING FUNCTIONS
  // ============================================================
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

  // ============================================================
  // FORM HANDLERS
  // ============================================================
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

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!levelId || !currentLevel) return;
    setFormError('');
    setFormLoading(true);

    try {
      const tips = (questionForm.interview_tips || []).filter((t) => t.trim());
      const openTCs = (questionForm.open_test_cases || [])
        .filter((tc) => tc.input || tc.output)
        .map((tc, idx) => ({
          input: tc.input,
          expected_output: tc.output,
          is_hidden: false,
          order_index: idx + 1,
        }));

      const hiddenTCs = (questionForm.hidden_test_cases || [])
        .filter((tc) => tc.input || tc.output)
        .map((tc, idx) => ({
          input: tc.input,
          expected_output: tc.output,
          is_hidden: true,
          order_index: openTCs.length + idx + 1,
        }));

      const hintsList = [
        ...(questionForm.hints || []).filter((h) => h.trim()).map((h, i) => ({ type: 'hint', content: h.trim(), order_index: i + 1 })),
        ...(questionForm.interview_tips || []).filter((t) => t.trim()).map((t, i) => ({ type: 'interview_tip', content: t.trim(), order_index: i + 1 })),
        ...(questionForm.rubrics || []).filter((r) => r.trim()).map((r, i) => ({ type: 'rubric', content: r.trim(), order_index: i + 1 })),
        ...(questionForm.talking_points || []).filter((tp) => tp.trim()).map((tp, i) => ({ type: 'talking_point', content: tp.trim(), order_index: i + 1 })),
        ...(questionForm.tradeoffs || []).filter((tr) => tr.trim()).map((tr, i) => ({ type: 'tradeoff', content: tr.trim(), order_index: i + 1 })),
      ];

      const mcqOpts = (questionForm.options || []).map((opt) => ({
        option_key: opt.id,
        option_text: opt.text,
        is_correct: opt.id === questionForm.correct_option,
      }));

      const postBody = {
        title: questionForm.title,
        prompt: questionForm.prompt,
        difficulty: questionForm.difficulty,
        type: currentLevel.mode,
        detail: {
          constraints: questionForm.constraints || '',
          expected_approach: questionForm.expected_approach || '',
          expected_complexity: questionForm.expected_complexity || '',
          ideal_answer: questionForm.ideal_answer || '',
          scenario: questionForm.scenario || '',
          correct_option: questionForm.correct_option || '',
          explanation: questionForm.explanation || '',
        },
        templates: [
          { language: 'javascript', starter_code: questionForm.starter_code || '' },
        ],
        test_cases: [...openTCs, ...hiddenTCs],
        hints: hintsList,
        mcq_options: mcqOpts,
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

  return (
    <div className="space-y-6">
      {/* Header with Interactive Breadcrumbs */}
      <div className={`${questionId ? 'pb-2' : 'pb-5 border-b border-[var(--border)]'} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          {/* Breadcrumbs */}
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

        {/* Action Buttons for non-detail views */}
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
                  onClick={() => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions/new`)}
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

      {/* VIEW 1: Track List */}
      {!trackId && (
        <TrackListView
          tracks={tracks}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectTrack={(track) => navigate(`/admin/interviews/${track.id}/levels`)}
          onEditTrack={(track) => {
            setTrackForm({
              id: track.id,
              title: track.title,
              icon: track.icon,
              description: track.description,
            });
            setFormError('');
            setShowTrackModal(true);
          }}
          onDeleteTrack={(track) => {
            setDeleteTarget({ type: 'track', data: track });
            setShowDeleteModal(true);
          }}
        />
      )}

      {/* VIEW 2: Level List */}
      {trackId && !levelId && (
        <LevelListView
          currentTrack={currentTrack}
          levels={levels}
          onSelectLevel={(level) => navigate(`/admin/interviews/${trackId}/levels/${level.id}/questions`)}
          onCreateLevel={() => {
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
          onEditLevel={(level) => {
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
          onDeleteLevel={(level) => {
            setDeleteTarget({ type: 'level', data: level });
            setShowDeleteModal(true);
          }}
        />
      )}

      {/* VIEW 3: Question List */}
      {trackId && levelId && !questionId && (
        <QuestionListView
          currentLevel={currentLevel}
          questions={questions}
          onSelectQuestion={(q) => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions/${q.id}`)}
          onAddQuestion={() => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions/new`)}
          onEditQuestion={(q) => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions/${q.id}/edit`)}
          onDeleteQuestion={(q) => {
            setDeleteTarget({ type: 'question', data: q });
            setShowDeleteModal(true);
          }}
        />
      )}

      {/* VIEW 4: Question Details */}
      {trackId && levelId && questionId && (
        <QuestionDetailView
          currentQuestion={currentQuestion}
          currentLevel={currentLevel}
          trackId={trackId}
          levelId={levelId}
          onBack={() => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions`)}
          onEdit={() => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions/${currentQuestion.id}/edit`)}
          onDelete={() => {
            setDeleteTarget({ type: 'question', data: currentQuestion });
            setShowDeleteModal(true);
          }}
        />
      )}

      {/* MODALS */}
      <TrackModal
        isOpen={showTrackModal}
        onClose={() => setShowTrackModal(false)}
        trackForm={trackForm}
        setTrackForm={setTrackForm}
        onSave={handleSaveTrack}
        formError={formError}
        formLoading={formLoading}
      />

      <LevelModal
        isOpen={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        levelForm={levelForm}
        setLevelForm={setLevelForm}
        onSave={handleSaveLevel}
        formError={formError}
        formLoading={formLoading}
      />

      <QuestionFormModal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        currentLevel={currentLevel}
        questionForm={questionForm}
        setQuestionForm={setQuestionForm}
        onSave={handleSaveQuestion}
        formError={formError}
        formLoading={formLoading}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        deleteTarget={deleteTarget}
        onConfirm={handleConfirmDelete}
        formLoading={formLoading}
      />
    </div>
  );
}
