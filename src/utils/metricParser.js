/* ════════════════════════════════════════════════════════════════
   HEALTH METRIC PARSER
   Extracts structured metric data from free-form health text
════════════════════════════════════════════════════════════════ */

// Reference ranges for common health metrics
const REFERENCE_RANGES = {
  'systolic': { min: 90, max: 120, unit: 'mmHg', label: 'Systolic BP', color: '#ef4444' },
  'diastolic': { min: 60, max: 80, unit: 'mmHg', label: 'Diastolic BP', color: '#f97316' },
  'heart rate': { min: 60, max: 100, unit: 'bpm', label: 'Heart Rate', color: '#ec4899' },
  'pulse': { min: 60, max: 100, unit: 'bpm', label: 'Pulse', color: '#ec4899' },
  'temperature': { min: 97, max: 99, unit: '°F', label: 'Temperature', color: '#f59e0b' },
  'fever': { min: 97, max: 99, unit: '°F', label: 'Temperature', color: '#f59e0b' },
  'glucose': { min: 70, max: 100, unit: 'mg/dL', label: 'Blood Glucose', color: '#8b5cf6' },
  'sugar': { min: 70, max: 100, unit: 'mg/dL', label: 'Blood Glucose', color: '#8b5cf6' },
  'hba1c': { min: 4, max: 5.6, unit: '%', label: 'HbA1c', color: '#6366f1' },
  'spo2': { min: 95, max: 100, unit: '%', label: 'SpO2', color: '#00a896' },
  'oxygen': { min: 95, max: 100, unit: '%', label: 'O2 Sat', color: '#00a896' },
  'platelet': { min: 150000, max: 400000, unit: 'K/µL', label: 'Platelet Count', color: '#1a73e8' },
  'hemoglobin': { min: 12, max: 17, unit: 'g/dL', label: 'Hemoglobin', color: '#dc2626' },
  'cholesterol': { min: 0, max: 200, unit: 'mg/dL', label: 'Total Cholesterol', color: '#d97706' },
  'ldl': { min: 0, max: 100, unit: 'mg/dL', label: 'LDL Cholesterol', color: '#ef4444' },
  'hdl': { min: 40, max: 200, unit: 'mg/dL', label: 'HDL Cholesterol', color: '#22c55e' },
  'tsh': { min: 0.4, max: 4.0, unit: 'mIU/L', label: 'TSH', color: '#8b5cf6' },
  'creatinine': { min: 0.6, max: 1.2, unit: 'mg/dL', label: 'Creatinine', color: '#f97316' },
  'bmi': { min: 18.5, max: 24.9, unit: 'kg/m²', label: 'BMI', color: '#0891b2' },
  'weight': { min: null, max: null, unit: 'kg', label: 'Weight', color: '#64748b' },
};

