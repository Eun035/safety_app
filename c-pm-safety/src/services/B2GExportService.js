export const B2GExportService = {
  // Generate CSV from aggregated stats
  generateCSV: (stats) => {
    // BOM for UTF-8 Excel compatibility to prevent Korean text encoding issues
    const BOM = '\uFEFF';
    
    const headers = [
      'Report_Date',
      'Total_Rides',
      'Avg_Safety_Score',
      'Pedestrian_Stress_Count',
      'Accident_Count',
      'Accident_Reduction_Rate(%)',
      'Station_Return_Rate(%)',
      'Insurance_Risk_Reduction(%)',
      'Complaint_Reduction_Rate(%)',
      'High_Risk_Intersection_Avoidance_Rate(%)',
      'Vibe_Safety_Score_Model(%)',
      'Risk_Suppression_Rate(%)',
      'Accident_Growth_Elasticity',
      'Near-Miss_Reduction_Efficiency(%)'
    ];

    const today = new Date().toISOString().split('T')[0];

    const row = [
      today,
      stats.totalRides || 0,
      stats.avgSafetyScore || 0,
      stats.pedestrianReports || 0,
      stats.totalHazards || 0,
      stats.kpis?.accidentReduction || 0,
      stats.kpis?.parkingReduction || 0,
      stats.kpis?.insuranceRiskReduction || 0,
      stats.kpis?.complaintReduction || 0,
      stats.kpis?.intersectionAvoidance || 0,
      stats.kpis?.vibeSafetyScore || 0,
      stats.kpis?.riskSuppressionRate ?? 0,
      stats.kpis?.accidentGrowthElasticity ?? 0,
      stats.kpis?.nearMissReductionEfficiency ?? 0
    ].join(',');
    
    return BOM + headers.join(',') + '\n' + row;
  },

  // Generate SHA-256 using native Web Crypto API
  generateSHA256Hash: async (text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert ArrayBuffer to Hex String
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  },

  // Trigger browser file download securely
  triggerDownload: (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
