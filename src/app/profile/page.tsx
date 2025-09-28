'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile as AuthUserProfile } from '@/lib/supabase';
import { authService } from '@/lib/auth';
import { Navbar } from '@/components/navbar';
import { generateUserAvatar } from '@/lib/avatar-generator';
import { supabase } from '@/lib/supabase';
import { Apartment } from '@/types';

interface ProfilePageProps {
  currentUser?: AuthUserProfile | null;
  onUserUpdate?: (user: AuthUserProfile) => void;
}

export default function ProfilePage({ currentUser, onUserUpdate }: ProfilePageProps = {}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserProfile | null>(currentUser || null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingApartments, setIsLoadingApartments] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form state for preferences
  const [budgetMax, setBudgetMax] = useState(2000);
  const [beds, setBeds] = useState(1);
  const [baths, setBaths] = useState(1);
  const [maxWalkTime, setMaxWalkTime] = useState(15);
  const [maxDriveTime, setMaxDriveTime] = useState(20);
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

  // Fetch profile data from Supabase
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
        setProfileData(null);
      } else {
        setProfileData(data);
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load user and profile data
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
    loadApartments();
  }, [currentUser, fetchProfileData, router]);

  // Helper function to safely parse array-like strings
  const parseArrayString = (value: any): string[] => {
    if (!value || typeof value !== 'string') {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse array string:", value, e);
      return [];
    }
  };

  // Sync state from fetched data
  useEffect(() => {
    if (profileData) {
      console.log('🔄 Loading profile data');
      
      const walkTimeArray = parseArrayString(profileData['Preferred Commute Time (Walk)']);
      const walkTime = parseInt(walkTimeArray[0]) || 15;
      const amenities = parseArrayString(profileData['Amenities']);
      const culture = parseArrayString(profileData['Culture']);
      const dei = parseArrayString(profileData['DEI']);
      const idealApartment = parseArrayString(profileData['ideal_apartment']);

      setMaxWalkTime(walkTime);
      setMaxDriveTime(20);

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

      // Map tags from database
      const newSelectedTags = new Set<string>();
      
      amenities.forEach((amenity: string) => {
        newSelectedTags.add(amenity);
      });

      culture.forEach((cultureItem: string) => {
        newSelectedTags.add(cultureItem);
      });

      dei.forEach((deiItem: string) => {
        newSelectedTags.add(deiItem);
      });

      idealApartment.forEach((item: string) => {
        if (item === 'Utilities Included') {
          newSelectedTags.add('Utilities Included');
        }
        if (item === 'Furnished') {
          newSelectedTags.add('Fully Furnished');
        }
      });

      setSelectedTags(newSelectedTags);
      
      // Load favorites from profile data
      let favoritesData = [];
      if (profileData['favorites']) {
        if (Array.isArray(profileData['favorites'])) {
          // If it's already an array (from Supabase text[] column)
          favoritesData = profileData['favorites'];
        } else {
          // If it's a JSON string, parse it
          favoritesData = parseArrayString(profileData['favorites']);
        }
      }
      setFavorites(favoritesData);
      console.log('⭐ Favorites loaded:', favoritesData.length, 'items');
    }
  }, [profileData]);

  const loadApartments = async () => {
    setIsLoadingApartments(true);
    try {
      const response = await fetch('/api/apartments');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const apartmentData = await response.json();
      console.log('📊 Apartments loaded:', apartmentData.length, 'total');
      
      // Check if any favorites match current apartments
      const matchingFavorites = favorites.filter(favId => 
        apartmentData.some((apt: Apartment) => apt.id === favId)
      );
      
      const orphanedFavorites = favorites.filter(favId => 
        !apartmentData.some((apt: Apartment) => apt.id === favId)
      );
      
      // If there are orphaned favorites, clean them up
      if (orphanedFavorites.length > 0) {
        console.log('🧹 Cleaning up orphaned favorites...');
        const cleanedFavorites = matchingFavorites;
        setFavorites(cleanedFavorites);
        
        // Save the cleaned favorites to the database
        if (user) {
          supabase
            .from('user_profiles')
            .update({
              favorites: cleanedFavorites,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.user_id)
            .then(({ error }) => {
              if (error) {
                console.error('Error cleaning up favorites:', error);
              } else {
                console.log('✅ Orphaned favorites cleaned up successfully');
              }
            });
        }
      }
      
      setApartments(apartmentData);
      setFilteredApartments(apartmentData);
    } catch (error) {
      console.error('Error loading apartments:', error);
    } finally {
      setIsLoadingApartments(false);
    }
  };

  // Search function to filter apartments
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredApartments(apartments);
      return;
    }

    const filtered = apartments.filter(apartment => 
      apartment.name.toLowerCase().includes(query.toLowerCase()) ||
      apartment.address.toLowerCase().includes(query.toLowerCase()) ||
      apartment.description.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredApartments(filtered);
  };

  // Toggle favorite status
  const toggleFavorite = async (apartmentId: string) => {
    if (!user) return;
    
    const newFavorites = favorites.includes(apartmentId)
      ? favorites.filter(id => id !== apartmentId)
      : [...favorites, apartmentId];
    
    console.log('⭐ Toggling favorite for:', apartmentId);
    console.log('⭐ Current favorites:', favorites);
    console.log('⭐ New favorites:', newFavorites);
    
    setFavorites(newFavorites);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          favorites: newFavorites,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user_id);

      if (error) {
        console.error('Error updating favorites:', error);
        setFavorites(favorites);
      } else {
        console.log('✅ Favorites saved successfully to database');
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      setFavorites(favorites);
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
        
        if (onUserUpdate) {
          onUserUpdate(updatedUser);
        }
        
        // Save preferences to Supabase
        const amenities = [];
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

        const culture = [];
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
    } else {
      newSelectedTags.add(tag);
    }
    setSelectedTags(newSelectedTags);
    setHasUnsavedChanges(true);
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
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.nickname || 'Your Name'}</h2>
                  <p className="text-sm text-gray-500">@{user.username}</p>
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
                  
                  {Object.entries(tagCategories).map(([category, tags]) => (
                    <div key={category} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 capitalize">{category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const isSelected = selectedTags.has(tag);
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

          {/* Right Column - Apartment Search & Favorites */}
          <div className="bg-white rounded-lg p-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'search'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🔍 Search Apartments
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'favorites'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ⭐ My Favorites ({favorites.length})
              </button>
            </div>

            {/* Search Tab Content */}
            {activeTab === 'search' && (
              <>
                {/* Search Input */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by name, address, or description..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  {searchQuery && (
                    <p className="text-sm text-gray-500 mt-2">
                      {filteredApartments.length} result{filteredApartments.length !== 1 ? 's' : ''} found
                    </p>
                  )}
                </div>
                
                {isLoadingApartments ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading apartments...</p>
                  </div>
                ) : apartments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏠</div>
                    <p className="text-gray-500">No apartments found</p>
                    <p className="text-sm text-gray-400 mt-2">Check your database connection or add some apartment complexes!</p>
                  </div>
                ) : filteredApartments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-gray-500">No apartments match your search</p>
                    <p className="text-sm text-gray-400 mt-2">Try searching for a different term</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {filteredApartments.map((apartment) => {
                      const isFavorited = favorites.includes(apartment.id);
                      return (
                        <div key={apartment.id} className="group relative flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <img
                            src={apartment.photos[0] || '/placeholder-apartment.jpg'}
                            alt={apartment.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{apartment.name}</h4>
                            <p className="text-sm text-gray-600">{apartment.address}</p>
                            <p className="text-sm text-gray-700 font-medium">
                              ${apartment.rent}/month - {apartment.bedrooms} Bed, {apartment.bathrooms} Bath
                            </p>
                            {/* VT-specific info */}
                            <div className="flex items-center gap-2 mt-1">
                              {apartment.distanceToVTCampus && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                  📍 {apartment.distanceToVTCampus}mi to VT
                                </span>
                              )}
                              {apartment.btAccess && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  🚌 BT Bus
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{apartment.description}</p>
                          </div>
                          <div className="flex flex-col space-y-1">
                            {apartment.pros.slice(0, 2).map((pro, index) => (
                              <span key={index} className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                {pro}
                              </span>
                            ))}
                          </div>
                          
                          {/* Favorite Star Button */}
                          <button
                            onClick={() => toggleFavorite(apartment.id)}
                            className={`absolute top-2 right-2 p-1 rounded-full transition-all duration-200 group ${
                              isFavorited 
                                ? 'text-yellow-500 hover:text-yellow-600 opacity-100' 
                                : 'text-gray-300 hover:text-yellow-500 opacity-0 group-hover:opacity-100'
                            }`}
                            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <svg 
                              className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
                              />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Favorites Tab Content */}
            {activeTab === 'favorites' && (
              <>
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">⭐</div>
                    <p className="text-gray-500">No favorites yet</p>
                    <p className="text-sm text-gray-400 mt-2">Start favoriting apartments to see them here!</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {apartments
                      .filter(apartment => favorites.includes(apartment.id))
                      .map((apartment) => (
                        <div key={apartment.id} className="group relative flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <img
                            src={apartment.photos[0] || '/placeholder-apartment.jpg'}
                            alt={apartment.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{apartment.name}</h4>
                            <p className="text-sm text-gray-600">{apartment.address}</p>
                            <p className="text-sm text-gray-700 font-medium">
                              ${apartment.rent}/month - {apartment.bedrooms} Bed, {apartment.bathrooms} Bath
                            </p>
                            {/* VT-specific info */}
                            <div className="flex items-center gap-2 mt-1">
                              {apartment.distanceToVTCampus && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                  📍 {apartment.distanceToVTCampus}mi to VT
                                </span>
                              )}
                              {apartment.btAccess && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  🚌 BT Bus
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{apartment.description}</p>
                          </div>
                          <div className="flex flex-col space-y-1">
                            {apartment.pros.slice(0, 2).map((pro, index) => (
                              <span key={index} className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                {pro}
                              </span>
                            ))}
                          </div>
                          
                          {/* Favorite Star Button - Always filled since these are favorites */}
                          <button
                            onClick={() => toggleFavorite(apartment.id)}
                            className="absolute top-2 right-2 p-1 rounded-full transition-all duration-200 text-yellow-500 hover:text-yellow-600 opacity-100"
                            title="Remove from favorites"
                          >
                            <svg 
                              className="w-5 h-5 fill-current" 
                              fill="currentColor" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
