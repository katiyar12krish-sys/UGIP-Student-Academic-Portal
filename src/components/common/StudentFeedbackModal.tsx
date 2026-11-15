// ===================================================================================================
// Student feedback form about teaching / facilities.
// ===================================================================================================
import React, { useState } from 'react';
import { MessageSquare, Star, Send, CheckCircle2, Lock, X } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';

// Screen part: student feedback modal.
export const StudentFeedbackModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { subjects } = useCollege();
  // Subject code (kept in screen state)
  const [subjectCode, setSubjectCode] = useState(subjects[0]?.code || 'CS-501');
  // List of comments shown on this screen
  const [comments, setComments] = useState('');
  // Submitted (kept in screen state)
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  // Runs when the user does this on screen: submit.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <div>
              <h4 className="font-bold text-sm">Course & Faculty Feedback</h4>
              <p className="text-xs text-slate-300">Uttarakhand Government Institute of Polytechnic</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Feedback Submitted</h4>
            <p className="text-xs text-slate-500">Thank you for your academic feedback.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject</label>
              <select
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
              >
                {subjects.map((s) => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Suggestions & Observations</label>
              <textarea
                rows={3}
                required
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share your feedback..."
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl">Submit</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
