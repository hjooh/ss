'use client';

import { Roommate } from '@/types';

interface RoommateListProps {
  roommates: Roommate[];
  currentUser: Roommate | null;
}

export const RoommateList = ({ roommates, currentUser }: RoommateListProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Roommates ({roommates.length})</h3>
      <div className="space-y-2">
        {roommates.map((roommate) => (
          <div
            key={roommate.id}
            className={`flex items-center space-x-3 p-2 rounded-lg ${
              roommate.id === currentUser?.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
            }`}
          >
            <div className="relative">
              <img
                src={roommate.avatar}
                alt={roommate.nickname}
                className="w-8 h-8 rounded-full"
              />
              <div
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  roommate.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {roommate.nickname}
                {roommate.id === currentUser?.id && (
                  <span className="ml-2 text-xs text-blue-600 font-normal">(You)</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {roommate.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
