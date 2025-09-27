'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, defaultPreferences } from '@/types/profile';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [favorites, setFavorites] = useState<any[]>([]); // We'll add apartment favorites later

  useEffect(() => {
    loadProfile();
    loadFavorites();
  }, []);

  const loadProfile = () => {
    try {
      const saved = localStorage.getItem('padmatch-profile');
      console.log('Loading profile from localStorage:', saved);
      if (saved) {
        const profileData = JSON.parse(saved);
        console.log('Parsed profile data:', profileData);
        setProfile(profileData);
      } else {
        console.log('No saved profile found, creating default');
        // Create default profile
        const defaultProfile: UserProfile = {
          id: `user-${Date.now()}`,
          nickname: '',
          avatar: '',
          preferences: defaultPreferences,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
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

  const saveProfile = (updatedProfile: UserProfile) => {
    try {
      localStorage.setItem('padmatch-profile', JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!profile) return;
    
    const updatedProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date(),
    };
    saveProfile(updatedProfile);
  };

  const updatePreferences = (preferenceUpdates: Partial<UserProfile['preferences']>) => {
    if (!profile) return;
    
    const updatedPreferences = {
      ...profile.preferences,
      ...preferenceUpdates,
    };
    
    updateProfile({ preferences: updatedPreferences });
  };

  const removeFavorite = (apartmentId: string) => {
    const updatedFavorites = favorites.filter(apt => apt.id !== apartmentId);
    setFavorites(updatedFavorites);
    localStorage.setItem('padmatch-favorites', JSON.stringify(updatedFavorites));
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">PadMatch</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <div className="w-8 h-8 rounded-full bg-gray-300"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Profile & Preferences */}
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt="Profile"
                      className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
                      <span className="text-gray-500 text-2xl">👤</span>
                    </div>
                  )}
                  <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{profile.nickname || 'Your Name'}</h2>
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
                      value={profile.nickname}
                      onChange={(e) => updateProfile({ nickname: e.target.value })}
                      placeholder="Enter your nickname"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Min Rent</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={profile.preferences.budget.min}
                          onChange={(e) => updatePreferences({
                            budget: { ...profile.preferences.budget, min: Number(e.target.value) }
                          })}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          step="50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Max Rent</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={profile.preferences.budget.max}
                          onChange={(e) => updatePreferences({
                            budget: { ...profile.preferences.budget, max: Number(e.target.value) }
                          })}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min={profile.preferences.budget.min}
                          step="50"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="budgetType"
                        defaultChecked
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Total Cost</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="budgetType"
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Per Person</span>
                    </label>
                  </div>
                </div>

                {/* Other Preferences */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Move Timing</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>ASAP</option>
                      <option>Within 1 month</option>
                      <option>Within 3 months</option>
                      <option>Within 6 months</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beds/Baths</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>Studio</option>
                      <option>1 Bed / 1 Bath</option>
                      <option>2 Bed / 1 Bath</option>
                      <option>2 Bed / 2 Bath</option>
                      <option>3+ Bed / 2+ Bath</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location/Commute</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>Within 15 minutes</option>
                      <option>Within 30 minutes</option>
                      <option>Within 45 minutes</option>
                      <option>Within 1 hour</option>
                    </select>
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

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
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

