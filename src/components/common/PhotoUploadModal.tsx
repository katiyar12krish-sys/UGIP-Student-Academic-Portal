// ===================================================================================================
// Upload / change / remove a profile photo (stored on the server, needs photo consent).
// ===================================================================================================
import React, { useState, useRef } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { UserProfile } from '../../types';
import { authApi } from '../../services/authApi';
import {
  Upload,
  Camera,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';

// Data shape: photo upload modal props.
interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: UserProfile;
}

// Screen part: photo upload modal.
export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  targetUser,
}) => {
  const { currentUser, updateUser } = useCollege();
  const userToUpdate = targetUser || currentUser;
  // Preview url (kept in screen state)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Error message to show (error message); empty = no error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Is it success? (true / false)
  const [isSuccess, setIsSuccess] = useState(false);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);
  // Need consent (kept in screen state)
  const [needConsent, setNeedConsent] = useState(false);   // server said: photo consent missing and this person may give it themselves
  // Consent tick (kept in screen state)
  const [consentTick, setConsentTick] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Returns the initials.
  const getInitials = (name: string) => {
    const parts = name.replace(/^(mr\.|mrs\.|ms\.|dr\.|km|er\.)\s+/i, '').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || 'U').toUpperCase();
  };

  // Runs when the user does this on screen: file change.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setIsSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5MB limit. Please choose a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 320;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPreviewUrl(compressedDataUrl);
        } else {
          setPreviewUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // The photo is stored on the server (JPEG only, EXIF removed there). Needs the person's photo consent (a parent's for under-18 students).
  const handleSave = async () => {
    if (!previewUrl || busy) return;
    setBusy(true);
    setErrorMessage(null);
    const blob = await (await fetch(previewUrl)).blob();     // previewUrl is already a resized JPEG from the canvas
    let r = await authApi.uploadPhoto(userToUpdate.id, blob);
    if (!r.ok && r.code === 'photo_consent_required' && r.canSelfConsent && consentTick) {
      const c = await authApi.saveConsent({ service: true, photo: true });
      if (c.ok) r = await authApi.uploadPhoto(userToUpdate.id, blob);
    }
    setBusy(false);
    if (!r.ok) {
      setNeedConsent(r.code === 'photo_consent_required' && !!r.canSelfConsent);
      setErrorMessage(r.error);
      return;
    }
    updateUser(userToUpdate.id, { avatar: r.data.photoUrl });
    setNeedConsent(false);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 800);
  };

  // Runs when the user does this on screen: remove photo.
  const handleRemovePhoto = async () => {
    if (busy) return;
    setBusy(true);
    const r = await authApi.deletePhoto(userToUpdate.id);
    setBusy(false);
    if (!r.ok) { setErrorMessage(r.error); return; }
    updateUser(userToUpdate.id, { avatar: '' });
    setPreviewUrl(null);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
              <Camera className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Profile Photo
              </h3>
              <p className="text-[11px] text-slate-300">
                {userToUpdate.name} · {userToUpdate.role.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {needConsent && (
            <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={consentTick} onChange={(e) => setConsentTick(e.target.checked)} />
              <span>I allow the institute to store my profile photo on the portal server. I can withdraw this any time under Privacy &amp; Security.</span>
            </label>
          )}
          {isSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profile photo updated successfully!</span>
            </div>
          )}

          {/* Avatar Preview Area */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative group">
              {(() => {
                const effectiveAvatar = previewUrl || (userToUpdate.avatar && userToUpdate.avatar.trim().length > 0 ? userToUpdate.avatar : null);
                return effectiveAvatar ? (
                  <img
                    src={effectiveAvatar}
                    alt={userToUpdate.name}
                    className="w-28 h-28 rounded-2xl object-cover ring-4 ring-blue-500/20 shadow-md border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center justify-center font-bold text-2xl tracking-wider ring-4 ring-slate-100 dark:ring-slate-800 shadow-inner">
                    <span>{getInitials(userToUpdate.name)}</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5 uppercase tracking-normal">
                      No Photo
                    </span>
                  </div>
                );
              })()}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer transition-transform active:scale-95"
                title="Select Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Official institutional photograph (JPG, PNG or WEBP). Stored on the server only with your consent.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Choose / Upload Pic</span>
            </button>
            {userToUpdate.avatar ? (
              <a
                href={userToUpdate.avatar}
                download={`${userToUpdate.name.replace(/\s+/g, '_')}_photo.jpg`}
                className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Photo</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 opacity-50 cursor-not-allowed border border-slate-200 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>No Photo to Download</span>
              </button>
            )}
          </div>
          {userToUpdate.avatar && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="w-full py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Photo</span>
            </button>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!previewUrl || busy || (needConsent && !consentTick)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{busy ? 'Saving…' : 'Save As Photo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
