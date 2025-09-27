import { Apartment } from '@/types';

export const sampleApartments: Apartment[] = [
  {
    id: 'apt-1',
    name: 'The Mill',
    address: '123 Mill Street, Blacksburg, VA 24060',
    rent: 1200,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 950,
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ 5-minute walk to Virginia Tech campus',
      '✓ Recently renovated kitchen with granite countertops',
      '✓ In-unit washer and dryer',
      '✓ Pet-friendly with no breed restrictions',
      '✓ Covered parking included'
    ],
    cons: [
      '✗ Higher rent compared to similar units',
      '✗ No central air conditioning',
      '✗ Limited storage space',
      '✗ Street parking can be difficult on game days'
    ],
    description: 'Modern 2-bedroom apartment in the heart of downtown Blacksburg, perfect for students who want to be close to campus and local amenities.'
  },
  {
    id: 'apt-2',
    name: 'Foxridge Apartments',
    address: '456 Foxridge Drive, Blacksburg, VA 24060',
    rent: 850,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1100,
    photos: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ Affordable rent with great value',
      '✓ Two full bathrooms - no sharing!',
      '✓ Large living room with fireplace',
      '✓ Balcony with mountain views',
      '✓ On-site fitness center'
    ],
    cons: [
      '✗ 15-minute drive to campus',
      '✗ Older building with some maintenance issues',
      '✗ Limited public transportation',
      '✗ No in-unit laundry'
    ],
    description: 'Spacious 2-bedroom, 2-bathroom apartment with stunning mountain views. Great for students with cars who don\'t mind the commute.'
  },
  {
    id: 'apt-3',
    name: 'Terrace View',
    address: '789 Terrace View Lane, Blacksburg, VA 24060',
    rent: 1100,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1300,
    photos: [
      'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ Three bedrooms for maximum flexibility',
      '✓ Updated appliances and fixtures',
      '✓ Large private deck',
      '✓ Close to shopping and restaurants',
      '✓ Assigned parking spaces'
    ],
    cons: [
      '✗ Higher utility costs due to size',
      '✗ Can be noisy on weekends',
      '✗ Limited natural light in bedrooms',
      '✗ Strict pet policy'
    ],
    description: 'Perfect for groups of three! This spacious 3-bedroom apartment offers plenty of room to spread out and entertain.'
  },
  {
    id: 'apt-4',
    name: 'Campus Heights',
    address: '321 Campus Heights Boulevard, Blacksburg, VA 24060',
    rent: 950,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 900,
    photos: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ Walking distance to campus (10 minutes)',
      '✓ Recently painted and cleaned',
      '✓ Quiet neighborhood',
      '✓ Responsive maintenance team',
      '✓ Utilities included in rent'
    ],
    cons: [
      '✗ Small kitchen with limited counter space',
      '✗ No dishwasher',
      '✗ Street parking only',
      '✗ Older building with some quirks'
    ],
    description: 'Cozy 2-bedroom apartment in a quiet residential area. Perfect for students who prioritize location and simplicity.'
  },
  {
    id: 'apt-5',
    name: 'The Lofts at Main',
    address: '555 Main Street, Blacksburg, VA 24060',
    rent: 1300,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ Luxury finishes and modern design',
      '✓ Two full bathrooms',
      '✓ In-unit washer and dryer',
      '✓ Rooftop terrace access',
      '✓ Prime downtown location'
    ],
    cons: [
      '✗ Most expensive option',
      '✗ Limited parking availability',
      '✗ Can be noisy at night',
      '✗ Strict lease terms'
    ],
    description: 'Upscale living in the heart of downtown Blacksburg. Perfect for students who want luxury amenities and don\'t mind paying premium prices.'
  },
  {
    id: 'apt-6',
    name: 'Garden View Apartments',
    address: '888 Garden View Circle, Blacksburg, VA 24060',
    rent: 800,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 850,
    photos: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ Most affordable option',
      '✓ Beautiful garden views',
      '✓ Quiet, family-friendly complex',
      '✓ Plenty of green space',
      '✓ On-site management office'
    ],
    cons: [
      '✗ 20-minute drive to campus',
      '✗ Limited public transportation',
      '✗ Older appliances',
      '✗ No in-unit laundry'
    ],
    description: 'Budget-friendly option with beautiful surroundings. Great for students who have cars and want to save money on rent.'
  },
  {
    id: 'apt-7',
    name: 'University Commons',
    address: '777 University Commons Drive, Blacksburg, VA 24060',
    rent: 1050,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 1000,
    photos: [
      'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ 8-minute walk to campus',
      '✓ Large windows with natural light',
      '✓ Updated kitchen with island',
      '✓ Walk-in closets in both bedrooms',
      '✓ Covered parking available'
    ],
    cons: [
      '✗ Higher rent for the area',
      '✗ Limited storage space',
      '✗ Can be drafty in winter',
      '✗ No balcony or outdoor space'
    ],
    description: 'Well-located apartment with modern amenities. Perfect balance of convenience and comfort for Virginia Tech students.'
  },
  {
    id: 'apt-8',
    name: 'The Reserve at Blacksburg',
    address: '999 Reserve Lane, Blacksburg, VA 24060',
    rent: 1150,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1150,
    photos: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ Two full bathrooms',
      '✓ Modern appliances and fixtures',
      '✓ Large living room',
      '✓ Private patio',
      '✓ On-site pool and gym'
    ],
    cons: [
      '✗ 12-minute drive to campus',
      '✗ Higher utility costs',
      '✗ Limited parking spaces',
      '✗ Can be noisy from pool area'
    ],
    description: 'Modern apartment complex with resort-style amenities. Great for students who want luxury living with recreational facilities.'
  }
];
