'use client';

import { Roommate } from '@/types';

interface RoommateListProps {
  roommates: Roommate[];
  currentUser: Roommate | null;
  onLeaveSession?: () => void;
  isAnonymousMode?: boolean;
}

export const RoommateList = ({ roommates, currentUser, onLeaveSession, isAnonymousMode = false }: RoommateListProps) => {
  // Filter to only show online roommates
  const onlineRoommates = roommates.filter(roommate => roommate.isOnline);
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 fixed top-24 right-10 w-80 z-50">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Roommates ({onlineRoommates.length})</h3>
      <div className="space-y-2">
        {onlineRoommates.map((roommate) => (
          <div  
            key={roommate.id}
            className={`flex items-center space-x-3 p-2 rounded-lg ${
              roommate.id === currentUser?.id ? 'bg-gray-100 border border-gray-300' : 'bg-gray-50'
            }`}
          >
            <div className="relative">
              {isAnonymousMode ? (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-medium">?</span>
                </div>
              ) : (
                <img
                  src={roommate.avatar}
                  alt={roommate.nickname}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div
                className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-green-500"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {isAnonymousMode ? (
                  roommate.id === currentUser?.id ? (
                    <>
                      Anonymous (You)
                    </>
                  ) : (
                    'Anonymous'
                  )
                ) : (
                  <>
                    {roommate.nickname}
                    {roommate.id === currentUser?.id && (
                      <span className="ml-2 text-xs text-black font-normal">(You)</span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Leave Session Button */}
      {onLeaveSession && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={onLeaveSession}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Leave Session
          </button>
        </div>
      )}
    </div>
  );
};
