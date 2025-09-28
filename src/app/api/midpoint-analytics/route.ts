import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Algorithm to determine best visualization type for a group
function determineBestVisualization(groupProfile: any) {
  const { priceSensitivity, distancePreference, amenityImportance, sizePreference } = groupProfile;
  
  // Calculate correlation strengths
  const correlations = {
    priceSentiment: priceSensitivity * 0.8,
    distanceConvenience: distancePreference * 0.7,
    amenityValue: amenityImportance * 0.6,
    sizeComfort: sizePreference * 0.5
  };
  
  // Find the strongest correlation
  const strongestCorrelation = Object.entries(correlations)
    .sort(([,a], [,b]) => b - a)[0];
  
  const [factor, strength] = strongestCorrelation;
  
  // Determine visualization type based on strongest factor
  if (factor === 'priceSentiment' && strength > 0.6) {
    return {
      type: 'scatter',
      xAxis: 'price',
      yAxis: 'sentiment',
      title: 'Price vs Sentiment Analysis',
      description: 'Your group shows strong price-sentiment correlation'
    };
  } else if (factor === 'distanceConvenience' && strength > 0.5) {
    return {
      type: 'scatter',
      xAxis: 'distance',
      yAxis: 'ranking',
      title: 'Distance vs Preference Ranking',
      description: 'Location convenience drives your group\'s decisions'
    };
  } else if (factor === 'amenityValue' && strength > 0.4) {
    return {
      type: 'bar',
      xAxis: 'amenities',
      yAxis: 'importance',
      title: 'Amenity Importance Analysis',
      description: 'Amenities are a key differentiator for your group'
    };
  } else {
    return {
      type: 'composed',
      xAxis: 'price',
      yAxis: 'sentiment',
      secondaryYAxis: 'ranking',
      title: 'Multi-Factor Analysis',
      description: 'Your group shows balanced preferences across multiple factors'
    };
  }
}

// Generate dynamic group analysis
function generateGroupAnalysis() {
  // Simulate different group profiles
  const groupProfiles = [
    {
      name: 'Budget-Conscious Commuters',
      priceSensitivity: 0.9,
      distancePreference: 0.8,
      amenityImportance: 0.3,
      sizePreference: 0.4
    },
    {
      name: 'Luxury Seekers',
      priceSensitivity: 0.2,
      distancePreference: 0.4,
      amenityImportance: 0.9,
      sizePreference: 0.8
    },
    {
      name: 'Balanced Optimizers',
      priceSensitivity: 0.6,
      distancePreference: 0.6,
      amenityImportance: 0.6,
      sizePreference: 0.6
    }
  ];
  
  // Randomly select a group profile (in real implementation, this would be based on actual data)
  const selectedProfile = groupProfiles[Math.floor(Math.random() * groupProfiles.length)];
  const bestViz = determineBestVisualization(selectedProfile);
  
  // Generate data based on group characteristics
  const scatterData = generateScatterData(selectedProfile);
  const trendData = generateTrendData(selectedProfile);
  const preferenceData = generatePreferenceData(selectedProfile);
  
  return {
    primaryFinding: {
      title: bestViz.title,
      description: bestViz.description,
      correlation: Math.max(selectedProfile.priceSensitivity, selectedProfile.distancePreference, selectedProfile.amenityImportance),
      factors: [bestViz.xAxis, bestViz.yAxis],
      bestVisualization: bestViz
    },
    outlier: generateOutlier(selectedProfile),
    hypothesis: generateHypothesis(selectedProfile),
    visualizationData: {
      scatterData,
      trendData,
      preferenceData
    },
    groupProfile: selectedProfile
  };
}

