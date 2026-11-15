// ===================================================================================================
// Honours & achievements gallery of the college (students and staff).
// ===================================================================================================
import React from 'react';
import { Trophy, ShieldCheck, User } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';

// Screen part: achievements gallery.
export const AchievementsGallery: React.FC<{ allowNominate?: boolean }> = () => {
  const sampleAchievements = [
    {
      id: 'ach-1',
      studentName: 'Diya Adhikari',
      branch: 'CSE',
      title: '1st Prize - Uttarakhand State Polytechnic Hackathon 2025',
      category: 'Technical / Hackathon',
      eventName: 'UCOST State Science & Tech Hackathon',
      year: 2025,
      position: '1st Place',
      verificationStatus: 'Verified',
    },
    {
      id: 'ach-2',
      studentName: 'Aditya Singh',
      branch: 'Civil',
      title: 'Gold Medal - State Inter-Polytechnic Badminton Championship',
      category: 'State Sports',
      eventName: 'UBTER Annual Inter-Polytechnic Meet',
      year: 2025,
      position: 'Gold Medal',
      verificationStatus: 'Verified',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Student Honors & Achievement Gallery</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          State technical symposium medals, hackathons, sports championships, and academic merits from UGIP.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sampleAchievements.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                {item.position}
              </span>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {item.verificationStatus}
              </span>
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</h4>
            <p className="text-xs text-slate-500">{item.eventName} ({item.year})</p>
            <div className="pt-2 border-t text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{item.studentName} ({item.branch})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
