/**
 * Krishi Mitra - Standalone Presentation-Layer Kannada Translator (Plan B)
 * Zero changes to backend APIs, data pipelines, form values, or English mode.
 *
 * Architecture:
 *  - Shared language key: `km_selected_language` ('en' default | 'kn' Kannada)
 *  - Pass 1 (0ms offline): Exact phrase & dynamic pattern dictionary + emoji/prefix preservation
 *  - Pass 2 (queued local Gemma cache): MutationObserver batches unseen DB/LLM text via
 *    POST /api/v1/gemma/chat only when 'kn' is active, queuing cleanly around active AI calls.
 *  - Lossless WeakMap / data-attribute English snapshots restore exact English instantaneously.
 */
(function () {
  'use strict';

  const LANG_KEY = 'km_selected_language';
  const CACHE_KEY = 'km_kn_tx_cache_v1';
  const MAX_CACHE_ENTRIES = 1200;
  const KANNADA_RE = /[\u0C80-\u0CFF]/;
  // Reject Devanagari, Bengali, Gurmukhi, Gujarati, Tamil, Telugu, Malayalam, Thai, CJK, Hangul, Cyrillic, Arabic
  const BAD_SCRIPT_RE = /[\u0400-\u04FF\u0600-\u06FF\u0900-\u0BFF\u0C00-\u0C7F\u0D00-\u0E7F\u1100-\u11FF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;
  const LATIN_WORD_RE = /[A-Za-z]{2,}/;
  const LONG_ENGLISH_RE = /\b[A-Za-z]{4,}\b/;

  const API_BASE = (window.location.protocol && window.location.protocol.startsWith('http') && !['5500', '3000', '5173'].includes(window.location.port))
    ? window.location.origin
    : 'http://127.0.0.1:8000';

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CODE', 'PRE', 'TEXTAREA', 'INPUT']);
  const SKIP_TOKENS_RE = /^(?:KM\d+@\S*|FID-\S*|PM-?KISAN|PM-?KUSUM|PM-?KMY|PMFBY|PMJJBY|PMSBY|PM-?DAKSH|KCC|KAPY|MMKSSY|RSK|ADA|DBT|NPCI|UIDAI|RTC|FRUITS|SHGs?|CSC|OBC|General|CUDA:0|fp16|Q4_0|BAAI\/bge-m3|PostgreSQL|pgvector|PostgreSQL pgvector|PostgreSQL 16 pgvector|llama-server|LGD|HTTP|HTTPS|HTML|CSS|JSON|SSE|API|OTP|OS|AI|ID|INR|HECTARE|BGE-M3|BGE-M3 \(CUDA:0\)|KrishiMitra|Krishi\s*Mitra|raithamitra\.karnataka\.gov\.in|https?:\/\/\S+)$/i;

  // Track active Gemma calls so dynamic batch translation never collides with --parallel 1
  let activePrimaryGemmaRequests = 0;
  const origFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
  if (origFetch) {
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      const isPrimaryGemma = url.includes('/api/v1/gemma/consult');
      if (isPrimaryGemma) activePrimaryGemmaRequests++;
      return origFetch(input, init).finally(() => {
        if (isPrimaryGemma) activePrimaryGemmaRequests = Math.max(0, activePrimaryGemmaRequests - 1);
      });
    };
  }

  // Exact English -> Kannada phrase map (lowercased/normalized lookup keys computed below)
  const RAW_EXACT = {
    // Brand & Common Navigation
    'krishi': 'ಕೃಷಿ',
    'mitra': 'ಮಿತ್ರ',
    'krishi mitra': 'ಕೃಷಿ ಮಿತ್ರ',
    'krishimitra': 'ಕೃಷಿಮಿತ್ರ',
    'krishimitra ai': 'ಕೃಷಿಮಿತ್ರ AI',
    'krishi ai': 'ಕೃಷಿ AI',
    'ai': 'AI',
    'sovereign agri-os': 'ಸಾರ್ವಭೌಮ ಕೃಷಿ-OS',
    's o v e r e i g n   a g r i - o s': 'ಸಾ ರ್ವ ಭೌ ಮ   ಕೃ ಷಿ - O S',
    'home': 'ಮುಖಪುಟ',
    'home overview': 'ಮುಖಪುಟ ಅವಲೋಕನ',
    'krishi mitra home': 'ಕೃಷಿ ಮಿತ್ರ ಮುಖಪುಟ',
    '← farmer dashboard': '← ರೈತರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'farmer dashboard': 'ರೈತರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'public portal': 'ಸಾರ್ವಜನಿಕ ಪೋರ್ಟಲ್',
    'governance portal': 'ಆಡಳಿತ ಪೋರ್ಟಲ್',
    'executive dashboard': 'ಕಾರ್ಯನಿರ್ವಾಹಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'executive portal': 'ಕಾರ್ಯನಿರ್ವಾಹಕ ಪೋರ್ಟಲ್',
    'launch portal': 'ಪೋರ್ಟಲ್ ತೆರೆಯಿರಿ',
    'launch executive dashboard': 'ಕಾರ್ಯನಿರ್ವಾಹಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ',
    'farmer login': 'ರೈತ ಲಾಗಿನ್',
    'ai chat': 'AI ಚಾಟ್',
    'ai chatbot': 'AI ಚಾಟ್‌ಬಾಟ್',
    'krishi ai chatbot': 'ಕೃಷಿ AI ಚಾಟ್‌ಬಾಟ್',
    'ask krishi ai': 'ಕೃಷಿ AI ಕೇಳಿ',
    'ask krishi ai chatbot': 'ಕೃಷಿ AI ಚಾಟ್‌ಬಾಟ್ ಕೇಳಿ',
    'consult krishi ai chatbot': 'ಕೃಷಿ AI ಚಾಟ್‌ಬಾಟ್ ಸಂಪರ್ಕಿಸಿ',
    'open krishimitra ai': 'ಕೃಷಿಮಿತ್ರ AI ತೆರೆಯಿರಿ',
    'open chatbot →': 'ಚಾಟ್‌ಬಾಟ್ ತೆರೆಯಿರಿ →',
    'architecture': 'ವಿನ್ಯಾಸ',
    '3-step flow': '3-ಹಂತದ ಪ್ರಕ್ರಿಯೆ',
    'governance matrix': 'ಆಡಳಿತ ಮಾಪನ ಪಟ್ಟಿ',
    'toggle theme': 'ಥೀಮ್ ಬದಲಿಸಿ',
    'open krishi ai chatbot': 'ಕೃಷಿ AI ಚಾಟ್‌ಬಾಟ್ ತೆರೆಯಿರಿ',
    'farmer': 'ರೈತ',
    'new farmer': 'ಹೊಸ ರೈತ',
    'registration': 'ನೋಂದಣಿ',
    'please create a farmer user id.': 'ದಯವಿಟ್ಟು ರೈತ User ID ರಚಿಸಿ.',
    'please create a non-empty password.': 'ದಯವಿಟ್ಟು ಖಾಲಿಯಲ್ಲದ ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ.',
    'search by scheme name, ministry, or keyword': 'ಯೋಜನೆಯ ಹೆಸರು, ಸಚಿವಾಲಯ ಅಥವಾ ಕೀವರ್ಡ್‌ನಿಂದ ಹುಡುಕಿ',
    'all statutory categories': 'ಎಲ್ಲಾ ಶಾಸನಬದ್ಧ ವರ್ಗಗಳು',
    'highest benefit first': 'ಅತ್ಯಧಿಕ ಸೌಲಭ್ಯ ಮೊದಲು',
    'lowest benefit first': 'ಕನಿಷ್ಠ ಸೌಲಭ್ಯ ಮೊದಲು',
    'relevance (bge-m3)': 'ಸಂಬಂಧಿತ ಕ್ರಮ (BGE-M3)',
    'search schemes': 'ಯೋಜನೆ ಹುಡುಕಿ',
    'notice': 'ಸೂಚನೆ',
    'how to link rtc land survey to fruits id?': 'RTC ಜಮೀನು ಸರ್ವೆ ನಂಬರ್ ಅನ್ನು FRUITS IDಗೆ ಲಿಂಕ್ ಮಾಡುವುದು ಹೇಗೆ?',
    'eligible schemes': 'ಅರ್ಹ ಯೋಜನೆಗಳು',
    'almost eligible': 'ಬಹುತೇಕ ಅರ್ಹ',
    'saved schemes': 'ಉಳಿಸಿದ ಯೋಜನೆಗಳು',
    'all schemes': 'ಎಲ್ಲಾ ಯೋಜನೆಗಳು',
    'direct income': 'ನೇರ ಆದಾಯ ನೆರವು',
    'crop insurance': 'ಬೆಳೆ ವಿಮೆ',
    'subsidized loans': 'ಸಬ್ಸಿಡಿ ಸಾಲ',
    'irrigation & ponds': 'ನೀರಾವರಿ ಮತ್ತು ಕೃಷಿ ಹೊಂಡ',
    'farmer pension': 'ರೈತ ಪಿಂಚಣಿ',
    'financial benefit': 'ಆರ್ಥಿಕ ಸೌಲಭ್ಯ',
    'why you matched': 'ಹೊಂದಾಣಿಕೆಗೆ ಕಾರಣ',
    'not set': 'ನಮೂದಿಸಿಲ್ಲ',
    'apply now': 'ಈಗಲೇ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    'visit official portal': 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗೆ ಭೇಟಿ ನೀಡಿ',
    'cancel': 'ರದ್ದುಮಾಡಿ',
    'close': 'ಮುಚ್ಚಿ',
    'save': 'ಉಳಿಸಿ',
    'no.': 'ಇಲ್ಲ.',
    'yes.': 'ಹೌದು.',
    'a: no.': 'ಉ: ಇಲ್ಲ.',
    'a: no': 'ಉ: ಇಲ್ಲ',
    'a: yes.': 'ಉ: ಹೌದು.',
    'a: yes': 'ಉ: ಹೌದು',
    'mode: online': 'ವಿಧಾನ: ಆನ್‌ಲೈನ್',
    'mode: offline': 'ವಿಧಾನ: ಆಫ್‌ಲೈನ್',
    'mode: online / offline': 'ವಿಧಾನ: ಆನ್‌ಲೈನ್ / ಆಫ್‌ಲೈನ್',
    'none': 'ಯಾವುದೂ ಇಲ್ಲ',
    'nil': 'ಶೂನ್ಯ',
    'n/a': 'ಅನ್ವಯವಾಗುವುದಿಲ್ಲ',
    'scheme name': 'ಯೋಜನೆಯ ಹೆಸರು',
    'department': 'ಇಲಾಖೆ',

    // States & Terms
    'karnataka': 'ಕರ್ನಾಟಕ',
    'assam': 'ಅಸ್ಸಾಂ',
    'gujarat': 'ಗುಜರಾತ್',
    'goa': 'ಗೋವಾ',
    'meghalaya': 'ಮೇಘಾಲಯ',
    'india': 'ಭಾರತ',
    'central government': 'ಕೇಂದ್ರ ಸರ್ಕಾರ',
    'state / ut government': 'ರಾಜ್ಯ / ಕೇಂದ್ರಾಡಳಿತ ಸರ್ಕಾರ',

    // Page Titles
    'krishi mitra — sovereign agrarian intelligence & governance os': 'ಕೃಷಿ ಮಿತ್ರ — ಸಾರ್ವಭೌಮ ಕೃಷಿ ಬುದ್ಧಿಮತ್ತೆ ಮತ್ತು ಆಡಳಿತ OS',
    'farmer portal login & registration — krishi mitra': 'ರೈತ ಪೋರ್ಟಲ್ ಲಾಗಿನ್ ಮತ್ತು ನೋಂದಣಿ — ಕೃಷಿ ಮಿತ್ರ',
    'krishi mitra ai — chief secretary consultation': 'ಕೃಷಿ ಮಿತ್ರ AI — ಮುಖ್ಯ ಕಾರ್ಯದರ್ಶಿ ಸಮಾಲೋಚನೆ',

    // Index.html Hero & Proof
    'a unified system for': 'ಸಮಗ್ರ ಏಕೀಕೃತ ವ್ಯವಸ್ಥೆ',
    'sovereign agrarian governance': 'ಸಾರ್ವಭೌಮ ಕೃಷಿ ಆಡಳಿತಕ್ಕಾಗಿ',
    'we connect statutory schemes, citizen land records, agro-climatic conditions, and procedural mandates into one evolving deliberation layer that reflects farmer reality in real time.': 'ರೈತರ ವಾಸ್ತವ ಸ್ಥಿತಿಗೆ ತಕ್ಕಂತೆ ಶಾಸನಬದ್ಧ ಯೋಜನೆಗಳು, ಭೂ ದಾಖಲೆಗಳು, ಹವಾಮಾನ ಪರಿಸ್ಥಿತಿ ಮತ್ತು ಆಡಳಿತ ನಿಯಮಗಳನ್ನು ನಾವು ನೈಜ ಸಮಯದಲ್ಲಿ ಸಂಪರ್ಕಿಸುತ್ತೇವೆ.',
    'we connect statutory schemes, citizen land records, agro-climatic conditions, and procedural mandates into direct dbt income support, crop insurance, zero-interest kcc credit, and micro-irrigation subsidies.': 'ಶಾಸನಬದ್ಧ ಯೋಜನೆಗಳು, ರೈತ ಭೂ ದಾಖಲೆಗಳು, ಕೃಷಿ-ಹವಾಮಾನ ಪರಿಸ್ಥಿತಿಗಳನ್ನು ನೇರ DBT ನಗದು ನೆರವು, ಬೆಳೆ ವಿಮೆ, ಬಡ್ಡಿ ರಹಿತ KCC ಸಾಲ ಮತ್ತು ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ ಸಬ್ಸಿಡಿಗಳೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತೇವೆ.',
    'access farmer portal (citizen id)': 'ರೈತ ಪೋರ್ಟಲ್ ಪ್ರವೇಶಿಸಿ (Citizen ID)',
    'explore 6 pillars': '6 ಆಧಾರ ಸ್ತಂಭಗಳನ್ನು ನೋಡಿ',
    'autonomous architecture powered by sovereign open weights': 'ಸ್ವತಂತ್ರ ಸಾರ್ವಭೌಮ AI ತಂತ್ರಜ್ಞಾನದಿಂದ ಚಾಲಿತ ಸ್ವಾಯತ್ತ ವಿನ್ಯಾಸ',
    'bge-m3 dense rag': 'BGE-M3 ದಟ್ಟ RAG ಹುಡುಕಾಟ',
    'gemma 4 e4b (llama.cpp)': 'Gemma 4 E4B (llama.cpp)',
    '100% on-premise airgap': '100% ಸ್ಥಳೀಯ ಏರ್‌ಗ್ಯಾಪ್ ಸುರಕ್ಷತೆ',
    'active statutory schemes': 'ಸಕ್ರಿಯ ಶಾಸನಬದ್ಧ ಯೋಜನೆಗಳು',
    'official faqs & sops': 'ಅಧಿಕೃತ ಪ್ರಶ್ನೋತ್ತರಗಳು ಮತ್ತು ಮಾರ್ಗಸೂಚಿಗಳು',
    'states & uts': 'ರಾಜ್ಯಗಳು ಮತ್ತು ಕೇಂದ್ರಾಡಳಿತಗಳು',
    '36 states & uts': '36 ರಾಜ್ಯಗಳು ಮತ್ತು ಕೇಂದ್ರಾಡಳಿತಗಳು',
    '38 states & uts': '36 ರಾಜ್ಯಗಳು ಮತ್ತು ಕೇಂದ್ರಾಡಳಿತಗಳು',
    '28 states & 8 union territories': '28 ರಾಜ್ಯಗಳು ಮತ್ತು 8 ಕೇಂದ್ರಾಡಳಿತ ಪ್ರದೇಶಗಳು',
    'states & uts indexed': '28 ರಾಜ್ಯಗಳು ಮತ್ತು 8 ಕೇಂದ್ರಾಡಳಿತ ಪ್ರದೇಶಗಳು',
    '100% local': '100% ಸ್ಥಳೀಯ',
    'zero cloud egress': 'ಶೂನ್ಯ ಕ್ಲೌಡ್ ಡೇಟಾ ಹೊರಹರಿವು',
    'ministry of agriculture & farmers welfare': 'ಕೃಷಿ ಮತ್ತು ರೈತರ ಕಲ್ಯಾಣ ಸಚಿವಾಲಯ',
    'ministry of new & renewable energy': 'ಹೊಸ ಮತ್ತು ನವೀಕರಿಸಬಹುದಾದ ಇಂಧನ ಸಚಿವಾಲಯ',
    'department of water resources (dowr)': 'ಜಲಸಂಪನ್ಮೂಲ ಇಲಾಖೆ (DoWR)',
    'animal husbandry & dairying': 'ಪಶುಸಂಗೋಪನೆ ಮತ್ತು ಹೈನುಗಾರಿಕೆ',
    'nabard & reserve bank priority credit': 'NABARD ಮತ್ತು RBI ಆದ್ಯತಾ ಸಾಲ ವ್ಯವಸ್ಥೆ',
    'indian council of agricultural research (icar)': 'ಭಾರತೀಯ ಕೃಷಿ ಅನುಸಂಧಾನ ಪರಿಷತ್ (ICAR)',

    // Common scheme names (frequently shown in modals / cards)
    'pradhan mantri garib kalyan anna yojana': 'ಪ್ರಧಾನ ಮಂತ್ರಿ ಗರೀಬ್ ಕಲ್ಯಾಣ ಅನ್ನ ಯೋಜನೆ',
    'ganga kalyana scheme': 'ಗಂಗಾ ಕಲ್ಯಾಣ ಯೋಜನೆ',
    'pradhan mantri fasal bima yojana': 'ಪ್ರಧಾನ ಮಂತ್ರಿ ಫಸಲ್ ಬಿಮಾ ಯೋಜನೆ',
    'pradhan mantri kisan samman nidhi': 'ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ ನಿಧಿ',
    'pradhan mantri kisan credit card': 'ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್',
    'kisan credit card': 'ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್',
    'pradhan mantri krishi sinchai yojana': 'ಪ್ರಧಾನ ಮಂತ್ರಿ ಕೃಷಿ ಸಿಂಚಾಯಿ ಯೋಜನೆ',
    'national mission on micro irrigation': 'ರಾಷ್ಟ್ರೀಯ ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ ಅಭಿಯಾನ',
    'soil health card scheme': 'ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಯೋಜನೆ',
    'paramparagat krishi vikas yojana': 'ಪರಂಪರಾಗತ ಕೃಷಿ ವಿಕಾಸ ಯೋಜನೆ',
    'national food security act': 'ರಾಷ್ಟ್ರೀಯ ಆಹಾರ ಭದ್ರತಾ ಕಾಯ್ದೆ',

    // Common document / identity terms
    'ration card': 'ರೇಷನ್ ಕಾರ್ಡ್',
    'aadhaar card': 'ಆಧಾರ್ ಕಾರ್ಡ್',
    'aadhar card': 'ಆಧಾರ್ ಕಾರ್ಡ್',
    'adhar card': 'ಆಧಾರ್ ಕಾರ್ಡ್',
    'bank passbook': 'ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್',
    'bank pass book': 'ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್',
    'income certificate': 'ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ',
    'caste certificate': 'ಜಾತಿ ಪ್ರಮಾಣಪತ್ರ',
    'land record': 'ಭೂ ದಾಖಲೆ',
    'land records': 'ಭೂ ದಾಖಲೆಗಳು',
    'rtc copy': 'RTC ಪ್ರತಿ',
    'latest rtc copy': 'ಇತ್ತೀಚಿನ RTC ಪ್ರತಿ',
    'self declaration letter': 'ಸ್ವ-ಘೋಷಣಾ ಪತ್ರ',
    'guarantor': 'ಜಾಮೀನುದಾರ',
    'competent authority': 'ಸಮರ್ಥ ಪ್ರಾಧಿಕಾರ',
    'applicant': 'ಅರ್ಜಿದಾರ',
    'beneficiary': 'ಫಲಾನುಭವಿ',
    'beneficiaries': 'ಫಲಾನುಭವಿಗಳು',

    // Ministry names
    'ministry of finance': 'ಹಣಕಾಸು ಸಚಿವಾಲಯ',
    'ministry of food': 'ಆಹಾರ ಸಚಿವಾಲಯ',
    'ministry of food and consumer affairs': 'ಆಹಾರ ಮತ್ತು ಗ್ರಾಹಕ ವ್ಯವಹಾರ ಸಚಿವಾಲಯ',
    'ministry of consumer affairs, food and public distribution': 'ಆಹಾರ ಮತ್ತು ಸಾರ್ವಜನಿಕ ವಿತರಣ ಸಚಿವಾಲಯ',

    // Index.html Problem / Dilemma
    'the governance dilemma': 'ಆಡಳಿತಾತ್ಮಕ ಸವಾಲು',
    'agrarian welfare is': 'ಕೃಷಿ ಕಲ್ಯಾಣ ವ್ಯವಸ್ಥೆ',
    'fragmented': 'ವಿಭಜಿತವಾಗಿದೆ',
    'despite over 2,000 public assistance schemes, millions of indian farmers are excluded by procedural bureaucracy, opaque eligibility criteria, and disjointed administrative portals.': '2,000ಕ್ಕೂ ಹೆಚ್ಚು ಸರ್ಕಾರಿ ಯೋಜನೆಗಳಿದ್ದರೂ, ಸಂಕೀರ್ಣ ನಿಯಮಗಳು, ಅಸ್ಪಷ್ಟ ಅರ್ಹತೆ ಮತ್ತು ಬೇರ್ಪಟ್ಟ ಪೋರ್ಟಲ್‌ಗಳಿಂದಾಗಿ ಕೋಟ್ಯಂತರ ರೈತರು ವಂಚಿತರಾಗಿದ್ದಾರೆ.',
    '2,066 disconnected portals': '2,066 ಬೇರ್ಪಟ್ಟ ಪೋರ್ಟಲ್‌ಗಳು',
    'schemes exist across 28 separate state revenue boards and dozens of central ministries. farmers have no unified interface to cross-reference overlapping benefits, input quotas, and subsidy thresholds.': '28 ರಾಜ್ಯ ಕಂದಾಯ ಮಂಡಳಿಗಳು ಮತ್ತು ಹತ್ತಾರು ಕೇಂದ್ರ ಸಚಿವಾಲಯಗಳಲ್ಲಿ ಯೋಜನೆಗಳು ಹಂಚಿಹೋಗಿವೆ. ರೈತರಿಗೆ ಪ್ರಯೋಜನಗಳು ಮತ್ತು ಸಬ್ಸಿಡಿ ಮಿತಿಗಳನ್ನು ಒಟ್ಟಿಗೆ ಪರಿಶೀಲಿಸಲು ಏಕೀಕೃತ ವೇದಿಕೆ ಇಲ್ಲ.',
    '40%+ rejection from minor errors': 'ಸಣ್ಣ ತಪ್ಪುಗಳಿಂದ 40%+ ಅರ್ಜಿ ತಿರಸ್ಕಾರ',
    'spelling mismatches in aadhaar, unseeded bank accounts on the npci mapper, and unverified mutation entries stop pm-kisan, pmfby, and solar subsidies without clear procedural redressal.': 'ಆಧಾರ್ ಕಾಗುಣಿತ ವ್ಯತ್ಯಾಸ, NPCI ಬ್ಯಾಂಕ್ ಸೀಡಿಂಗ್ ಇಲ್ಲದಿರುವುದು ಮತ್ತು ಪರಿಶೀಲನೆಯಾಗದ ಭೂ ದಾಖಲೆಗಳಿಂದ PM-KISAN, PMFBY ಮತ್ತು ಸೋಲಾರ್ ಸಬ್ಸಿಡಿಗಳು ಸ್ಪಷ್ಟ ಪರಿಹಾರವಿಲ್ಲದೆ ನಿಲ್ಲುತ್ತವೆ.',
    'cloud vulnerability & latency': 'ಕ್ಲೌಡ್ ಅಪಾಯ ಮತ್ತು ವಿಳಂಬ',
    'commercial cloud llms expose sensitive farmer identities, landholding coordinates, and family income data to third-party offshore apis while suffering from severe latency and hallucinated policy advice.': 'ವಾಣಿಜ್ಯ ಕ್ಲೌಡ್ AIಗಳು ರೈತರ ಗುರುತು, ಜಮೀನು ಮತ್ತು ಆದಾಯದ ಮಾಹಿತಿಯನ್ನು ಹೊರಗಿನ ಸರ್ವರ್‌ಗಳಿಗೆ ಕಳುಹಿಸುತ್ತವೆ ಮತ್ತು ತಪ್ಪು ಸಲಹೆ ನೀಡುವ ಅಪಾಯ ಹೊಂದಿವೆ.',

    // Index.html 6 Pillars
    'architectural capabilities': 'ತಾಂತ್ರಿಕ ಸಾಮರ್ಥ್ಯಗಳು',
    'everything needed for': 'ಸಂಪೂರ್ಣ ವ್ಯವಸ್ಥೆ',
    'agrarian justice': 'ರೈತ ನ್ಯಾಯಕ್ಕಾಗಿ',
    'an autonomous local stack engineering deterministic policy evaluation, semantic retrieval, and legally sound citizen directives.': 'ನಿಖರ ಅರ್ಹತಾ ಮೌಲ್ಯಮಾಪನ, ಅರ್ಥಪೂರ್ಣ ಹುಡುಕಾಟ ಮತ್ತು ಕಾನೂನುಬದ್ಧ ಮಾರ್ಗದರ್ಶನ ನೀಡುವ ಸ್ವಾಯತ್ತ ಸ್ಥಳೀಯ ತಂತ್ರಜ್ಞಾನ.',
    'all architecture (6)': 'ಎಲ್ಲಾ ವಿನ್ಯಾಸಗಳು (6)',
    'autonomous ai & retrieval': 'ಸ್ವಾಯತ್ತ AI ಮತ್ತು ಹುಡುಕಾಟ',
    'deterministic logic & graph': 'ನಿಖರ ತರ್ಕ ಮತ್ತು ಗ್ರಾಫ್',
    'air-gapped edge & redressal': 'ಏರ್‌ಗ್ಯಾಪ್ ಸುರಕ್ಷತೆ ಮತ್ತು ಪರಿಹಾರ',
    'chief secretary agent': 'ಮುಖ್ಯ ಕಾರ್ಯದರ್ಶಿ ಏಜೆಂಟ್',
    'autonomous 5-turn multi-agent deliberation engine that synthesizes inter-ministerial packages, administrative action steps, and official grievance letters.': 'ಅಂತರ್-ಇಲಾಖಾ ಯೋಜನೆ ಪ್ಯಾಕೇಜ್‌ಗಳು, ಆಡಳಿತಾತ್ಮಕ ಕ್ರಮಗಳು ಮತ್ತು ದೂರು ಪರಿಹಾರ ಮಾರ್ಗದರ್ಶನ ನೀಡುವ 5-ಹಂತದ ಸ್ವಾಯತ್ತ ಏಜೆಂಟ್.',
    'gemma 4 local engine': 'Gemma 4 ಸ್ಥಳೀಯ ಎಂಜಿನ್',
    'bge-m3 dense retrieval': 'BGE-M3 ದಟ್ಟ ಹುಡುಕಾಟ',
    '1024-dimensional pgvector index embedding 2,066 statutory schemes and 20,110 faqs for instant cross-lingual semantic search with sub-second latency.': '2,066 ಯೋಜನೆಗಳು ಮತ್ತು 20,110 ಪ್ರಶ್ನೋತ್ತರಗಳನ್ನು ಒಂದು ಸೆಕೆಂಡಿಗಿಂತ ಕಡಿಮೆ ಅವಧಿಯಲ್ಲಿ ಹುಡುಕುವ 1024-ಆಯಾಮದ pgvector ವ್ಯವಸ್ಥೆ.',
    'cuda:0 embedded pytorch': 'CUDA:0 ಎಂಬೆಡೆಡ್ PyTorch',
    '4-state statutory evaluator': '4-ಹಂತದ ಶಾಸನಬದ್ಧ ಮೌಲ್ಯಮಾಪಕ',
    'strict constitutional evaluation logic returning': 'ಕಟ್ಟುನಿಟ್ಟಾದ ನಿಯಮ ತರ್ಕವು ನೀಡುತ್ತದೆ',
    '. never hallucinates an invalid government benefit.': '. ಅಮಾನ್ಯ ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳನ್ನು ಎಂದಿಗೂ ಊಹಿಸುವುದಿಲ್ಲ.',
    '100% deterministic': '100% ನಿಖರ ತರ್ಕ',
    'citizen profile graph': 'ರೈತ ಪ್ರೊಫೈಲ್ ಗ್ರಾಫ್',
    'deep aggregation of citizen landholdings, soil records, irrigation sources, social categories, crop cycles, and livestock under unique ids (e.g.': 'ಜಮೀನು, ನೀರಾವರಿ, ಸಾಮಾಜಿಕ ವರ್ಗ, ಬೆಳೆ ಮತ್ತು ಜಾನುವಾರು ವಿವರಗಳ ಸಮಗ್ರ ಸಂಗ್ರಹ (ಉದಾ.',
    'relational postgres': 'ರಿಲೇಶನಲ್ Postgres',
    'air-gapped edge sovereignty': 'ಏರ್‌ಗ್ಯಾಪ್ ಸ್ಥಳೀಯ ಸಾರ್ವಭೌಮತ್ವ',
    'runs completely offline on local rtx gpus. zero cloud dependencies, zero external api keys, ensuring complete privacy for national land and citizen datasets.': 'ಸ್ಥಳೀಯ RTX GPUನಲ್ಲಿ ಸಂಪೂರ್ಣವಾಗಿ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ. ಕ್ಲೌಡ್ ಅವಲಂಬನೆಯಿಲ್ಲದೆ ರೈತರ ದತ್ತಾಂಶವನ್ನು ರಕ್ಷಿಸುತ್ತದೆ.',
    'air-gapped local stack': 'ಏರ್‌ಗ್ಯಾಪ್ ಸ್ಥಳೀಯ ವ್ಯವಸ್ಥೆ',
    'procedural action dossier': 'ಕಾರ್ಯವಿಧಾನ ಮಾರ್ಗದರ್ಶಿ ಕಡತ',
    'produces actionable administrative guidance: exact annexure download paths, mandatory document checklists, and district grievance appeal workflows.': 'ಅರ್ಜಿ ನಮೂನೆ ವಿವರಗಳು, ಅಗತ್ಯ ದಾಖಲೆಗಳ ಪಟ್ಟಿ ಮತ್ತು ಜಿಲ್ಲಾ ಮಟ್ಟದ ದೂರು ಮೇಲ್ಮನವಿ ಕ್ರಮಗಳನ್ನು ಒದಗಿಸುತ್ತದೆ.',
    'immediate citizen redressal': 'ತಕ್ಷಣದ ರೈತ ಪರಿಹಾರ',

    // Index.html 3 Steps & Governance Matrix
    'citizen workflow': 'ರೈತ ಕಾರ್ಯವಿಧಾನ',
    'entitlement in': 'ಸರ್ಕಾರಿ ಸೌಲಭ್ಯ ಪಡೆಯಿರಿ',
    '3 simple steps': '3 ಸರಳ ಹಂತಗಳಲ್ಲಿ',
    'from citizen authentication to executive administrative resolution in less than 3 seconds.': 'ರೈತ ಲಾಗಿನ್‌ನಿಂದ ಅಧಿಕೃತ ಆಡಳಿತ ಪರಿಹಾರದವರೆಗೆ 3 ಸೆಕೆಂಡುಗಳಿಗಿಂತ ಕಡಿಮೆ ಅವಧಿಯಲ್ಲಿ.',
    'citizen unique id & registration': 'ರೈತ ಅನನ್ಯ ID ಮತ್ತು ನೋಂದಣಿ',
    'existing or newly registered farmers sign in with their unique user id (e.g.': 'ಹಳೆಯ ಅಥವಾ ಹೊಸ ರೈತರು ತಮ್ಮ ಅನನ್ಯ User ID (ಉದಾ.',
    ') and password to pull postgresql landholding, crop, and category records.': ') ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ಬಳಸಿ PostgreSQL ಭೂಮಿ, ಬೆಳೆ ಮತ್ತು ವರ್ಗದ ವಿವರಗಳನ್ನು ಪಡೆಯುತ್ತಾರೆ.',
    'neural cross-matching': 'ನ್ಯೂರಲ್ ಕ್ರಾಸ್-ಮ್ಯಾಚಿಂಗ್',
    "bge-m3 and postgresql cross-evaluate the farmer's land area, state jurisdiction, and category against 2,066 statutory rules and 20,110 policy provisions.": 'BGE-M3 ಮತ್ತು PostgreSQL ರೈತರ ಜಮೀನು ವಿಸ್ತೀರ್ಣ, ರಾಜ್ಯ ಮತ್ತು ವರ್ಗವನ್ನು 2,066 ಯೋಜನೆ ನಿಯಮಗಳೊಂದಿಗೆ ಪರಿಶೀಲಿಸುತ್ತವೆ.',
    'executive directive': 'ಕಾರ್ಯನಿರ್ವಾಹಕ ನಿರ್ದೇಶನ',
    'gemma 4 deliberates autonomously to produce a binding administrative roadmap with exact document checklists, online submission steps, and official appeal channels.': 'Gemma 4 ಸ್ವತಂತ್ರವಾಗಿ ವಿಶ್ಲೇಷಿಸಿ ದಾಖಲೆ ಪಟ್ಟಿ, ಆನ್‌ಲೈನ್ ಅರ್ಜಿ ಹಂತಗಳು ಮತ್ತು ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತದೆ.',
    'governance benchmark': 'ಆಡಳಿತ ಮಾಪನ',
    'statutory efficiency &': 'ಶಾಸನಬದ್ಧ ದಕ್ಷತೆ ಮತ್ತು',
    'sovereignty matrix': 'ಸಾರ್ವಭೌಮತ್ವ ಪಟ್ಟಿ',
    'comparing traditional fragmented bureaucracy against the krishi mitra autonomous edge operating system.': 'ಸಾಂಪ್ರದಾಯಿಕ ಕಚೇರಿ ಪ್ರಕ್ರಿಯೆ ಮತ್ತು ಕೃಷಿ ಮಿತ್ರ ಸ್ವಾಯತ್ತ ವ್ಯವಸ್ಥೆಯ ತುಲನೆ.',
    'architectural dimension': 'ವಿನ್ಯಾಸ ಅಂಶ',
    'legacy bureaucracy / portals': 'ಹಳೆಯ ಕಚೇರಿ / ಪೋರ್ಟಲ್ ವ್ಯವಸ್ಥೆ',
    'krishi mitra sovereign os': 'ಕೃಷಿ ಮಿತ್ರ ಸಾರ್ವಭೌಮ OS',
    'eligibility resolution time': 'ಅರ್ಹತೆ ನಿರ್ಧಾರದ ಸಮಯ',
    'latency to policy verdict': 'ಯೋಜನೆ ತೀರ್ಪಿನ ವೇಗ',
    '3 to 6 weeks': '3 ರಿಂದ 6 ವಾರಗಳು',
    'manual physical visits to taluk office / csc, offline paper file queues.': 'ತಾಲೂಕು ಕಚೇರಿ / CSCಗೆ ಖುದ್ದು ಭೇಟಿ ಮತ್ತು ಕಾಗದದ ಕಡತಗಳ ಸರತಿ ಸಾಲು.',
    '1.8 seconds local edge inference': '1.8 ಸೆಕೆಂಡ್‌ಗಳಲ್ಲಿ ಸ್ಥಳೀಯ ನಿರ್ಣಯ',
    'sub-second dense vector lookup': 'ಒಂದು ಸೆಕೆಂಡಿಗಿಂತ ವೇಗದ ವೆಕ್ಟರ್ ಹುಡುಕಾಟ',
    'statutory accuracy & verification': 'ಶಾಸನಬದ್ಧ ನಿಖರತೆ ಮತ್ತು ಪರಿಶೀಲನೆ',
    'constitutional logic': 'ನಿಯಮಬದ್ಧ ತರ್ಕ',
    'discretionary & 40%+ error rate': 'ವೈಯಕ್ತಿಕ ವಿವೇಚನೆ ಮತ್ತು 40%+ ದೋಷ ಪ್ರಮಾಣ',
    'minor aadhaar spelling mismatches or unseeded bank accounts result in silent rejection.': 'ಸಣ್ಣ ಆಧಾರ್ ಕಾಗುಣಿತ ದೋಷ ಅಥವಾ ಬ್ಯಾಂಕ್ ಸೀಡಿಂಗ್ ಇಲ್ಲದಿರುವುದರಿಂದ ಮೌನ ಅರ್ಜಿ ತಿರಸ್ಕಾರ.',
    'deterministic 4-state evaluator': 'ನಿಖರ 4-ಹಂತದ ಮೌಲ್ಯಮಾಪಕ',
    'pass • fail • unknown • conditional': 'PASS • FAIL • UNKNOWN • CONDITIONAL',
    'inter-ministerial policy synthesis': 'ಅಂತರ್-ಇಲಾಖಾ ಯೋಜನೆ ಸಮನ್ವಯ',
    'cross-department coordination': 'ವಿವಿಧ ಇಲಾಖೆಗಳ ಸಮನ್ವಯ',
    'isolated silos (dozens of sites)': 'ಬೇರ್ಪಟ್ಟ ಇಲಾಖೆಗಳು (ಹತ್ತಾರು ವೆಬ್‌ಸೈಟ್‌ಗಳು)',
    'farmers must independently discover and apply across agriculture, water, energy, and animal husbandry.': 'ರೈತರು ಕೃಷಿ, ನೀರಾವರಿ, ವಿದ್ಯುತ್ ಮತ್ತು ಪಶುಸಂಗೋಪನೆ ಇಲಾಖೆಗಳನ್ನು ಪ್ರತ್ಯೇಕವಾಗಿ ಹುಡುಕಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಬೇಕು.',
    'unified 2,066-program graph': 'ಏಕೀಕೃತ 2,066 ಯೋಜನೆಗಳ ಜಾಲ',
    'synthesizes central + 28 state gazettes': 'ಕೇಂದ್ರ + 28 ರಾಜ್ಯ ಗೆಜೆಟ್‌ಗಳ ಸಮನ್ವಯ',
    'procedural rejection redressal': 'ತಿರಸ್ಕಾರ ಪರಿಹಾರ ಮಾರ್ಗದರ್ಶನ',
    'actionable citizen remediation': 'ರೈತರಿಗೆ ಕಾರ್ಯರೂಪದ ಪರಿಹಾರ',
    'opaque "application rejected"': 'ಅಸ್ಪಷ್ಟ "ಅರ್ಜಿ ತಿರಸ್ಕೃತಗೊಂಡಿದೆ" ಸಂದೇಶ',
    'no statutory explanation, missing annexure lists, or appellate contact info.': 'ಶಾಸನಬದ್ಧ ಕಾರಣವಿಲ್ಲ, ಬೇಕಾದ ದಾಖಲೆ ಪಟ್ಟಿ ಅಥವಾ ಮೇಲ್ಮನವಿ ಮಾಹಿತಿ ಇಲ್ಲ.',
    'binding action directives': 'ಸ್ಪಷ್ಟ ಕ್ರಮ ನಿರ್ದೇಶನಗಳು',
    'biometric e-kyc & npci mandate checklists': 'ಬಯೋಮೆಟ್ರಿಕ್ e-KYC ಮತ್ತು NPCI ಪರಿಶೀಲನಾ ಪಟ್ಟಿ',
    'data sovereignty & privacy': 'ದತ್ತಾಂಶ ಸಾರ್ವಭೌಮತ್ವ ಮತ್ತು ಗೌಪ್ಯತೆ',
    'national security boundary': 'ರಾಷ್ಟ್ರೀಯ ಭದ್ರತಾ ಗಡಿ',
    'public cloud & third-party apis': 'ಸಾರ್ವಜನಿಕ ಕ್ಲೌಡ್ ಮತ್ತು ಥರ್ಡ್-ಪಾರ್ಟಿ APIಗಳು',
    'sensitive farmer identity, land coordinates, and bank details sent across commercial offshore cloud servers.': 'ರೈತರ ಗುರುತು, ಜಮೀನು ಮತ್ತು ಬ್ಯಾಂಕ್ ವಿವರಗಳು ಹೊರದೇಶದ ಕ್ಲೌಡ್ ಸರ್ವರ್‌ಗಳಿಗೆ ರವಾನೆಯಾಗುತ್ತವೆ.',
    '100% air-gapped local rtx gpu': '100% ಏರ್‌ಗ್ಯಾಪ್ ಸ್ಥಳೀಯ RTX GPU',
    'zero cloud leakage • 100% data-sovereign': 'ಶೂನ್ಯ ಕ್ಲೌಡ್ ಸೋರಿಕೆ • 100% ದತ್ತಾಂಶ-ಸಾರ್ವಭೌಮ',

    // Telemetry, CTA, Footer, Offcanvas
    'local gemma 4 e4b': 'ಸ್ಥಳೀಯ Gemma 4 E4B',
    'llama-server (port 8080)': 'llama-server (ಪೋರ್ಟ್ 8080)',
    'llama-server (:8080 live)': 'llama-server (:8080 ಸಕ್ರಿಯ)',
    'llama-server (:8080 offline)': 'llama-server (:8080 ಆಫ್‌ಲೈನ್)',
    'gateway :8000 offline': 'ಗೇಟ್‌ವೇ :8000 ಆಫ್‌ಲೈನ್',
    'postgresql disconnnected': 'PostgreSQL ಸಂಪರ್ಕ ಕಡಿತ',
    'postgresql disconnected': 'PostgreSQL ಸಂಪರ್ಕ ಕಡಿತ',
    'airgap data sovereignty': 'ಏರ್‌ಗ್ಯಾಪ್ ದತ್ತಾಂಶ ಸಾರ್ವಭೌಮತ್ವ',
    'zero foreign cloud egress': 'ವಿದೇಶಿ ಕ್ಲೌಡ್ ಹೊರಹರಿವು ಇಲ್ಲ',
    'sovereign democratization of agricultural welfare': 'ಕೃಷಿ ಕಲ್ಯಾಣ ಯೋಜನೆಗಳ ಸಾರ್ವಭೌಮ ಪ್ರಜಾಸತ್ತೀಕರಣ',
    'ready to initialize': 'ಪ್ರಾರಂಭಿಸಲು ಸಿದ್ಧರಿದ್ದೀರಾ',
    'sovereign agrarian intelligence?': 'ಸಾರ್ವಭೌಮ ಕೃಷಿ ಬುದ್ಧಿಮತ್ತೆಯನ್ನು?',
    'access your authenticated citizen entitlement dossier across 2,066 statutory programs with zero password barriers.': '2,066 ಶಾಸನಬದ್ಧ ಯೋಜನೆಗಳಲ್ಲಿ ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಅರ್ಹತಾ ವರದಿಯನ್ನು ಸುಲಭವಾಗಿ ಪಡೆಯಿರಿ.',
    'sovereign, air-gapped agrarian operating system unifying statutory schemes, land records, and autonomous edge reasoning for indian agriculture.': 'ಭಾರತೀಯ ಕೃಷಿಗಾಗಿ ಶಾಸನಬದ್ಧ ಯೋಜನೆಗಳು, ಭೂ ದಾಖಲೆಗಳು ಮತ್ತು ಸ್ವಾಯತ್ತ ಸ್ಥಳೀಯ ತರ್ಕವನ್ನು ಒಂದೇ ವೇದಿಕೆಯಲ್ಲಿ ತರುವ ಸಾರ್ವಭೌಮ ವ್ಯವಸ್ಥೆ.',
    '© 2026 krishi mitra — sovereign agrarian operating system. 100% data-sovereign.': '© 2026 ಕೃಷಿ ಮಿತ್ರ — ಸಾರ್ವಭೌಮ ಕೃಷಿ ಆಡಳಿತ ವ್ಯವಸ್ಥೆ. 100% ದತ್ತಾಂಶ-ಸುರಕ್ಷಿತ.',
    '— sovereign agrarian operating system. 100% data-sovereign.': '— ಸಾರ್ವಭೌಮ ಕೃಷಿ ಆಡಳಿತ ವ್ಯವಸ್ಥೆ. 100% ದತ್ತಾಂಶ-ಸುರಕ್ಷಿತ.',
    'system status:': 'ವ್ಯವಸ್ಥೆ ಸ್ಥಿತಿ:',
    'checking subsystems...': 'ಉಪವ್ಯವಸ್ಥೆಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    'all 3 subsystems active': 'ಎಲ್ಲಾ 3 ಉಪವ್ಯವಸ್ಥೆಗಳು ಸಕ್ರಿಯ',
    '(local edge)': '(ಸ್ಥಳೀಯ ಎಡ್ಜ್)',
    'farmer portal login': 'ರೈತ ಪೋರ್ಟಲ್ ಲಾಗಿನ್',
    'user id & password verified': 'USER ID ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ಪರಿಶೀಲಿತ',
    'enter your registered farmer user id (e.g. km26@0001 or your newly registered user id) and password to access personalized statutory schemes and the farmer dashboard.': 'ವೈಯಕ್ತಿಕ ಯೋಜನೆಗಳು ಮತ್ತು ರೈತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಪ್ರವೇಶಿಸಲು ನಿಮ್ಮ ನೋಂದಾಯಿತ User ID ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ.',
    'or your newly registered user id) and': 'ಅಥವಾ ನಿಮ್ಮ ಹೊಸದಾಗಿ ನೋಂದಾಯಿಸಿದ User ID) ಮತ್ತು',
    'to access personalized statutory schemes and the farmer dashboard.': 'ನಮೂದಿಸಿ ವೈಯಕ್ತಿಕ ಯೋಜನೆಗಳು ಮತ್ತು ರೈತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಪ್ರವೇಶಿಸಿ.',
    'farmer user id': 'ರೈತ ಗುರುತಿನ ಸಂಖ್ಯೆ (User ID)',
    'password': 'ಪಾಸ್‌ವರ್ಡ್',
    'enter your password': 'ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ',
    '🌾 verify & sign in to farmer portal': '🌾 ಪರಿಶೀಲಿಸಿ & ರೈತ ಪೋರ್ಟಲ್‌ಗೆ ಲಾಗಿನ್ ಆಗಿ',
    'verify & sign in to farmer portal': 'ಪರಿಶೀಲಿಸಿ & ರೈತ ಪೋರ್ಟಲ್‌ಗೆ ಲಾಗಿನ್ ಆಗಿ',
    'new farmer? register new account': 'ಹೊಸ ರೈತರೇ? ಹೊಸ ಖಾತೆ ನೋಂದಣಿ ಮಾಡಿ',
    '— or quick fill a sample profile —': '— ಅಥವಾ ಮಾದರಿ ರೈತ ವಿವರ ತುಂಬಿ —',
    'want to explore all 2,066 schemes directly?': 'ಎಲ್ಲಾ 2,066 ಯೋಜನೆಗಳನ್ನು ನೇರವಾಗಿ ನೋಡಬೇಕೆ?',
    'explore public governance catalog →': 'ಸಾರ್ವಜನಿಕ ಯೋಜನೆ ಪಟ್ಟಿ ನೋಡಿ →',
    'verifying credentials...': 'ಗುರುತಿನ ವಿವರ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    'please enter both your farmer user id and password.': 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ರೈತ User ID ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ಎರಡನ್ನೂ ನಮೂದಿಸಿ.',
    'invalid farmer user id or password.': 'ತಪ್ಪಾದ ರೈತ User ID ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್.',

    // Page-login.html & auth.js
    'sovereign agri-os // farmer authentication': 'ಸಾರ್ವಭೌಮ ಕೃಷಿ-OS // ರೈತ ದೃಢೀಕರಣ',
    'farmer portal sign in': 'ರೈತ ಪೋರ್ಟಲ್ ಲಾಗಿನ್',
    'portal sign in': 'ಪೋರ್ಟಲ್ ಲಾಗಿನ್',
    'enter your registered user id and password to unlock personalized scheme eligibility and your farmer dashboard.': 'ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಯೋಜನೆ ಅರ್ಹತೆ ಮತ್ತು ರೈತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಲು ನೋಂದಾಯಿತ User ID ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ.',
    'create your unique user id & password and complete any optional profile details below.': 'ನಿಮ್ಮ ಅನನ್ಯ User ID ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ ಮತ್ತು ಕೆಳಗಿನ ಐಚ್ಛಿಕ ಪ್ರೊಫೈಲ್ ವಿವರಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.',
    'existing farmer login': 'ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ ರೈತ ಲಾಗಿನ್',
    'new farmer registration': 'ಹೊಸ ರೈತ ನೋಂದಣಿ',
    'verify & open farmer dashboard': 'ಪರಿಶೀಲಿಸಿ & ರೈತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ',
    'verifying with postgresql...': 'PostgreSQL ನೊಂದಿಗೆ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    'quick demo logins (existing citizens)': 'ತ್ವರಿತ ಮಾದರಿ ಲಾಗಿನ್ (ನೋಂದಾಯಿತ ರೈತರು)',
    'password = user id': 'ಪಾಸ್‌ವರ್ಡ್ = User ID',
    'new to krishimitra sovereign os?': 'ಕೃಷಿಮಿತ್ರ ಸಾರ್ವಭೌಮ OSಗೆ ಹೊಸಬರೇ?',
    'create new farmer account →': 'ಹೊಸ ರೈತ ಖಾತೆ ರಚಿಸಿ →',
    'create new farmer account': 'ಹೊಸ ರೈತ ಖಾತೆ ರಚಿಸಿ',
    'complete profile setup': 'ಸಂಪೂರ್ಣ ಪ್ರೊಫೈಲ್ ಸಿದ್ಧತೆ',
    'are required. all other fields are optional.': 'ಕಡ್ಡಾಯವಾಗಿವೆ. ಉಳಿದ ಎಲ್ಲಾ ವಿವರಗಳು ಐಚ್ಛಿಕ.',
    'only': 'ಕೇವಲ',
    'user id': 'User ID',
    'and': 'ಮತ್ತು',
    'user id & password': 'User ID ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್',
    'profile & location': 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸ್ಥಳ',
    'land, crops, trees & livestock': 'ಜಮೀನು, ಬೆಳೆ, ಮರ ಮತ್ತು ಜಾನುವಾರು',
    'account credentials': 'ಖಾತೆ ವಿವರಗಳು',
    'create your unique user id': 'ನಿಮ್ಮ ಅನನ್ಯ User ID ರಚಿಸಿ',
    'check availability': 'ಲಭ್ಯತೆ ಪರಿಶೀಲಿಸಿ',
    '8 to 20 characters': '8 ರಿಂದ 20 ಅಕ್ಷರಗಳು',
    'at least 1 letter (a-z / a-z)': 'ಕನಿಷ್ಠ 1 ಅಕ್ಷರ (A-Z / a-z)',
    'at least 1 digit (0-9)': 'ಕನಿಷ್ಠ 1 ಅಂಕಿ (0-9)',
    'at least 1 symbol (@ # $ _ -)': 'ಕನಿಷ್ಠ 1 ಚಿಹ್ನೆ (@ # $ _ -)',
    'create password': 'ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ',
    'confirm password': 'ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ',
    're-enter password': 'ಪಾಸ್‌ವರ್ಡ್ ಮತ್ತೆ ನಮೂದಿಸಿ',
    'next: profile & location': 'ಮುಂದೆ: ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸ್ಥಳ',
    'personal & agrarian profile': 'ವೈಯಕ್ತಿಕ ಮತ್ತು ಕೃಷಿ ಪ್ರೊಫೈಲ್',
    'full name': 'ಪೂರ್ಣ ಹೆಸರು',
    'enter full name (optional)': 'ಪೂರ್ಣ ಹೆಸರು ನಮೂದಿಸಿ (ಐಚ್ಛಿಕ)',
    'enter full name': 'ಪೂರ್ಣ ಹೆಸರು ನಮೂದಿಸಿ',
    'date of birth': 'ಜನ್ಮ ದಿನಾಂಕ',
    'age helper': 'ವಯಸ್ಸು ಸಹಾಯಕ',
    'gender': 'ಲಿಂಗ',
    '-- select gender (optional) --': '-- ಲಿಂಗ ಆಯ್ಕೆಮಾಡಿ (ಐಚ್ಛಿಕ) --',
    'male': 'ಪುರುಷ',
    'female': 'ಮಹಿಳೆ',
    'other': 'ಇತರೆ',
    'mobile number': 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    '10-digit mobile (optional)': '10 ಅಂಕಿಯ ಮೊಬೈಲ್ (ಐಚ್ಛಿಕ)',
    '10-digit mobile': '10 ಅಂಕಿಯ ಮೊಬೈಲ್',
    'social category': 'ಸಾಮಾಜಿಕ ವರ್ಗ',
    '-- select category (optional) --': '-- ವರ್ಗ ಆಯ್ಕೆಮಾಡಿ (ಐಚ್ಛಿಕ) --',
    '-- select category --': '-- ವರ್ಗ ಆಯ್ಕೆಮಾಡಿ --',
    'farmer category': 'ರೈತ ವರ್ಗ',
    '-- select class (optional) --': '-- ರೈತ ವರ್ಗ ಆಯ್ಕೆಮಾಡಿ (ಐಚ್ಛಿಕ) --',
    '-- select class --': '-- ವರ್ಗ ಆಯ್ಕೆಮಾಡಿ --',
    'marginal (< 1 ha)': 'ಸಣ್ಣ / ಅತಿ ಸಣ್ಣ (< 1 ಹೆ.)',
    'small (1 - 2 ha)': 'ಸಣ್ಣ ರೈತ (1 - 2 ಹೆ.)',
    'semi-medium (2 - 4 ha)': 'ಅರೆ-ಮಧ್ಯಮ (2 - 4 ಹೆ.)',
    'medium (4 - 10 ha)': 'ಮಧ್ಯಮ (4 - 10 ಹೆ.)',
    'large (> 10 ha)': 'ದೊಡ್ಡ ರೈತ (> 10 ಹೆ.)',
    'annual family income (inr)': 'ವಾರ್ಷಿಕ ಕುಟುಂಬ ಆದಾಯ (₹)',
    'enter annual income (optional)': 'ವಾರ್ಷಿಕ ಆದಾಯ ನಮೂದಿಸಿ (ಐಚ್ಛಿಕ)',
    'kcc holder': 'KCC ಕಾರ್ಡ್ ಹೊಂದಿದ್ದೀರಾ',
    '-- select status (optional) --': '-- ಸ್ಥಿತಿ ಆಯ್ಕೆಮಾಡಿ (ಐಚ್ಛಿಕ) --',
    '-- select status --': '-- ಸ್ಥಿತಿ ಆಯ್ಕೆಮಾಡಿ --',
    'yes (kcc holder)': 'ಹೌದು (KCC ಹೊಂದಿದ್ದೇನೆ)',
    'no': 'ಇಲ್ಲ',
    'yes': 'ಹೌದು',
    'farmer registration / fruits id': 'ರೈತ ನೋಂದಣಿ / FRUITS ID',
    'registration / fruits id': 'ನೋಂದಣಿ / FRUITS ID',
    'verification status': 'ಪರಿಶೀಲನೆ ಸ್ಥಿತಿ',
    'unverified (default)': 'ಪರಿಶೀಲನೆಯಾಗದ (ಡೀಫಾಲ್ಟ್)',
    'unverified': 'ಪರಿಶೀಲನೆಯಾಗದ',
    'pending': 'ಬಾಕಿ ಇದೆ',
    'verified': 'ಪರಿಶೀಲಿತ',
    'residence location & lgd directory': 'ನಿವಾಸ ಸ್ಥಳ ಮತ್ತು LGD ನಿರ್ದೇಶಿಕೆ',
    'select state, district, sub-district & village from official lgd directory': 'ಅಧಿಕೃತ LGD ಪಟ್ಟಿಯಿಂದ ರಾಜ್ಯ, ಜಿಲ್ಲೆ, ತಾಲೂಕು ಮತ್ತು ಗ್ರಾಮವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    'manual entry': 'ಕೈಯಾರೆ ನಮೂದಿಸಿ',
    'state': 'ರಾಜ್ಯ',
    'district': 'ಜಿಲ್ಲೆ',
    'sub-district / taluk': 'ತಾಲೂಕು / ಉಪ-ಜಿಲ್ಲೆ',
    'sub-district': 'ತಾಲೂಕು / ಉಪ-ಜಿಲ್ಲೆ',
    'village': 'ಗ್ರಾಮ',
    '-- select state (optional) --': '-- ರಾಜ್ಯ ಆಯ್ಕೆಮಾಡಿ (ಐಚ್ಛಿಕ) --',
    '-- loading states... --': '-- ರಾಜ್ಯಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ... --',
    '-- select district --': '-- ಜಿಲ್ಲೆ ಆಯ್ಕೆಮಾಡಿ --',
    '-- select sub-district --': '-- ತಾಲೂಕು ಆಯ್ಕೆಮಾಡಿ --',
    '-- select village --': '-- ಗ್ರಾಮ ಆಯ್ಕೆಮಾಡಿ --',
    '-- lgd offline (use manual entry) --': '-- LGD ಆಫ್‌ಲೈನ್ (ಕೈಯಾರೆ ನಮೂದಿಸಿ) --',
    'pincode': 'ಪಿನ್‌ಕೋಡ್',
    'selected': 'ಆಯ್ಕೆಯಾದದ್ದು',
    'not selected': 'ಆಯ್ಕೆ ಮಾಡಿಲ್ಲ',
    'back': 'ಹಿಂದೆ',
    'next: landholdings, crops & assets': 'ಮುಂದೆ: ಜಮೀನು, ಬೆಳೆ ಮತ್ತು ಆಸ್ತಿಗಳು',
    'landholding plots': 'ಜಮೀನು ಹಿಡುವಳಿ ಪ್ಲಾಟ್‌ಗಳು',
    '(0 or more)': '(0 ಅಥವಾ ಹೆಚ್ಚು)',
    'columns:': 'ಕಾಲಂಗಳು:',
    'add plot': 'ಪ್ಲಾಟ್ ಸೇರಿಸಿ',
    '+ add plot': '+ ಪ್ಲಾಟ್ ಸೇರಿಸಿ',
    'no landholding plots added yet. click "add plot" to attach land records, or leave empty.': 'ಇನ್ನೂ ಯಾವುದೇ ಜಮೀನು ಪ್ಲಾಟ್ ಸೇರಿಸಿಲ್ಲ. ಭೂ ದಾಖಲೆ ಸೇರಿಸಲು "ಪ್ಲಾಟ್ ಸೇರಿಸಿ" ಒತ್ತಿ.',
    'no landholding plots added. click "+ add plot" to add land records.': 'ಯಾವುದೇ ಜಮೀನು ಪ್ಲಾಟ್ ಸೇರಿಸಿಲ್ಲ. ಸೇರಿಸಲು "+ ಪ್ಲಾಟ್ ಸೇರಿಸಿ" ಒತ್ತಿ.',
    'crops cultivated': 'ಬೆಳೆದ ಬೆಳೆಗಳು',
    'add crop': 'ಬೆಳೆ ಸೇರಿಸಿ',
    '+ add crop': '+ ಬೆಳೆ ಸೇರಿಸಿ',
    'no crop entries added yet. click "add crop" to attach seasonal crop records.': 'ಇನ್ನೂ ಬೆಳೆ ವಿವರ ಸೇರಿಸಿಲ್ಲ. ಸೇರಿಸಲು "ಬೆಳೆ ಸೇರಿಸಿ" ಒತ್ತಿ.',
    'no crops recorded. click "+ add crop" to add crop entries.': 'ಯಾವುದೇ ಬೆಳೆ ವಿವರ ದಾಖಲಿಸಿಲ್ಲ. ಸೇರಿಸಲು "+ ಬೆಳೆ ಸೇರಿಸಿ" ಒತ್ತಿ.',
    'horticulture & plantation trees': 'ತೋಟಗಾರಿಕೆ ಮತ್ತು ತೋಟದ ಮರಗಳು',
    'add tree': 'ಮರ ಸೇರಿಸಿ',
    '+ add tree': '+ ಮರ ಸೇರಿಸಿ',
    'add at least 1 landholding plot above first to attach tree records.': 'ಮರದ ವಿವರಗಳನ್ನು ಸೇರಿಸಲು ಮೊದಲು ಮೇಲೆ ಕನಿಷ್ಠ 1 ಜಮೀನು ಪ್ಲಾಟ್ ಸೇರಿಸಿ.',
    'no tree entries added.': 'ಯಾವುದೇ ಮರದ ವಿವರ ಸೇರಿಸಿಲ್ಲ.',
    'no tree entries recorded.': 'ಯಾವುದೇ ಮರದ ವಿವರ ದಾಖಲಿಸಿಲ್ಲ.',
    'livestock & poultry': 'ಜಾನುವಾರು ಮತ್ತು ಕೋಳಿ ಸಾಕಾಣಿಕೆ',
    'add livestock': 'ಜಾನುವಾರು ಸೇರಿಸಿ',
    '+ add livestock': '+ ಜಾನುವಾರು ಸೇರಿಸಿ',
    'add at least 1 landholding plot above first to attach livestock records.': 'ಜಾನುವಾರು ವಿವರಗಳನ್ನು ಸೇರಿಸಲು ಮೊದಲು ಮೇಲೆ ಕನಿಷ್ಠ 1 ಜಮೀನು ಪ್ಲಾಟ್ ಸೇರಿಸಿ.',
    'no livestock entries added.': 'ಯಾವುದೇ ಜಾನುವಾರು ವಿವರ ಸೇರಿಸಿಲ್ಲ.',
    'no livestock entries recorded.': 'ಯಾವುದೇ ಜಾನುವಾರು ವಿವರ ದಾಖಲಿಸಿಲ್ಲ.',
    'register new farmer': 'ಹೊಸ ರೈತ ನೋಂದಣಿ ಮಾಡಿ',
    'remove': 'ತೆಗೆಯಿರಿ',
    '✕ remove': '✕ ತೆಗೆಯಿರಿ',
    'copy profile location': 'ಪ್ರೊಫೈಲ್ ಸ್ಥಳ ನಕಲಿಸಿ',
    '📍 copy residence location': '📍 ನಿವಾಸ ಸ್ಥಳ ನಕಲಿಸಿ',
    'land area (land_area)': 'ಜಮೀನು ವಿಸ್ತೀರ್ಣ',
    'land area': 'ಜಮೀನು ವಿಸ್ತೀರ್ಣ',
    'input unit': 'ಅಳತೆ ಘಟಕ',
    'unit': 'ಘಟಕ',
    'hectare': 'ಹೆಕ್ಟೇರ್',
    'acres (→ ha)': 'ಎಕರೆ (→ ಹೆ.)',
    'ownership type': 'ಮಾಲೀಕತ್ವದ ವಿಧ',
    'ownership': 'ಮಾಲೀಕತ್ವ',
    'owned': 'ಸ್ವಂತ (OWNED)',
    'leased': 'ಗುತ್ತಿಗೆ (LEASED)',
    'tenant': 'ಗೇಣಿ (TENANT)',
    'shared': 'ಹಂಚಿಕೆ (SHARED)',
    'irrigation available': 'ನೀರಾವರಿ ಸೌಲಭ್ಯ',
    'irrigation': 'ನೀರಾವರಿ',
    'yes (irrigated)': 'ಹೌದು (ನೀರಾವರಿ ಇದೆ)',
    'no (rainfed)': 'ಇಲ್ಲ (ಮಳೆಯಾಶ್ರಿತ)',
    'plot state': 'ಪ್ಲಾಟ್ ರಾಜ್ಯ',
    'plot district': 'ಪ್ಲಾಟ್ ಜಿಲ್ಲೆ',
    'plot village': 'ಪ್ಲಾಟ್ ಗ್ರಾಮ',
    'plot link': 'ಪ್ಲಾಟ್ ಲಿಂಕ್',
    'crop name': 'ಬೆಳೆಯ ಹೆಸರು',
    'season': 'ಋತು',
    'year': 'ವರ್ಷ',
    'kharif': 'ಮುಂಗಾರು (Kharif)',
    'rabi': 'ಹಿಂಗಾರು (Rabi)',
    'zaid': 'ಬೇಸಿಗೆ (Zaid)',
    'perennial': 'ಬಹುವಾರ್ಷಿಕ (Perennial)',
    'tree name': 'ಮರದ ಹೆಸರು',
    'variety': 'ತಳಿ',
    'count *': 'ಸಂಖ್ಯೆ *',
    'count': 'ಸಂಖ್ಯೆ',
    'age (yr)': 'ವಯಸ್ಸು (ವರ್ಷ)',
    'age years': 'ವಯಸ್ಸು (ವರ್ಷ)',
    'purpose': 'ಉದ್ದೇಶ',
    'commercial': 'ವಾಣಿಜ್ಯ',
    'fruit': 'ಹಣ್ಣು',
    'shade': 'ನೆರಳು',
    'timber': 'ಮರದ ದಿಮ್ಮಿ',
    'animal type': 'ಪ್ರಾಣಿಯ ವಿಧ',
    'breed': 'ತಳಿ',
    'dairy': 'ಹೈನುಗಾರಿಕೆ',
    'milk': 'ಹಾಲು',
    'breeding': 'ತಳಿ ಅಭಿವೃದ್ಧಿ',
    'eggs': 'ಮೊಟ್ಟೆ',
    'meat': 'ಮಾಂಸ',
    'wool': 'ಉಣ್ಣೆ',
    '-- select (optional) --': '-- ಆಯ್ಕೆಮಾಡಿ (ಐಚ್ಛಿಕ) --',
    '-- optional --': '-- ಐಚ್ಛಿಕ --',
    '-- select season (optional) --': '-- ಋತು ಆಯ್ಕೆಮಾಡಿ (ಐಚ್ಛಿಕ) --',
    '-- general / not linked to a specific plot --': '-- ಸಾಮಾನ್ಯ / ನಿರ್ದಿಷ್ಟ ಪ್ಲಾಟ್‌ಗೆ ಲಿಂಕ್ ಇಲ್ಲ --',
    '-- general / unassigned (null) --': '-- ಸಾಮಾನ್ಯ / ಹಂಚಿಕೆಯಾಗದ (NULL) --',
    'please enter a user id first.': 'ದಯವಿಟ್ಟು ಮೊದಲು User ID ನಮೂದಿಸಿ.',
    'checking availability in postgresql...': 'PostgreSQL ನಲ್ಲಿ ಲಭ್ಯತೆ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    'passwords do not match. please re-enter the same password.': 'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಾಣಿಕೆಯಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಒಂದೇ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ.',

    // Dashboard_app.html + app.js + profileEditor.js extra UI strings
    '⚡ quick fill demo citizens:': '⚡ ತ್ವರಿತ ಮಾದರಿ ರೈತರು:',
    'quick fill demo citizens:': 'ತ್ವರಿತ ಮಾದರಿ ರೈತರು:',
    '100% sovereign & local': '100% ಸಾರ್ವಭೌಮ ಮತ್ತು ಸ್ಥಳೀಯ',
    'or select an option below': 'ಅಥವಾ ಕೆಳಗಿನ ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ',
    'save your profile permanently to postgresql': 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಅನ್ನು PostgreSQL ನಲ್ಲಿ ಶಾಶ್ವತವಾಗಿ ಉಳಿಸಿ',
    'create account & view schemes': 'ಖಾತೆ ರಚಿಸಿ & ಯೋಜನೆಗಳನ್ನು ನೋಡಿ',
    'continue locally only': 'ಸ್ಥಳೀಯವಾಗಿ ಮಾತ್ರ ಮುಂದುವರಿಯಿರಿ',
    'live advisory': 'ನೇರ ಸೂಚನೆ',
    'loading live statutory schemes...': 'ನೇರ ಶಾಸನಬದ್ಧ ಯೋಜನೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    'loading statutory advisories...': 'ಶಾಸನಬದ್ಧ ಸಲಹೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    'loading official schemes from postgresql catalog...': 'PostgreSQL ಪಟ್ಟಿಯಿಂದ ಅಧಿಕೃತ ಯೋಜನೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    '⚡ verify top schemes (gemma ai)': '⚡ ಅಗ್ರ ಯೋಜನೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ (Gemma AI)',
    '🏛 browse all 2,066 catalog': '🏛 ಎಲ್ಲಾ 2,066 ಯೋಜನೆಗಳ ಪಟ್ಟಿ ನೋಡಿ',
    'load next 20 schemes': 'ಮುಂದಿನ 20 ಯೋಜನೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಿ',
    '🔍 official faq troubleshooter (bge-m3 semantic search)': '🔍 ಅಧಿಕೃತ ಪ್ರಶ್ನೋತ್ತರ ಪರಿಹಾರಕ (BGE-M3 ಹುಡುಕಾಟ)',
    'ask chief secretary ai →': 'ಮುಖ್ಯ ಕಾರ್ಯದರ್ಶಿ AI ಕೇಳಿ →',
    'search official faqs': 'ಅಧಿಕೃತ ಪ್ರಶ್ನೋತ್ತರ ಹುಡುಕಿ',
    'krishimitra ai chief secretary': 'ಕೃಷಿಮಿತ್ರ AI ಮುಖ್ಯ ಕಾರ್ಯದರ್ಶಿ',
    'update fields across all 6 database tables — saves to postgresql immediately': 'ಎಲ್ಲಾ 6 ಡೇಟಾಬೇಸ್ ಟೇಬಲ್‌ಗಳ ವಿವರ ನವೀಕರಿಸಿ — ತಕ್ಷಣ PostgreSQL ನಲ್ಲಿ ಉಳಿತಾಯವಾಗುತ್ತದೆ',
    'save changes to postgresql ✔': 'ಬದಲಾವಣೆಗಳನ್ನು PostgreSQL ಗೆ ಉಳಿಸಿ ✔',
    '🤖 gemma 4 wing 1 statutory audit': '🤖 Gemma 4 Wing 1 ಶಾಸನಬದ್ಧ ತಪಾಸಣೆ',
    'verify eligibility now': 'ಈಗಲೇ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ',
    're-run gemma ai audit': 'Gemma AI ತಪಾಸಣೆ ಮರು-ನಡೆಸಿ',
    'loading ai statutory verdict...': 'AI ಶಾಸನಬದ್ಧ ತೀರ್ಪನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    'official eligibility & exclusions': 'ಅಧಿಕೃತ ಅರ್ಹತೆ ಮತ್ತು ಹೊರಗಿಡುವಿಕೆಗಳು',
    'official faqs & administrative precedents (bge-m3)': 'ಅಧಿಕೃತ ಪ್ರಶ್ನೋತ್ತರಗಳು ಮತ್ತು ಆಡಳಿತ ಪೂರ್ವನಿದರ್ಶನಗಳು (BGE-M3)',
    '💬 ask chief secretary ai about this scheme': '💬 ಈ ಯೋಜನೆ ಬಗ್ಗೆ ಮುಖ್ಯ ಕಾರ್ಯದರ್ಶಿ AI ಕೇಳಿ',
    'bge match • verify ai': 'BGE ಹೊಂದಾಣಿಕೆ • AI ಪರಿಶೀಲಿಸಿ',
    'bge match': 'BGE ಹೊಂದಾಣಿಕೆ',
    'ineligible': 'ಅನರ್ಹರು',
    'eligible': 'ಅರ್ಹರು',
    "gemma 4 ai ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಲು 'details' ತೆರೆಯಿರಿ.": "Gemma 4 AI ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಲು 'ಮಾಹಿತಿ' ತೆರೆಯಿರಿ.",
    'high priority': 'ಹೆಚ್ಚಿನ ಆದ್ಯತೆ',
    'normal priority': 'ಸಾಮಾನ್ಯ ಆದ್ಯತೆ',
    '⚡ verify ai': '⚡ AI ಪರಿಶೀಲಿಸಿ',
    'checking...': 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    'auditing with gemma 4...': 'Gemma 4 ಮೂಲಕ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    'no statutory disqualifying factors detected.': 'ಯಾವುದೇ ಅನರ್ಹತಾ ಅಂಶಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
    'gemma 4 ai is auditing your matched schemes...': 'Gemma 4 AI ನಿಮ್ಮ ಹೊಂದಾಣಿಕೆಯ ಯೋಜನೆಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದೆ...',
    'no gemma-verified eligible schemes on this view yet': 'ಈ ಪಟ್ಟಿಯಲ್ಲಿ ಇನ್ನೂ Gemma-ಪರಿಶೀಲಿತ ಅರ್ಹ ಯೋಜನೆಗಳಿಲ್ಲ',
    'available all days (multilingual & kannada support)': 'ಎಲ್ಲಾ ದಿನ ಲಭ್ಯ (ಬಹುಭಾಷಾ ಮತ್ತು ಕನ್ನಡ ಬೆಂಬಲ)',
    'krishi mitra — sovereign citizen assistance': 'ಕೃಷಿ ಮಿತ್ರ — ಸಾರ್ವಭೌಮ ರೈತ ಸಹಾಯ',
    'eligibility:': 'ಅರ್ಹತೆ:',
    'exclusions:': 'ಹೊರಗಿಡುವಿಕೆಗಳು:',
    'loading official document requirements from postgresql...': 'PostgreSQL ನಿಂದ ಅಧಿಕೃತ ದಾಖಲೆ ಅಗತ್ಯಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    'loading official application workflow...': 'ಅಧಿಕೃತ ಅರ್ಜಿ ಪ್ರಕ್ರಿಯೆಯನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    'loading latest farmer records from postgresql...': 'PostgreSQL ನಿಂದ ಇತ್ತೀಚಿನ ರೈತ ದಾಖಲೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    'guest citizen': 'ಅತಿಥಿ ರೈತ',
    'personal, credentials & classification': 'ವೈಯಕ್ತಿಕ, ಖಾತೆ ಮತ್ತು ವರ್ಗೀಕರಣ ವಿವರ',
    '1. profile': '1. ಪ್ರೊಫೈಲ್',
    '2. location (lgd)': '2. ಸ್ಥಳ (LGD)',
    '3. landholdings': '3. ಜಮೀನು',
    '4. crops': '4. ಬೆಳೆಗಳು',
    '5. trees': '5. ಮರಗಳು',
    '6. livestock': '6. ಜಾನುವಾರು',
    'farmer unique id': 'ರೈತ ಅನನ್ಯ ID',
    'new password': 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್',
    'leave blank to keep existing': 'ಬದಲಾಯಿಸದಿದ್ದರೆ ಖಾಲಿ ಬಿಡಿ',
    'manual entry (location_id = null)': 'ಕೈಯಾರೆ ನಮೂದು (location_id = NULL)',
    'not linked': 'ಲಿಂಕ್ ಆಗಿಲ್ಲ',
    'not linked (manual / optional)': 'ಲಿಂಕ್ ಆಗಿಲ್ಲ (ಕೈಯಾರೆ / ಐಚ್ಛಿಕ)',
    'click \'run ai check\' or open details to verify statutory eligibility with gemma 4.': 'Gemma 4 ಮೂಲಕ ಶಾಸನಬದ್ಧ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಲು "AI ಪರಿಶೀಲಿಸಿ" ಅಥವಾ "ಮಾಹಿತಿ" ಒತ್ತಿ.',
    'statutory central/state agricultural welfare entitlement (click details to load full benefits).': 'ಕೇಂದ್ರ/ರಾಜ್ಯ ಕೃಷಿ ಕಲ್ಯಾಣ ಯೋಜನೆ ಸೌಲಭ್ಯ (ಪೂರ್ಣ ಮಾಹಿತಿಗೆ "ಮಾಹಿತಿ" ಒತ್ತಿ).',
    'review official eligibility criteria and confirm missing farmer profile details.': 'ಅಧಿಕೃತ ಅರ್ಹತಾ ನಿಯಮಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಬಾಕಿ ಇರುವ ರೈತ ವಿವರಗಳನ್ನು ದೃಢೀಕರಿಸಿ.',

    // AI Chat UI (ai_chat.html)
    '+ new chat': '+ ಹೊಸ ಚಾಟ್',
    'new chat': 'ಹೊಸ ಚಾಟ್',
    'sovereign secretariat consultation': 'ಸಾರ್ವಭೌಮ ಸಚಿವಾಲಯ ಸಮಾಲೋಚನೆ',
    'official ai chief secretary — cross-ministerial statutory guidance & scheme resolution for indian & karnataka farmers.': 'ಅಧಿಕೃತ AI ಮುಖ್ಯ ಕಾರ್ಯದರ್ಶಿ — ಭಾರತೀಯ ಮತ್ತು ಕರ್ನಾಟಕದ ರೈತರಿಗೆ ಅಂತರ್-ಇಲಾಖಾ ಶಾಸನಬದ್ಧ ಮಾರ್ಗದರ್ಶನ ಮತ್ತು ಯೋಜನೆ ಪರಿಹಾರ.',
    'ask the chief secretary about schemes, pmfby claim window, rtc linking, subsidies...': 'ಯೋಜನೆಗಳು, PMFBY ಬೆಳೆ ನಷ್ಟ ಪರಿಹಾರ, RTC ಜೋಡಣೆ, ಸಬ್ಸಿಡಿಗಳ ಬಗ್ಗೆ ಮುಖ್ಯ ಕಾರ್ಯದರ್ಶಿಯನ್ನು ಕೇಳಿ...',
    'grounded in official gazettes': 'ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಗೆಜೆಟ್ ಆಧಾರಿತ',
    'consult': 'ಸಲಹೆ ಪಡೆಯಿರಿ',
    'pm-kisan ₹6,000': 'PM-KISAN ₹6,000',
    'pmfby 72h crop loss': 'PMFBY 72ಗಂ ಬೆಳೆ ನಷ್ಟ',
    'kcc crop loan (4%)': 'KCC ಬೆಳೆ ಸಾಲ (4%)',
    'krishi bhagya drip': 'ಕೃಷಿ ಭಾಗ್ಯ ಹನಿ ನೀರಾವರಿ',
    'fruits fid & rtc': 'FRUITS FID ಮತ್ತು RTC',
    'machinery & tractor subsidy': 'ಯಂತ್ರೋಪಕರಣ & ಟ್ರ್ಯಾಕ್ಟರ್ ಸಬ್ಸಿಡಿ',
    'document checklist': 'ದಾಖಲೆ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ',
    'raitha samparka kendra': 'ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ',
    'sovereign agri-os // checking engines...': 'ಸಾರ್ವಭೌಮ ಕೃಷಿ-OS // ಎಂಜಿನ್ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    'api gateway (:8000) unreachable — offline': 'API ಗೇಟ್‌ವೇ (:8000) ಸಂಪರ್ಕವಿಲ್ಲ — ಆಫ್‌ಲೈನ್',
    'api gateway (:8000) offline': 'API ಗೇಟ್‌ವೇ (:8000) ಆಫ್‌ಲೈನ್',
    'opening sse stream & retrieving statutory gazette records...': 'SSE ಸ್ಟ್ರೀಮ್ ತೆರೆಯಲಾಗುತ್ತಿದೆ ಮತ್ತು ಅಧಿಕೃತ ಗೆಜೆಟ್ ದಾಖಲೆಗಳನ್ನು ಪಡೆಯಲಾಗುತ್ತಿದೆ...',
    'official secretariat directive verified': 'ಅಧಿಕೃತ ಸಚಿವಾಲಯ ನಿರ್ದೇಶನ ದೃಢೀಕರಿಸಲಾಗಿದೆ',
    'official secretariat directive complete': 'ಅಧಿಕೃತ ಸಚಿವಾಲಯ ನಿರ್ದೇಶನ ಪೂರ್ಣಗೊಂಡಿದೆ',
    'inter-ministerial scheme package': 'ಅಂತರ್-ಇಲಾಖಾ ಯೋಜನೆ ಪ್ಯಾಕೇಜ್',
    'faq & procedural resolutions': 'ಪ್ರಶ್ನೋತ್ತರ ಮತ್ತು ಕಾರ್ಯವಿಧಾನ ಪರಿಹಾರಗಳು',
    'mandatory document checklist': 'ಕಡ್ಡಾಯ ದಾಖಲೆಗಳ ಪಟ್ಟಿ',
    'administrative action plan': 'ಆಡಳಿತಾತ್ಮಕ ಕ್ರಿಯಾ ಯೋಜನೆ',
    'official portals': 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗಳು',
    'executive deliberation audit trace': 'ಕಾರ್ಯನಿರ್ವಾಹಕ ಪರಿಶೀಲನಾ ವಿವರ (Audit Trace)',
    'bge-m3 evidence matched': 'BGE-M3 ಆಧಾರಿತ ದಾಖಲೆ ಹೊಂದಾಣಿಕೆ',
    'chief secretary returned an empty directive.': 'ಮುಖ್ಯ ಕಾರ್ಯದರ್ಶಿ ಯಾವುದೇ ನಿರ್ದೇಶನ ನೀಡಲಿಲ್ಲ.',
    'streaming interrupted — switching to direct chief secretary post api...': 'ಸ್ಟ್ರೀಮಿಂಗ್ ವ್ಯತ್ಯಯ — ನೇರ ಮುಖ್ಯ ಕಾರ್ಯದರ್ಶಿ APIಗೆ ಬದಲಾಯಿಸಲಾಗುತ್ತಿದೆ...'
  };

  // Build normalized lookup dictionary
  const EXACT = new Map();
  Object.keys(RAW_EXACT).forEach((k) => {
    EXACT.set(k.replace(/\s+/g, ' ').trim().toLowerCase(), RAW_EXACT[k]);
  });

  // Dynamic regex rules evaluated when exact dictionary match misses
  const PATTERN_RULES = [
    [/^SOVEREIGN AGRI-OS \/\/ ([\d,]+) STATUTORY SCHEMES INDEXED$/i, (_, n) => `ಸಾರ್ವಭೌಮ ಕೃಷಿ-OS // ${n} ಶಾಸನಬದ್ಧ ಯೋಜನೆಗಳು ಸೂಚೀಕೃತ`],
    [/^SOVEREIGN AGRI-OS \/\/ GEMMA 4 [•+] (.+?) LIVE$/i, (_, d) => `ಸಾರ್ವಭೌಮ ಕೃಷಿ-OS // GEMMA 4 • ${d} ಸಕ್ರಿಯ`],
    [/^National Scheme Repository \(([\d,]+) Programs\)$/i, (_, n) => `ರಾಷ್ಟ್ರೀಯ ಯೋಜನೆ ಸಂಗ್ರಹ (${n} ಯೋಜನೆಗಳು)`],
    [/^([\d,]+) Schemes \/ ([\d,]+) FAQs$/i, (_, s, f) => `${s} ಯೋಜನೆಗಳು / ${f} ಪ್ರಶ್ನೋತ್ತರಗಳು`],
    [/^(\d+)\/(\d+) Active \(Gemma :8080 Offline\)$/i, (_, a, b) => `${a}/${b} ಸಕ್ರಿಯ (Gemma :8080 ಆಫ್‌ಲೈನ್)`],
    [/^Degraded \(Check PostgreSQL & :8000\)$/i, () => 'ಕಾರ್ಯಕ್ಷಮತೆ ಕುಂಠಿತ (PostgreSQL ಮತ್ತು :8000 ಪರಿಶೀಲಿಸಿ)'],
    [/^API Gateway Offline \(:8000\)$/i, () => 'API ಗೇಟ್‌ವೇ ಆಫ್‌ಲೈನ್ (:8000)'],
    [/^SOVEREIGN AGRI-OS \/\/ GEMMA 4 \+ (.+?) LIVE$/i, (_, d) => `ಸಾರ್ವಭೌಮ ಕೃಷಿ-OS // GEMMA 4 + ${d} ಸಕ್ರಿಯ`],
    [/^DB \+ (.+?) LIVE \/\/ GEMMA :8080 OFFLINE$/i, (_, d) => `DB + ${d} ಸಕ್ರಿಯ // GEMMA :8080 ಆಫ್‌ಲೈನ್`],
    [/^Stage 1 \(BGE-M3\): (\d+) matched schemes • Stage 2 \(Gemma 4\): (\d+) audited \((\d+) Eligible(?:, (\d+) Ineligible)?\)$/i,
      (_, m, a, e, inel) => `ಹಂತ 1 (BGE-M3): ${m} ಯೋಜನೆಗಳು • ಹಂತ 2 (Gemma 4): ${a} ಪರಿಶೀಲಿತ (${e} ಅರ್ಹ${inel ? `, ${inel} ಅನರ್ಹ` : ''})`],
    [/^Stage 1 \(BGE-M3\): (\d+) matched schemes • Gemma 4 \(:8080\) offline$/i,
      (_, m) => `ಹಂತ 1 (BGE-M3): ${m} ಯೋಜನೆಗಳು • Gemma 4 (:8080) ಆಫ್‌ಲೈನ್`],
    [/^Stage 1 \(BGE-M3\): (\d+) matched schemes • Stage 2 \(Gemma 4\): Auditing (\d+\/\d+)\.\.\.$/i,
      (_, m, p) => `ಹಂತ 1 (BGE-M3): ${m} ಯೋಜನೆಗಳು • ಹಂತ 2 (Gemma 4): ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ ${p}...`],
    [/^Stage 1 \(BGE-M3\): (\d+) matched schemes • Stage 2 \(Gemma 4\): Checking (\d+\/\d+) — (.+)$/i,
      (_, m, p, name) => `ಹಂತ 1 (BGE-M3): ${m} ಯೋಜನೆಗಳು • ಹಂತ 2 (Gemma 4): ${p} ಪರಿಶೀಲನೆ — ${name}`],
    [/^PostgreSQL Catalog: (\d+) of (\d+) loaded$/i, (_, a, b) => `PostgreSQL ಪಟ್ಟಿ: ${b} ರಲ್ಲಿ ${a} ಲೋಡ್ ಆಗಿದೆ`],
    [/^Load Next 20 Schemes \((\d+) \/ (\d+)\)$/i, (_, a, b) => `ಮುಂದಿನ 20 ಯೋಜನೆಗಳು (${a} / ${b})`],
    [/^View (\d+) Matched Candidate Schemes ➔$/i, (_, n) => `${n} ಹೊಂದಾಣಿಕೆಯ ಯೋಜನೆಗಳನ್ನು ನೋಡಿ ➔`],
    [/^(\d+) schemes were matched by BGE-M3 and await Gemma 4 Wing 1 verification\.$/i,
      (_, n) => `BGE-M3 ಮೂಲಕ ${n} ಯೋಜನೆಗಳು ಹೊಂದಾಣಿಕೆಯಾಗಿದ್ದು Gemma 4 ಪರಿಶೀಲನೆಗೆ ಬಾಕಿ ಇವೆ.`],
    [/^(HIGH|MEDIUM|LOW|NORMAL) Priority$/i, (_, t) => {
      const m = { HIGH: 'ಹೆಚ್ಚಿನ', MEDIUM: 'ಮಧ್ಯಮ', LOW: 'ಕಡಿಮೆ', NORMAL: 'ಸಾಮಾನ್ಯ' };
      return `${m[t.toUpperCase()] || t} ಆದ್ಯತೆ`;
    }],
    [/^(.+?)\s*\((Central Government|State \/ UT Government)\)$/i, (_, min, gov) => {
      const gKn = gov.toLowerCase().includes('central') ? 'ಕೇಂದ್ರ ಸರ್ಕಾರ' : 'ರಾಜ್ಯ / ಕೇಂದ್ರಾಡಳಿತ ಸರ್ಕಾರ';
      const minKn = dynamicCache[min.trim()] || EXACT.get(min.trim().toLowerCase()) || min.trim();
      return `${minKn} (${gKn})`;
    }],
    [/^Gemma Wing 1 Verdict: ([A-Z_]+) \((.+?) confidence(?: • Priority: (\w+))?(?: • Quota: ([^)]+))?\)\.?$/i,
      (_, st, conf, pr, qt) => {
        const sMap = { ELIGIBLE: 'ಅರ್ಹರು', INELIGIBLE: 'ಅನರ್ಹರು', UNCERTAIN_NEEDS_INFO: 'ಷರತ್ತುಬದ್ಧ / ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಅಗತ್ಯ', CONDITIONAL: 'ಷರತ್ತುಬದ್ಧ' };
        const pMap = { HIGH: 'ಹೆಚ್ಚು', MEDIUM: 'ಮಧ್ಯಮ', LOW: 'ಕಡಿಮೆ', NORMAL: 'ಸಾಮಾನ್ಯ' };
        return `Gemma Wing 1 ತೀರ್ಪು: ${sMap[st.toUpperCase()] || st} (${conf} ವಿಶ್ವಾಸಾರ್ಹತೆ${pr ? ` • ಆದ್ಯತೆ: ${pMap[pr.toUpperCase()] || pr}` : ''}${qt ? ` • ಕೋಟಾ: ${qt}` : ''}).`;
      }],
    [/^(?:Matched via BGE-M3|BGE-M3 ಹೊಂದಾಣಿಕೆ)\s*\(([^)]+)\)\s*[—\-–]\s*(.+)$/is,
      (_, pct, rest) => {
        let tagKn = '';
        let body = rest.trim();
        const tagM = body.match(/^\[(ELIGIBILITY\s*&\s*BENEFITS|BENEFITS|ELIGIBILITY|EXCLUSIONS)\]\s*(.*)$/is);
        if (tagM) {
          const tUpper = tagM[1].replace(/\s+/g, ' ').toUpperCase();
          const tMap = {
            'ELIGIBILITY & BENEFITS': 'ಅರ್ಹತೆ ಮತ್ತು ಸೌಲಭ್ಯಗಳು',
            'BENEFITS': 'ಸೌಲಭ್ಯಗಳು',
            'ELIGIBILITY': 'ಅರ್ಹತೆ',
            'EXCLUSIONS': 'ಹೊರಗಿಡುವಿಕೆಗಳು'
          };
          tagKn = `[${tMap[tUpper] || tagM[1]}] `;
          body = (tagM[2] || '').trim();
        }
        const translatedBody = dynamicCache[body] || translateCompoundText(body, false) || body;
        return `BGE-M3 ಹೊಂದಾಣಿಕೆ (${pct.replace('match', 'ಹೊಂದಾಣಿಕೆ')}) — ${tagKn}${translatedBody}`;
      }],
    [/^Personalized Context: (.+)$/i, (_, rest) => {
      const parts = rest.split('•').map((p) => {
        const t = p.trim();
        const exactHit = EXACT.get(t.toLowerCase());
        if (exactHit) return exactHit;
        const idM = t.match(/^KM(\d+@\S+)\s*\(ID\s*#(\d+)\)$/i);
        if (idM) return `KM${idM[1]} (ಗುರುತು #${idM[2]})`;
        return t;
      });
      return `ವೈಯಕ್ತಿಕ ಸಂದರ್ಭ: ${parts.join(' • ')}`;
    }],
    [/^Farmer Inquiry • (.+)$/i, (_, tm) => `ರೈತರ ಪ್ರಶ್ನೆ • ${tm}`],
    [/^Chief Secretary Secretariat • (.+)$/i, (_, tm) => `ಮುಖ್ಯ ಕಾರ್ಯದರ್ಶಿ ಸಚಿವಾಲಯ • ${tm}`],
    [/^Secretariat Session Started(?: \(([^)]+)\))?\.\.\.$/i, (_, f) => `ಸಚಿವಾಲಯ ಅಧಿವೇಶನ ಪ್ರಾರಂಭವಾಯಿತು${f ? ` (${f.replace('Farmer', 'ರೈತ')})` : ''}...`],
    [/^Plot #(\d+)$/i, (_, n) => `ಪ್ಲಾಟ್ #${n}`],
    [/^Plot #(\d+)\s*\((.+)\)$/i, (_, n, d) => `ಪ್ಲಾಟ್ #${n} (${d === 'New' ? 'ಹೊಸದು' : d})`],
    [/^Crop #(\d+)$/i, (_, n) => `ಬೆಳೆ #${n}`],
    [/^Tree(?: Record)? #(\d+)$/i, (_, n) => `ಮರದ ದಾಖಲೆ #${n}`],
    [/^Livestock(?: Record)? #(\d+)$/i, (_, n) => `ಜಾನುವಾರು ದಾಖಲೆ #${n}`],
    [/^Verdict:\s*([A-Z_]+)$/i, (_, v) => {
      const vMap = {
        ELIGIBLE: 'ಅರ್ಹರು',
        ALMOST_ELIGIBLE: 'ಬಹುತೇಕ ಅರ್ಹ',
        INELIGIBLE: 'ಅನರ್ಹರು',
        UNCERTAIN_NEEDS_INFO: 'ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಅಗತ್ಯ'
      };
      return `ತೀರ್ಪು: ${vMap[v.toUpperCase()] || v}`;
    }],
    [/^Confidence:\s*(.+)$/i, (_, c) => `ವಿಶ್ವಾಸಾರ್ಹತೆ: ${c}`],
    [/^Priority Tier:\s*(.+)$/i, (_, p) => {
      const pMap = { HIGH: 'ಹೆಚ್ಚು', MEDIUM: 'ಮಧ್ಯಮ', LOW: 'ಕಡಿಮೆ' };
      const pt = p.trim();
      return `ಆದ್ಯತಾ ಶ್ರೇಣಿ: ${pMap[pt.toUpperCase()] || pt}`;
    }],
    [/^Check my eligibility, exact subsidy benefits, and required documents for "([^"]+)"\.$/i,
      (_, name) => `"${name}" ಯೋಜನೆಗೆ ನನ್ನ ಅರ್ಹತೆ, ನಿಖರ ಸಬ್ಸಿಡಿ ಸೌಲಭ್ಯ ಮತ್ತು ಅಗತ್ಯ ದಾಖಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.`],
    [/^Searching ([\d,]+) official FAQs with BGE-M3\.\.\.$/i, (_, n) => `BGE-M3 ಮೂಲಕ ${n} ಅಧಿಕೃತ ಪ್ರಶ್ನೋತ್ತರಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...`],
    [/^Not audited for Farmer #(\d+) yet\.\s*(?:Running\/click|Click)$/i,
      (_, id) => `ರೈತ #${id} ಗೆ ಇನ್ನೂ ಪರಿಶೀಲಿಸಿಲ್ಲ. ದಯವಿಟ್ಟು`],
    [/^to evaluate against the 17-column official record\.?$/i,
      () => 'ಒತ್ತಿ 17-ಕಾಲಂ ಅಧಿಕೃತ ದಾಖಲೆಗಳೊಂದಿಗೆ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ.'],
    [/^Not audited for Farmer #(\d+) yet\.\s*(?:Running\/click|Click)\s+Verify Eligibility Now\s+to evaluate against the 17-column official record\.?$/i,
      (_, id) => `ರೈತ #${id} ಗೆ ಇನ್ನೂ ಪರಿಶೀಲಿಸಿಲ್ಲ. 17-ಕಾಲಂ ಅಧಿಕೃತ ದಾಖಲೆಗಳೊಂದಿಗೆ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಲು "ಈಗಲೇ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ" ಒತ್ತಿ.`],
    [/^Mode:\s*(Online|Offline)(?:\s+(.+))?$/is, (_, modeWord, rest) => {
      const modeKn = modeWord.toLowerCase() === 'online' ? 'ಆನ್‌ಲೈನ್' : 'ಆಫ್‌ಲೈನ್';
      if (!rest || !rest.trim()) return `ವಿಧಾನ: ${modeKn}`;
      const b = rest.trim();
      const bKn = EXACT.get(b.toLowerCase()) || dynamicCache[b] || translateCompoundText(b, false) || b;
      return `ವಿಧಾನ: ${modeKn} ${bKn}`;
    }],
    [/^Mode:\s*(.+)$/is, (_, v) => {
      const m = v.trim();
      const lower = m.toLowerCase();
      const valKn = lower === 'online' ? 'ಆನ್‌ಲೈನ್' : (lower === 'offline' ? 'ಆಫ್‌ಲೈನ್' : (dynamicCache[m] || translateCompoundText(m, false) || m));
      return `ವಿಧಾನ: ${valKn}`;
    }],
    [/^Step\s*0?(\d+):\s*(.+)$/is, (_, num, body) => {
      const b = body.trim();
      const bKn = EXACT.get(b.toLowerCase()) || dynamicCache[b] || translateCompoundText(b, false) || b;
      return `ಹಂತ ${num}: ${bKn}`;
    }],
    [/^Q:\s*(.+)$/is, (_, body) => {
      const b = body.trim();
      const bKn = EXACT.get(b.toLowerCase()) || dynamicCache[b] || translateCompoundText(b, false) || b;
      return `ಪ್ರ: ${bKn}`;
    }],
    [/^A:\s*(.+)$/is, (_, body) => {
      const b = body.trim();
      const lower = b.toLowerCase();
      const bKn = EXACT.get(lower) || dynamicCache[b] || translateCompoundText(b, false) || b;
      return `ಉ: ${bKn}`;
    }],
    [/^(.+?)\s*•\s*(.+?)\s*\((\d+%)\)$/i, (_, sName, minName, pct) => {
      const s = sName.trim();
      const m = minName.trim();
      const sKn = EXACT.get(s.toLowerCase()) || dynamicCache[s] || s;
      const mKn = EXACT.get(m.toLowerCase()) || dynamicCache[m] || m;
      return `${sKn} • ${mKn} (${pct})`;
    }],
    [/^(.+?)\s*\((\d+%)\)$/i, (_, name, pct) => {
      const n = name.trim();
      const nKn = EXACT.get(n.toLowerCase()) || dynamicCache[n] || n;
      return `${nKn} (${pct})`;
    }],
    [/^(\d+) States & UTs$/i, (_, n) => `${n} ರಾಜ್ಯಗಳು ಮತ್ತು ಕೇಂದ್ರಾಡಳಿತಗಳು`],
    [/^(\d+)% Local$/i, (_, n) => `${n}% ಸ್ಥಳೀಯ`]
  ];

  // State: lossless WeakMap for original DOM text nodes & Set for layer-translated nodes
  const origTextMap = new WeakMap();
  const translatedNodes = new WeakSet();
  const TRANSLATED_ATTRS = ['placeholder', 'title', 'aria-label'];
  let observer = null;
  let mutationTimer = null;
  let isApplying = false;

  // Dynamic translation cache persisted in localStorage
  let dynamicCache = {};
  try {
    dynamicCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {};
    // Purge any stale entries contaminated with non-Kannada scripts (Devanagari, Thai, CJK, etc.)
    let purged = false;
    Object.keys(dynamicCache).forEach((k) => {
      const v = dynamicCache[k];
      if (typeof v !== 'string' || !KANNADA_RE.test(v) || BAD_SCRIPT_RE.test(v)) {
        delete dynamicCache[k];
        purged = true;
      }
    });
    if (purged) localStorage.setItem(CACHE_KEY, JSON.stringify(dynamicCache));
  } catch (_) {
    dynamicCache = {};
  }

  function saveDynamicCache() {
    try {
      const keys = Object.keys(dynamicCache);
      if (keys.length > MAX_CACHE_ENTRIES) {
        keys.slice(0, keys.length - MAX_CACHE_ENTRIES).forEach((k) => { delete dynamicCache[k]; });
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(dynamicCache));
    } catch (_) { }
  }

  function getLang() {
    try {
      return localStorage.getItem(LANG_KEY) === 'kn' ? 'kn' : 'en';
    } catch (_) {
      return 'en';
    }
  }

  function syncToggleButtons(lang) {
    const label = lang === 'kn' ? 'English' : 'ಕನ್ನಡ';
    document.querySelectorAll('[data-km-lang-toggle], .lang-toggle-pill').forEach((btn) => {
      const disp = btn.querySelector('.lang-text-display');
      if (disp) {
        disp.textContent = label;
      } else {
        const ico = btn.querySelector('i');
        if (ico) {
          btn.innerHTML = `${ico.outerHTML} <span>${label}</span>`;
        } else {
          btn.textContent = label;
        }
      }
      btn.setAttribute('aria-pressed', lang === 'kn' ? 'true' : 'false');
    });
    document.documentElement.setAttribute('lang', lang === 'kn' ? 'kn' : 'en');
  }

  function isProtectedElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP_TAGS.has(el.tagName)) return true;
    return Boolean(el.closest('[data-km-no-translate], code, pre, script, style, svg'));
  }

  function isAttributeProtected(el) {
    if (!el || el.nodeType !== 1) return true;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'SVG' || tag === 'CODE' || tag === 'PRE') {
      return true;
    }
    return Boolean(el.closest('[data-km-no-translate], code, pre, script, style, svg'));
  }

  const DYNAMIC_CONTAINER_SEL = '.scheme-card, #scheme-detail-modal, #docs-faq-results, #docs-list-container, #tips-full-list, .ticker-content-box, #profile-drawer-summary, #edit-profile-fields, #login-help-modal, #chatThread, #loginError, #regError, #uniqueIdStatus, #offcanvasLoginError, #editProfileError, #app-toast-notice, #wizard-reg-error';

  function hasTranslatableEnglish(str) {
    if (!str || KANNADA_RE.test(str)) return false;
    const trimmed = str.trim();
    if (!trimmed || SKIP_TOKENS_RE.test(trimmed)) return false;
    if (/^\(?[a-z]+_[a-z0-9_*\s(),<>]+\)?$/i.test(trimmed)) return false;
    if (/^https?:\/\//i.test(trimmed) || /^[\d\s.,₹%+\-\/:#•()]+$/.test(trimmed)) return false;
    return LONG_ENGLISH_RE.test(trimmed) || /^(?:yes|no|q:|a:|mode:|nil|none)\b/i.test(trimmed);
  }

  function looksUnseenDynamicEnglish(str, parentEl) {
    if (!hasTranslatableEnglish(str)) return false;
    if (parentEl && (parentEl.tagName === 'OPTION' || parentEl.tagName === 'SELECT')) return false;
    // Skip hidden tabs/collapsed sections so visible UI cards & modals are never starved in Gemma queue
    if (!parentEl || typeof parentEl.getClientRects !== 'function' || parentEl.getClientRects().length === 0) return false;
    return Boolean(parentEl.closest(DYNAMIC_CONTAINER_SEL));
  }

  // Split long, newline-separated, or bullet-separated text while keeping exact delimiters
  function splitIntoSegmentsAndDelims(rawText) {
    const tokens = [];
    const nlParts = rawText.split(/(\r?\n+)/);
    for (let i = 0; i < nlParts.length; i++) {
      const part = nlParts[i];
      if (!part) continue;
      if (/^\r?\n+$/.test(part)) {
        tokens.push({ delim: part });
        continue;
      }
      const bulletParts = part.split(/(\s*•\s*)/);
      for (let j = 0; j < bulletParts.length; j++) {
        const bp = bulletParts[j];
        if (!bp) continue;
        if (/^\s*•\s*$/.test(bp)) {
          tokens.push({ delim: bp });
          continue;
        }
        const trimmed = bp.trim();
        if (!trimmed) continue;
        if (trimmed.length <= 360) {
          tokens.push({ text: trimmed });
        } else {
          // Sentence / clause chunking for very long paragraphs (>360 chars) so Gemma JSON never truncates
          let pieces = trimmed.split(/(?<=[.!?])\s*(?=[A-Z0-9])/);
          if (pieces.length === 1) {
            pieces = trimmed.split(/(?<=[,;:])\s+/);
          }
          let buf = '';
          for (let s = 0; s < pieces.length; s++) {
            const candidate = buf ? `${buf} ${pieces[s]}` : pieces[s];
            if (buf && candidate.length > 340) {
              tokens.push({ text: buf });
              tokens.push({ delim: ' ' });
              buf = pieces[s];
            } else {
              buf = candidate;
            }
          }
          if (buf) tokens.push({ text: buf });
        }
      }
    }
    return tokens;
  }

  function translateSingleRuleOrCache(norm) {
    if (!norm || SKIP_TOKENS_RE.test(norm)) return null;
    const lower = norm.toLowerCase();

    if (EXACT.has(lower)) return EXACT.get(lower);

    if (lower.endsWith(':') && EXACT.has(lower.slice(0, -1).trim())) {
      return EXACT.get(lower.slice(0, -1).trim()) + ':';
    }

    const symMatch = norm.match(/^([^\w\s\u0C80-\u0CFF.,()"'?!+\-/₹%]+\s+)(.+)$/);
    if (symMatch) {
      const symLead = symMatch[1];
      const symBody = symMatch[2].trim();
      const symLower = symBody.toLowerCase();
      if (EXACT.has(symLower)) return `${symLead}${EXACT.get(symLower)}`;
      if (symLower.endsWith(':') && EXACT.has(symLower.slice(0, -1).trim())) {
        return `${symLead}${EXACT.get(symLower.slice(0, -1).trim())}:`;
      }
    }

    for (let i = 0; i < PATTERN_RULES.length; i++) {
      const [re, fn] = PATTERN_RULES[i];
      const m = norm.match(re);
      if (m) return fn(...m);
    }

    if (dynamicCache[norm]) return dynamicCache[norm];
    return null;
  }

  function translateCompoundText(rawInput, allowFallback = true) {
    if (!rawInput || (!/[\r\n•]/.test(rawInput) && rawInput.length <= 360)) {
      return allowFallback ? translateSingleRuleOrCache(String(rawInput || '').replace(/\s+/g, ' ').trim()) : null;
    }
    const tokens = splitIntoSegmentsAndDelims(rawInput);
    let anyChanged = false;
    const out = tokens.map((tok) => {
      if (tok.delim !== undefined) return tok.delim;
      const hit = translateSingleRuleOrCache(tok.text.replace(/\s+/g, ' ').trim());
      if (hit && hit !== tok.text) {
        anyChanged = true;
        return hit;
      }
      return tok.text;
    }).join('');
    return anyChanged ? out : null;
  }

  function translateStaticOrCached(rawCore) {
    if (!rawCore) return null;
    if (/[\r\n•]/.test(rawCore) || rawCore.length > 360) {
      const compound = translateCompoundText(rawCore, false);
      if (compound) return compound;
    }
    const norm = rawCore.replace(/\s+/g, ' ').trim();
    return translateSingleRuleOrCache(norm);
  }

  // Pass 2 Gemma queue (priority ordered: open modal > AI chat > visible viewport > below fold)
  const pendingTexts = new Set();
  const pendingNodeRefs = new Set();
  const textToNodes = new Map();
  const retryCounts = new Map();
  let gemmaQueueTimer = null;
  let gemmaBusy = false;

  function queueDynamicNode(node, trimmedEnglish, allowSplit = true) {
    if (!trimmedEnglish) return;
    const norm = trimmedEnglish.replace(/\s+/g, ' ').trim();
    if (!norm || dynamicCache[norm]) return;
    if (allowSplit && (norm.length > 360 || /[\r\n•]/.test(trimmedEnglish))) {
      const parts = splitIntoSegmentsAndDelims(trimmedEnglish);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].text) queueDynamicNode(node, parts[i].text, false);
      }
      return;
    }
    if (norm.length < 3 || norm.length > 1800) return;
    pendingTexts.add(norm);
    pendingNodeRefs.add(node);
    if (!textToNodes.has(norm)) textToNodes.set(norm, new Set());
    textToNodes.get(norm).add(node);
    scheduleDynamicBatch();
  }

  function scheduleDynamicBatch(delayMs = 45) {
    if (gemmaQueueTimer) clearTimeout(gemmaQueueTimer);
    gemmaQueueTimer = setTimeout(flushDynamicBatch, delayMs);
  }

  function isChatStreamingBusy() {
    const activeSpin = document.querySelector('#chatThread .fa-spin, #chatThread .fa-pulse');
    return activePrimaryGemmaRequests > 0 || Boolean(activeSpin);
  }

  function getNodePriority(node) {
    if (!node || !node.isConnected) return 99;
    const parent = node.parentElement;
    if (!parent || typeof parent.getClientRects !== 'function' || parent.getClientRects().length === 0) return 99;
    if (parent.closest('#scheme-detail-modal.open, #edit-profile-modal.open, #login-help-modal.active')) return 0;
    if (parent.closest('#chatThread')) return 1;
    const rect = parent.getBoundingClientRect();
    if (rect.bottom >= 0 && rect.top <= (window.innerHeight || 900)) return 2;
    return 3;
  }

  async function translateSingleViaGoogleGTX(text, signal) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=kn&dt=t&q=${encodeURIComponent(text)}`;
    const r = await fetch(url, { method: 'GET', signal });
    if (!r.ok) throw new Error(`GTX HTTP ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('GTX bad payload');
    return data[0].map((seg) => (seg && seg[0]) ? seg[0] : '').join('').trim();
  }

  async function translateBatchViaGoogleGTX(items, signal) {
    if (!items.length || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      return null;
    }
    try {
      const joined = items.join('\n§KM§\n');
      if (encodeURIComponent(joined).length <= 1800) {
        const translatedJoined = await translateSingleViaGoogleGTX(joined, signal);
        const parts = translatedJoined.split(/\s*§\s*KM\s*§\s*/i);
        if (parts.length === items.length) {
          return parts.map((p) => p.trim());
        }
      }
      // Fallback: parallel per-item GTX calls (still ~250-500ms total)
      const results = await Promise.all(items.map((txt) => translateSingleViaGoogleGTX(txt, signal)));
      return results;
    } catch (_) {
      return null;
    }
  }

  function applyPendingNodesToDom() {
    if (getLang() !== 'kn') return;
    isApplying = true;
    try {
      pendingNodeRefs.forEach((ref) => {
        if (!ref || !ref.isConnected) {
          pendingNodeRefs.delete(ref);
          return;
        }
        const orig = origTextMap.get(ref);
        if (!orig) return;
        const lead = (orig.match(/^\s*/) || [''])[0];
        const trail = (orig.match(/\s*$/) || [''])[0];
        const trimmedOrig = orig.trim();
        const tr = translateStaticOrCached(trimmedOrig);
        if (tr) {
          ref.nodeValue = `${lead}${tr}${trail}`;
          translatedNodes.add(ref);
        }
      });
    } finally {
      isApplying = false;
    }
  }

  async function flushDynamicBatch() {
    if (getLang() !== 'kn' || gemmaBusy || pendingTexts.size === 0) return;
    // Only pause while Chief Secretary AI reply is actively streaming tokens
    if (document.querySelector('#chatThread .fa-spin, #chatThread .fa-pulse')) {
      scheduleDynamicBatch(350);
      return;
    }

    // Rank queued texts by visibility & modal focus; drop hidden/disconnected entries cleanly
    const ranked = [];
    for (const s of pendingTexts) {
      if (dynamicCache[s]) {
        pendingTexts.delete(s);
        continue;
      }
      const nodes = textToNodes.get(s);
      let bestPri = 99;
      if (nodes) {
        for (const n of nodes) {
          if (!n || !n.isConnected) {
            nodes.delete(n);
            continue;
          }
          const pri = getNodePriority(n);
          if (pri < bestPri) bestPri = pri;
        }
      }
      if (bestPri >= 99) {
        pendingTexts.delete(s);
        textToNodes.delete(s);
        continue;
      }
      ranked.push({ text: s, pri: bestPri });
    }

    if (!ranked.length) return;
    ranked.sort((a, b) => a.pri - b.pri);

    gemmaBusy = true;
    const batch = [];
    let charSum = 0;
    for (let i = 0; i < ranked.length; i++) {
      const item = ranked[i];
      if (batch.length >= 12 || (batch.length > 0 && charSum + item.text.length > 1200)) break;
      batch.push(item.text);
      charSum += item.text.length;
    }
    batch.forEach((s) => pendingTexts.delete(s));

    let controller = typeof AbortController === 'function' ? new AbortController() : null;
    const abortTimer = controller ? setTimeout(() => { try { controller.abort(); } catch (_) { } }, 12000) : null;
    let requeueDelayMs = 0;

    try {
      // Primary fast path: Google Translate GTX (~200-500ms per 12-item batch)
      const gtxResults = await translateBatchViaGoogleGTX(batch, controller ? controller.signal : undefined);
      if (gtxResults && gtxResults.length === batch.length) {
        batch.forEach((orig, idx) => {
          const translated = gtxResults[idx];
          if (typeof translated === 'string' && translated.trim() && KANNADA_RE.test(translated) && !BAD_SCRIPT_RE.test(translated)) {
            dynamicCache[orig] = translated.trim();
            retryCounts.delete(orig);
          } else {
            const tries = retryCounts.get(orig) || 0;
            if (tries < 2) {
              retryCounts.set(orig, tries + 1);
              pendingTexts.add(orig);
            }
          }
        });
        saveDynamicCache();
        applyPendingNodesToDom();
        return;
      }

      // Offline / GTX-unavailable fallback: local Gemma 4 (:8080)
      if (isChatStreamingBusy()) {
        batch.forEach((orig) => pendingTexts.add(orig));
        requeueDelayMs = 650;
        return;
      }

      const gemmaBatch = batch.slice(0, 4);
      batch.slice(4).forEach((orig) => pendingTexts.add(orig));

      const numberedObj = {};
      gemmaBatch.forEach((txt, idx) => { numberedObj[String(idx)] = txt; });

      const resp = await fetch(`${API_BASE}/api/v1/gemma/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a concise, accurate English-to-Kannada agricultural translator. Return ONLY valid JSON with key "t" mapping each numeric key to its natural Kannada translation. Output ONLY pure Kannada script (ಕನ್ನಡ), numbers, and official English acronyms (PM-KISAN, KCC, PMFBY, FRUITS, RTC, NPCI); NEVER output Hindi/Devanagari, Thai, Tamil, Telugu, or Chinese characters. Preserve rupee amounts, percentages, and URLs.'
            },
            {
              role: 'user',
              content: JSON.stringify({ translate_to_kannada: numberedObj })
            }
          ],
          temperature: 0.1,
          max_tokens: 1600
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        const r = data && data.response;
        const tMap = (r && (r.t || r.translations || r)) || {};
        gemmaBatch.forEach((orig, idx) => {
          const translated = tMap[String(idx)] !== undefined ? tMap[String(idx)] : tMap[idx];
          // Reject translations containing any non-Kannada/non-Latin script (Devanagari, Thai, CJK, Hangul, etc.)
          if (typeof translated === 'string' && translated.trim() && KANNADA_RE.test(translated) && !BAD_SCRIPT_RE.test(translated)) {
            dynamicCache[orig] = translated.trim();
            retryCounts.delete(orig);
          } else {
            const tries = retryCounts.get(orig) || 0;
            if (tries < 2) {
              retryCounts.set(orig, tries + 1);
              pendingTexts.add(orig);
            }
          }
        });
        saveDynamicCache();
        applyPendingNodesToDom();
      } else {
        gemmaBatch.forEach((orig) => {
          const tries = retryCounts.get(orig) || 0;
          if (tries < 2) {
            retryCounts.set(orig, tries + 1);
            pendingTexts.add(orig);
          }
        });
        requeueDelayMs = 900;
      }
    } catch (_) {
      batch.forEach((orig) => {
        const tries = retryCounts.get(orig) || 0;
        if (tries < 2) {
          retryCounts.set(orig, tries + 1);
          pendingTexts.add(orig);
        }
      });
      requeueDelayMs = 900;
    } finally {
      if (abortTimer) clearTimeout(abortTimer);
      gemmaBusy = false;
      if (pendingTexts.size > 0 && getLang() === 'kn') {
        const hasUrgent = Boolean(document.querySelector('#scheme-detail-modal.open, #chatThread .cs-summary'));
        scheduleDynamicBatch(requeueDelayMs || (hasUrgent ? 30 : 80));
      }
    }
  }

  function queueSubFragmentsIfNeeded(node, rawTrimmed, parent) {
    if (!parent || typeof parent.getClientRects !== 'function' || parent.getClientRects().length === 0) return;
    if (!parent.closest(DYNAMIC_CONTAINER_SEL)) return;

    let body = rawTrimmed;
    const bgeM = rawTrimmed.match(/^(?:Matched via BGE-M3|BGE-M3 ಹೊಂದಾಣಿಕೆ)\s*\([^)]+\)\s*[—\-–]\s*(?:\[(?:ELIGIBILITY\s*&\s*BENEFITS|BENEFITS|ELIGIBILITY|EXCLUSIONS)\]\s*)?(.+)$/is);
    if (bgeM && bgeM[1]) body = bgeM[1].trim();
    else {
      const govM = rawTrimmed.match(/^(.+?)\s*\((Central Government|State \/ UT Government)\)$/i);
      if (govM && govM[1]) body = govM[1].trim();
      else {
        const pctM = rawTrimmed.match(/^(.+?)\s*\(\d+%\)$/i);
        if (pctM && pctM[1]) body = pctM[1].trim();
      }
    }

    const tokens = splitIntoSegmentsAndDelims(body);
    for (let i = 0; i < tokens.length; i++) {
      let seg = tokens[i].text;
      if (!seg) continue;
      // Strip known prefixes so Gemma translates pure content sentences cleanly
      const prefM = seg.match(/^(?:Step\s*0?\d+:|Q:|A:|Mode:\s*(?:Online|Offline)?)\s*(.+)$/i);
      if (prefM && prefM[1]) seg = prefM[1].trim();
      const segNorm = seg.replace(/\s+/g, ' ').trim();
      if (!segNorm) continue;
      if (EXACT.has(segNorm.toLowerCase()) || dynamicCache[segNorm]) continue;
      // Check full non-composite PATTERN_RULES (don't treat composite rule output as finished)
      if (/^(?:No|Yes|Online|Offline|None|Nil|N\/A)[.!]?$/i.test(segNorm)) continue;
      if (hasTranslatableEnglish(segNorm)) {
        queueDynamicNode(node, segNorm);
      }
    }
  }

  function processTextNode(node, queueDynamic) {
    if (!node || node.nodeType !== 3) return;
    const parent = node.parentElement;
    if (!parent || isProtectedElement(parent)) return;

    const current = node.nodeValue || '';
    if (!LATIN_WORD_RE.test(current)) return;

    // Preserve strings already rendered cleanly in Kannada by app.js/translations.js
    if (KANNADA_RE.test(current) && !translatedNodes.has(node)) {
      const strippedAcronyms = current.replace(/\b(?:PM-?KISAN|PMFBY|PM-?KUSUM|KCC|Gemma\s*4|BGE-?M3|AI|OS|PostgreSQL|NPCI|DBT|FRUITS|RTC|RSK|FID|API|SSE|OTP|ID)\b/gi, '');
      if (!/[A-Za-z]{4,}/.test(strippedAcronyms)) return;
    }

    if (!origTextMap.has(node) && !translatedNodes.has(node)) {
      origTextMap.set(node, current);
    }

    const orig = origTextMap.get(node) || current;
    const lead = (orig.match(/^\s*/) || [''])[0];
    const trail = (orig.match(/\s*$/) || [''])[0];
    const trimmedRaw = orig.trim();
    if (!trimmedRaw) return;

    const hit = translateStaticOrCached(trimmedRaw);
    if (hit) {
      const nextVal = `${lead}${hit}${trail}`;
      if (node.nodeValue !== nextVal) node.nodeValue = nextVal;
      translatedNodes.add(node);
      if (queueDynamic) {
        queueSubFragmentsIfNeeded(node, trimmedRaw, parent);
      }
    } else if (queueDynamic && looksUnseenDynamicEnglish(trimmedRaw, parent)) {
      queueDynamicNode(node, trimmedRaw);
    }
  }

  function processElementAttributes(el) {
    if (!el || el.nodeType !== 1 || isAttributeProtected(el)) return;
    if (el.hasAttribute('data-km-no-translate')) return;
    TRANSLATED_ATTRS.forEach((attr) => {
      if (!el.hasAttribute(attr)) return;
      const origAttrKey = `data-km-orig-${attr}`;
      if (!el.hasAttribute(origAttrKey)) {
        const cur = el.getAttribute(attr) || '';
        if (cur && LATIN_WORD_RE.test(cur)) {
          el.setAttribute(origAttrKey, cur);
        }
      }
      const origVal = el.getAttribute(origAttrKey);
      if (!origVal) return;
      const tr = translateStaticOrCached(origVal);
      if (tr && el.getAttribute(attr) !== tr) {
        el.setAttribute(attr, tr);
      }
    });
  }

  function translateSubtree(root, queueDynamic = true) {
    if (!root || getLang() !== 'kn') return;
    isApplying = true;
    try {
      if (root.nodeType === 3) {
        processTextNode(root, queueDynamic);
        return;
      }
      if (root.nodeType !== 1 && root !== document) return;
      const targetRoot = root === document ? document.body : root;
      if (!targetRoot) return;

      if (targetRoot.nodeType === 1) processElementAttributes(targetRoot);
      const els = targetRoot.querySelectorAll('*');
      for (let i = 0; i < els.length; i++) {
        processElementAttributes(els[i]);
      }

      const walker = document.createTreeWalker(targetRoot, NodeFilter.SHOW_TEXT, null);
      let n;
      while ((n = walker.nextNode())) {
        processTextNode(n, queueDynamic);
      }

      if (document.title) {
        if (!document.documentElement.dataset.kmOrigTitle) {
          document.documentElement.dataset.kmOrigTitle = document.title;
        }
        const trTitle = translateStaticOrCached(document.documentElement.dataset.kmOrigTitle);
        if (trTitle) document.title = trTitle;
      }
    } finally {
      isApplying = false;
    }
  }

  function restoreEnglish() {
    isApplying = true;
    pendingTexts.clear();
    pendingNodeRefs.clear();
    pendingMutationRoots.clear();
    textToNodes.clear();
    retryCounts.clear();
    if (gemmaQueueTimer) clearTimeout(gemmaQueueTimer);
    try {
      if (document.documentElement.dataset.kmOrigTitle) {
        document.title = document.documentElement.dataset.kmOrigTitle;
      }
      if (!document.body) return;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let n;
      while ((n = walker.nextNode())) {
        if (translatedNodes.has(n) && origTextMap.has(n)) {
          n.nodeValue = origTextMap.get(n);
          translatedNodes.delete(n);
        }
      }
      document.body.querySelectorAll('*').forEach((el) => {
        TRANSLATED_ATTRS.forEach((attr) => {
          const k = `data-km-orig-${attr}`;
          if (el.hasAttribute(k)) {
            el.setAttribute(attr, el.getAttribute(k));
          }
        });
      });
    } finally {
      isApplying = false;
    }
  }

  function applyCurrentLanguage() {
    const lang = getLang();
    syncToggleButtons(lang);
    if (lang === 'kn') {
      translateSubtree(document, true);
    } else {
      restoreEnglish();
    }
  }

  function setLang(nextLang) {
    const normalized = nextLang === 'kn' ? 'kn' : 'en';
    const prev = getLang();
    try { localStorage.setItem(LANG_KEY, normalized); } catch (_) { }

    // If dashboard KrishiMitraApp is active, delegate via app.setLanguage so i18n keys & speech sync cleanly
    if (window.app && typeof window.app.setLanguage === 'function' && window.app.currentLang !== normalized) {
      window.app.setLanguage(normalized);
      return;
    }
    if (prev !== normalized || normalized === 'kn') {
      applyCurrentLanguage();
    } else {
      syncToggleButtons(normalized);
    }
  }

  function toggle() {
    setLang(getLang() === 'kn' ? 'en' : 'kn');
  }

  const pendingMutationRoots = new Set();

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver((mutations) => {
      if (isApplying || getLang() !== 'kn') return;
      let queuedAny = false;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            pendingMutationRoots.add(node);
            queuedAny = true;
          });
        } else if (m.type === 'characterData' && m.target && !translatedNodes.has(m.target)) {
          pendingMutationRoots.add(m.target);
          queuedAny = true;
        } else if (m.type === 'attributes' && m.target && m.target.classList &&
          (m.target.classList.contains('open') || m.target.classList.contains('show') || m.target.classList.contains('active'))) {
          pendingMutationRoots.add(m.target);
          queuedAny = true;
        }
      }
      if (!queuedAny && pendingMutationRoots.size === 0) return;
      if (mutationTimer) clearTimeout(mutationTimer);
      mutationTimer = setTimeout(() => {
        if (getLang() !== 'kn' || pendingMutationRoots.size === 0) return;
        const batch = Array.from(pendingMutationRoots);
        pendingMutationRoots.clear();
        batch.forEach((r) => translateSubtree(r, true));
      }, 80);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'hidden']
    });
  }

  function hookDashboardApp() {
    if (!window.app || window.app._kmLayerHooked) return;
    window.app._kmLayerHooked = true;
    const origSetLang = window.app.setLanguage.bind(window.app);
    window.app.setLanguage = function (lang) {
      if (lang === 'en') {
        restoreEnglish();
      }
      origSetLang(lang);
      syncToggleButtons(lang === 'kn' ? 'kn' : 'en');
      if (lang === 'kn') {
        setTimeout(() => translateSubtree(document, true), 20);
      } else {
        setTimeout(() => restoreEnglish(), 20);
      }
    };
    const origRenderAll = window.app.renderAll.bind(window.app);
    window.app.renderAll = function () {
      origRenderAll();
      if (getLang() === 'kn') {
        setTimeout(() => translateSubtree(document, true), 20);
      }
    };
  }

  function bindStandaloneToggles() {
    document.querySelectorAll('[data-km-lang-toggle]').forEach((btn) => {
      if (btn._kmBound) return;
      btn._kmBound = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggle();
      });
    });
  }

  function init() {
    bindStandaloneToggles();
    hookDashboardApp();
    startObserver();
    syncToggleButtons(getLang());
    if (getLang() === 'kn') {
      translateSubtree(document, true);
    }
    // In case window.app initializes asynchronously after this script
    let tries = 0;
    const pollApp = setInterval(() => {
      tries++;
      if (window.app) {
        hookDashboardApp();
        if (getLang() === 'kn') translateSubtree(document, true);
        clearInterval(pollApp);
      } else if (tries > 20) {
        clearInterval(pollApp);
      }
    }, 100);

    window.addEventListener('storage', (e) => {
      if (e.key === LANG_KEY) applyCurrentLanguage();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.KrishiKannadaLayer = {
    getLang,
    setLang,
    toggle,
    applyCurrentLanguage,
    restoreEnglish,
    translateSubtree
  };
})();
