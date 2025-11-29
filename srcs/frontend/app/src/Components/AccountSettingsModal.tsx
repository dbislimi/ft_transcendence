import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobalBackground } from '../contexts/GlobalBackgroundContext';
import { useUser } from '../context/UserContext'; 
import { useNotifications } from '../context/NotificationContext';
import { API_BASE_URL } from '../config/api';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();
  const { notify } = useNotifications();

  const [email, setEmail] = useState(user?.email || '');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const avatars = [
    "/avatars/avatar1.png", "/avatars/avatar2.png", "/avatars/avatar3.png",
    "/avatars/avatar4.png", "/avatars/avatar5.png", "/avatars/avatar6.png",
    "/avatars/avatar7.png", "/avatars/avatar8.png", "/avatars/avatar9.png",
    "/avatars/avatar10.png"
  ];

  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || "/avatars/avatar1.png");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetch2FAStatus = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE_URL}/api/reglages`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setIs2FAEnabled(data.twoFAEnabled);
          }
        } catch (error) {
          console.error('Error fetching 2FA status:', error);
        }
      };
      fetch2FAStatus();
    }
  }, [isOpen]);

  const toggle2FA = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/reglages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enable2fa: !is2FAEnabled })
      });

      if (res.ok) {
        const data = await res.json();
        setIs2FAEnabled(data.twoFAEnabled);
        notify({
          variant: 'success',
          message: `Double authentification ${data.twoFAEnabled ? 'activée' : 'désactivée'}`
        });
      } else {
        notify({ variant: 'error', message: 'Erreur lors de la modification de la 2FA' });
      }
    } catch (error) {
      notify({ variant: 'error', message: 'Erreur de connexion' });
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (newPassword && newPassword !== confirmPassword) {
        notify({ variant: 'error', message: 'Les nouveaux mots de passe ne correspondent pas' });
        setIsLoading(false);
        return;
      }

      const body: any = {
        email,
        display_name: displayName,
        avatar: selectedAvatar
      };

      if (newPassword) {
        body.password = newPassword;
        body.currentPassword = currentPassword;
      }

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        notify({ variant: 'success', message: 'Profil mis à jour avec succes' });
        await refreshUser();
        setIsEditing(false);
        // Reset password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        notify({ variant: 'error', message: data.error || 'Erreur lors de la mise à jour' });
      }
    } catch (error) {
      notify({ variant: 'error', message: 'Erreur de connexion' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="settings-modal rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-settings-slide bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">👤</span>
            <h2 className="text-2xl font-bold text-white">
              {t('settings.account.title') || 'Reglages de compte'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {!isEditing ? (
            // Mode Lecture
            <div className="space-y-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <img
                  src={user?.avatar || "/avatars/avatar1.png"}
                  alt="Profile"
                  className="w-32 h-32 rounded-full border-4 border-blue-500/50 object-cover"
                />
                <h3 className="text-2xl font-bold text-white">{user?.display_name}</h3>
                <p className="text-gray-400">{user?.email}</p>
              </div>

              <div className="bg-slate-700/30 rounded-xl p-6 space-y-4">
                <h4 className="text-lg font-semibold text-blue-300">Informations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Pseudo</label>
                    <p className="text-white font-medium">{user?.display_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <p className="text-white font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Membre depuis</label>
                    <p className="text-white font-medium">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
                >
                  <span>✏️</span> {t('profile.editProfile')}
                </button>
              </div>
            </div>
          ) : (
            // Mode edition
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-300">Avatar</label>
                  <div className="flex justify-center mb-4">
                    <img
                      src={selectedAvatar}
                      alt="Selected Avatar"
                      className="w-24 h-24 rounded-full border-4 border-blue-500 object-cover"
                    />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {avatars.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setSelectedAvatar(av)}
                        className={`relative rounded-full overflow-hidden aspect-square border-2 transition-all ${selectedAvatar === av ? 'border-blue-500 scale-110' : 'border-transparent hover:border-gray-500'
                          }`}
                      >
                        <img src={av} alt="Avatar choice" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Pseudo</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Double Authentification (2FA)</label>
                    <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-600 rounded-lg">
                      <span className="text-sm text-gray-400">
                        {is2FAEnabled ? 'Activée' : 'Désactivée'}
                      </span>
                      <button
                        type="button"
                        onClick={toggle2FA}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${is2FAEnabled
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          }`}
                      >
                        {is2FAEnabled ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700/50">
                    <h4 className="text-sm font-semibold text-blue-300 mb-3">Changer le mot de passe</h4>
                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Mot de passe actuel (si changement)"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none text-sm"
                      />
                      <input
                        type="password"
                        placeholder="Nouveau mot de passe"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none text-sm"
                      />
                      <input
                        type="password"
                        placeholder={t('account.confirmNewPassword')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-700/50">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
