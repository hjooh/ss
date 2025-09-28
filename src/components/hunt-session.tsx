'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { RoommateList } from './roommate-list';
import { ApartmentComparison } from './apartment-comparison';
import { SessionSettings } from './session-settings';
import { AILoadingScreen } from './ai-loading-screen';
import { Settings } from 'lucide-react';
import { MidpointInsights } from './midpoint-insights';
import { generateRoomBackground, generateBackgroundDataURL } from '@/lib/background-generator';
import toast from 'react-hot-toast';

interface HuntSessionProps {
  onLeaveSession: () => void;
  socketHook: ReturnType<typeof useSocket>;
}

export const HuntSession = ({ onLeaveSession, socketHook }: HuntSessionProps) => {
  // Panel state management (roommates now always visible)
  const [showSettings, setShowSettings] = useState(false);
  const { sessionState, voteApartment, forceEndRound, hostTiebreak, startSession, updateSettings, updateRoomName, isAIGenerating, aiMessage } = socketHook;
  // const [showTooltip, setShowTooltip] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isCopyDisabled, setIsCopyDisabled] = useState(false);
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [editedRoomName, setEditedRoomName] = useState('');
  const { session, currentUser } = sessionState;

  // Generate background when session changes
  useEffect(() => {
    if (session?.code) {
      const backgroundConfig = generateRoomBackground(session.code);
      const dataURL = generateBackgroundDataURL(backgroundConfig, 800, 600);
      setBackgroundImage(dataURL);
    }
  }, [session?.code]);

  // Midpoint insights state for binary search ranking
  const [showMidpointInsights, setShowMidpointInsights] = useState(false);
  const hasRedirectedToMidpoint = useRef(false);
  useEffect(() => {
    if (!session || !session.rankingSystem || !session.availableApartments) return;
    if (hasRedirectedToMidpoint.current) return;

    const total = session.availableApartments.length;
    if (!total || total < 2) return;

    const halfway = Math.floor(total / 2); // one less for odd numbers
    const progress = session.rankingSystem.rankingProgress || 0;

    if (session.rankingSystem.isRanking && progress >= halfway && halfway > 0) {
      hasRedirectedToMidpoint.current = true;
      // Show midpoint insights within the hunt session
      setShowMidpointInsights(true);
    }
  }, [session?.rankingSystem?.rankingProgress, session?.rankingSystem?.isRanking, session?.availableApartments?.length, session]);



  if (!session || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
          <p className="text-sm text-gray-500 mt-2">
            Session: {session ? 'exists' : 'null'}, User: {currentUser ? 'exists' : 'null'}
          </p>
        </div>
      </div>
    );
  }


  const handleVote = (apartmentId: string) => {
    voteApartment(apartmentId);
  };

  const handleForceEndRound = () => {
    console.log('[UI] Host clicked Force End Round');
    forceEndRound();
  };

  const handleHostTiebreak = (winnerId: string) => {
    hostTiebreak(winnerId);
  };


  const copySessionCode = async () => {
    // Prevent spam clicking
    if (isCopyDisabled) {
      return;
    }

    try {
      // Disable button immediately
      setIsCopyDisabled(true);
      
      await navigator.clipboard.writeText(session.code);
      toast.success('Room code copied to clipboard!');
      
      // Re-enable button after 2 seconds
      setTimeout(() => {
        setIsCopyDisabled(false);
      }, 500);
    } catch (error) {
      console.error('Failed to copy session code:', error);
      toast.error('Failed to copy room code');
      
      // Re-enable button even on error
      setTimeout(() => {
        setIsCopyDisabled(false);
      }, 1000);
    }
  };

  const handleStartEditingRoomName = () => {
    if (currentUser?.id !== session?.hostId) return;
    setEditedRoomName(session?.name || '');
    setIsEditingRoomName(true);
  };

  const handleSaveRoomName = () => {
    console.log('🏠 handleSaveRoomName called with:', editedRoomName);
    
    if (!editedRoomName.trim()) {
      console.log('❌ Room name is empty');
      toast.error('Room name cannot be empty');
      return;
    }
    
    if (editedRoomName.length > 50) {
      console.log('❌ Room name too long:', editedRoomName.length);
      toast.error('Room name must be 50 characters or less');
      return;
    }

    console.log('✅ Calling updateRoomName with:', editedRoomName.trim());
    updateRoomName(editedRoomName.trim());
    setIsEditingRoomName(false);
  };

  const handleCancelEditingRoomName = () => {
    setIsEditingRoomName(false);
    setEditedRoomName('');
  };

  const handleRoomNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRoomName();
    } else if (e.key === 'Escape') {
      handleCancelEditingRoomName();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className={`lg:col-span-3 ${session.currentMatchup ? 'lg:col-span-4' : ''}`}>
            {showMidpointInsights ? (
              <MidpointInsights 
                session={{
                  id: session.id,
                  code: session.code,
                  name: session.name,
                  currentRound: session.rankingSystem?.rankingProgress || 1,
                  settings: { numberOfRounds: session.settings?.numberOfApartments || 10 },
                  championApartment: session.championApartment ? {
                    ...session.championApartment,
                    distance: (session.championApartment as { distance?: number }).distance || 1.5
                  } : undefined,
                  eliminatedApartments: (session.rankingSystem?.rankedApartments || []).map(apt => ({
                    ...apt,
                    distance: (apt as { distance?: number }).distance || 1.5 // Default distance if not present
                  })),
                  matchupLog: session.rankingSystem?.comparisonHistory || [],
                  availableApartments: session.availableApartments.map(apt => ({
                    ...apt,
                    distance: (apt as { distance?: number }).distance || 1.5 // Default distance if not present
                  }))
                }}
                onContinue={() => setShowMidpointInsights(false)}
                onRefineSearch={(priority, direction) => {
                  console.log('Refining search with priority:', priority, 'direction:', direction);
                  setShowMidpointInsights(false);
                }}
              />
            ) : session.currentMatchup ? (
              <div className="space-y-6">
                {/* Apartment Comparison */}
                <ApartmentComparison
                  matchup={session.currentMatchup}
                  roommates={session.roommates}
                  currentUser={currentUser}
                  onVote={handleVote}
                  onForceEndRound={handleForceEndRound}
                  onHostTiebreak={handleHostTiebreak}
                  isHost={currentUser?.id === session.hostId}
                  roundNumber={session.rankingSystem?.rankingProgress || 1}
                  isAnonymousMode={!session.settings?.showIndividualRatings}
                />
              </div>
            ) : session.championApartment ? (
              <div className="py-12">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Ranking Complete!</h2>
                  <p className="text-gray-600 mb-6">
                    Here&apos;s how your group ranked all the apartments:
                  </p>
                </div>
                
                {/* Champion Display */}
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">🥇</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-yellow-800">#1 Champion</h3>
                      <h4 className="text-lg font-semibold text-gray-900">{session.championApartment.name}</h4>
                      <p className="text-gray-600">{session.championApartment.address}</p>
                      <p className="text-xl font-bold text-green-600 mt-1">{session.championApartment.rent}/month</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-600">
                        {session.rankingSystem?.apartmentVoteCounts?.[session.championApartment.id] || 0}
                      </div>
                      <div className="text-sm text-gray-600">votes</div>
                    </div>
                  </div>
                </div>
                
                {/* Full Ranking List */}
                {session.rankingSystem?.finalRanking && (
                  <div className="max-w-4xl mx-auto">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Complete Ranking</h3>
                    <div className="space-y-3">
                      {session.rankingSystem.finalRanking.map((item: { apartment: { id: string; name: string; address: string; rent: number }; rank: number; totalVotes: number; winPercentage: number }, index: number) => (
                        <div 
                          key={`${item.apartment.id}-${index}`}
                          className={`bg-white rounded-lg p-4 shadow-sm border-l-4 ${
                            index === 0 ? 'border-yellow-400 bg-yellow-50' :
                            index === 1 ? 'border-gray-300 bg-gray-50' :
                            index === 2 ? 'border-amber-600 bg-amber-50' :
                            'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="text-2xl font-bold text-gray-600 w-8">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${item.rank}`}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-gray-900">{item.apartment.name}</h4>
                                <p className="text-gray-600 text-sm">{item.apartment.address}</p>
                                <p className="text-gray-700 font-medium">{item.apartment.rent}/month</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-blue-600">
                                {item.totalVotes}
                              </div>
                              <div className="text-sm text-gray-600">votes</div>
                              {item.winPercentage > 0 && (
                                <div className="text-xs text-green-600 mt-1">
                                  {item.winPercentage.toFixed(0)}% win rate
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Hero Banner */}
                <div className="relative mb-8 h-80 w-full overflow-hidden rounded-xl">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url('${backgroundImage || session.availableApartments?.[0]?.photos?.[0] || '/window.svg'}')`
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-8 text-white">
                    {isEditingRoomName ? (
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={editedRoomName}
                          onChange={(e) => setEditedRoomName(e.target.value)}
                          onKeyDown={handleRoomNameKeyPress}
                          className="text-4xl font-bold bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:outline-none focus:border-white/50"
                          placeholder="Enter room name..."
                          maxLength={50}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveRoomName}
                          className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 font-semibold transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEditingRoomName}
                          className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <h1 className="text-4xl font-bold">{session.name || 'Apartment Hunt'}</h1>
                        {currentUser?.id === session.hostId && (
                          <button
                            onClick={handleStartEditingRoomName}
                            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-3 py-1 text-sm font-semibold transition-colors"
                            title="Edit room name"
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-white/80 mt-2">
                      Click to copy the code: &nbsp;
                      <button
                        onClick={copySessionCode}
                        disabled={isCopyDisabled}
                        className={`font-semibold text-white hover:text-blue-200 transition-colors ${
                          isCopyDisabled 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'cursor-pointer'
                        }`}
                      >
                        {isCopyDisabled ? 'Copying...' : session.code}
                      </button>
                    </p>
                    
                    {/* Ranking Progress Display */}
                    {session.rankingSystem && session.rankingSystem.isRanking && (
                      <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">🔍</div>
                          <div>
                            <h3 className="text-lg font-semibold">Binary Search Ranking</h3>
                            <p className="text-sm text-white/80">
                              Ranking apartments by preference... {session.rankingSystem.rankingProgress} of {session.availableApartments.length} completed
                            </p>
                            <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                              <div 
                                className="bg-blue-400 h-2 rounded-full transition-all duration-300" 
                                style={{ 
                                  width: `${(session.rankingSystem.rankingProgress / session.availableApartments.length) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Start Button / Status */}
                <div className="mb-12">
                  {currentUser?.id === session.hostId ? (
                    <button
                      onClick={startSession}
                      className="h-14 w-full cursor-pointer rounded-lg bg-black px-5 text-lg font-bold text-white transition-transform hover:scale-105"
                    >
                      Start Swiping
                    </button>
                  ) : (
                    <p className="text-center text-gray-600">
                      Waiting for the host to start the tournament...
                    </p>
                  )}
                </div>

                {/* Roommates + Settings */}
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                  <div className="lg:col-span-2">
                    <h2 className="mb-4 text-2xl font-bold text-gray-900"></h2>
                    <div className="divide-y divide-gray-100 rounded-lg bg-white shadow-sm">
                      <SessionSettings
                        settings={session.settings}
                        onUpdateSettings={updateSettings}
                        isHost={currentUser?.id === session.hostId}
                      />
                    </div>
                    </div>

                
                </div>
              </div>
            )}
          </div>

          {/* Sidebar (hidden during active matchup) */}
          {!session.currentMatchup && (
            <div className="lg:col-span-1">
              {/* Sidebar with permanent roommates list */}
              <div className="sticky top-8 space-y-6">
                {/* Always visible roommates */}
                <RoommateList
                  roommates={session.roommates}
                  currentUser={currentUser}
                  onLeaveSession={onLeaveSession}
                  isAnonymousMode={!session.settings?.showIndividualRatings}
                />
                
                {/* {activePanel === 'contenders' && (
                  <TopContenders
                    session={session}
                  />
                )} */}
                
                {showSettings && (
                  <SessionSettings
                    settings={session.settings || {
                      requireUnanimousVoting: false,
                      allowVetoOverride: true,
                      minimumRatingToPass: 3,
                      allowMembersToControlNavigation: true,
                      autoAdvanceOnConsensus: false,
                      sessionTimeout: 60,
                      maxRent: null,
                      minBedrooms: null,
                      maxCommute: null,
                      showIndividualRatings: true,
                      allowGuestJoining: true,
                      notifyOnNewRatings: true,
                      notifyOnVetos: true
                    }}
                    onUpdateSettings={updateSettings}
                    isHost={currentUser?.id === session.hostId}
                    onClose={() => setShowSettings(false)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* AI Loading Screen */}
      <AILoadingScreen 
        isVisible={isAIGenerating} 
        message={aiMessage} 
        roomCode={session?.code} 
      />
    </div>
  );
};