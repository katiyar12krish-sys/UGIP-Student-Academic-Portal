// ===================================================================================================
// Round profile picture or initials of a person.
// ===================================================================================================
import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { Role } from '../../types';

// Data shape: user avatar props.
interface UserAvatarProps {
  name: string;
  avatar?: string;
  role?: Role;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  editable?: boolean;
  onEditClick?: () => void;
}

// Screen part: user avatar.
export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatar,
  role = 'student',
  size = 'md',
  className = '',
  editable = false,
  onEditClick,
}) => {
  // Error message to show (img error); empty = no error
  const [imgError, setImgError] = useState(false);

  // Returns the initials.
  const getInitials = (fullName: string) => {
    if (!fullName) return 'U';
    const cleaned = fullName.replace(/^(mr\.|mrs\.|ms\.|dr\.|km|er\.)\s+/i, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || 'U').toUpperCase();
  };

  const initials = getInitials(name);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] rounded-md',
    sm: 'w-8 h-8 text-xs rounded-lg',
    md: 'w-10 h-10 text-sm rounded-xl',
    lg: 'w-14 h-14 text-base rounded-2xl',
    xl: 'w-20 h-20 text-xl rounded-2xl',
  };

  const roleGradients: Record<Role, string> = {
    admin: 'bg-gradient-to-br from-slate-800 to-slate-950 text-slate-100 border border-slate-700/60',
    faculty: 'bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 border border-amber-600/40',
    student: 'bg-gradient-to-br from-blue-700 to-indigo-900 text-blue-50 border border-blue-500/40',
    parent: 'bg-gradient-to-br from-violet-700 to-purple-900 text-violet-50 border border-violet-500/40',
  };

  const hasValidAvatar = Boolean(avatar && avatar.trim().length > 0 && !imgError);

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      {hasValidAvatar && avatar ? (
        <img
          src={avatar}
          alt={name}
          onError={() => setImgError(true)}
          className={`${sizeClasses[size]} object-cover border border-slate-200 dark:border-slate-700 shadow-2xs`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${roleGradients[role]} flex items-center justify-center font-bold tracking-wider select-none shadow-2xs`}
          title={name}
        >
          {initials}
        </div>
      )}
      {editable && (
        <button
          type="button"
          onClick={onEditClick}
          className="absolute -bottom-1 -right-1 p-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-xs transition-transform active:scale-95 cursor-pointer ring-2 ring-white dark:ring-slate-900"
          title="Upload or Change Photo"
        >
          <Camera className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
