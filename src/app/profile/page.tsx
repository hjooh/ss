'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile as AuthUserProfile } from '@/lib/supabase';
import { authService } from '@/lib/auth';
import { Navbar } from '@/components/navbar';
import { generateUserAvatar } from '@/lib/avatar-generator';

interface ProfilePageProps {
  currentUser?: AuthUserProfile | null;
  onUserUpdate?: (user: AuthUserProfile) => void;
}

export default function ProfilePage({ currentUser, onUserUpdate }: ProfilePageProps = {}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserProfile | null>(currentUser || null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form state for preferences (stored in localStorage for now)
  const [budgetMax, setBudgetMax] = useState(2000);
  const [beds, setBeds] = useState(1);
  const [baths, setBaths] = useState(1);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      loadPreferences();
      setIsLoading(false);
    } else {
      loadCurrentUser();
    }
    loadFavorites();
  }, [currentUser]);

  const loadCurrentUser = async () => {
    try {
      const { user: authUser, error } = await authService.getCurrentUser();
      if (authUser && !error) {
        setUser(authUser);
        loadPreferences();
      } else {
        console.error('Error loading user:', error);
        router.push('/');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreferences = () => {
    try {
      const savedPrefs = localStorage.getItem('padmatch-preferences');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        setBudgetMax(prefs.budget?.max || 2000);
        setBeds(prefs.beds || 1);
        setBaths(prefs.baths || 1);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('padmatch-favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !user.nickname?.trim()) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      let avatarUrl = user.avatar_url;
      
      // If there's a new avatar file, convert it to a data URL for now
      // In a real app, you'd upload this to Supabase Storage or another service
      if (avatarFile) {
        const reader = new FileReader();
        avatarUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(avatarFile);
        });
      }

      const { user: updatedUser, error } = await authService.updateProfile({
        nickname: user.nickname.trim(),
        avatar_url: avatarUrl
      });
      
      if (error) {
        setSaveError(error);
        setIsSaving(false);
        return;
      }
      
      if (updatedUser) {
        setUser(updatedUser);
        setHasUnsavedChanges(false);
        
        // Notify parent component of user update
        if (onUserUpdate) {
          onUserUpdate(updatedUser);
        }
        
        // Save preferences to localStorage for now (can be moved to database later)
        const preferences = {
          budget: { max: budgetMax },
          beds,
          baths,
          accessibility: { wheelchairAccessible: false, elevatorRequired: false, groundFloorOnly: false },
          amenities: { parking: false, laundry: false, dishwasher: false, airConditioning: false, heating: true, balcony: false, gym: false, pool: false },
          roommates: { maxRoommates: 3, petsAllowed: false, smokingAllowed: false },
          lease: { preferredLeaseLength: 12, utilitiesIncluded: false, furnished: false }
        };
        
        localStorage.setItem('padmatch-preferences', JSON.stringify(preferences));
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNicknameChange = (value: string) => {
    if (!user) return;
    setUser({ ...user, nickname: value });
    setHasUnsavedChanges(value.trim() !== user.nickname);
  };

  const handleBudgetChange = (max: number) => {
    setBudgetMax(max);
    setHasUnsavedChanges(true);
  };

  const handleBedsChange = (value: number) => {
    setBeds(value);
    setHasUnsavedChanges(true);
  };

  const handleBathsChange = (value: number) => {
    setBaths(value);
    setHasUnsavedChanges(true);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSaveError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSaveError('Image must be smaller than 5MB');
        return;
      }

      setAvatarFile(file);
      setHasUnsavedChanges(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFavorite = (apartmentId: string) => {
    const updatedFavorites = favorites.filter(apt => apt.id !== apartmentId);
    setFavorites(updatedFavorites);
    localStorage.setItem('padmatch-favorites', JSON.stringify(updatedFavorites));
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentUser={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Profile & Preferences */}
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden">
                    <img
                      src={avatarPreview || user.avatar_url || generateUserAvatar(user.username)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.nickname || 'Your Name'}</h2>
                </div>
              </div>

              {/* Profile Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Profile</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
                    <input
                      type="text"
                      value={user.nickname}
                      onChange={(e) => handleNicknameChange(e.target.value)}
                      placeholder="Enter your nickname"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      maxLength={20}
                    />
                  </div>
                </div>
              </div>

              {/* Housing Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Housing Preferences</h3>
                
                {/* Budget */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Budget</h4>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Max Rent Per Person</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={budgetMax}
                        onChange={(e) => handleBudgetChange(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        min="0"
                        step="50"
                        placeholder="2000"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Your maximum monthly rent contribution</p>
                  </div>
                </div>

                {/* Other Preferences */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
                      <select 
                        value={beds} 
                        onChange={(e) => handleBedsChange(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      >
                        <option value={0}>Studio</option>
                        <option value={1}>1 Bed</option>
                        <option value={2}>2 Beds</option>
                        <option value={3}>3 Beds</option>
                        <option value={4}>4+ Beds</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
                      <select 
                        value={baths} 
                        onChange={(e) => handleBathsChange(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      >
                        <option value={1}>1 Bath</option>
                        <option value={1.5}>1.5 Baths</option>
                        <option value={2}>2 Baths</option>
                        <option value={2.5}>2.5 Baths</option>
                        <option value={3}>3+ Baths</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Preferences</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>Pet-friendly</option>
                      <option>Furnished</option>
                      <option>Parking included</option>
                      <option>Utilities included</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {saveError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{saveError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || !user.nickname?.trim() || isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Favorites */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Your Favorite Apartments ({favorites.length})
            </h3>
            
            {favorites.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏠</div>
                <p className="text-gray-500">No favorite apartments yet</p>
                <p className="text-sm text-gray-400 mt-2">Start hunting to add apartments to your favorites!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {favorites.map((apartment) => (
                  <div key={apartment.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <img
                      src={apartment.image || '/placeholder-apartment.jpg'}
                      alt={apartment.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{apartment.name}</h4>
                      <p className="text-sm text-gray-600">{apartment.address}</p>
                      <p className="text-sm text-gray-700 font-medium">
                        ${apartment.price}/month - {apartment.beds} Bed, {apartment.baths} Bath
                      </p>
                    </div>
                    <button
                      onClick={() => removeFavorite(apartment.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

