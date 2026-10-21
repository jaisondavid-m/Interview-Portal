import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FlaskConical,
  BookOpen,
  Code2,
  FileText,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Search,
  X,
  MessageSquareCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  ListOrdered,
  Sparkles,
  Lock,
  Layers,
  Terminal,
  Hash,
  Users
} from 'lucide-react';
import api from '../../api/axios';
import CodeEditor from '../../Components/CodeEditor';
import Pagination from '../../Components/Pagination';
import LabVariantMappingModal from '../../Components/AdminLabs/LabVariantMappingModal';

export default function FacultyLabCourseExperiments() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // Core Data State
  const [course, setCourse] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // View Mode: 'experiments' | 'variants' | 'questions' | 'studio'
  const [currentView, setCurrentView] = useState('experiments');
  const [selectedExp, setSelectedExp] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // Student Variant Allocation Modal
  const [mappingModal, setMappingModal] = useState(false);

  // Experiments Pagination & Search
  const [expSearch, setExpSearch] = useState('');
  const [expPage, setExpPage] = useState(1);
  const [expLimit, setExpLimit] = useState(12);
  const [expTotalPages, setExpTotalPages] = useState(1);
  const [expTotalCount, setExpTotalCount] = useState(0);

  // Variants & Questions Search
  const [variantSearch, setVariantSearch] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  // Active Question Studio Tab
  const [activeStudioTab, setActiveStudioTab] = useState('details'); // 'details' | 'algo' | 'solution' | 'testcases' | 'viva'

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId, expPage, expLimit, expSearch]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/admin/labs/courses/${courseId}/experiments?page=${expPage}&limit=${expLimit}&search=${encodeURIComponent(
          expSearch.trim()
        )}`
      );
      setCourse(res?.course || null);
      const list = res?.experiments || [];
      setExperiments(list);
      setExpTotalCount(res?.total ?? list.length);
      setExpTotalPages(res?.total_pages ?? 1);
    } catch {
      showToast('Failed to load course experiments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExp?.id && currentView === 'variants') {
      fetchVariants(selectedExp);
    }
  }, [selectedExp?.id, variantSearch, currentView]);

  useEffect(() => {
    if (selectedVariant?.id && currentView === 'questions') {
      fetchVariantQuestions(selectedVariant);
    }
  }, [selectedVariant?.id, questionSearch, currentView]);

  const fetchVariants = async (exp) => {
    if (!exp?.id) return;
    setVariantsLoading(true);
    try {
      const res = await api.get(
        `/faculty/labs/experiments/${exp.id}/variants?search=${encodeURIComponent(variantSearch.trim())}`
      );
      setVariants(res?.variants || []);
    } catch {
      showToast('Could not load experiment variants.', 'error');
    } finally {
      setVariantsLoading(false);
    }
  };

  const fetchVariantQuestions = async (variant) => {
    if (!variant?.id) return;
    setQuestionsLoading(true);
    try {
      const res = await api.get(
        `/faculty/labs/variants/${variant.id}/questions?search=${encodeURIComponent(questionSearch.trim())}`
      );
      setQuestions(res?.questions || []);
    } catch {
      showToast('Could not load variant questions.', 'error');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const openExperimentVariants = (exp) => {
    setSelectedExp(exp);
    setSelectedVariant(null);
    setSelectedQuestion(null);
    setVariantSearch('');
    setCurrentView('variants');
  };

  const openVariantQuestions = (variant) => {
    setSelectedVariant(variant);
    setSelectedQuestion(null);
    setQuestionSearch('');
    setCurrentView('questions');
  };

  const openQuestionStudio = (q) => {
    setSelectedQuestion(q);
    setCurrentView('studio');
    setActiveStudioTab('details');
  };

  // Helper parser for algorithms
  const parseAlgorithmSteps = (algo) => {
    if (!algo) return [];
    if (Array.isArray(algo)) return algo;
    try {
      const parsed = JSON.parse(algo);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // split lines
    }
    return String(algo)
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // Helper parser for test cases
  const parseTestCases = (tc) => {
    if (!tc) return [];
    if (Array.isArray(tc)) return tc;
    try {
      const parsed = JSON.parse(tc);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // return empty
    }
    return [];
  };

  const filteredExperiments = experiments.filter((e) => {
    if (!expSearch) return true;
    const term = expSearch.toLowerCase();
    return (
      e.title?.toLowerCase().includes(term) ||
      e.aim?.toLowerCase().includes(term) ||
      String(e.experiment_no).includes(term)
    );
  });

  const filteredVariants = variants.filter((v) => {
    if (!variantSearch) return true;
    const term = variantSearch.toLowerCase();
    return (
      v.variant_code?.toLowerCase().includes(term) ||
      v.title?.toLowerCase().includes(term) ||
      v.description?.toLowerCase().includes(term)
    );
  });

  const filteredQuestions = questions.filter((q) => {
    if (!questionSearch) return true;
    const term = questionSearch.toLowerCase();
    return (
      q.question_code?.toLowerCase().includes(term) ||
      q.title?.toLowerCase().includes(term) ||
      q.aim?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[var(--radius-md)] text-xs font-semibold shadow-lg border flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red-border)]'
              : 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Navigation Breadcrumb Bar */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            onClick={() => navigate('/faculty/labs/curriculum')}
            className="inline-flex items-center gap-1.5 font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-[var(--shadow-sm)] shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            Curriculum
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />

          <button
            onClick={() => {
              setCurrentView('experiments');
              setSelectedExp(null);
              setSelectedVariant(null);
              setSelectedQuestion(null);
            }}
            className={`font-semibold transition-colors cursor-pointer ${
              currentView === 'experiments' ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {course?.course_code || `Course #${courseId}`}
          </button>

          {selectedExp && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <button
                onClick={() => {
                  setCurrentView('variants');
                  setSelectedVariant(null);
                  setSelectedQuestion(null);
                }}
                className={`font-semibold transition-colors cursor-pointer ${
                  currentView === 'variants' ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Exp {selectedExp.experiment_no}
              </button>
            </>
          )}

          {selectedVariant && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <button
                onClick={() => {
                  setCurrentView('questions');
                  setSelectedQuestion(null);
                }}
                className={`font-semibold transition-colors cursor-pointer ${
                  currentView === 'questions' ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Variant {selectedVariant?.variant_code}
              </button>
            </>
          )}

          {selectedQuestion && currentView === 'studio' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <span className="font-mono font-bold text-[var(--accent)]">
                {selectedQuestion.question_code || 'Question'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Faculty Inspector
          </span>
        </div>
      </div>

      {/* ================================================================ */}
      {/* VIEW 1: EXPERIMENTS GRID                                         */}
      {/* ================================================================ */}
      {currentView === 'experiments' && (
        <div className="space-y-6">
          {/* Course Banner */}
          {course && (
            <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                    {course.course_code}
                  </span>
                  {course.semester && (
                    <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)]">
                      {course.degree ? `${course.degree} · ` : ''}
                      {course.semester}
                    </span>
                  )}
                  {(course.regulation || course.academic_year) && (
                    <span className="text-[10px] font-mono text-[var(--accent)] font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] border border-[var(--border-accent)]">
                      {course.regulation ? (course.regulation.toLowerCase().includes('regulation') ? course.regulation : `Regulation ${course.regulation}`) : 'Regulation 2022'}
                    </span>
                  )}
                </div>
                <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
                  {course.title}
                </h1>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  {course.department || 'Practical laboratory problem statements, reference algorithms, and test suites.'}
                </p>
              </div>

              <div className="text-center pr-2 shrink-0">
                <p className="text-[20px] font-bold font-mono text-[var(--text-primary)]">
                  {experiments?.length || 0}
                </p>
                <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Experiments</p>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-xs)]">
            <div className="relative w-full max-w-md flex items-center">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={expSearch}
                onChange={(e) => {
                  setExpSearch(e.target.value);
                  setExpPage(1);
                }}
                placeholder="Search experiments by title, aim, or experiment #..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-8 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
              />
              {expSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setExpSearch('');
                    setExpPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Experiments Cards Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              <span className="text-sm font-medium">Loading experiments...</span>
            </div>
          ) : filteredExperiments.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center space-y-3">
              <Code2 className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                {expSearch ? 'No experiments match your search query.' : 'No experiments found in this lab course.'}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] max-w-md mx-auto">
                {expSearch ? 'Try clearing or modifying your search keywords.' : 'Experiments configured for this course syllabus will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredExperiments.map((exp) => (
                <div
                  key={exp.id}
                  className="group relative bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[var(--radius-lg)] p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                  onClick={() => openExperimentVariants(exp)}
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Exp # + Language */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] font-mono font-bold text-xs flex items-center justify-center">
                          {exp.experiment_no}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase font-semibold">
                          {exp.language || 'python'}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {exp.max_marks || 100} Marks
                      </span>
                    </div>

                    {/* Title & Aim */}
                    <div>
                      <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                        {exp.title}
                      </h3>
                      <p className="text-[12px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                        {exp.aim || 'No problem statement configured for this experiment.'}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <span className="text-[var(--text-primary)] font-semibold flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Variants Catalog
                    </span>
                    <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      View Variants &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Experiments Pagination */}
          {!loading && expTotalCount > 0 && (
            <Pagination
              page={expPage}
              totalPages={expTotalPages}
              totalItems={expTotalCount}
              limit={expLimit}
              onPageChange={(newPage) => setExpPage(newPage)}
              onLimitChange={(newLimit) => {
                setExpLimit(newLimit);
                setExpPage(1);
              }}
              pageSizeOptions={[6, 12, 24, 48]}
            />
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 2: EXPERIMENT VARIANTS CATALOG (Level 2)                     */}
      {/* ================================================================ */}
      {currentView === 'variants' && selectedExp && (
        <div className="space-y-6">
          {/* Experiment Summary Banner */}
          <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                  Experiment {selectedExp.experiment_no}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] uppercase">
                  {selectedExp.language || 'python'}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)]">
                  Max: {selectedExp.max_marks || 100} Marks
                </span>
              </div>
              <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--text-primary)]">
                {selectedExp.title}
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                {selectedExp.aim}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentView('experiments')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                All Experiments
              </button>

              <button
                type="button"
                onClick={() => setMappingModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:opacity-90 text-xs font-bold transition cursor-pointer shadow-[var(--shadow-xs)]"
              >
                <Users className="w-3.5 h-3.5" />
                Map to Students
              </button>
            </div>
          </div>

          {/* Variants Search */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-xs)]">
            <div className="relative w-full max-w-md flex items-center">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={variantSearch}
                onChange={(e) => setVariantSearch(e.target.value)}
                placeholder="Search variants by code, title, or description..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-8 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
              />
              {variantSearch && (
                <button
                  type="button"
                  onClick={() => setVariantSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Variants Grid */}
          {variantsLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              <span className="text-sm font-medium">Loading experiment variants...</span>
            </div>
          ) : filteredVariants.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center space-y-3">
              <Layers className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                {variantSearch ? 'No variants match your search keyword.' : 'No variants created for this experiment.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVariants.map((v) => {
                const qCount = v.questions_count ?? 0;
                return (
                  <div
                    key={v.id}
                    className="group relative bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[var(--radius-lg)] p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    onClick={() => openVariantQuestions(v)}
                  >
                    <div className="space-y-3.5">
                      {/* Code Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono font-bold text-[12px] px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                          Variant {v.variant_code}
                        </span>

                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {qCount} {qCount === 1 ? 'Question' : 'Questions'}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                          {v.title}
                        </h3>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                          {v.description || 'Custom problem variant with curated questions and test cases.'}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMappingModal(true);
                        }}
                        className="text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 transition"
                      >
                        <Users className="w-3 h-3" />
                        Map Students
                      </button>

                      <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Explore Questions &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 3: QUESTIONS LIST INSIDE VARIANT (Level 3)                   */}
      {/* ================================================================ */}
      {currentView === 'questions' && selectedVariant && (
        <div className="space-y-6">
          {/* Variant Summary Banner */}
          <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                  Exp {selectedExp?.experiment_no} · Variant {selectedVariant?.variant_code}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] uppercase">
                  {selectedExp?.language || 'python'}
                </span>
              </div>
              <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--text-primary)]">
                {selectedVariant?.title}
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                {selectedVariant?.description || 'Questions assigned to students allocated to this variant.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentView('variants')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                All Variants
              </button>

              <button
                type="button"
                onClick={() => setMappingModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:opacity-90 text-xs font-bold transition cursor-pointer shadow-[var(--shadow-xs)]"
              >
                <Users className="w-3.5 h-3.5" />
                Map to Students
              </button>
            </div>
          </div>

          {/* Questions Search */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-xs)]">
            <div className="relative w-full max-w-md flex items-center">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                placeholder="Search questions by code, title, or aim..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-8 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
              />
              {questionSearch && (
                <button
                  type="button"
                  onClick={() => setQuestionSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Questions Grid */}
          {questionsLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              <span className="text-sm font-medium">Loading questions for Variant {selectedVariant?.variant_code}...</span>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                {questionSearch
                  ? 'No questions match your search keyword.'
                  : `No questions found under Variant ${selectedVariant?.variant_code}.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredQuestions.map((q) => {
                const sampleCount = parseTestCases(q.sample_test_cases).length;
                const hiddenCount = parseTestCases(q.hidden_test_cases).length;
                const vivaCount = (q.viva_questions || []).length;

                return (
                  <div
                    key={q.id}
                    className="group relative bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[var(--radius-lg)] p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    onClick={() => openQuestionStudio(q)}
                  >
                    <div className="space-y-3.5">
                      {/* Code Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                          {q.question_code || 'Question'}
                        </span>

                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase font-semibold">
                          {q.language || selectedExp?.language || 'python'}
                        </span>
                      </div>

                      {/* Title & Aim */}
                      <div>
                        <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                          {q.title}
                        </h3>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                          {q.aim || 'No specific objective provided.'}
                        </p>
                      </div>

                      {/* Feature Badges */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] flex items-center gap-1">
                          <Code2 className="w-3 h-3 text-[var(--accent)]" />
                          {sampleCount + hiddenCount} Test Cases
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] flex items-center gap-1">
                          <MessageSquareCheck className="w-3 h-3 text-indigo-500" />
                          {vivaCount} Viva Qns
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                      <span className="text-[var(--text-secondary)] font-semibold">
                        {q.max_marks || 100} Marks
                      </span>
                      <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Inspect Details &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 4: QUESTION INSPECTOR STUDIO (Level 4 Read-Only)            */}
      {/* ================================================================ */}
      {currentView === 'studio' && selectedQuestion && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-[12px] px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                  {selectedQuestion.question_code || 'QUESTION'}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Exp {selectedExp?.experiment_no} · Variant {selectedVariant?.variant_code}: {selectedVariant?.title}
                </span>
              </div>
              <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)]">
                {selectedQuestion.title}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setCurrentView('questions')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-xs text-[var(--text-primary)] font-medium transition cursor-pointer self-start md:self-auto shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Questions
            </button>
          </div>

          {/* Tabs Bar */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
            {[
              { id: 'details', label: '1. Problem & Aim', icon: FileText },
              { id: 'algo', label: '2. Reference Algorithm', icon: ListOrdered },
              { id: 'solution', label: '3. Reference Solution Code', icon: Code2 },
              { id: 'testcases', label: '4. Test Cases Suite', icon: Terminal },
              { id: 'viva', label: '5. Oral Viva Questions Pool', icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeStudioTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveStudioTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-xs)] font-bold'
                      : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: Problem Details & Aim */}
          {activeStudioTab === 'details' && (
            <div className="panel-card p-6 space-y-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)]">
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Question Code</span>
                  <span className="font-mono font-bold text-[13px] text-[var(--accent)] mt-0.5 block">{selectedQuestion.question_code}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Target Language</span>
                  <span className="font-mono font-bold text-[13px] text-[var(--text-primary)] uppercase mt-0.5 block">{selectedQuestion.language || 'python'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Max Marks</span>
                  <span className="font-mono font-bold text-[13px] text-[var(--text-primary)] mt-0.5 block">{selectedQuestion.max_marks || 100} Marks</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Viva Questions Count</span>
                  <span className="font-mono font-bold text-[13px] text-[var(--text-primary)] mt-0.5 block">{(selectedQuestion.viva_questions || []).length} Questions</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Title / Problem Heading</h3>
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)]">
                  {selectedQuestion.title}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Aim & Problem Statement</h3>
                <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {selectedQuestion.aim}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Reference Algorithm / Steps */}
          {activeStudioTab === 'algo' && (
            <div className="panel-card p-6 space-y-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
              <div className="pb-3 border-b border-[var(--border)]">
                <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-[var(--accent)]" />
                  Step-by-Step Computational Algorithm
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Standard algorithmic progression and expected pseudocode logic for student verification.
                </p>
              </div>

              {parseAlgorithmSteps(selectedQuestion.reference_algorithm).length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] italic">
                  No reference algorithm specified for this question.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {parseAlgorithmSteps(selectedQuestion.reference_algorithm).map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border)] flex items-start gap-3.5"
                    >
                      <span className="w-6 h-6 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-[var(--text-primary)] leading-relaxed pt-0.5">
                        {typeof step === 'string' ? step : JSON.stringify(step)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Reference Solution Code */}
          {activeStudioTab === 'solution' && (
            <div className="panel-card p-6 space-y-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
              <div className="pb-3 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[var(--accent)]" />
                    Faculty Reference Solution Code
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Official faculty reference implementation for validating algorithmic syntax and sandbox test suites.
                  </p>
                </div>

                <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] font-bold">
                  {selectedQuestion.language || 'python'}
                </span>
              </div>

              <div className="border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden h-[380px]">
                <CodeEditor
                  code={selectedQuestion.solution_code || '# No reference solution code uploaded'}
                  value={selectedQuestion.solution_code || '# No reference solution code uploaded'}
                  language={selectedQuestion.language || 'python'}
                  isEditable={false}
                  height="380px"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Test Cases Suite */}
          {activeStudioTab === 'testcases' && (
            <div className="space-y-6">
              {/* Sample Test Cases */}
              <div className="panel-card p-6 space-y-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
                <div className="pb-3 border-b border-[var(--border)] flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-500" />
                      Sample Test Cases (Visible to Students)
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Public examples given to students to understand input-output formatting.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {parseTestCases(selectedQuestion.sample_test_cases).length} Cases
                  </span>
                </div>

                {parseTestCases(selectedQuestion.sample_test_cases).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic">No sample test cases configured.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parseTestCases(selectedQuestion.sample_test_cases).map((tc, idx) => (
                      <div key={idx} className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border)] space-y-3">
                        <span className="font-mono font-bold text-xs text-[var(--accent)] block">Sample #{idx + 1}</span>
                        <div>
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">Standard Input:</span>
                          <pre className="p-2.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] overflow-x-auto whitespace-pre-wrap">
                            {tc.input || '(Empty input)'}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">Expected Output:</span>
                          <pre className="p-2.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono text-emerald-500 font-bold overflow-x-auto whitespace-pre-wrap">
                            {tc.expected_output || '(Empty output)'}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hidden Test Cases */}
              <div className="panel-card p-6 space-y-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
                <div className="pb-3 border-b border-[var(--border)] flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-500" />
                      Hidden Test Cases (Blind Grading Suite)
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Rigorous boundary cases executed during final student submission assessment.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    {parseTestCases(selectedQuestion.hidden_test_cases).length} Cases
                  </span>
                </div>

                {parseTestCases(selectedQuestion.hidden_test_cases).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic">No hidden test cases configured.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parseTestCases(selectedQuestion.hidden_test_cases).map((tc, idx) => (
                      <div key={idx} className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border)] space-y-3">
                        <span className="font-mono font-bold text-xs text-amber-500 block">Hidden Case #{idx + 1}</span>
                        <div>
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">Standard Input:</span>
                          <pre className="p-2.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] overflow-x-auto whitespace-pre-wrap">
                            {tc.input || '(Empty input)'}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">Expected Output:</span>
                          <pre className="p-2.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono text-emerald-500 font-bold overflow-x-auto whitespace-pre-wrap">
                            {tc.expected_output || '(Empty output)'}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Oral Viva Questions Pool */}
          {activeStudioTab === 'viva' && (
            <div className="panel-card p-6 space-y-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
              <div className="pb-3 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                    Oral Viva Voce Question Bank
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Curated viva questions and reference answers for lab incharge oral examinations.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  {(selectedQuestion.viva_questions || []).length} Viva Questions
                </span>
              </div>

              {(selectedQuestion.viva_questions || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] italic">
                  No oral viva questions configured for this question.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {(selectedQuestion.viva_questions || []).map((vq, idx) => (
                    <div
                      key={vq.id || idx}
                      className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border)] space-y-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] leading-snug pt-0.5">
                          {vq.question}
                        </h4>
                      </div>

                      {vq.answer && (
                        <div className="ml-8 p-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">
                            Reference Answer / Key Points:
                          </span>
                          {vq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Student Variant Allocation Modal */}
      {mappingModal && selectedExp && (
        <LabVariantMappingModal
          isOpen={mappingModal}
          onClose={() => setMappingModal(false)}
          courseId={courseId}
          experiment={selectedExp}
          onSuccess={() => {
            if (selectedExp) fetchVariants(selectedExp);
          }}
        />
      )}
    </div>
  );
}
