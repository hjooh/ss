'use client';

import { useState, useEffect } from 'react';
import { useSessionAPI } from '@/hooks/use-session-api';
import { RoommateList } from './roommate-list';
import { ApartmentComparison } from './apartment-comparison';
import { SessionSettings } from './session-settings';
import { MidpointInsights } from './midpoint-insights';
import { generateRoomBackground, generateBackgroundDataURL } from '@/lib/background-generator';
import toast from 'react-hot-toast';
import { HuntSession as HuntSessionType, Apartment, Matchup } from '@/types';

interface HuntSessionAPIProps {
  onLeaveSession: () => void;
  sessionHook: ReturnType<typeof useSessionAPI>;
}

export const HuntSessionAPI = ({ onLeaveSession, sessionHook }: HuntSessionAPIProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showMidpointInsights, setShowMidpointInsights] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [editedRoomName, setEditedRoomName] = useState('');
  
  const { sessionState } = sessionHook;
  const { session, currentUser } = sessionState;

  // Generate background when session changes
  useEffect(() => {
    if (session?.code) {
      const backgroundConfig = generateRoomBackground(session.code);
      const dataURL = generateBackgroundDataURL(backgroundConfig, 800, 600);
      setBackgroundImage(dataURL);
    }
  }, [session?.code]);

  // Initialize room name
  useEffect(() => {
    if (session?.name && !editedRoomName) {
      setEditedRoomName(session.name);
    }
  }, [session?.name, editedRoomName]);

  // Simple session management functions for API mode
  const startSession = () => {
    if (!session || !currentUser) return;
    
    if (currentUser.id !== session.hostId) {
      toast.error('Only the host can start the session');
      return;
    }

    if (session.availableApartments.length < 2) {
      toast.error('Need at least 2 apartments to start ranking');
      return;
    }

    // Create a simple matchup for API mode
    const matchup: Matchup = {
      id: `matchup-${Date.now()}`,
      leftApartment: session.availableApartments[0],
      rightApartment: session.availableApartments[1],
      votes: [],
      status: 'active',
      createdAt: new Date(),
      isRankingComparison: true
    };

    // Update session state (in a real implementation, this would be stored in a database)
    const updatedSession = {
      ...session,
      currentMatchup: matchup,
      rankingSystem: {
        ...session.rankingSystem,
        isRanking: true,
        currentComparison: session.availableApartments[0]
      }
    };

    // For now, just show a toast since we don't have real-time updates
    toast.success('Session started! (API mode - limited functionality)');
  };

  const voteApartment = (apartmentId: string) => {
    if (!session?.currentMatchup) return;
    
    // Simple vote handling for API mode
    toast.success(`Voted for apartment ${apartmentId} (API mode)`);
  };

  const forceEndRound = () => {
    toast.info('Round ended (API mode)');
  };

  const hostTiebreak = (winnerId: string) => {
    toast.info(`Host tiebreak: ${winnerId} wins (API mode)`);
  };

  const updateSettings = (newSettings: any) => {
    toast.info('Settings updated (API mode)');
  };

  const updateRoomName = (newName: string) => {
    setEditedRoomName(newName);
    toast.info('Room name updated (API mode)');
  };

  if (!session || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Background */}
      {backgroundImage && (
        <div 
          className="fixed inset-0 opacity-10 z-0"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}

      {/* Header */}
      <div className="relative z-10 bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Room Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Room Code:</span>
                <span className="font-mono font-bold text-lg bg-gray-100 px-3 py-1 rounded">
                  {session.code}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(session.code);
                    toast.success('Room code copied!');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  📋
                </button>
              </div>
              
              {/* Room Name */}
              <div className="flex items-center space-x-2">
                {isEditingRoomName ? (
                  <input
                    type="text"
                    value={editedRoomName}
                    onChange={(e) => setEditedRoomName(e.target.value)}
                    onBlur={() => {
                      updateRoomName(editedRoomName);
                      setIsEditingRoomName(false);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        updateRoomName(editedRoomName);
                        setIsEditingRoomName(false);
                      }
                    }}
                    className="text-lg font-semibold bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingRoomName(true)}
                    className="text-lg font-semibold hover:bg-gray-100 px-2 py-1 rounded"
                  >
                    {editedRoomName || session.name}
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSettings(true)}
                className="text-gray-600 hover:text-gray-900"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={onLeaveSession}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Roommates */}
          <div className="lg:col-span-1">
            <RoommateList 
              roommates={session.roommates}
              currentUser={currentUser}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {!session.currentMatchup ? (
              /* Session Not Started */
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Ready to Start Your Hunt?
                </h2>
                <p className="text-gray-600 mb-6">
                  You have {session.availableApartments.length} apartments ready to rank.
                </p>
                {currentUser?.id === session.hostId && (
                  <button
                    onClick={startSession}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700"
                  >
                    Start Ranking Session
                  </button>
                )}
                {currentUser?.id !== session.hostId && (
                  <p className="text-gray-500">
                    Waiting for the host to start the session...
                  </p>
                )}
              </div>
            ) : (
              /* Active Session */
              <ApartmentComparison
                matchup={session.currentMatchup}
                currentUser={currentUser}
                onVote={voteApartment}
                onForceEndRound={forceEndRound}
                onHostTiebreak={hostTiebreak}
                isHost={currentUser?.id === session.hostId}
              />
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SessionSettings
          settings={session.settings}
          onUpdateSettings={updateSettings}
          onClose={() => setShowSettings(false)}
          isHost={currentUser?.id === session.hostId}
        />
      )}

      {/* Midpoint Insights Modal */}
      {showMidpointInsights && (
        <MidpointInsights
          session={session}
          onClose={() => setShowMidpointInsights(false)}
          onRefineSearch={() => {}}
        />
      )}
    </div>
  );
};

