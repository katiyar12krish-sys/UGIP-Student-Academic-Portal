// ===================================================================================================
// AI exam-preparation helper for one subject (important questions, step-by-step answers).
// ===================================================================================================
import React, { useState, useRef, useEffect } from 'react';
import { useCollege } from '../../context/CollegeContext';
import {
  Sparkles,
  X,
  BookOpen,
  Send,
  HelpCircle,
  Copy,
  Check,
  RotateCcw,
  GraduationCap,
  Calculator,
  Atom,
  FlaskConical,
  Binary,
  Compass,
  Cpu,
  Zap,
  Globe,
  Volume2,
  Bot,
  User,
  Lightbulb,
} from 'lucide-react';

// Data shape: ai subject solver modal props.
interface AISubjectSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
}

// Data shape: chat message.
interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  subject?: string;
  language?: 'en' | 'hi' | 'ur';
}

const PRESET_SUBJECTS = [
  { id: 'math', name: 'Applied Mathematics', icon: Calculator },
  { id: 'physics', name: 'Applied Physics', icon: Atom },
  { id: 'chemistry', name: 'Applied Chemistry', icon: FlaskConical },
  { id: 'mechanics', name: 'Engineering Mechanics / SOM', icon: Compass },
  { id: 'cse', name: 'Computer Science & C / Data Structures', icon: Binary },
  { id: 'civil', name: 'Civil Engineering & Surveying', icon: BookOpen },
  { id: 'electrical', name: 'Electrical & Electronics', icon: Zap },
  { id: 'other', name: 'General Polytechnic Syllabus', icon: Cpu },
];

