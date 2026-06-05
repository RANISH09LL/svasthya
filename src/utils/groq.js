/* ════════════════════════════════════════════════════════════════
   GROQ API CLIENT
   Handles all LLM calls for Svasthya AI features.
   Requires VITE_GROQ_API_KEY in .env
════════════════════════════════════════════════════════════════ */

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const MODELS = {
  fast: 'llama-3.1-8b-instant',       // Fast, cheap: jargon translation, fact-check
  smart: 'llama-3.3-70b-versatile',    // Smarter: case studies, avatar chat
  whisper: 'whisper-large-v3',         // Audio transcription
};

/**
 * Core chat completion call.
 * @param {Array} messages - OpenAI-format messages array
 * @param {string} model - model key from MODELS
 * @param {Object} opts - temperature, max_tokens, response_format
 */
async function chatComplete(messages, model = 'fast', opts = {}) {
  if (!API_KEY) {
    throw new Error('VITE_GROQ_API_KEY not set. Add it to your .env file.');
  }

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODELS[model] || model,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.max_tokens ?? 1024,
      ...(opts.response_format ? { response_format: opts.response_format } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq API error ${res.status}: ${err?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/* ───────────────────────────────────────────────────────────────
   FEATURE 1: Jargon Translator
─────────────────────────────────────────────────────────────── */
const READING_LEVELS = {
  simple: {
    label: '🟢 Simple',
    desc: 'Plain language, 6th grade reading level',
    prompt: 'Rewrite this for a 6th grader with zero medical knowledge. Use simple everyday words. Replace ALL medical terms with plain equivalents. Keep it short and reassuring.',
  },
  patient: {
    label: '🟡 Patient',
    desc: 'Clear explanation for an informed patient',
    prompt: 'Rewrite this for an educated patient. You may use common medical terms but always explain them in parentheses. Keep all important safety warnings. Be warm and clear.',
  },
  medical: {
    label: '🔵 Medical',
    desc: 'Preserved clinical terminology',
    prompt: 'Summarize this in structured clinical format with preserved medical terminology. Add bullet points for key clinical facts. Keep all diagnoses, drug names, and values precise.',
  },
};

/**
 * Simplifies medical text into a target reading level.
 */
export async function simplifyMedicalText(text, level = 'patient') {
  const { prompt } = READING_LEVELS[level] || READING_LEVELS.patient;
  const messages = [
    {
      role: 'system',
      content: `You are a compassionate medical communication expert. Your job is to rewrite medical content clearly and accurately. Never provide a medical diagnosis. Always end with a safety note if the original contains any warnings.`,
    },
    {
      role: 'user',
      content: `${prompt}\n\nOriginal text:\n"""\n${text}\n"""\n\nProvide ONLY the rewritten text. No preamble, no explanation, no quotes.`,
    },
  ];
  return chatComplete(messages, 'fast', { temperature: 0.3, max_tokens: 600 });
}

export { READING_LEVELS };

/* ───────────────────────────────────────────────────────────────
   FEATURE 2: Fact-Check Guardrail
─────────────────────────────────────────────────────────────── */

/**
 * Analyzes a health claim for factual accuracy.
 * Returns { verdict: 'safe'|'unverified'|'caution', reason, suggestion }
 */
export async function factCheckHealthClaim(text) {
  const messages = [
    {
      role: 'system',
      content: `You are a medical fact-checking AI. Analyze health claims and return ONLY valid JSON. Do not include any explanation outside the JSON.`,
    },
    {
      role: 'user',
      content: `Analyze this community health post for accuracy and safety:\n"""\n${text}\n"""\n\nReturn JSON with exactly these fields:\n{\n  "verdict": "safe" | "unverified" | "caution",\n  "reason": "one concise sentence explaining the verdict",\n  "suggestion": "one concise sentence with a better alternative or clarification (or null if safe)"\n}\n\n- safe: factually accurate, well-established medical consensus\n- unverified: plausible but not well-established, needs professional guidance\n- caution: potentially misleading, contraindicated, or dangerous advice`,
    },
  ];

  const raw = await chatComplete(messages, 'fast', {
    temperature: 0.1,
    max_tokens: 200,
    response_format: { type: 'json_object' },
  });

  try {
    return JSON.parse(raw);
  } catch {
    return { verdict: 'unverified', reason: 'Could not analyze this claim.', suggestion: 'Please consult a healthcare professional.' };
  }
}

/* ───────────────────────────────────────────────────────────────
   FEATURE 3: Case Study Synthesizer
─────────────────────────────────────────────────────────────── */

/**
 * Step 1: Scrub PII from a patient narrative.
 */
export async function scrubPII(text) {
  const messages = [
    {
      role: 'system',
      content: `You are a medical privacy expert. Replace all personally identifiable information (PII) with structured placeholders. 
PII includes: full names → [PATIENT_INITIALS], phone numbers → [PHONE], email → [EMAIL], specific addresses → [LOCATION], unique identifiers → [ID].
Keep all medical data, symptoms, diagnoses, medications, and timelines exactly as-is. Return ONLY the anonymized text.`,
    },
    {
      role: 'user',
      content: text,
    },
  ];
  return chatComplete(messages, 'fast', { temperature: 0.1, max_tokens: 800 });
}

/**
 * Step 2: Structure anonymized text into an educational case study.
 */
export async function generateCaseStudy(anonymizedText) {
  const messages = [
    {
      role: 'system',
      content: `You are a medical education writer. Convert patient narratives into structured educational case studies for medical students. Use professional clinical language.`,
    },
    {
      role: 'user',
      content: `Convert this anonymized patient narrative into a structured case study:\n"""\n${anonymizedText}\n"""\n\nFormat the output exactly as:\n## Chief Complaint\n[1-2 sentences]\n\n## History of Present Illness\n[paragraph]\n\n## Relevant History\n[bullet points]\n\n## Assessment\n[clinical interpretation]\n\n## Teaching Points\n[2-3 key learning points for medical students]\n\n---\n*This case study has been anonymized for educational use.*`,
    },
  ];
  return chatComplete(messages, 'smart', { temperature: 0.3, max_tokens: 800 });
}

/* ───────────────────────────────────────────────────────────────
   FEATURE 4: Voice Transcription (Whisper)
─────────────────────────────────────────────────────────────── */

/**
 * Transcribes an audio Blob using Groq's Whisper endpoint.
 */
export async function transcribeAudio(audioBlob) {
  if (!API_KEY) throw new Error('VITE_GROQ_API_KEY not set.');

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', MODELS.whisper);
  formData.append('language', 'en');
  formData.append('response_format', 'json');

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Whisper API error: ${res.status}`);
  const data = await res.json();
  return data.text;
}

/**
 * Extracts structured symptoms and emotional tone from a voice transcript.
 */
export async function extractSymptomsFromTranscript(transcript) {
  const messages = [
    {
      role: 'system',
      content: 'You are a medical triage AI. Extract structured health information from patient voice notes. Return ONLY valid JSON.',
    },
    {
      role: 'user',
      content: `Extract health data from this voice note:\n"""\n${transcript}\n"""\n\nReturn JSON:\n{\n  "symptoms": ["list", "of", "symptoms"],\n  "duration": "how long they have had these symptoms",\n  "severity": "mild | moderate | severe",\n  "emotionalTone": "anxious | calm | distressed | hopeful | neutral",\n  "summary": "one sentence clinical summary",\n  "urgency": "routine | soon | urgent"\n}`,
    },
  ];

  const raw = await chatComplete(messages, 'fast', {
    temperature: 0.2,
    max_tokens: 300,
    response_format: { type: 'json_object' },
  });

  try {
    return JSON.parse(raw);
  } catch {
    return { symptoms: [], duration: 'unknown', severity: 'mild', emotionalTone: 'neutral', summary: transcript, urgency: 'routine' };
  }
}

/* ───────────────────────────────────────────────────────────────
   FEATURE 6: Empathetic Avatar Chat
─────────────────────────────────────────────────────────────── */

const AVATAR_SYSTEM_PROMPT = `You are Svasthya AI — a warm, empathetic health companion on the Svasthya community platform.

Your role:
- Help users express their health concerns clearly before they post
- Guide them through community guidelines
- Provide general health education (NOT medical diagnoses)
- Assist in drafting well-structured posts

CRITICAL RULES:
1. NEVER diagnose any medical condition
2. NEVER recommend specific medications or dosages  
3. If a user mentions self-harm, thoughts of suicide, or a medical emergency, IMMEDIATELY respond with: "🚨 If you are in immediate danger or having a medical emergency, please call 112 (India) or your local emergency number right away. For mental health support, you can call iCall: 9152987821."
4. Always recommend consulting a real doctor for personal medical advice
5. Be warm, never clinical or cold
6. Keep responses concise (2-4 sentences max)`;

/**
 * Sends a message to the Svasthya Avatar and gets a response.
 * @param {Array} history - Array of {role, content} message objects
 * @param {string} newMessage - The latest user message
 */
export async function chatWithAvatar(history, newMessage) {
  const messages = [
    { role: 'system', content: AVATAR_SYSTEM_PROMPT },
    // Keep last 10 messages to stay within token limits
    ...history.slice(-10),
    { role: 'user', content: newMessage },
  ];

  return chatComplete(messages, 'fast', { temperature: 0.7, max_tokens: 200 });
}

export { MODELS };
