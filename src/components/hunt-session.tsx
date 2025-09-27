'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { RoommateList } from './roommate-list';
import { ApartmentComparison } from './apartment-comparison';
import { TopContenders } from './top-contenders';
import { SessionSettings } from './session-settings';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { generateRoomBackground, generateBackgroundDataURL } from '@/lib/background-generator';
import toast from 'react-hot-toast';

interface HuntSessionProps {
  onLeaveSession: () => void;
  socketHook: ReturnType<typeof useSocket>;
}

export const HuntSession = ({ onLeaveSession, socketHook }: HuntSessionProps) => {
  // Panel state management (roommates now always visible)
  const [activePanel, setActivePanel] = useState<'contenders' | 'settings' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { sessionState, voteApartment, forceEndRound, hostTiebreak, startSession, updateSettings, updateRoomName } = socketHook;
  // const [showTooltip, setShowTooltip] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isCopyDisabled, setIsCopyDisabled] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
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

  console.log('HuntSession: sessionState:', sessionState);
  console.log('HuntSession: session:', session);
  console.log('HuntSession: currentUser:', currentUser);
  console.log('HuntSession: isHost?', currentUser?.id === session?.hostId);
  console.log('HuntSession: session.hostId:', session?.hostId);
  console.log('HuntSession: currentUser.id:', currentUser?.id);
  console.log('HuntSession: session.settings:', session?.settings);

  if (!session || !currentUser) {
    console.log('HuntSession: Showing loading state');
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
    forceEndRound();
  };

  const handleHostTiebreak = (winnerId: string) => {
    hostTiebreak(winnerId);
  };

  // Panel toggle handler (roommates no longer toggleable)
  const handlePanelToggle = (panelName: 'contenders' | 'settings') => {
    if (panelName === 'settings') {
      setShowSettings(!showSettings);
    } else {
      setActivePanel(prevPanel => (prevPanel === panelName ? null : panelName));
    }
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
          <div className="lg:col-span-3">
            {session.currentMatchup ? (
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
                />
              </div>
            ) : session.championApartment ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tournament Complete!</h2>
                <p className="text-gray-600 mb-6">
                  The winner is: <strong>{session.championApartment.name}</strong>
                </p>
                <div className="bg-white rounded-lg p-6 shadow-sm max-w-md mx-auto text-left">
    <img src={session.championApartment.photos[0]} />
    <h3 className="text-lg font-semibold">{session.championApartment.name}</h3>
    <p className="text-gray-600">{session.championApartment.address}</p>
    <p className="text-2xl font-bold text-green-600 mt-2">{session.championApartment.rent}/month</p>
                  </div>
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
                      Click to copy the code: {" "}
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
                  </div>
                  <button
                    onClick={onLeaveSession}
                    className="absolute top-4 right-4 flex h-10 cursor-pointer items-center justify-center rounded-lg bg-white/20 px-4 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                  >
                    Leave Room
                  </button>
                </div>

                {/* Start Button / Status */}
                <div className="mb-12">
                  {currentUser?.id === session.hostId ? (
                    <button
                      onClick={startSession}
                      className="h-14 w-full cursor-pointer rounded-lg bg-blue-600 px-5 text-lg font-bold text-white transition-transform hover:scale-105"
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

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Sidebar with permanent roommates list */}
            <div className="sticky top-8 space-y-6">
              {/* Always visible roommates */}
              <RoommateList
                roommates={session.roommates}
                currentUser={currentUser}
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
        </div>
      </div>
    </div>
  );
};