import React, { useEffect } from 'react';
import { injectSpeedInsights } from '@vercel/speed-insights';

/**
 * SpeedInsights component for Vercel Speed Insights integration
 * 
 * This component initializes the Vercel Speed Insights tracking script
 * which automatically collects Web Vitals metrics (Core Web Vitals).
 * 
 * The injectSpeedInsights function should only be called once in the app,
 * preferably as early as possible in the component tree.
 */
const SpeedInsights: React.FC = () => {
  useEffect(() => {
    // Initialize Speed Insights tracking
    injectSpeedInsights();
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default SpeedInsights;
