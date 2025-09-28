'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile as AuthUserProfile } from '@/lib/supabase';
import { authService } from '@/lib/auth';
import { Navbar } from '@/components/navbar';
import { generateUserAvatar } from '@/lib/avatar-generator';
import { supabase } from '@/lib/supabase';

interface ProfilePageProps {
  currentUser?: AuthUserProfile | null;
  onUserUpdate?: (user: AuthUserProfile) => void;
}

export default function ProfilePage({ currentUser, onUserUpdate }: ProfilePageProps = {}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserProfile | null>(currentUser || null);
  const [profileData, setProfileData] = useState<any | null>(null); // New state to hold fetched data
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form state for preferences (now synced with Supabase)
  const [budgetMax, setBudgetMax] = useState(2000);
  const [beds, setBeds] = useState(1);
  const [baths, setBaths] = useState(1);
  const [maxWalkTime, setMaxWalkTime] = useState(15); // minutes
  const [maxDriveTime, setMaxDriveTime] = useState(20); // minutes
  
  // Tags state
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Tags data
  const tagCategories = {
    amenities: [
      'In-Unit Washer/Dryer', 'Washer/Dryer Hookup', 'Dishwasher', 'Fully Furnished',
      'Air Conditioning', 'Hardwood Floors', 'Stainless Steel Appliances', 'Granite Countertops',
      'Walk-In Closets', 'Private Patio/Balcony', 'Swimming Pool', 'Fitness Center / Gym',
      'Clubhouse', 'On-Site Laundry', 'Off-Street Parking', 'Garage Parking',
      'Utilities Included', 'Fireplace', 'Smart Home Technology', 'Extra Storage', 'Office/Den Space'
    ],
    culture: [
      'Student-Focused', 'Quiet Residential', 'Family-Friendly', 'Social & Lively',
      'Modern & Upscale', 'Convenient to Downtown', 'Close to Nature/Trails', 'Community-Oriented',
      'Luxury Living', 'All-Inclusive Living'
    ],
    dei: [
      'Pet-Friendly', 'Wheelchair Accessible', 'Main-Floor Bedroom', 'Equal Housing Opportunity',
      'On Public Transit Route', 'Roommate Matching Available', 'Individual Leases',
      'Short-Term Leases Available', 'Community Events'
    ]
  };

  // --- STEP 1: A clean function to ONLY fetch data ---
  const fetchProfileData = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error loading preferences:', error);
        setProfileData(null); // Set to null on error
      } else {
        setProfileData(data); // Store the entire profile object
      }
    } catch (err) {
      console.error('Catastrophic error loading preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array means this function is created once

  // --- STEP 2: useEffect to fetch data when the user changes ---
  useEffect(() => {
    async function loadUserAndProfile() {
      let finalUser = currentUser;
      if (!finalUser) {
        const { user: authUser } = await authService.getCurrentUser();
        finalUser = authUser;
      }
      
      if (finalUser) {
        setUser(finalUser);
        fetchProfileData(finalUser.user_id);
    } else {
        router.push('/');
      }
    }
    loadUserAndProfile();
    loadFavorites(); // This can stay as is
  }, [currentUser, fetchProfileData, router]);


  // Helper function to safely parse array-like strings
  const parseArrayString = (value: any): string[] => {
    // Return an empty array if the value is null, not a string, or empty
    if (!value || typeof value !== 'string') {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      // Ensure the parsed result is actually an array
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      // If JSON.parse fails, return an empty array
      console.error("Failed to parse array string:", value, e);
      return [];
    }
  };

  // --- STEP 3: A SEPARATE useEffect to sync state FROM the fetched data ---
  useEffect(() => {
    if (profileData) {
      console.log('🔄 Syncing state from fetched profileData:', profileData);
      
      // Use the helper function to parse the data
      const walkTimeArray = parseArrayString(profileData['Preferred Commute Time (Walk)']);
      const walkTime = parseInt(walkTimeArray[0]) || 15;
      const amenities = parseArrayString(profileData['Amenities']);
      const culture = parseArrayString(profileData['Culture']);
      const dei = parseArrayString(profileData['DEI']);
      const idealApartment = parseArrayString(profileData['ideal_apartment']);

      setMaxWalkTime(walkTime);
      setMaxDriveTime(20); // Default

      // Extract budget from ideal apartment
      const budgetItem = idealApartment.find((item: string) => item.includes('Under $'));
      if (budgetItem) {
        const match = budgetItem.match(/Under \$(\d+)/);
        if (match) {
          setBudgetMax(parseInt(match[1]));
        }
      }

      // Extract roommates from ideal apartment
      const roommatesItem = idealApartment.find((item: string) => item.includes('Roommates'));
      if (roommatesItem) {
        const match = roommatesItem.match(/(\d+)\s+Roommates/);
        if (match) {
          setBeds(parseInt(match[1]));
        }
      }

      // Your tag logic remains the same, but it's now in a predictable place
      const newSelectedTags = new Set<string>();
      
      // Map amenities from database to form tags
      amenities.forEach((amenity: string) => {
        newSelectedTags.add(amenity);
      });

      // Map culture tags
      culture.forEach((cultureItem: string) => {
        newSelectedTags.add(cultureItem);
      });

      // Map DEI tags
      dei.forEach((deiItem: string) => {
        newSelectedTags.add(deiItem);
      });

      // Map ideal apartment tags
      idealApartment.forEach((item: string) => {
        if (item === 'Utilities Included') {
          newSelectedTags.add('Utilities Included');
        }
        if (item === 'Furnished') {
          newSelectedTags.add('Fully Furnished');
        }
      });

      setSelectedTags(newSelectedTags);
      console.log('✅ State sync complete. Tags set to:', Array.from(newSelectedTags));
    }
  }, [profileData]); // This effect runs ONLY when profileData changes

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
      const { user: updatedUser, error } = await authService.updateProfile({
        nickname: user.nickname.trim()
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
        
        // Save preferences to Supabase using array format
        console.log('💾 Saving preferences with selected tags:', Array.from(selectedTags));
        
        const amenities = [];
        // Map all amenities from form tags to database values
        if (selectedTags.has('In-Unit Washer/Dryer')) amenities.push('In-Unit Washer/Dryer');
        if (selectedTags.has('Washer/Dryer Hookup')) amenities.push('Washer/Dryer Hookup');
        if (selectedTags.has('Dishwasher')) amenities.push('Dishwasher');
        if (selectedTags.has('Fully Furnished')) amenities.push('Fully Furnished');
        if (selectedTags.has('Air Conditioning')) amenities.push('Air Conditioning');
        if (selectedTags.has('Hardwood Floors')) amenities.push('Hardwood Floors');
        if (selectedTags.has('Stainless Steel Appliances')) amenities.push('Stainless Steel Appliances');
        if (selectedTags.has('Granite Countertops')) amenities.push('Granite Countertops');
        if (selectedTags.has('Walk-In Closets')) amenities.push('Walk-In Closets');
        if (selectedTags.has('Private Patio/Balcony')) amenities.push('Private Patio/Balcony');
        if (selectedTags.has('Swimming Pool')) amenities.push('Swimming Pool');
        if (selectedTags.has('Fitness Center / Gym')) amenities.push('Fitness Center / Gym');
        if (selectedTags.has('Clubhouse')) amenities.push('Clubhouse');
        if (selectedTags.has('On-Site Laundry')) amenities.push('On-Site Laundry');
        if (selectedTags.has('Off-Street Parking')) amenities.push('Off-Street Parking');
        if (selectedTags.has('Garage Parking')) amenities.push('Garage Parking');
        if (selectedTags.has('Utilities Included')) amenities.push('Utilities Included');
        if (selectedTags.has('Fireplace')) amenities.push('Fireplace');
        if (selectedTags.has('Smart Home Technology')) amenities.push('Smart Home Technology');
        if (selectedTags.has('Extra Storage')) amenities.push('Extra Storage');
        if (selectedTags.has('Office/Den Space')) amenities.push('Office/Den Space');
        
        console.log('🏠 Mapped amenities for database:', amenities);

        const culture = [];
        // Map all culture tags
        if (selectedTags.has('Student-Focused')) culture.push('Student-Focused');
        if (selectedTags.has('Quiet Residential')) culture.push('Quiet Residential');
        if (selectedTags.has('Family-Friendly')) culture.push('Family-Friendly');
        if (selectedTags.has('Social & Lively')) culture.push('Social & Lively');
        if (selectedTags.has('Modern & Upscale')) culture.push('Modern & Upscale');
        if (selectedTags.has('Convenient to Downtown')) culture.push('Convenient to Downtown');
        if (selectedTags.has('Close to Nature/Trails')) culture.push('Close to Nature/Trails');
        if (selectedTags.has('Community-Oriented')) culture.push('Community-Oriented');
        if (selectedTags.has('Luxury Living')) culture.push('Luxury Living');
        if (selectedTags.has('All-Inclusive Living')) culture.push('All-Inclusive Living');

        const dei = [];
        // Map all DEI tags
        if (selectedTags.has('Pet-Friendly')) dei.push('Pet-Friendly');
        if (selectedTags.has('Wheelchair Accessible')) dei.push('Wheelchair Accessible');
        if (selectedTags.has('Main-Floor Bedroom')) dei.push('Main-Floor Bedroom');
        if (selectedTags.has('Equal Housing Opportunity')) dei.push('Equal Housing Opportunity');
        if (selectedTags.has('On Public Transit Route')) dei.push('On Public Transit Route');
        if (selectedTags.has('Roommate Matching Available')) dei.push('Roommate Matching Available');
        if (selectedTags.has('Individual Leases')) dei.push('Individual Leases');
        if (selectedTags.has('Short-Term Leases Available')) dei.push('Short-Term Leases Available');
        if (selectedTags.has('Community Events')) dei.push('Community Events');

        const idealApartment = [];
        idealApartment.push(`${beds} Roommates`);
        idealApartment.push(`Under $${budgetMax}`);
        if (selectedTags.has('Utilities Included')) idealApartment.push('Utilities Included');
        if (selectedTags.has('Fully Furnished')) idealApartment.push('Furnished');

        const { error: prefError } = await supabase
          .from('user_profiles')
          .update({
            'Preferred Commute Time (Walk)': [maxWalkTime],
            'Preferred Commute Time (Drive)': [maxDriveTime],
            'Amenities': amenities,
            'Culture': culture,
            'DEI': dei,
            'ideal_apartment': idealApartment,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id);

        if (prefError) {
          console.error('Error saving preferences:', prefError);
        }
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

  const handleWalkTimeChange = (value: number) => {
    setMaxWalkTime(value);
    setHasUnsavedChanges(true);
  };

  const handleDriveTimeChange = (value: number) => {
    setMaxDriveTime(value);
    setHasUnsavedChanges(true);
  };

  const toggleTag = (tag: string) => {
    const newSelectedTags = new Set(selectedTags);
    if (newSelectedTags.has(tag)) {
      newSelectedTags.delete(tag);
      console.log('❌ Removed tag:', tag, 'New set:', Array.from(newSelectedTags));
    } else {
      newSelectedTags.add(tag);
      console.log('✅ Added tag:', tag, 'New set:', Array.from(newSelectedTags));
    }
    setSelectedTags(newSelectedTags);
    setHasUnsavedChanges(true);
  };

  // Avatar functionality removed

  const removeFavorite = (apartmentId: string) => {
    const updatedFavorites = favorites.filter(apt => apt.id !== apartmentId);
    setFavorites(updatedFavorites);
    localStorage.setItem('padmatch-favorites', JSON.stringify(updatedFavorites));
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
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
      <Navbar currentUser={user} onLogout={handleLogout} />

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
                      src={generateUserAvatar(user.username)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Avatar upload removed */}
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

                {/* Bedrooms & Bathrooms */}
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

                {/* Commute Preferences */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Commute to Campus</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Max Walking Time</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={maxWalkTime}
                          onChange={(e) => handleWalkTimeChange(Number(e.target.value))}
                          className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          min="1"
                          max="60"
                          step="1"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">min</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Max Driving Time</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={maxDriveTime}
                          onChange={(e) => handleDriveTimeChange(Number(e.target.value))}
                          className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          min="1"
                          max="120"
                          step="1"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">min</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Maximum time you're willing to spend commuting to campus</p>
                </div>

                {/* Tags Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
                  <div className="text-xs text-gray-500 mb-2">
                    Debug: selectedTags = {Array.from(selectedTags).join(', ') || 'EMPTY'}
                  </div>
                  
                  {Object.entries(tagCategories).map(([category, tags]) => (
                    <div key={category} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 capitalize">{category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const isSelected = selectedTags.has(tag);
                          console.log(`🎨 Rendering tag "${tag}": ${isSelected ? 'SELECTED' : 'NOT SELECTED'}`);
                          return (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                            }`}
                          >
                            {tag}
                          </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
