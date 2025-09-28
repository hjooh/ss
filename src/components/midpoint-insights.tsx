'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, ScatterChart, Scatter, ComposedChart, Area, Line } from 'recharts';

// --- INTERFACES (assume these are defined as before) ---
interface Apartment {
  id: string;
  name: string;
  rent: number;
  distance: number;
  sqft: number;
  pros: string[];
  cons: string[];
  // Include other potential fields to be safe
  [key: string]: unknown; 
}

interface Session {
  id: string;
  code: string;
  name: string;
  currentRound: number;
  settings: {
    numberOfRounds: number;
  };
  championApartment?: Apartment;
  eliminatedApartments: Apartment[];
  matchupLog: unknown[];
  availableApartments: Apartment[];
}

interface AnalysisResult {
  primaryFinding: {
    title: string;
    description: string;
    correlation?: number;
    factors?: string[];
    bestVisualization?: {
      type: string;
      xAxis: string;
      yAxis: string;
      secondaryYAxis?: string;
      title: string;
      description: string;
    };
  };
  outlier: {
    apartmentName?: string;
    description: string;
  };
  hypothesis: {
    title?: string;
    description: string;
  };
  visualizationData: {
    scatterData: unknown[];
    trendData: unknown[];
    preferenceData: unknown[];
  };
  groupProfile?: {
    name: string;
    priceSensitivity: number;
    distancePreference: number;
    amenityImportance: number;
    sizePreference: number;
  };
}

// --- NEW INTERFACE for the cluster comparison API response ---
interface ClusterComparisonResult {
    distribution: Array<{
        cluster: string;
        count: number;
    }>;
    preferredCluster: {
        id: number;
        summary: string;
    };
}


interface MidpointInsightsProps {
  session: Session;
  onContinue: () => void;
  onRefineSearch?: (priority: string, direction: string) => void;
}

// =================================================================
// HELPER: Render Dynamic Visualization
// Renders the appropriate chart based on algorithm recommendation
// =================================================================
const renderDynamicVisualization = (analysis: AnalysisResult) => {
  const { bestVisualization } = analysis.primaryFinding;
  const { visualizationData } = analysis;
  
  if (!bestVisualization || !visualizationData) return null;
  
  const { type, xAxis, yAxis, secondaryYAxis, title, description } = bestVisualization;
  
  switch (type) {
    case 'scatter':
      return renderScatterVisualization(xAxis, yAxis, visualizationData.scatterData, title, description);
    case 'bar':
      return renderBarVisualization(xAxis, yAxis, visualizationData.preferenceData, title, description);
    case 'composed':
      return renderComposedVisualization(xAxis, yAxis, secondaryYAxis, visualizationData.trendData, title, description);
    default:
      return renderDefaultVisualization(visualizationData, title, description);
  }
};

const renderScatterVisualization = (xAxis: string, yAxis: string, data: unknown[], title: string, description: string) => (
  <div className="mb-6">
    <h3 className="text-lg font-medium text-gray-900 mb-3">{title}</h3>
    <p className="text-sm text-gray-600 mb-4">{description}</p>
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey={xAxis} 
          name={xAxis} 
          unit={xAxis === 'price' ? '$' : xAxis === 'distance' ? 'mi' : ''} 
          type="number" 
          domain={xAxis === 'price' ? ['dataMin - 200', 'dataMax + 200'] : undefined}
          label={{ value: `${xAxis} ${xAxis === 'price' ? '($)' : xAxis === 'distance' ? '(mi)' : ''}`, position: 'insideBottom', offset: -5 }}
        />
        <YAxis 
          dataKey={yAxis} 
          name={yAxis} 
          type="number" 
          domain={yAxis === 'sentiment' ? [0, 1] : undefined}
          label={{ value: `${yAxis} ${yAxis === 'sentiment' ? 'Score' : 'Ranking'}`, angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value, name) => [
            name === 'sentiment' ? (Number(value) * 100).toFixed(0) + '%' : value,
            name === 'sentiment' ? 'Sentiment' : name
          ]}
          labelFormatter={(label) => `${xAxis}: ${xAxis === 'price' ? '$' : ''}${label}`}
        />
        <Scatter 
          name="Apartments" 
          data={data} 
          fill="#3B82F6"
          shape="circle"
        />
      </ScatterChart>
    </ResponsiveContainer>
  </div>
);

