/**
 * Mock Property Listings Data
 * Sample property data with seller/broker ownership for testing
 */

export const MOCK_LISTINGS = [
  {
    id: 'listing_001',
    title: 'Modern 3BR Apartment in Downtown',
    description: 'Beautiful modern apartment with city views, updated kitchen, and in-unit laundry. Walking distance to metro and shopping.',
    price: 450000,
    priceType: 'sale', // 'sale' or 'rent'
    propertyType: 'apartment',
    bedrooms: 3,
    bathrooms: 2,
    area: 1250, // sq ft
    address: {
      street: '125 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      fullAddress: '125 Main Street, San Francisco, CA 94102',
    },
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    ],
    features: ['Parking', 'Gym', 'Pool', 'Balcony', 'Air Conditioning'],
    status: 'active', // 'active', 'pending', 'sold', 'rented'
    ownerId: 'user_202', // Jane Seller
    ownerName: 'Jane Seller',
    ownerRole: 'seller',
    ownerPhone: '+1-555-0123',
    ownerEmail: 'seller@estaty.com',
    createdAt: '2024-02-15T10:00:00.000Z',
    updatedAt: '2024-02-15T10:00:00.000Z',
  },
  {
    id: 'listing_002',
    title: 'Cozy 2BR House with Garden',
    description: 'Charming family house with private garden, renovated kitchen, and quiet neighborhood. Great for families.',
    price: 320000,
    priceType: 'sale',
    propertyType: 'house',
    bedrooms: 2,
    bathrooms: 1.5,
    area: 1100,
    address: {
      street: '45 Oak Avenue',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94110',
      fullAddress: '45 Oak Avenue, San Francisco, CA 94110',
    },
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    ],
    features: ['Garden', 'Parking', 'Fireplace', 'Hardwood Floors'],
    status: 'active',
    ownerId: 'user_303', // Bob Broker
    ownerName: 'Bob Broker',
    ownerRole: 'broker',
    ownerPhone: '+1-555-0456',
    ownerEmail: 'broker@estaty.com',
    createdAt: '2024-02-20T14:30:00.000Z',
    updatedAt: '2024-02-20T14:30:00.000Z',
  },
  {
    id: 'listing_003',
    title: 'Luxury Penthouse with Rooftop Terrace',
    description: 'Stunning penthouse with 360-degree city views, private rooftop terrace, premium finishes throughout.',
    price: 1200000,
    priceType: 'sale',
    propertyType: 'penthouse',
    bedrooms: 4,
    bathrooms: 3.5,
    area: 2800,
    address: {
      street: '1000 Market Street, Unit 50',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103',
      fullAddress: '1000 Market Street, Unit 50, San Francisco, CA 94103',
    },
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    ],
    features: ['Rooftop Terrace', 'Smart Home', 'Concierge', 'Wine Cellar', 'Elevator Access'],
    status: 'active',
    ownerId: 'user_202', // Jane Seller
    ownerName: 'Jane Seller',
    ownerRole: 'seller',
    ownerPhone: '+1-555-0123',
    ownerEmail: 'seller@estaty.com',
    createdAt: '2024-03-01T09:15:00.000Z',
    updatedAt: '2024-03-01T09:15:00.000Z',
  },
  {
    id: 'listing_004',
    title: 'Bright Studio in Mission District',
    description: 'Sunny studio apartment in vibrant Mission District. Modern appliances, high ceilings, walk to BART.',
    price: 2800,
    priceType: 'rent',
    propertyType: 'studio',
    bedrooms: 0,
    bathrooms: 1,
    area: 550,
    address: {
      street: '850 Valencia Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94110',
      fullAddress: '850 Valencia Street, San Francisco, CA 94110',
    },
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    ],
    features: ['In-Unit Laundry', 'Dishwasher', 'High Ceilings', 'Pet Friendly'],
    status: 'active',
    ownerId: 'user_303', // Bob Broker
    ownerName: 'Bob Broker',
    ownerRole: 'broker',
    ownerPhone: '+1-555-0456',
    ownerEmail: 'broker@estaty.com',
    createdAt: '2024-03-10T11:00:00.000Z',
    updatedAt: '2024-03-10T11:00:00.000Z',
  },
  {
    id: 'listing_005',
    title: 'Spacious 4BR Family Home',
    description: 'Large family home with open floor plan, backyard, 2-car garage, and top-rated school district.',
    price: 650000,
    priceType: 'sale',
    propertyType: 'house',
    bedrooms: 4,
    bathrooms: 3,
    area: 2200,
    address: {
      street: '210 Pine Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94108',
      fullAddress: '210 Pine Street, San Francisco, CA 94108',
    },
    images: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800',
    ],
    features: ['Backyard', 'Garage', 'Office Space', 'Walk-in Closet', 'Central AC'],
    status: 'active',
    ownerId: 'user_202', // Jane Seller
    ownerName: 'Jane Seller',
    ownerRole: 'seller',
    ownerPhone: '+1-555-0123',
    ownerEmail: 'seller@estaty.com',
    createdAt: '2024-03-15T16:45:00.000Z',
    updatedAt: '2024-03-15T16:45:00.000Z',
  },
];

export const LISTING_PROPERTY_TYPES = [
  'apartment',
  'house',
  'condo',
  'townhouse',
  'penthouse',
  'studio',
  'land',
  'commercial',
];

export const LISTING_PRICE_TYPES = ['sale', 'rent'];

export const LISTING_STATUSES = ['active', 'pending', 'sold', 'rented', 'off-market'];

export default MOCK_LISTINGS;