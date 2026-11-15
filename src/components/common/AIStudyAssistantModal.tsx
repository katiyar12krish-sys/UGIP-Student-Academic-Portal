// ===================================================================================================
// AI study helper: a student asks a question about a subject and gets an explanation.
// ===================================================================================================
import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Brain,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Award,
  Zap,
  HelpCircle,
  X,
} from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';

// Data shape: ai study assistant modal props.
interface AIStudyAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UBTER_QUIZ_BANKS = [
  {
    question: 'Which theorem states that total mechanical energy remains constant in steady streamline flow of an incompressible non-viscous fluid?',
    options: ["Bernoulli's Theorem", "Pascal's Law", "Archimedes' Principle", "Hooke's Law"],
    correctIdx: 0,
    explanation: "Bernoulli's Theorem: P/ρg + v²/2g + z = Constant. Tested frequently in UBTER diploma exams.",
  },
  {
    question: 'In Integration by Parts, what rule decides the priority for choosing the first function u(x)?',
    options: ['BODMAS Rule', 'ILATE Rule (Inverse, Log, Algebraic, Trig, Exponential)', 'Right Hand Thumb Rule', 'Cramer Rule'],
    correctIdx: 1,
    explanation: 'ILATE dictates priority: Inverse Trigonometric > Logarithmic > Algebraic > Trigonometric > Exponential.',
  },
  {
    question: 'What is the time complexity of searching an element in a sorted array of size N using Binary Search?',
    options: ['O(N²)', 'O(N)', 'O(log N)', 'O(1)'],
    correctIdx: 2,
    explanation: 'Binary Search halves the search space at each iteration, resulting in O(log N) time complexity.',
  },
];

// Screen part: ai study assistant modal.
export const AIStudyAssistantModal: React.FC<AIStudyAssistantModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, subjects, getStudentAttendanceStats, getStudentAcademicSummary, getWeakStudentsAnalysis } = useCollege();
  // The subject id chosen by the user (filter / list selection)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  // Which tab is open right now
  const [activeTab, setActiveTab] = useState<'high-frequency' | 'ai-diagnostic' | 'practice-quiz'>('high-frequency');

  // Current quiz idx (kept in screen state)
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  // Quiz answer selected (kept in screen state)
  const [quizAnswerSelected, setQuizAnswerSelected] = useState<number | null>(null);
  // Score (kept in screen state)
  const [score, setScore] = useState(0);
  // Quiz completed (kept in screen state)
  const [quizCompleted, setQuizCompleted] = useState(false);

  if (!isOpen) return null;

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const attendanceStats = getStudentAttendanceStats(currentUser.id);
  const academicSummary = getStudentAcademicSummary(currentUser.id);
  const weaknessList = getWeakStudentsAnalysis();
  const myWeakness = weaknessList.find((w) => w.studentId === currentUser.id);

  const currentQuestion = UBTER_QUIZ_BANKS[currentQuizIdx] || UBTER_QUIZ_BANKS[0];

  // Runs when the user does this on screen: select quiz option.
  const handleSelectQuizOption = (idx: number) => {
    if (quizAnswerSelected !== null) return;
    setQuizAnswerSelected(idx);
    if (idx === currentQuestion.correctIdx) setScore((prev) => prev + 1);
  };

  // Runs when the user does this on screen: next quiz question.
  const handleNextQuizQuestion = () => {
    if (currentQuizIdx + 1 < UBTER_QUIZ_BANKS.length) {
      setCurrentQuizIdx((prev) => prev + 1);
      setQuizAnswerSelected(null);
    } else {
      setQuizCompleted(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">AI Academic Diagnostic & Exam Coach</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-400/20 text-indigo-200 border border-indigo-400/30">
                  UBTER AI Engine
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Uttarakhand Government Institute of Polytechnic · Personalized Academic Guidance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Controls & Subject Selector */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-white"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  [{sub.branch} Sem {sub.semester}] {sub.code} - {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('high-frequency')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'high-frequency' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              High-Frequency Topics
            </button>
            <button
              onClick={() => setActiveTab('ai-diagnostic')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ai-diagnostic' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              Cognitive Diagnostic
            </button>
            <button
              onClick={() => setActiveTab('practice-quiz')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'practice-quiz' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Practice Quiz
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
          {/* Tab "high-frequency" */}
          {activeTab === 'high-frequency' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSubject?.importantTopics?.map((topic, idx) => (
                  <div
                    key={topic.id || idx}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                          {topic.chapter}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{topic.title}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        ~{topic.weightageMarks} Marks
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg">
                      {topic.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab "ai-diagnostic" */}
          {activeTab === 'ai-diagnostic' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Attendance Health</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{attendanceStats.overallPercent}%</div>
                  <div className="mt-2 text-xs">
                    {attendanceStats.overallPercent >= 75 ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Eligible for UBTER Admit Card
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Below 75% Board Minimum
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sessional Exam Avg</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{academicSummary.avgMarksPercent}%</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Academic Risk Level</div>
                  <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">
                    {myWeakness ? myWeakness.riskLevel : 'Low Risk'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab "practice-quiz" */}
          {activeTab === 'practice-quiz' && (
            <div className="max-w-2xl mx-auto space-y-4">
              {!quizCompleted ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      Question {currentQuizIdx + 1} of {UBTER_QUIZ_BANKS.length}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Score: <span className="text-indigo-600 dark:text-indigo-400 font-mono">{score}</span> / {UBTER_QUIZ_BANKS.length}
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                    {currentQuestion.question}
                  </h4>

                  <div className="space-y-2.5 pt-1">
                    {currentQuestion.options.map((opt, idx) => (
                      <button
                        key={idx}
                        disabled={quizAnswerSelected !== null}
                        onClick={() => handleSelectQuizOption(idx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          quizAnswerSelected !== null
                            ? idx === currentQuestion.correctIdx
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-semibold'
                              : quizAnswerSelected === idx
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-950 dark:text-rose-200 font-semibold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
                        }`}
                      >
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>

                  {quizAnswerSelected !== null && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleNextQuizQuestion}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <span>{currentQuizIdx + 1 < UBTER_QUIZ_BANKS.length ? 'Next Question' : 'Complete Quiz'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-xs text-center space-y-4">
                  <Award className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mx-auto" />
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Quiz Complete! Score: {score} / {UBTER_QUIZ_BANKS.length}
                  </h3>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
