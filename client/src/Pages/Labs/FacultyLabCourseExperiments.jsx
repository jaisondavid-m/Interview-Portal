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
  Hash
} from 'lucide-react';
import api from '../../api/axios';
import CodeEditor from '../../Components/CodeEditor';
import Pagination from '../../Components/Pagination';

export default function FacultyLabCourseExperiments() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // Core Data State
  const [course, setCourse] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // View Mode: 'experiments' | 'variants' | 'studio'
  const [currentView, setCurrentView] = useState('experiments');
  const [selectedExp, setSelectedExp] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Experiments Pagination & Search
  const [expSearch, setExpSearch] = useState('');
  const [expPage, setExpPage] = useState(1);
  const [expLimit, setExpLimit] = useState(12);
  const [expTotalPages, setExpTotalPages] = useState(1);
  const [expTotalCount, setExpTotalCount] = useState(0);

  // Variants Pagination & Search
  const [variantSearch, setVariantSearch] = useState('');
  const [varPage, setVarPage] = useState(1);
  const [varLimit, setVarLimit] = useState(10);
  const [varTotalPages, setVarTotalPages] = useState(1);
  const [varTotalCount, setVarTotalCount] = useState(0);

  // Active Variant Studio Tab
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
  }, [selectedExp?.id, varPage, varLimit, variantSearch, currentView]);

  const fetchVariants = async (exp) => {
    if (!exp?.id) return;
    setVariantsLoading(true);
    try {
      const res = await api.get(
        `/admin/labs/experiments/${exp.id}/variants?page=${varPage}&limit=${varLimit}&search=${encodeURIComponent(
          variantSearch.trim()
        )}`
      );
      const varList = res?.variants || [];
      setVarTotalCount(res?.total ?? varList.length);
      setVarTotalPages(res?.total_pages ?? 1);
      if (varList.length > 0) {
        setVariants(varList);
      } else {
        // Fallback default variant based on experiment info
        const defaultVar = {
          id: 0,
          experiment_id: exp.id,
          course_id: exp.course_id,
          question_code: `EX${exp.experiment_no}_VAR_A`,
          title: exp.title,
          aim: exp.aim,
          reference_algorithm: exp.procedure || '["Step 1: Read problem input.", "Step 2: Compute result.", "Step 3: Output formatted answer."]',
          solution_code: exp.starter_code || '# Faculty Reference Solution\n',
          language: exp.language || 'python',
          sample_test_cases: exp.sample_test_cases || '[]',
          hidden_test_cases: exp.hidden_test_cases || '[]',
          max_marks: exp.max_marks || 100,
          viva_questions: [],
        };
        setVariants([defaultVar]);
      }
    } catch {
      showToast('Could not load question variants.', 'error');
    } finally {
      setVariantsLoading(false);
    }
  };

  const openExperimentVariants = (exp) => {
    setSelectedExp(exp);
    setVarPage(1);
    setVariantSearch('');
    setCurrentView('variants');
  };

  const openVariantStudio = (v) => {
    setSelectedVariant(v);
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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/30'
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
                }}
                className={`font-semibold transition-colors cursor-pointer ${
                  currentView === 'variants' ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Exp {selectedExp.experiment_no}
              </button>
            </>
          )}

          {selectedVariant && currentView === 'studio' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <span className="font-mono font-bold text-[var(--accent)]">
                {selectedVariant.question_code || 'Variant'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Read-Only Inspector
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
          ) : experiments.length === 0 ? (
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
              {experiments.map((exp) => (
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
                      Explore Variants
                    </span>
                    <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Inspect &rarr;
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
      {/* VIEW 2: QUESTION VARIANTS CATALOG                                */}
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

            <button
              type="button"
              onClick={() => setCurrentView('experiments')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-xs text-[var(--text-primary)] font-medium transition cursor-pointer self-start sm:self-auto shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Experiments
            </button>
          </div>

          {/* Variants Search */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-xs)]">
            <div className="relative w-full max-w-md flex items-center">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={variantSearch}
                onChange={(e) => {
                  setVariantSearch(e.target.value);
                  setVarPage(1);
                }}
                placeholder="Search question variants by code, title, or aim..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-8 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
              />
              {variantSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setVariantSearch('');
                    setVarPage(1);
                  }}
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
              <span className="text-sm font-medium">Loading question variants...</span>
            </div>
          ) : variants.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                {variantSearch ? 'No question variants match your search keyword.' : 'No variants created for this experiment.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {variants.map((v, idx) => {
                const sampleCount = parseTestCases(v.sample_test_cases).length;
                const hiddenCount = parseTestCases(v.hidden_test_cases).length;
                const vivaCount = (v.viva_questions || []).length;

                return (
                  <div
                    key={v.id || idx}
                    className="group relative bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[var(--radius-lg)] p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    onClick={() => openVariantStudio(v)}
                  >
                    <div className="space-y-3.5">
                      {/* Code Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                          {v.question_code || `VAR_${String.fromCharCode(65 + idx)}`}
                        </span>

                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase font-semibold">
                          {v.language || selectedExp.language || 'python'}
                        </span>
                      </div>

                      {/* Title & Aim */}
                      <div>
                        <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                          {v.title || `Variant ${String.fromCharCode(65 + idx)}`}
                        </h3>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                          {v.aim || 'No specific objective provided.'}
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
                        {v.max_marks || 100} Marks
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

          {/* Variants Pagination */}
          {!variantsLoading && varTotalCount > 0 && (
            <Pagination
              page={varPage}
              totalPages={varTotalPages}
              totalItems={varTotalCount}
              limit={varLimit}
              onPageChange={(newPage) => setVarPage(newPage)}
              onLimitChange={(newLimit) => {
                setVarLimit(newLimit);
                setVarPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 3: VARIANT INSPECTOR STUDIO (100% READ-ONLY)                */}
      {/* ================================================================ */}
      {currentView === 'studio' && selectedVariant && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-[12px] px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                  {selectedVariant.question_code || 'VARIANT'}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Exp {selectedExp?.experiment_no}: {selectedExp?.title}
                </span>
              </div>
              <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)]">
                {selectedVariant.title}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setCurrentView('variants')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-xs text-[var(--text-primary)] font-medium transition cursor-pointer self-start md:self-auto shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Variants List
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
                  <span className="font-mono font-bold text-[13px] text-[var(--accent)] mt-0.5 block">{selectedVariant.question_code}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Target Language</span>
                  <span className="font-mono font-bold text-[13px] text-[var(--text-primary)] uppercase mt-0.5 block">{selectedVariant.language || 'python'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Max Marks</span>
                  <span className="font-mono font-bold text-[13px] text-[var(--text-primary)] mt-0.5 block">{selectedVariant.max_marks || 100} Marks</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Viva Questions Count</span>
                  <span className="font-mono font-bold text-[13px] text-[var(--text-primary)] mt-0.5 block">{selectedVariant.viva_questions_count || 5} Questions</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Title / Problem Heading</h3>
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)]">
                  {selectedVariant.title}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Aim & Problem Statement</h3>
                <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {selectedVariant.aim}
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

              {parseAlgorithmSteps(selectedVariant.reference_algorithm).length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] italic">
                  No reference algorithm specified for this variant.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {parseAlgorithmSteps(selectedVariant.reference_algorithm).map((step, idx) => (
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
                  {selectedVariant.language || 'python'}
                </span>
              </div>

              <div className="border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden h-[380px]">
                <CodeEditor
                  code={selectedVariant.solution_code || '# No reference solution code uploaded'}
                  value={selectedVariant.solution_code || '# No reference solution code uploaded'}
                  language={selectedVariant.language || 'python'}
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
                    {parseTestCases(selectedVariant.sample_test_cases).length} Cases
                  </span>
                </div>

                {parseTestCases(selectedVariant.sample_test_cases).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic">No sample test cases configured.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parseTestCases(selectedVariant.sample_test_cases).map((tc, idx) => (
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
                    {parseTestCases(selectedVariant.hidden_test_cases).length} Cases
                  </span>
                </div>

                {parseTestCases(selectedVariant.hidden_test_cases).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic">No hidden test cases configured.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parseTestCases(selectedVariant.hidden_test_cases).map((tc, idx) => (
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
                  {(selectedVariant.viva_questions || []).length} Viva Questions
                </span>
              </div>

              {(selectedVariant.viva_questions || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] italic">
                  No oral viva questions configured for this variant.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {(selectedVariant.viva_questions || []).map((vq, idx) => (
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
    </div>
  );
}
