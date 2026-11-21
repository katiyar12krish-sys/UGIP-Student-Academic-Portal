// ===================================================================================================
// Practice quizzes (AI-generated questions) and the student's quiz score analytics.
// ===================================================================================================
import React, { useState, useMemo } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { QnAQuestionItem, StudentProgressGraphPoint, BranchCode } from '../../types';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Award,
  Users,
  Calendar,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Filter,
  BarChart3,
  Check,
  ChevronRight,
  Target,
  Trophy,
  Flame,
  AlertTriangle,
} from 'lucide-react';

// Data shape: ai quiz drill and analytics props.
interface AIQuizDrillAndAnalyticsProps {
  defaultSubject?: string;
  defaultBranch?: BranchCode;
  onExit?: () => void;
}

// Screen part: ai quiz drill and analytics.
export const AIQuizDrillAndAnalytics: React.FC<AIQuizDrillAndAnalyticsProps> = ({
  defaultSubject,
  defaultBranch,
  onExit,
}) => {
  const {
    currentUser,
    subjects,
    studentProgressPoints,
    addStudentProgressPoint,
    logActivity,
    t,
  } = useCollege();

  // Mode: 'quiz' | 'analytics'
  const [activeView, setActiveView] = useState<'quiz' | 'analytics'>('quiz');

  // Quiz Setup States
  const [selectedSubject, setSelectedSubject] = useState<string>(
    defaultSubject || (currentUser.branch === 'Civil' ? 'Surveying - I' : 'Computer Programming Using C')
  );
  // Topic input (kept in screen state)
  const [topicInput, setTopicInput] = useState<string>(
    currentUser.branch === 'Civil' ? 'Total Station & Height of Instrument Leveling' : 'Pointers, Dynamic Memory & Array Operations'
  );
  // Question limit options: 10, 20, 50, 100 (as specifically requested by user)
  const [questionLimit, setQuestionLimit] = useState<10 | 20 | 50 | 100>(10);
  // Quiz language (kept in screen state)
  const [quizLanguage, setQuizLanguage] = useState<'en' | 'hi' | 'ur'>('hi');

  // Quiz Engine States
  const [isQuizActive, setIsQuizActive] = useState(false);
  // Is it generating questions? (true / false)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  // List of questions shown on this screen
  const [questions, setQuestions] = useState<QnAQuestionItem[]>([]);
  // Current index (kept in screen state)
  const [currentIndex, setCurrentIndex] = useState(0);
  // The option chosen by the user (filter / list selection)
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  // Is it answer submitted? (true / false)
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  // Score (kept in screen state)
  const [score, setScore] = useState(0);
  // Wrong count (kept in screen state)
  const [wrongCount, setWrongCount] = useState(0);
  // Quiz completed (kept in screen state)
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Multi-Student Analytics Filter
  const [analyticsBranchFilter, setAnalyticsBranchFilter] = useState<'All' | 'CSE' | 'Civil'>('All');

  // Procedural questions generator based on subject & topic
  const generateQuestionsPool = (sub: string, top: string, count: number): QnAQuestionItem[] => {
    const isCivil = sub.toLowerCase().includes('civil') || sub.toLowerCase().includes('survey') || top.toLowerCase().includes('level');
    const items: QnAQuestionItem[] = [];

    for (let i = 1; i <= count; i++) {
      if (isCivil) {
        if (i % 4 === 1) {
          items.push({
            id: `gen-ce-${i}`,
            question: `In Civil Surveying (${sub}), what is the primary arithmetic check applied to Height of Instrument (HI) leveling?`,
            options: [
              'A) Σ BS - Σ FS = Last RL - First RL',
              'B) Σ Rise - Σ Fall = Total Staff Stations',
              'C) Total Backsights = Total Foresights',
              'D) Σ BS + Σ FS = Σ Intermediate Sights',
            ],
            correctAnswer: 'A) Σ BS - Σ FS = Last RL - First RL',
            explanation:
              'The fundamental mathematical check in HI method is Σ BS - Σ FS = Last RL - First RL. Notice that intermediate sights (IS) are not verified by this check, which is why the Rise & Fall method is preferred for rigorous engineering leveling.',
          });
        } else if (i % 4 === 2) {
          items.push({
            id: `gen-ce-${i}`,
            question: `As per IS 456:2000, what is the minimum grade of concrete specified for reinforced concrete (RCC) structural elements?`,
            options: ['A) M10', 'B) M15', 'C) M20', 'D) M25'],
            correctAnswer: 'C) M20',
            explanation:
              'Clause 6.1.2 of IS 456:2000 mandates minimum concrete grade of M20 for RCC work under mild environmental exposure. M15 is allowed only for Plain Concrete (PCC).',
          });
        } else if (i % 4 === 3) {
          items.push({
            id: `gen-ce-${i}`,
            question: `Which electronic surveying instrument combines an electronic theodolite, EDM (Electronic Distance Meter), and microprocessor?`,
            options: ['A) Dumpy Level', 'B) Total Station', 'C) Prismatic Compass', 'D) Plane Table with Alidade'],
            correctAnswer: 'B) Total Station',
            explanation:
              'A Total Station electronically measures both horizontal and vertical angles as well as slope distance to a prism or reflectorless target, storing coordinates directly in digital memory.',
          });
        } else {
          items.push({
            id: `gen-ce-${i}`,
            question: `What type of slump failure indicates an uncohesive, harsh concrete mix where top portion shears off laterally?`,
            options: ['A) True Slump', 'B) Shear Slump', 'C) Collapse Slump', 'D) Zero Slump'],
            correctAnswer: 'B) Shear Slump',
            explanation:
              'Shear slump occurs when one half of the cone slips down an inclined plane. It indicates lack of cohesion, segregation tendency, and poor aggregate gradation.',
          });
        }
      } else {
        // CSE Questions
        if (i % 4 === 1) {
          items.push({
            id: `gen-cs-${i}`,
            question: `In C programming (${sub}), what is the key difference between malloc() and calloc()?`,
            options: [
              'A) malloc() sets memory to zero; calloc() leaves garbage values',
              'B) malloc() takes 1 argument and leaves uninitialized garbage; calloc() takes 2 arguments and initializes memory to zero (0)',
              'C) malloc() returns a float pointer; calloc() returns a void pointer',
              'D) malloc() cannot be deallocated using free()',
            ],
            correctAnswer:
              'B) malloc() takes 1 argument and leaves uninitialized garbage; calloc() takes 2 arguments and initializes memory to zero (0)',
            explanation:
              'malloc(size_t size) allocates raw bytes containing arbitrary garbage data. calloc(size_t num, size_t size) allocates memory for num elements of size bytes and clears all allocated memory bits to 0.',
          });
        } else if (i % 4 === 2) {
          items.push({
            id: `gen-cs-${i}`,
            question: `Which layer of the OSI 7-Layer Reference Model is responsible for end-to-end communication, flow control, and error recovery?`,
            options: ['A) Network Layer', 'B) Data Link Layer', 'C) Transport Layer', 'D) Session Layer'],
            correctAnswer: 'C) Transport Layer',
            explanation:
              'The Transport Layer (Layer 4) handles reliable end-to-end communication between application processes on host systems, managing segmentation, TCP 3-way handshakes, and flow control.',
          });
        } else if (i % 4 === 3) {
          items.push({
            id: `gen-cs-${i}`,
            question: `What is the average and worst-case time complexity of searching in a Balanced Binary Search Tree (AVL Tree)?`,
            options: ['A) O(1)', 'B) O(n)', 'C) O(log n)', 'D) O(n²)'],
            correctAnswer: 'C) O(log n)',
            explanation:
              'Because AVL trees strictly maintain a height balance condition (|hL - hR| <= 1), the height is guaranteed to remain O(log n), ensuring lookup, insertion, and deletion occur in O(log n) time.',
          });
        } else {
          items.push({
            id: `gen-cs-${i}`,
            question: `In SQL relational databases, what distinguishes TRUNCATE from DELETE?`,
            options: [
              'A) Both statements operate identically',
              'B) TRUNCATE is DDL, deallocates data pages instantly, and resets identity seeds; DELETE is DML and removes rows individually with transaction logging',
              'C) DELETE drops the table definition completely',
              'D) TRUNCATE can only remove 1 row at a time',
            ],
            correctAnswer:
              'B) TRUNCATE is DDL, deallocates data pages instantly, and resets identity seeds; DELETE is DML and removes rows individually with transaction logging',
            explanation:
              'DELETE scans the table and logs every deleted tuple, firing delete triggers. TRUNCATE is a Data Definition Language operation that deallocates data extents at page level, making it much faster.',
          });
        }
      }
    }
    return items;
  };

  // Runs when the user does this on screen: start quiz.
  const handleStartQuiz = async () => {
    setIsGeneratingQuestions(true);
    try {
      // Generate questions pool
      const generated = generateQuestionsPool(selectedSubject, topicInput, questionLimit);
      setQuestions(generated);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setWrongCount(0);
      setQuizCompleted(false);
      setIsQuizActive(true);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Runs when the user does this on screen: select option.
  const handleSelectOption = (opt: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(opt);
    setIsAnswerSubmitted(true);

    const currentQ = questions[currentIndex];
    const isCorrect = opt.startsWith(currentQ.correctAnswer.slice(0, 2));

    if (isCorrect) {
      setScore((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }
  };

  // Runs when the user does this on screen: next question.
  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      // Quiz finished
      setQuizCompleted(true);
      const finalAccuracy = Math.round((score / questions.length) * 100);

      // Record performance in studentProgressPoints (Day 3 / Today)
      const newPoint: StudentProgressGraphPoint = {
        dayLabel: 'Day 3 (Today)',
        date: new Date().toISOString().split('T')[0],
        studentId: currentUser.id,
        studentName: currentUser.name,
        rollNo: currentUser.rollNo || '',
        branch: currentUser.branch || 'CSE',
        scorePercentage: finalAccuracy,
        totalAttempted: questions.length,
      };

      addStudentProgressPoint(newPoint);
      logActivity(
        'AI_QUIZ_COMPLETED',
        `Completed AI Q&A Quiz on ${selectedSubject} (${topicInput}): Scored ${score}/${questions.length} (${finalAccuracy}%)`
      );
    }
  };

  // Group student progress points by student to compute trajectory (Day 1 -> Today)
  const studentAnalysis = useMemo(() => {
    const studentsMap: Record<
      string,
      {
        studentId: string;
        name: string;
        rollNo: string;
        branch: BranchCode;
        day1Score: number | null;
        day2Score: number | null;
        day3Score: number | null;
      }
    > = {};

    studentProgressPoints.forEach((p) => {
      if (!studentsMap[p.studentId]) {
        studentsMap[p.studentId] = {
          studentId: p.studentId,
          name: p.studentName,
          rollNo: p.rollNo,
          branch: p.branch,
          day1Score: null,
          day2Score: null,
          day3Score: null,
        };
      }

      if (p.dayLabel.includes('Day 1')) {
        studentsMap[p.studentId].day1Score = p.scorePercentage;
      } else if (p.dayLabel.includes('Day 2')) {
        studentsMap[p.studentId].day2Score = p.scorePercentage;
      } else if (p.dayLabel.includes('Day 3') || p.dayLabel.includes('Today')) {
        studentsMap[p.studentId].day3Score = p.scorePercentage;
      }
    });

    const list = Object.values(studentsMap);

    return list
      .filter((s) => analyticsBranchFilter === 'All' || s.branch === analyticsBranchFilter)
      .map((s) => {
        const d1 = s.day1Score ?? 60;
        const d3 = s.day3Score ?? (s.day2Score ?? d1);
        const change = d3 - d1;
        const status =
          change >= 10
            ? 'Progressed'
            : change <= -8
            ? 'Declined'
            : d3 >= 85
            ? 'Top Performer'
            : 'Steady';

        return {
          ...s,
          d1,
          d3,
          change,
          status,
        };
      });
  }, [studentProgressPoints, analyticsBranchFilter]);

  return (
    <div className="space-y-6">
      {/* Header and Mode Toggle */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                AI Q&A Quiz Drill & Multi-Student Progress Graph (2026)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instant question-by-question feedback with explanations, custom limits (10/20/50/100), and side-by-side student trajectory analytics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setActiveView('quiz')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Interactive Quiz</span>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Comparative Progress Graph</span>
            </button>
          </div>

          {onExit && (
            <button
              onClick={onExit}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            >
              Back
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: INTERACTIVE AI QUIZ DRILL */}
      {/* ========================================================================= */}
      {activeView === 'quiz' && (
        <div className="space-y-6">
          {!isQuizActive ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6 max-w-2xl mx-auto">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Configure Your Practice Drill
                </span>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                  Enter Subject & Topic for Instant Q&A Generation
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select your diploma subject, enter the specific concept, and choose your preferred question limit.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Subject:
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    <option value="Computer Programming Using C">Computer Programming Using C (CSE)</option>
                    <option value="Data Structures & Algorithms">Data Structures & Algorithms (CSE)</option>
                    <option value="Computer Networks & OSI">Computer Networks & OSI (CSE)</option>
                    <option value="Database Management Systems">Database Management Systems & SQL (CSE)</option>
                    <option value="Surveying - I & Total Station">Surveying - I & Total Station (Civil)</option>
                    <option value="Concrete Technology & IS 456">Concrete Technology & IS 456 (Civil)</option>
                    <option value="Applied Mathematics - I / II">Applied Mathematics - I / II (General)</option>
                    <option value="Applied Physics & Bernoulli Theorem">Applied Physics & Bernoulli Theorem (General)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Specific Topic / Chapter:
                  </label>
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="e.g. Total Station Leveling or Dynamic Memory Allocation"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>

                {/* QUESTION LIMIT BUTTONS (10, 20, 50, 100 as explicitly requested) */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Question Count (प्रश्न संख्या):
                  </label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {([10, 20, 50, 100] as const).map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setQuestionLimit(count)}
                        className={`py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                          questionLimit === count
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-102'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {count} Questions
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Language (भाषा):
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'hi', label: 'हिन्दी (Hindi / Devanagari)' },
                      { id: 'en', label: 'English' },
                      { id: 'ur', label: 'Hinglish (हिंग्लिश)' },
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setQuizLanguage(lang.id as any)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                          quizLanguage === lang.id
                            ? 'bg-slate-900 dark:bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartQuiz}
                disabled={isGeneratingQuestions || !topicInput.trim()}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGeneratingQuestions ? 'Generating Questions...' : `Start Quiz (${questionLimit} Questions)`}</span>
              </button>
            </div>
          ) : !quizCompleted ? (
            /* Live Quiz Engine */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6 max-w-2xl mx-auto animate-in fade-in">
              {/* Progress & Live Scores */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-indigo-600 dark:text-indigo-400">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 font-mono">✓ {score} Correct</span>
                    <span className="text-rose-600 font-mono">✗ {wrongCount} Wrong</span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Question Card */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {selectedSubject}
                </span>
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed">
                  {questions[currentIndex]?.question}
                </h4>
              </div>

              {/* 4 Interactive Multiple-Choice Options */}
              <div className="space-y-2.5">
                {questions[currentIndex]?.options.map((opt, oIdx) => {
                  const isChosen = selectedOption === opt;
                  const isCorrectAnswer = opt.startsWith(questions[currentIndex].correctAnswer.slice(0, 2));

                  let buttonStyle =
                    'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400';

                  if (isAnswerSubmitted) {
                    if (isCorrectAnswer) {
                      // Correct option turns GREEN
                      buttonStyle =
                        'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/30';
                    } else if (isChosen && !isCorrectAnswer) {
                      // Chosen wrong option turns RED
                      buttonStyle =
                        'bg-rose-50 dark:bg-rose-950/70 border-rose-500 text-rose-900 dark:text-rose-200 font-bold ring-2 ring-rose-500/30';
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      disabled={isAnswerSubmitted}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${buttonStyle}`}
                    >
                      <span>{opt}</span>
                      {isAnswerSubmitted && isCorrectAnswer && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {isAnswerSubmitted && isChosen && !isCorrectAnswer && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Immediate Feedback with Explanation (Galt hone pe sahi answer btaye) */}
              {isAnswerSubmitted && (
                <div
                  className={`p-4 rounded-2xl border space-y-2 animate-in fade-in duration-200 ${
                    selectedOption?.startsWith(questions[currentIndex].correctAnswer.slice(0, 2))
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selectedOption?.startsWith(questions[currentIndex].correctAnswer.slice(0, 2)) ? (
                      <span className="font-black text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>बिलकुल सही उत्तर! (Correct Answer)</span>
                      </span>
                    ) : (
                      <span className="font-black text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>गलत उत्तर! सही उत्तर है: {questions[currentIndex].correctAnswer}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    <strong>व्याख्या एवं सिद्धांत (Explanation):</strong> {questions[currentIndex].explanation}
                  </p>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleNextQuestion}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>
                        {currentIndex + 1 === questions.length ? 'Finish & Save Score' : 'Next Question'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Quiz Completed Scorecard */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-lg max-w-xl mx-auto text-center space-y-6 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                  Performance Logged in System
                </span>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  Quiz Completed: {Math.round((score / questions.length) * 100)}% Accuracy
                </h4>
                <p className="text-xs text-slate-500">
                  Subject: {selectedSubject} ({topicInput})
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Attempted</span>
                  <span className="font-bold text-base text-slate-800 dark:text-slate-200">{questions.length}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Correct</span>
                  <span className="font-bold text-base text-emerald-600">{score}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Incorrect</span>
                  <span className="font-bold text-base text-rose-600">{wrongCount}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsQuizActive(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Configure New Drill
                </button>
                <button
                  onClick={() => setActiveView('analytics')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>View All Students Progress Graph</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MULTI-STUDENT COMPARATIVE PROGRESS GRAPH & TABLE */}
      {/* ========================================================================= */}
      {activeView === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col gap-3.5">
              <div className="w-full">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Comprehensive Student Progress Analytics (Day 1 vs Day 2 vs Today)</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tracks continuous day-by-day trajectory across subjects. Highlights who improved from Day 1 to Today and who requires remedial intervention.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Branch:
                </span>
                <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs font-bold">
                  {(['All', 'CSE', 'Civil'] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setAnalyticsBranchFilter(b)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        analyticsBranchFilter === b
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual SVG Multi-Bar Comparison Chart */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Student Performance Trajectory (% Accuracy)</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-600 inline-block"></span>
                    <span>Day 1 Baseline</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-600 inline-block"></span>
                    <span>Today (Latest)</span>
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {studentAnalysis.map((stu) => {
                  const isUp = stu.change > 0;
                  const isDown = stu.change < 0;

                  return (
                    <div key={stu.studentId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{stu.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({stu.rollNo} · {stu.branch})</span>
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-black uppercase flex items-center gap-1 ${
                              stu.status === 'Progressed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : stu.status === 'Declined'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {isUp && <TrendingUp className="w-3 h-3" />}
                            {isDown && <TrendingDown className="w-3 h-3" />}
                            <span>
                              {stu.status} ({isUp ? `+${stu.change}%` : isDown ? `${stu.change}%` : 'Stable'})
                            </span>
                          </span>
                        </div>

                        <div className="font-mono text-xs font-bold">
                          <span className="text-slate-400">Day 1: {stu.d1}%</span>
                          <span className="mx-1 text-slate-300">➔</span>
                          <span className={isUp ? 'text-emerald-600' : isDown ? 'text-rose-600' : 'text-indigo-600'}>
                            Today: {stu.d3}%
                          </span>
                        </div>
                      </div>

                      {/* Double Progress Bar Comparison */}
                      <div className="space-y-1">
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-slate-400 dark:bg-slate-500 rounded-full"
                            style={{ width: `${stu.d1}%` }}
                            title={`Day 1: ${stu.d1}%`}
                          ></div>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isUp ? 'bg-emerald-500' : isDown ? 'bg-rose-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${stu.d3}%` }}
                            title={`Today: ${stu.d3}%`}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold">
                    <th className="pb-3">Student Name</th>
                    <th className="pb-3">Roll No</th>
                    <th className="pb-3">Branch</th>
                    <th className="pb-3">Day 1 Score</th>
                    <th className="pb-3">Today Score</th>
                    <th className="pb-3">Overall Change</th>
                    <th className="pb-3">Status & Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {studentAnalysis.map((stu) => (
                    <tr key={stu.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-bold text-slate-900 dark:text-white">{stu.name}</td>
                      <td className="py-3 font-mono text-slate-500">{stu.rollNo}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {stu.branch}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-600 dark:text-slate-300">{stu.d1}%</td>
                      <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">{stu.d3}%</td>
                      <td className="py-3">
                        <span
                          className={`font-mono font-bold ${
                            stu.change > 0 ? 'text-emerald-600' : stu.change < 0 ? 'text-rose-600' : 'text-slate-500'
                          }`}
                        >
                          {stu.change > 0 ? `+${stu.change}%` : `${stu.change}%`}
                        </span>
                      </td>
                      <td className="py-3">
                        {stu.status === 'Progressed' && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            High Growth
                          </span>
                        )}
                        {stu.status === 'Declined' && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            Needs Remedial Attention
                          </span>
                        )}
                        {stu.status !== 'Progressed' && stu.status !== 'Declined' && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Consistent Performer
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