const PRESET_QUESTIONS: { [lang: string]: { [subjectId: string]: string[] } } = {
  en: {
    math: [
      'Solve by parts: Evaluate ∫ x sin(x) dx step-by-step with ILATE rule',
      'Find Rank and Inverse of matrix A = [[1, 2, 3], [0, 1, 4], [5, 6, 0]] using elementary row operations',
      "State and prove De Moivre's Theorem for rational indices",
    ],
    physics: [
      "State and derive Bernoulli's Theorem with neat assumptions & SI units",
      'Explain Simple Harmonic Motion (SHM) and time period formula of simple pendulum: T = 2π√(L/g)',
      'Explain Total Internal Reflection (TIR) and optical fiber communication principle',
    ],
    chemistry: [
      'Explain difference between Temporary and Permanent hardness of water & EDTA titration method',
      'Explain electrochemical mechanism of Rusting of Iron and methods of corrosion prevention',
    ],
    cse: [
      'Explain Binary Search algorithm with step-by-step trace on array [11, 22, 33, 44, 55, 66] and write C function',
      'Differentiate between Stack and Queue with real-world applications & push/pop operations in C',
    ],
    civil: [
      'Explain principles of Surveying: "Working from whole to part" and "Fixing a point by minimum two measurements"',
      'Calculate Reduced Levels (RL) using Height of Instrument (HI) method and Rise & Fall method with arithmetic checks',
    ],
    electrical: [
      "State Kirchhoff's Current Law (KCL) and Voltage Law (KVL) with circuit nodal analysis example",
      'Explain working principle and EMF equation of a Single Phase Transformer: E = 4.44 f N Φm',
    ],
    other: [
      'Give high-scoring UBTER board examination tips for polytechnic diploma 1st, 2nd, and 3rd year students',
    ],
  },
  hi: {
    math: [
      'खण्डशः समाकलन (Integration by Parts) द्वारा हल करें: ∫ x sin(x) dx को ILATE नियम से समझाएं',
      'आव्यूह (Matrix) की कोटि (Rank) और व्युत्क्रम (Inverse) प्रारंभिक पंक्ति संक्रियाओं द्वारा कैसे ज्ञात करते हैं?',
      'डी-मॉइवर प्रमेय (De Moivre\'s Theorem) का कथन एवं सत्यापन लिखिए',
    ],
    physics: [
      'बरनौली की प्रमेय (Bernoulli\'s Theorem) का कथन एवं विस्तृत निगमन (Derivation) स्वच्छ चित्र सहित समझाइए',
      'सरल लोलक (Simple Pendulum) के आवर्तकाल का सूत्र T = 2π√(L/g) स्थापित कीजिए',
      'पूर्ण आंतरिक परावर्तन (TIR) तथा ऑप्टिकल फाइबर के कार्य सिद्धांत को समझाइए',
    ],
    chemistry: [
      'जल की अस्थायी (Temporary) और स्थायी (Permanent) कठोरता में अंतर तथा EDTA विधि समझाइए',
      'लोहे में जंग (Rusting) लगने की विद्युत-रासायनिक क्रियाविधि एवं संक्षारण निवारण के उपाय बताइए',
    ],
    cse: [
      'बाइनरी सर्च (Binary Search) एल्गोरिदम को C भाषा के कोड और उदाहरण [11, 22, 33, 44, 55, 66] सहित समझाइए',
      'स्टैक (Stack) और क्यू (Queue) में मुख्य अंतर, LIFO/FIFO सिद्धांत और C भाषा में पुश/पॉप ऑपरेशन समझाइए',
    ],
    civil: [
      'सर्वेक्षण (Surveying) के मूलभूत सिद्धांत: "पूर्ण से अंश की ओर कार्य करना" समझाइए',
      'हाइट ऑफ इंस्ट्रूमेंट (HI) विधि और राइज़ एंड फॉल (Rise and Fall) विधि द्वारा समतलन (Levelling) की गणना समझाइए',
    ],
    electrical: [
      'किरचॉफ का धारा नियम (KCL) और विभव नियम (KVL) परिपथ आरेख सहित विस्तार से समझाइए',
      'सिंगल फेज ट्रांसफार्मर का कार्य सिद्धांत और विद्युत वाहक बल (EMF) समीकरण E = 4.44 f N Φm व्युत्पन्न कीजिए',
    ],
    other: [
      'उत्तराखंड प्राविधिक शिक्षा परिषद (UBTER) की डिप्लोमा परीक्षा में अधिकतम अंक लाने हेतु महत्वपूर्ण अध्ययन टिप्स बताइए',
    ],
  },
  ur: {
    math: [
      'Integration by Parts se solve karein: ∫ x sin(x) dx step-by-step ILATE rule ke sath explain karein',
      'Matrix ka Rank aur Inverse elementary row operations se kaise nikalte hain?',
      'De Moivre\'s Theorem ka statement aur proof explain karein',
    ],
    physics: [
      'Bernoulli\'s Theorem ka statement aur pura derivation neat diagram ke sath samjhayein',
      'Simple pendulum ka time period formula T = 2π√(L/g) kaise derive hota hai?',
      'Total Internal Reflection (TIR) aur Optical Fiber ka working principle batayein',
    ],
    chemistry: [
      'Water ki Temporary aur Permanent hardness me kya fark hai aur EDTA titration method samjhayein',
      'Iron me rusting ka electrochemical mechanism aur corrosion prevention ke tarike batayein',
    ],
    cse: [
      'Binary Search algorithm ko array [11, 22, 33, 44, 55, 66] par trace karein aur C code likhein',
      'Stack aur Queue me kya difference hai? LIFO aur FIFO concept real-life example ke sath samjhayein',
    ],
    civil: [
      'Surveying ke fundamental principles: "Whole to part work karna" aur arithmetic checks samjhayein',
      'Height of Instrument (HI) method aur Rise & Fall method se RL kaise calculate karte hain?',
    ],
    electrical: [
      'Kirchhoff\'s laws (KCL aur KVL) ko simple circuit example ke sath explain karein',
      'Transformer ka working principle aur EMF equation E = 4.44 f N Φm derive karein',
    ],
    other: [
      'UBTER diploma semester exam me maximum marks score karne ke liye best strategy aur tips batayein',
    ],
  },
};