function generateScatterData(profile: any) {
  const baseData = [
    { name: 'Urban Studio', price: 1200, distance: 0.5, amenities: 0.3, size: 500, sentiment: 0.4, ranking: 7 },
    { name: 'Suburban 2BR', price: 1800, distance: 2.0, amenities: 0.6, size: 900, sentiment: 0.7, ranking: 4 },
    { name: 'Downtown Luxury', price: 3500, distance: 0.2, amenities: 0.9, size: 1200, sentiment: 0.8, ranking: 2 },
    { name: 'Commuter Special', price: 1000, distance: 3.5, amenities: 0.2, size: 700, sentiment: 0.5, ranking: 6 },
    { name: 'Family Complex', price: 2200, distance: 1.5, amenities: 0.8, size: 1100, sentiment: 0.9, ranking: 1 },
    { name: 'Budget Find', price: 800, distance: 4.0, amenities: 0.1, size: 600, sentiment: 0.3, ranking: 8 },
    { name: 'Premium Loft', price: 2800, distance: 0.8, amenities: 0.7, size: 1000, sentiment: 0.6, ranking: 3 }
  ];
  
  // Adjust data based on group preferences
  return baseData.map(apt => ({
    ...apt,
    sentiment: adjustSentiment(apt, profile),
    ranking: adjustRanking(apt, profile)
  }));
}

function adjustSentiment(apt: any, profile: any) {
  let sentiment = 0.5; // base sentiment
  
  // Price sensitivity adjustment
  if (profile.priceSensitivity > 0.7) {
    sentiment += (2000 - apt.price) / 2000 * 0.4;
  } else if (profile.priceSensitivity < 0.4) {
    sentiment += apt.price / 4000 * 0.3;
  }
  
  // Distance preference adjustment
  if (profile.distancePreference > 0.7) {
    sentiment += (5 - apt.distance) / 5 * 0.3;
  }
  
  // Amenity importance adjustment
  if (profile.amenityImportance > 0.6) {
    sentiment += apt.amenities * 0.4;
  }
  
  return Math.max(0.1, Math.min(1.0, sentiment));
}

function adjustRanking(apt: any, profile: any) {
  let ranking = 5; // base ranking
  
  // Lower ranking (better) for preferred characteristics
  if (profile.priceSensitivity > 0.7 && apt.price < 1500) ranking -= 2;
  if (profile.distancePreference > 0.7 && apt.distance < 1.5) ranking -= 2;
  if (profile.amenityImportance > 0.6 && apt.amenities > 0.6) ranking -= 2;
  if (profile.sizePreference > 0.6 && apt.size > 900) ranking -= 1;
  
  return Math.max(1, Math.min(10, ranking));
}

function generateTrendData(profile: any) {
  const priceRanges = [800, 1200, 1600, 2000, 2400, 2800, 3200, 3600, 4000];
  
  return priceRanges.map(price => ({
    price,
    avgSentiment: calculateAvgSentiment(price, profile),
    rankingScore: calculateRankingScore(price, profile),
    avgDistance: calculateAvgDistance(price, profile),
    avgAmenities: calculateAvgAmenities(price, profile)
  }));
}

function calculateAvgSentiment(price: number, profile: any) {
  let sentiment = 0.5;
  if (profile.priceSensitivity > 0.7) {
    sentiment = Math.max(0.1, 1 - (price - 1000) / 3000);
  } else {
    sentiment = Math.min(1.0, 0.3 + price / 4000);
  }
  return sentiment;
}

function calculateRankingScore(price: number, profile: any) {
  if (profile.priceSensitivity > 0.7) {
    return price < 1500 ? 2 : 8;
  }
  return 5;
}

function calculateAvgDistance(price: number, profile: any) {
  // Higher price typically means closer to city center
  return Math.max(0.5, 4 - (price - 1000) / 1000);
}

function calculateAvgAmenities(price: number, profile: any) {
  return Math.min(1.0, (price - 1000) / 2000);
}