// Patterns for extracting metric-value pairs from text
const METRIC_PATTERNS = [
  // "BP: 130/85" or "Blood Pressure: 130/85 mmHg"
  { regex: /\b(?:bp|blood\s*pressure)[:\s]+(\d{2,3})\s*[\/\\]\s*(\d{2,3})\s*(?:mmhg)?/gi, type: 'bp' },
  // "heart rate was 95 bpm" or "HR: 72"
  { regex: /\b(?:heart\s*rate|hr|pulse)[:\s]+(\d{2,3})\s*(?:bpm)?/gi, type: 'heart rate' },
  // "fever of 102°F" or "temperature: 101.5 F"
  { regex: /\b(?:fever|temperature|temp)[:\s]+(\d{2,3}(?:\.\d)?)\s*(?:°?[fc])?/gi, type: 'temperature' },
  // "fasting sugar was 180 mg/dL" or "glucose: 95"
  { regex: /\b(?:fasting\s*(?:sugar|glucose)|blood\s*(?:sugar|glucose)|glucose|sugar)[:\s]+(\d{2,4})\s*(?:mg\/dl)?/gi, type: 'glucose' },
  // "HbA1c 7.2%" 
  { regex: /\bhba1c[:\s]+(\d{1,2}(?:\.\d)?)\s*%?/gi, type: 'hba1c' },
  // "SpO2 98%" or "oxygen saturation 96%"
  { regex: /\b(?:spo2|oxygen\s*(?:saturation|level|sat))[:\s]+(\d{2,3})\s*%?/gi, type: 'spo2' },
  // "platelets 120k" or "platelet count: 150,000"
  { regex: /\bplatelet(?:\s*count)?[:\s]+(\d+(?:,\d+)?)\s*(?:k|lakh|lakhs)?/gi, type: 'platelet' },
  // "hemoglobin 11.5 g/dL"
  { regex: /\bhemoglobin[:\s]+(\d{1,2}(?:\.\d)?)\s*(?:g\/dl)?/gi, type: 'hemoglobin' },
  // "cholesterol 210 mg/dL"  
  { regex: /\b(?:total\s*)?cholesterol[:\s]+(\d{2,3})\s*(?:mg\/dl)?/gi, type: 'cholesterol' },
  // "LDL: 130" / "HDL: 45"
  { regex: /\bldl[:\s]+(\d{2,3})\s*(?:mg\/dl)?/gi, type: 'ldl' },
  { regex: /\bhdl[:\s]+(\d{2,3})\s*(?:mg\/dl)?/gi, type: 'hdl' },
  // "TSH: 3.2"
  { regex: /\btsh[:\s]+(\d{1,2}(?:\.\d{1,2})?)\s*(?:miu\/l)?/gi, type: 'tsh' },
  // "BMI 28"
  { regex: /\bbmi[:\s]+(\d{2}(?:\.\d)?)/gi, type: 'bmi' },
  // "weight 72 kg"
  { regex: /\bweight[:\s]+(\d{2,3}(?:\.\d)?)\s*(?:kg|lbs)?/gi, type: 'weight' },
];

/**
 * Parses health metrics from a text string.
 * @param {string} text - The post content to parse
 * @returns {Array} - Array of metric objects
 */
export function parseHealthMetrics(text) {
  const metrics = [];
  const seen = new Set();

  for (const pattern of METRIC_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      if (pattern.type === 'bp') {
        // Blood pressure needs special handling (systolic/diastolic pair)
        const sys = parseInt(match[1]);
        const dia = parseInt(match[2]);
        if (!isNaN(sys) && !isNaN(dia) && !seen.has('bp')) {
          seen.add('bp');
          const sysRef = REFERENCE_RANGES['systolic'];
          const diaRef = REFERENCE_RANGES['diastolic'];
          metrics.push({
            type: 'bp',
            label: 'Blood Pressure',
            display: `${sys}/${dia}`,
            unit: 'mmHg',
            values: [
              { label: 'Systolic', value: sys, ...sysRef, status: getStatus(sys, sysRef.min, sysRef.max) },
              { label: 'Diastolic', value: dia, ...diaRef, status: getStatus(dia, diaRef.min, diaRef.max) },
            ],
          });
        }
      } else {
        const val = parseFloat(match[1].replace(',', ''));
        if (!isNaN(val) && !seen.has(pattern.type)) {
          seen.add(pattern.type);
          const ref = REFERENCE_RANGES[pattern.type] || {};
          
          // Handle platelet count (may be in thousands)
          let normalizedVal = val;
          if (pattern.type === 'platelet' && val < 10000) {
            normalizedVal = val * 1000; // convert "120k" → 120000
          }

          metrics.push({
            type: pattern.type,
            label: ref.label || pattern.type,
            value: normalizedVal,
            display: pattern.type === 'platelet' 
              ? `${(normalizedVal/1000).toFixed(0)}K`
              : String(normalizedVal),
            unit: ref.unit || '',
            color: ref.color || '#6366f1',
            min: ref.min,
            max: ref.max,
            status: ref.min !== null ? getStatus(normalizedVal, ref.min, ref.max) : 'normal',
          });
        }
      }
    }
  }

  return metrics;
}

/**
 * Determines if a value is below, normal, or above reference range.
 */
function getStatus(value, min, max) {
  if (min === null || max === null) return 'normal';
  if (value < min) return 'low';
  if (value > max) return 'high';
  return 'normal';
}

/**
 * Quick check: does this text contain any health metrics worth visualizing?
 */
export function hasHealthMetrics(text) {
  if (!text) return false;
  return METRIC_PATTERNS.some(p => {
    p.regex.lastIndex = 0;
    return p.regex.test(text);
  });
}
