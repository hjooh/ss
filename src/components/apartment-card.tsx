'use client';

import { useState } from 'react';
import { Apartment, Rating, Veto, Roommate } from '@/types';

interface ApartmentCardProps {
  apartment: Apartment;
  ratings: Rating[];
  vetos: Veto[];
  roommates: Roommate[];
  currentUser: Roommate | null;
  onRate: (apartmentId: string, stars: number) => void;
  onVeto: (apartmentId: string) => void;
  isVetoed: boolean;
}

export const ApartmentCard = ({
  apartment,
  ratings,
  vetos,
  roommates,
  currentUser,
  onRate,
  onVeto,
  isVetoed
}: ApartmentCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userRating, setUserRating] = useState<number>(0);

  // Get user's current rating
  const userCurrentRating = ratings.find(
    r => r.roommateId === currentUser?.id && r.apartmentId === apartment.id
  )?.stars || 0;

  // Calculate group consensus score
  const apartmentRatings = ratings.filter(r => r.apartmentId === apartment.id);
  const groupScore = apartmentRatings.length > 0 
    ? apartmentRatings.reduce((sum, r) => sum + r.stars, 0) / apartmentRatings.length 
    : 0;

  // Get roommate ratings for display
  const roommateRatings = apartmentRatings.map(rating => {
    const roommate = roommates.find(r => r.id === rating.roommateId);
    return { roommate, rating };
  });

  // Check if current user has vetoed
  const userHasVetoed = vetos.some(
    v => v.roommateId === currentUser?.id && v.apartmentId === apartment.id
  );

  const handleRating = (stars: number) => {
    setUserRating(stars);
    onRate(apartment.id, stars);
  };

  const handleVeto = () => {
    onVeto(apartment.id);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % apartment.photos.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + apartment.photos.length) % apartment.photos.length);
  };

  return (
    <div className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
      isVetoed ? 'opacity-60 border-2 border-red-300' : 'border border-gray-200'
    }`}>
      {/* Veto Overlay */}
      {isVetoed && (
        <div className="absolute inset-0 bg-red-100 bg-opacity-90 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-6xl mb-2">🚫</div>
            <p className="text-red-800 font-bold text-lg">VETOED</p>
            <p className="text-red-600 text-sm">
              {vetos.find(v => v.apartmentId === apartment.id)?.roommateId && 
                roommates.find(r => r.id === vetos.find(v => v.apartmentId === apartment.id)?.roommateId)?.nickname
              } vetoed this listing
            </p>
          </div>
        </div>
      )}

      {/* Image Carousel */}
      <div className="relative h-64 bg-gray-200">
        <img
          src={apartment.photos[currentImageIndex]}
          alt={`${apartment.name} - Image ${currentImageIndex + 1}`}
          className="w-full h-full object-cover"
        />
        
        {apartment.photos.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              ←
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              →
            </button>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {apartment.photos.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{apartment.name}</h2>
            <p className="text-gray-600 text-sm">{apartment.address}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">${apartment.rent}</p>
            <p className="text-sm text-gray-500">per month</p>
          </div>
        </div>

        {/* Property Details */}
        <div className="flex space-x-4 mb-4 text-sm text-gray-600">
          <span>{apartment.bedrooms} bed</span>
          <span>{apartment.bathrooms} bath</span>
          <span>{apartment.sqft} sqft</span>
        </div>

        {/* Group Consensus Score */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Group Score</span>
            <span className="text-lg font-bold text-blue-600">
              {groupScore > 0 ? groupScore.toFixed(1) : '—'}
            </span>
          </div>
          
          {/* Individual Ratings */}
          <div className="flex flex-wrap gap-2">
            {roommateRatings.map(({ roommate, rating }) => (
              <div key={rating.roommateId} className="flex items-center space-x-1">
                <img
                  src={roommate?.avatar}
                  alt={roommate?.nickname}
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-xs text-gray-600">{rating.stars}★</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pros and Cons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h4 className="font-semibold text-green-700 mb-2">Pros</h4>
            <ul className="space-y-1">
              {apartment.pros.map((pro, index) => (
                <li key={index} className="text-sm text-gray-700">{pro}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-red-700 mb-2">Cons</h4>
            <ul className="space-y-1">
              {apartment.cons.map((con, index) => (
                <li key={index} className="text-sm text-gray-700">{con}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rating Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Your Rating</span>
            <span className="text-sm text-gray-500">
              {userCurrentRating > 0 ? `${userCurrentRating} stars` : 'Not rated'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                disabled={isVetoed}
                className={`text-2xl transition-colors ${
                  star <= userCurrentRating
                    ? 'text-yellow-400'
                    : 'text-gray-300 hover:text-yellow-300'
                } ${isVetoed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                ★
              </button>
            ))}
          </div>

          {/* Veto Button */}
          <button
            onClick={handleVeto}
            disabled={isVetoed || userHasVetoed}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              userHasVetoed
                ? 'bg-red-200 text-red-600 cursor-not-allowed'
                : isVetoed
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            {userHasVetoed ? 'You Vetoed This' : isVetoed ? 'Already Vetoed' : 'Veto This Listing'}
          </button>
        </div>
      </div>
    </div>
  );
};