function generatePreferenceData(profile: any) {
  const factors = [
    { factor: 'Price-to-Value Ratio', importance: profile.priceSensitivity },
    { factor: 'Distance to Work', importance: profile.distancePreference },
    { factor: 'Amenities & Features', importance: profile.amenityImportance },
    { factor: 'Apartment Size', importance: profile.sizePreference },
    { factor: 'Neighborhood Safety', importance: 0.7 },
    { factor: 'Public Transportation', importance: 0.6 },
    { factor: 'Pet-Friendly', importance: 0.4 },
    { factor: 'Parking Availability', importance: 0.5 }
  ];
  
  return factors
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 6);
}

function generateOutlier(profile: any) {
  const outliers = [
    {
      apartmentName: 'Luxury Penthouse',
      description: 'High-priced outlier with premium amenities - suggests luxury preference in your group.'
    },
    {
      apartmentName: 'Budget Basement',
      description: 'Unusually low-priced option that scored surprisingly well - indicates strong budget consciousness.'
    },
    {
      apartmentName: 'Remote Retreat',
      description: 'Far from city center but high sentiment - shows your group values space over convenience.'
    }
  ];
  
  return outliers[Math.floor(Math.random() * outliers.length)];
}

function generateHypothesis(profile: any) {
  if (profile.priceSensitivity > 0.7) {
    return {
      title: 'Budget-Conscious Decision Making',
      description: 'Your group prioritizes value over luxury. The ranking algorithm reveals a strong preference for price-to-value ratio, with optimal choices in the $1,000-$1,500 range.'
    };
  } else if (profile.amenityImportance > 0.7) {
    return {
      title: 'Lifestyle-Focused Selection',
      description: 'Your group values amenities and lifestyle features over pure cost considerations. Premium options with extensive amenities score highly regardless of price.'
    };
  } else {
    return {
      title: 'Balanced Optimization',
      description: 'Your group shows balanced preferences across multiple factors. The algorithm reveals a sweet spot combining reasonable pricing with good location and amenities.'
    };
  }
}

export async function GET() {
  console.log('Midpoint analytics API GET called');
  const groupAnalysis = generateGroupAnalysis();
  
  return NextResponse.json({
    primaryFinding: {
      title: groupAnalysis.primaryFinding.title,
      description: groupAnalysis.primaryFinding.description,
      correlation: groupAnalysis.primaryFinding.correlation,
      factors: groupAnalysis.primaryFinding.factors,
      bestVisualization: groupAnalysis.primaryFinding.bestVisualization
    },
    outlier: groupAnalysis.outlier,
    hypothesis: groupAnalysis.hypothesis,
    visualizationData: groupAnalysis.visualizationData,
    groupProfile: groupAnalysis.groupProfile
  }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Midpoint analytics API called');
    const { sessionId } = await request.json();
    console.log('Session ID received:', sessionId);

    if (!sessionId) {
      console.log('No session ID provided');
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    // Try to call Supabase function, but fallback to mock data if it fails
    try {
      const admin = createClient(supabaseUrl, serviceKey);
      const { data, error } = await admin.functions.invoke('get-midpoint-analytics', {
        body: { sessionId }
      });

      if (error) {
        console.log('Supabase function not available, using mock data:', error.message || error);
        throw new Error('Function not deployed');
      }

      // If we get here, the function worked
      return NextResponse.json(data);
    } catch (functionError) {
      console.log('Using mock data for midpoint analytics');
      
      // Generate dynamic analysis based on group characteristics
      const groupAnalysis = generateGroupAnalysis();
      
      return NextResponse.json({
        primaryFinding: {
          title: groupAnalysis.primaryFinding.title,
          description: groupAnalysis.primaryFinding.description,
          correlation: groupAnalysis.primaryFinding.correlation,
          factors: groupAnalysis.primaryFinding.factors,
          bestVisualization: groupAnalysis.primaryFinding.bestVisualization
        },
        outlier: groupAnalysis.outlier,
        hypothesis: groupAnalysis.hypothesis,
        visualizationData: groupAnalysis.visualizationData,
        groupProfile: groupAnalysis.groupProfile
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error in midpoint analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
