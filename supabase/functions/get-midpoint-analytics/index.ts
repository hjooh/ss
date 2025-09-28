import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Apartment {
  id: string;
  name: string;
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  distanceToVTCampus?: number;
  btAccess?: boolean;
}

interface AnalysisResult {
  primaryFinding: {
    title: string;
    description: string;
    correlation: number;
    factors: string[];
  };
  outlier: {
    apartmentName: string;
    description: string;
  };
  hypothesis: {
    title: string;
    description: string;
  };
}

// Calculate correlation between two arrays
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

// Find the strongest correlation among apartment properties
function findStrongestCorrelation(apartments: Apartment[]): { factors: string[], correlation: number, data: { x: number[], y: number[] } } {
  const correlations = [];
  
  // Price vs Distance correlation
  const priceDistanceCorr = calculateCorrelation(
    apartments.map(apt => apt.rent),
    apartments.map(apt => apt.distanceToVTCampus || 0)
  );
  correlations.push({
    factors: ['price', 'distance'],
    correlation: priceDistanceCorr,
    data: {
      x: apartments.map(apt => apt.rent),
      y: apartments.map(apt => apt.distanceToVTCampus || 0)
    }
  });
  
  // Price vs Size correlation
  const priceSizeCorr = calculateCorrelation(
    apartments.map(apt => apt.rent),
    apartments.map(apt => apt.sqft)
  );
  correlations.push({
    factors: ['price', 'size'],
    correlation: priceSizeCorr,
    data: {
      x: apartments.map(apt => apt.rent),
      y: apartments.map(apt => apt.sqft)
    }
  });
  
  // Distance vs Size correlation
  const distanceSizeCorr = calculateCorrelation(
    apartments.map(apt => apt.distanceToVTCampus || 0),
    apartments.map(apt => apt.sqft)
  );
  correlations.push({
    factors: ['distance', 'size'],
    correlation: distanceSizeCorr,
    data: {
      x: apartments.map(apt => apt.distanceToVTCampus || 0),
      y: apartments.map(apt => apt.sqft)
    }
  });
  
  // Find the strongest correlation (highest absolute value)
  return correlations.reduce((strongest, current) => 
    Math.abs(current.correlation) > Math.abs(strongest.correlation) ? current : strongest
  );
}

// Find the biggest outlier based on the strongest correlation
function findOutlier(apartments: Apartment[], correlation: { factors: string[], correlation: number, data: { x: number[], y: number[] } }): Apartment | null {
  if (apartments.length < 3) return null;
  
  const [factor1, factor2] = correlation.factors;
  const x = correlation.data.x;
  const y = correlation.data.y;
  
  // Calculate the line of best fit
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Find the point with the largest deviation from the line
  let maxDeviation = 0;
  let outlierIndex = -1;
  
  for (let i = 0; i < x.length; i++) {
    const expectedY = slope * x[i] + intercept;
    const deviation = Math.abs(y[i] - expectedY);
    
    if (deviation > maxDeviation) {
      maxDeviation = deviation;
      outlierIndex = i;
    }
  }
  
  return outlierIndex >= 0 ? apartments[outlierIndex] : null;
}