const renderBarVisualization = (xAxis: string, yAxis: string, data: unknown[], title: string, description: string) => {
  // Map axis names to actual data keys for preference data
  const xDataKey = xAxis === 'amenities' ? 'factor' : xAxis;
  const yDataKey = yAxis === 'importance' ? 'importance' : yAxis;
  
  console.log('Bar chart data:', data);
  console.log('xDataKey:', xDataKey, 'yDataKey:', yDataKey);
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-3">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 20, bottom: 80, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={xDataKey} 
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
          />
          <YAxis 
            domain={[0, 1]}
            label={{ value: `${yAxis} Score`, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value) => [(Number(value) * 100).toFixed(0) + '%', yAxis]}
            labelFormatter={(label) => `${xAxis}: ${label}`}
          />
          <Bar 
            dataKey={yDataKey} 
            fill="#10B981"
            name={yAxis}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const renderComposedVisualization = (xAxis: string, yAxis: string, secondaryYAxis: string | undefined, data: unknown[], title: string, description: string) => {
  // Map friendly axis names to actual data keys present in trendData
  const primaryDataKey = yAxis === 'sentiment' ? 'avgSentiment' : yAxis;
  const secondaryDataKey = secondaryYAxis === 'ranking' ? 'rankingScore' : secondaryYAxis;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-3">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={xAxis} 
            name={xAxis} 
            unit={xAxis === 'price' ? '$' : ''} 
            type="number"
            label={{ value: `${xAxis} ${xAxis === 'price' ? '($)' : ''}`, position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            yAxisId="primary"
            dataKey={primaryDataKey}
            name={yAxis} 
            type="number" 
            domain={primaryDataKey === 'avgSentiment' ? [0, 1] : undefined}
            label={{ value: `${yAxis} Score`, angle: -90, position: 'insideLeft' }}
          />
          {secondaryDataKey && (
            <YAxis 
              yAxisId="secondary"
              orientation="right"
              dataKey={secondaryDataKey}
              name={secondaryYAxis} 
              type="number"
              label={{ value: `${secondaryYAxis} Score`, angle: 90, position: 'insideRight' }}
            />
          )}
          <Tooltip 
            formatter={(value, name) => [
              name === 'sentiment' || name === 'avgSentiment' ? (Number(value) * 100).toFixed(0) + '%' : value,
              name === 'sentiment' || name === 'avgSentiment' ? 'Sentiment' : name
            ]}
            labelFormatter={(label) => `${xAxis}: ${xAxis === 'price' ? '$' : ''}${label}`}
          />
          <Area 
            yAxisId="primary"
            type="monotone" 
            dataKey={primaryDataKey}
            fill="#3B82F6" 
            fillOpacity={0.3}
            stroke="#3B82F6"
            strokeWidth={2}
          />
          {secondaryDataKey && (
            <Line 
              yAxisId="secondary"
              type="monotone" 
              dataKey={secondaryDataKey}
              stroke="#EF4444" 
              strokeWidth={2}
              dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const renderDefaultVisualization = (visualizationData: unknown, title: string, description: string) => (
  <div className="mb-6">
    <h3 className="text-lg font-medium text-gray-900 mb-3">{title}</h3>
    <p className="text-sm text-gray-600 mb-4">{description}</p>
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="price" name="Price" unit="$" type="number" domain={['dataMin - 100', 'dataMax + 100']} />
        <YAxis dataKey="distance" name="Distance" unit="mi" type="number" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter name="Apartments" data={(visualizationData as any).scatterData} fill="#3B82F6" />
      </ScatterChart>
    </ResponsiveContainer>
  </div>
);

// =================================================================
// HELPER: Generate Visualization Data
// This function remains largely the same, as it operates on session data
// already present on the client.
// =================================================================
const generateVisualizationData = (session: Session) => {
    const allVotedApartments = [
        ...(session.championApartment ? [session.championApartment] : []),
        ...session.eliminatedApartments,
    ];

    // Scatter Plot Data
    const scatterData = allVotedApartments.map(apt => ({
        name: apt.name,
        price: apt.rent,
        distance: apt.distance || 0,
        size: apt.sqft,
        selected: apt.id === session.championApartment?.id,
    }));

    // Preference Data (from pros/cons)
    const featureScores: { [key: string]: number } = {};
    if (session.championApartment?.pros) {
        session.championApartment.pros.forEach(pro => {
            const feature = pro.replace('✓ ', '').trim();
            featureScores[feature] = (featureScores[feature] || 0) + 1;
        });
    }
    session.eliminatedApartments.forEach(apt => {
        (apt.cons || []).forEach(con => {
            const feature = con.replace('✗ ', '').trim();
            featureScores[feature] = (featureScores[feature] || 0) - 1;
        });
    });

    const preferenceData = Object.entries(featureScores)
        .map(([factor, importance]) => ({
            factor,
            importance,
        }))
        .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
        .slice(0, 10); // Show top 10 most impactful factors

    return { scatterData, preferenceData };
};


// =================================================================
// MAIN COMPONENT
// =================================================================
export const MidpointInsights = ({ session, onContinue, onRefineSearch }: MidpointInsightsProps) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- NEW STATE for cluster comparison results ---
  const [clusterComparison, setClusterComparison] = useState<ClusterComparisonResult | null>(null);
  const [isClusteringLoading, setIsClusteringLoading] = useState(true);
  

  // Dynamically generate visualization data once analysis is available
  const vizData = analysis ? generateVisualizationData(session) : null;



  // **EFFECT 1: Fetch General Midpoint Analysis**
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        console.log('Fetching midpoint analysis for session:', session.id);
        console.log('Current URL:', window.location.href);
        console.log('API endpoint:', '/api/midpoint-analytics');
        
        const response = await fetch('/api/midpoint-analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', response.status, response.statusText, errorText);
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Analysis result:', result);
        setAnalysis(result);
      } catch (err) {
        console.error("Error fetching midpoint analysis:", err);
        // Set a fallback analysis to prevent the page from being blank
        const fallbackAnalysis = {
          primaryFinding: {
            title: 'Analysis Unavailable',
            description: 'Unable to load analysis data. Please try refreshing the page.',
            correlation: 0,
            factors: ['error']
          },
          outlier: {
            description: 'Analysis data is currently unavailable.'
          },
          hypothesis: {
            description: 'Please check your connection and try again.'
          },
          visualizationData: {
            scatterData: [],
            trendData: [],
            preferenceData: []
          }
        };
        setAnalysis(fallbackAnalysis);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [session.id]);

  // **EFFECT 2: Fetch Cluster Comparison**
  // REMOVED: The complex, slow, and client-side k-means implementation.
  // REPLACED: With a clean API call to a new backend endpoint. This endpoint
  // should use your 'clustering.py' script to run the comparison.
  useEffect(() => {
    const fetchClusterComparison = async () => {
        // Gather the IDs of all apartments the user has interacted with.
        const pickedApartmentIds = [
            ...(session.championApartment ? [session.championApartment.id] : []),
            ...session.eliminatedApartments.map(apt => apt.id),
        ];

        if (pickedApartmentIds.length === 0) {
            setIsClusteringLoading(false);
            return;
        }

        try {
            // This new API endpoint will be powered by your Python script
            const response = await fetch('/api/compare-clusters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apartmentIds: pickedApartmentIds }),
            });

            if (!response.ok) throw new Error('Network response was not ok');
            
            const result: ClusterComparisonResult = await response.json();
            setClusterComparison(result);

        } catch (error) {
            console.error("Failed to fetch cluster comparison:", error);
            // Fail silently so the rest of the page can still render.
        } finally {
            setIsClusteringLoading(false);
        }
    };

    fetchClusterComparison();
  }, [session.id, session.championApartment, session.eliminatedApartments]);


  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Midpoint Insights</h1>

        {(isLoading || !analysis) ? (
          <div className="text-center text-gray-600 py-10">
            <div>Loading insights...</div>
            <button 
              onClick={() => {
                console.log('Manual API test triggered');
                fetch('/api/midpoint-analytics', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId: session.id }),
                })
                .then(response => {
                  console.log('Manual test response:', response.status);
                  return response.json();
                })
                .then(data => {
                  console.log('Manual test data:', data);
                  setAnalysis(data);
                })
                .catch(err => console.error('Manual test error:', err));
              }}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test API Connection
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* --- Primary Finding Card --- */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{analysis.primaryFinding.title}</h2>
              <p className="text-gray-700 mb-4">{analysis.primaryFinding.description}</p>
              
              {/* Group Profile Badge */}
              {analysis.groupProfile && (
                <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">{analysis.groupProfile.name}</p>
                      <p className="text-xs text-blue-700">Algorithm-detected group preferences</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-600">
                        Price: {(analysis.groupProfile.priceSensitivity * 100).toFixed(0)}% | 
                        Distance: {(analysis.groupProfile.distancePreference * 100).toFixed(0)}% | 
                        Amenities: {(analysis.groupProfile.amenityImportance * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {analysis.primaryFinding.correlation && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Correlation Strength:</strong> {(analysis.primaryFinding.correlation * 100).toFixed(0)}% 
                    ({analysis.primaryFinding.factors?.join(', ')})
                  </p>
                </div>
              )}
              
              {/* Dynamic Visualization Based on Algorithm */}
              {renderDynamicVisualization(analysis)}
              
              {/* Fallback to original scatter plot if no new data */}
              {vizData && vizData.scatterData.length > 0 && (!analysis.visualizationData?.scatterData || analysis.visualizationData.scatterData.length === 0) && (
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="price" name="Price" unit="$" type="number" domain={['dataMin - 100', 'dataMax + 100']} />
                    <YAxis dataKey="distance" name="Distance" unit="mi" type="number" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Apartments" data={vizData.scatterData} fill="#3B82F6" />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* --- NEW: Cluster Comparison Card --- */}
            {!isClusteringLoading && clusterComparison && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">How Your Picks Compare</h2>
                    <p className="text-gray-700 mb-4">
                        {clusterComparison.preferredCluster.summary}
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={clusterComparison.distribution} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="cluster" />
                            <YAxis allowDecimals={false} label={{ value: 'Number of Picks', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#6366f1" name="Picks in this Cluster" />
                        </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-center text-gray-500 mt-2">
                        This shows how many of your group&apos;s choices fall into each broad category of apartments available.
                    </p>
                </div>
            )}

            {/* --- Preference Factors Visualization --- */}
            {analysis.visualizationData?.preferenceData && analysis.visualizationData.preferenceData.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Preference Factors</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analysis.visualizationData.preferenceData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="factor" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis 
                      domain={[0, 1]}
                      label={{ value: 'Importance Score', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value) => [(Number(value) * 100).toFixed(0) + '%', 'Importance']}
                      labelFormatter={(label) => `Factor: ${label}`}
                    />
                    <Bar 
                      dataKey="importance" 
                      fill="#10B981"
                      name="Importance Score"
                    />
                  </BarChart>
                </ResponsiveContainer>
                </div>
            )}

            {/* --- Other Insight Cards --- */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {analysis.outlier.apartmentName ? `Outlier: ${analysis.outlier.apartmentName}` : 'Outlier Choice'}
                    </h3>
                    <p className="text-gray-700">{analysis.outlier.description}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {analysis.hypothesis.title || 'Working Hypothesis'}
                    </h3>
                    <p className="text-gray-700">{analysis.hypothesis.description}</p>
                </div>
            </div>

            {/* --- Continue Button --- */}
            <div className="text-center pt-4">
                <button 
                    onClick={onContinue}
                    className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Continue Ranking Process
                </button>
                
                
            </div>
          </div>
        )}
      </div>
    </div>
  );
};