'use client';

import { useState, useEffect } from 'react';

interface UserProfileProps {
  onProfileUpdate: (profile: { nickname: string; avatar: string }) => void;
  initialProfile?: { nickname: string; avatar: string };
}

export const UserProfile = ({ onProfileUpdate, initialProfile }: UserProfileProps) => {
  const [nickname, setNickname] = useState(initialProfile?.nickname || '');
  const [avatar, setAvatar] = useState(initialProfile?.avatar || '');
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Generate avatar options
  const avatarOptions = [
    { seed: 'smile', emoji: '😊' },
    { seed: 'cool', emoji: '😎' },
    { seed: 'happy', emoji: '😄' },
    { seed: 'wink', emoji: '😉' },
    { seed: 'love', emoji: '🥰' },
    { seed: 'laugh', emoji: '😂' },
    { seed: 'surprised', emoji: '😲' },
    { seed: 'thinking', emoji: '🤔' },
    { seed: 'sleepy', emoji: '😴' },
    { seed: 'nerd', emoji: '🤓' },
    { seed: 'party', emoji: '🥳' },
    { seed: 'fire', emoji: '🔥' }
  ];

  useEffect(() => {
    if (nickname && avatar) {
      onProfileUpdate({ nickname, avatar });
    }
  }, [nickname, avatar, onProfileUpdate]);

  const handleAvatarSelect = (seed: string) => {
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  };

  const handleSaveProfile = () => {
    if (nickname.trim()) {
      // Save to localStorage
      const profile = { nickname: nickname.trim(), avatar };
      localStorage.setItem('padmatch-profile', JSON.stringify(profile));
      setShowProfileEditor(false);
    }
  };

  const loadSavedProfile = () => {
    try {
      const saved = localStorage.getItem('padmatch-profile');
      if (saved) {
        const profile = JSON.parse(saved);
        setNickname(profile.nickname);
        setAvatar(profile.avatar);
        return profile;
      }
    } catch (error) {
      console.error('Error loading saved profile:', error);
    }
    return null;
  };

  useEffect(() => {
    const savedProfile = loadSavedProfile();
    if (savedProfile && !initialProfile) {
      onProfileUpdate(savedProfile);
    }
  }, []);

  return (
    <div className="relative">
      {/* Profile Display */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          {avatar ? (
            <img
              src={avatar}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center">
              <span className="text-gray-500 text-lg">👤</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {nickname ? (
            <div>
              <p className="text-sm font-medium text-gray-900 truncate">{nickname}</p>
              <p className="text-xs text-gray-500">Ready to hunt</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-500">Set up your profile</p>
              <p className="text-xs text-gray-400">Click to customize</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowProfileEditor(!showProfileEditor)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {/* Profile Editor */}
      {showProfileEditor && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border p-4 z-10">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {avatarOptions.map((option) => (
                  <button
                    key={option.seed}
                    onClick={() => handleAvatarSelect(option.seed)}
                    className={`p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                      avatar.includes(option.seed) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl">{option.emoji}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowProfileEditor(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={!nickname.trim()}
                className="px-4 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