// Generate hypothesis based on correlation and outlier
function generateHypothesis(
  correlation: { factors: string[], correlation: number },
  outlier: Apartment | null,
  apartments: Apartment[]
): AnalysisResult {
  const [factor1, factor2] = correlation.factors;
  const correlationStrength = Math.abs(correlation.correlation);
  
  // Generate primary finding
  let primaryFinding;
  if (factor1 === 'price' && factor2 === 'distance') {
    if (correlation.correlation < -0.5) {
      primaryFinding = {
        title: "Budget vs Convenience Trade-off",
        description: `We found a strong correlation (${correlationStrength.toFixed(2)}) showing your group consistently prefers lower-priced apartments, even if they're farther from campus.`,
        correlation: correlation.correlation,
        factors: correlation.factors
      };
    } else if (correlation.correlation > 0.5) {
      primaryFinding = {
        title: "Premium for Convenience",
        description: `We found a strong correlation (${correlationStrength.toFixed(2)}) showing your group is willing to pay more for apartments closer to campus.`,
        correlation: correlation.correlation,
        factors: correlation.factors
      };
    } else {
      primaryFinding = {
        title: "Balanced Decision Making",
        description: `Your group shows a balanced approach to price and distance, with a moderate correlation (${correlationStrength.toFixed(2)}).`,
        correlation: correlation.correlation,
        factors: correlation.factors
      };
    }
  } else if (factor1 === 'price' && factor2 === 'size') {
    primaryFinding = {
      title: "Value for Money Focus",
      description: `We found a correlation (${correlationStrength.toFixed(2)}) between price and apartment size, suggesting your group values space for the money.`,
      correlation: correlation.correlation,
      factors: correlation.factors
    };
  } else {
    primaryFinding = {
      title: "Property Relationship",
      description: `We found a correlation (${correlationStrength.toFixed(2)}) between ${factor1} and ${factor2} in your apartment preferences.`,
      correlation: correlation.correlation,
      factors: correlation.factors
    };
  }
  
  // Generate outlier description
  let outlierDesc;
  if (outlier) {
    if (factor1 === 'price' && factor2 === 'distance') {
      const avgDistance = apartments.reduce((sum, apt) => sum + (apt.distanceToVTCampus || 0), 0) / apartments.length;
      if (outlier.distanceToVTCampus && outlier.distanceToVTCampus < avgDistance) {
        outlierDesc = {
          apartmentName: outlier.name,
          description: `However, you also highly rated ${outlier.name}, which at $${outlier.rent} was more expensive but had a ${outlier.distanceToVTCampus}-minute commute - much shorter than the average.`
        };
      } else {
        outlierDesc = {
          apartmentName: outlier.name,
          description: `However, you also highly rated ${outlier.name}, which stands out from the typical price-distance pattern.`
        };
      }
    } else {
      outlierDesc = {
        apartmentName: outlier.name,
        description: `However, you also highly rated ${outlier.name}, which doesn't follow the typical ${factor1}-${factor2} pattern.`
      };
    }
  } else {
    outlierDesc = {
      apartmentName: "No clear outlier",
      description: "Your apartment choices followed a consistent pattern without major outliers."
    };
  }
  
  // Generate hypothesis
  let hypothesis;
  if (outlier && factor1 === 'price' && factor2 === 'distance') {
    const avgDistance = apartments.reduce((sum, apt) => sum + (apt.distanceToVTCampus || 0), 0) / apartments.length;
    if (outlier.distanceToVTCampus && outlier.distanceToVTCampus < avgDistance * 0.7) {
      hypothesis = {
        title: "Hypothesis: Short Commute is the Real Priority",
        description: `${outlier.name}'s ${outlier.distanceToVTCampus}-minute commute was significantly shorter than other options. This suggests your group is willing to break budget for a major convenience like a quick trip to campus.`
      };
    } else {
      hypothesis = {
        title: "Hypothesis: Hidden Priority Factor",
        description: `${outlier.name} breaks the typical pattern, suggesting there's another factor (like amenities, layout, or location) that's more important than ${factor1} and ${factor2}.`
      };
    }
  } else if (outlier) {
    hypothesis = {
      title: "Hypothesis: Hidden Priority Factor",
      description: `${outlier.name} doesn't follow the typical ${factor1}-${factor2} pattern, suggesting there's another factor that's more important to your group.`
    };
  } else {
    hypothesis = {
      title: "Hypothesis: Consistent Priorities",
      description: `Your group has shown consistent preferences based on ${factor1} and ${factor2}. This pattern is likely to continue in the remaining choices.`
    };
  }
  
  return {
    primaryFinding,
    outlier: outlierDesc,
    hypothesis
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId } = await req.json()
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('room')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get eliminated apartments and current champion
    // Note: This is a simplified version - in reality, you'd need to get this data
    // from your session storage or a more complex query
    const eliminatedApartments: Apartment[] = [
      // This would be populated from your session data
      // For now, returning mock data structure
    ]

    if (eliminatedApartments.length < 2) {
      return new Response(
        JSON.stringify({ 
          error: 'Not enough data for analysis',
          message: 'Need at least 2 eliminated apartments to perform analysis'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Perform analysis
    const correlation = findStrongestCorrelation(eliminatedApartments)
    const outlier = findOutlier(eliminatedApartments, correlation)
    const result = generateHypothesis(correlation, outlier, eliminatedApartments)

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-midpoint-analytics:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