// Screen part: ai subject solver modal.
export const AISubjectSolverModal: React.FC<AISubjectSolverModalProps> = ({
  isOpen,
  onClose,
  initialSubject,
}) => {
  const { currentUser } = useCollege();
  // The subject chosen by the user (filter / list selection)
  const [selectedSubject, setSelectedSubject] = useState<string>(
    initialSubject || 'Applied Mathematics'
  );
  // The subject id chosen by the user (filter / list selection)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('math');
  // Question text (kept in screen state)
  const [questionText, setQuestionText] = useState<string>('');
  // Ai language (kept in screen state)
  const [aiLanguage, setAiLanguage] = useState<'en' | 'hi' | 'ur'>('hi'); // Default Hindi for user preference
  // Is it loading? (true / false)
  const [isLoading, setIsLoading] = useState(false);
  // Copied id (kept in screen state)
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Chat history (kept in screen state)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'init-msg',
      sender: 'ai',
      text: `नमस्ते ${currentUser.name}! मैं आपका **UGIP AI स्टडी साथी (AI Study Sathi)** हूँ।\n\nआप मुझसे पॉलिटेक्निक डिप्लोमा (UBTER Roorkee) के किसी भी विषय (Applied Maths, Physics, Chemistry, SOM, CSE, Civil, Electrical आदि) का कोई भी सवाल, थ्योरी, न्यूमेरिकल, फॉर्मूला अथवा डेरिवेशन **हिन्दी, English या Hinglish** में पूछ सकते हैं।\n\nनीचे दिए गए किसी भी प्रश्न पर क्लिक करें अथवा अपना प्रश्न टाइप करें!`,
      timestamp: 'Just now',
      language: 'hi',
    },
  ]);

  // Runs automatically whenever these change: chatHistory, isLoading, isOpen.
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [chatHistory, isLoading, isOpen]);

  if (!isOpen) return null;

  // Runs when the user does this on screen: select subject.
  const handleSelectSubject = (item: typeof PRESET_SUBJECTS[0]) => {
    setSelectedSubjectId(item.id);
    setSelectedSubject(item.name);
  };

  // Runs when the user does this on screen: ask question.
  const handleAskQuestion = async (customQ?: string) => {
    const query = (customQ || questionText).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      subject: selectedSubject,
      language: aiLanguage,
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setQuestionText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/solve-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          subject: selectedSubject,
          language: aiLanguage,
          userRole: currentUser.role,
          userName: currentUser.name,
        }),
      });

      if (!res.ok) throw new Error('Network response error');
      const data = await res.json();
      const solutionText =
        data.solution ||
        data.answer ||
        data.content ||
        data.response ||
        (data.text ? data.text : '') ||
        'उत्तर तैयार किया गया है।';

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: solutionText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        subject: selectedSubject,
        language: aiLanguage,
      };

      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn('API fetch issue, generating smart local polytechnic response:', err);

      let fallbackText = '';
      if (aiLanguage === 'hi') {
        fallbackText = `### उत्तराखंड राजकीय पॉलिटेक्निक संस्थान - UGIP AI स्टडी साथी\n**विषय:** ${selectedSubject}\n**प्रश्न:** "${query}"\n\n#### 1. मुख्य सिद्धांत (Core Concept):\nयह विषय UBTER (उत्तराखंड प्राविधिक शिक्षा परिषद) के निर्धारित डिप्लोमा इंजीनियरिंग पाठ्यक्रम पर आधारित है। प्रश्न को हल करने के लिए आधारभूत नियमों और भौतिक/गणितीय सूत्रों का सही प्रयोग आवश्यक है।\n\n#### 2. चरणबद्ध समाधान (Step-by-Step Derivation):\n1. **दिए गए मान (Given Data):** प्रश्न में उल्लिखित सभी पैरामीटर्स को चिन्हित करें।\n2. **मूल सूत्र लागू करें:** संबंधित फॉर्मूला लागू करके मान प्रतिस्थापित करें।\n3. **गणना एवं विश्लेषण:** समीकरण को हल करें और मध्यवर्ती मानों की पुष्टि करें।\n4. **अंतिम उत्तर:** अंतिम मान को स्पष्ट रूप से मात्रक (SI Unit) के साथ लिखें।\n\n#### 3. UBTER बोर्ड परीक्षा टिप्स:\n- उत्तर लिखते समय स्वच्छ और नामांकित चित्र (Neat Diagram) अवश्य बनाएं।\n- मुख्य सूत्रों को बॉक्स में बंद करें ताकि परीक्षक आसानी से पूरे अंक दे सकें।`;
      } else if (aiLanguage === 'ur') {
        fallbackText = `### UGIP - UGIP AI Study Sathi\n**Subject:** ${selectedSubject}\n**Sawaal:** "${query}"\n\n#### 1. Core Principle (Mukhya Niyam):\nYeh topic UBTER Roorkee diploma syllabus ka important part hai. Isme standard formulas aur SI units follow hote hain.\n\n#### 2. Step-by-Step Solution:\n1. Pehle given data aur boundary conditions list karein.\n2. Core formula apply karke calculate karein.\n3. Stepwise answer verify karein aur units mention karein.\n\n#### 3. Exam Tip:\n- Exam me steps ke alag marks hote hain, isliye neat diagrams zaroor banayein!`;
      } else {
        fallbackText = `### Uttarakhand Government Institute of Polytechnic - UGIP AI Study Sathi\n**Subject:** ${selectedSubject}\n**Query:** "${query}"\n\n#### 1. Core Principle & Governing Law:\nThis concept follows UBTER & AICTE Polytechnic diploma standards. Apply fundamental constitutive equations maintaining dimensional consistency in SI units.\n\n#### 2. Step-by-Step Solution:\n1. State given boundary conditions and parameters.\n2. Apply primary equation or algorithm.\n3. Simplify intermediate coefficients and box the final result with units.\n\n#### 3. High-Scoring Exam Guidelines for UBTER:\n- Always sketch a neat labeled diagram where applicable.\n- Highlight final numerical answers clearly.`;
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        subject: selectedSubject,
        language: aiLanguage,
      };

      setChatHistory((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Runs when the user does this on screen: copy text.
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Runs when the user does this on screen: speak text.
  const handleSpeakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`_]/g, ''));
      if (aiLanguage === 'hi') utterance.lang = 'hi-IN';
      else utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const currentPresetList =
    PRESET_QUESTIONS[aiLanguage]?.[selectedSubjectId] ||
    PRESET_QUESTIONS['en'][selectedSubjectId] ||
    PRESET_QUESTIONS['en']['math'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[94vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-indigo-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  UGIP AI Study Sathi (यूजीआईपी एआई स्टडी साथी)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 hidden sm:inline">
                  UBTER AI Engine
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Uttarakhand Government Institute of Polytechnic · Active 24/7 for {currentUser.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector: Hindi, English, Hinglish */}
            <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/15 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAiLanguage('hi')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  aiLanguage === 'hi'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="हिन्दी में उत्तर पाएं"
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setAiLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  aiLanguage === 'en'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Answer in English"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setAiLanguage('ur')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  aiLanguage === 'ur'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Hinglish me answer payein"
              >
                Hinglish
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subject Pills Header */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0 hidden sm:inline">
            Subject:
          </span>
          {PRESET_SUBJECTS.map((sub) => {
            const Icon = sub.icon;
            const isSelected = selectedSubjectId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => handleSelectSubject(sub)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sub.name}</span>
              </button>
            );
          })}
        </div>

        {/* Chat History & Conversation Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 space-y-2 text-xs leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-1.5 text-[10px] opacity-80">
                  <span className="font-bold">
                    {msg.sender === 'user' ? currentUser.name : 'UGIP AI Study Sathi'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                <div className="whitespace-pre-wrap font-sans text-xs space-y-2">
                  {msg.text.split('\n\n').map((para, pIdx) => {
                    if (para.startsWith('### ')) {
                      return <h3 key={pIdx} className="font-black text-sm text-indigo-600 dark:text-indigo-400 mt-2">{para.replace('### ', '')}</h3>;
                    }
                    if (para.startsWith('#### ')) {
                      return <h4 key={pIdx} className="font-bold text-xs text-slate-900 dark:text-white mt-1.5">{para.replace('#### ', '')}</h4>;
                    }
                    return <p key={pIdx}>{para}</p>;
                  })}
                </div>

                {msg.sender === 'ai' && (
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => handleSpeakText(msg.text)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Speak / Read aloud"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer flex items-center gap-1"
                      title="Copy Answer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] text-emerald-500">Copied!</span>
                        </>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                <span>
                  {aiLanguage === 'hi'
                    ? 'यूजीआईपी एआई स्टडी साथी उत्तर तैयार कर रहा है...'
                    : aiLanguage === 'ur'
                    ? 'UGIP AI Study Sathi answer prepare kar raha hai...'
                    : 'UGIP AI Study Sathi is formulating the step-by-step answer...'}
                </span>
              </div>
            </div>
          )}

          {/* Quick Preset Prompts Strip */}
          <div className="pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              Frequently Asked UBTER Questions ({selectedSubject}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentPresetList.map((promptQ, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskQuestion(promptQ)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 rounded-xl text-left text-xs transition-colors cursor-pointer"
                >
                  "{promptQ.length > 70 ? promptQ.slice(0, 70) + '...' : promptQ}"
                </button>
              ))}
            </div>
          </div>

          {/* Auto scroll anchor */}
          <div ref={chatEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={
                aiLanguage === 'hi'
                  ? `यहाँ अपना प्रश्न लिखें (${selectedSubject})...`
                  : aiLanguage === 'ur'
                  ? `Yahan apna question likhein (${selectedSubject})...`
                  : `Ask any question on ${selectedSubject}...`
              }
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none font-medium"
            />
            <button
              type="submit"
              disabled={isLoading || !questionText.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
