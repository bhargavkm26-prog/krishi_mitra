/**
 * Krishi Mitra - Speech Recognition Controller
 * Utilizes Web Speech API for Kannada (kn-IN) and English (en-IN) voice input.
 * Strictly used only on profile questions with mandatory farmer confirmation.
 */

class SpeechController {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognition;
    this.recognition = this.isSupported ? new SpeechRecognition() : null;
    this.isListening = false;
    this.currentLanguage = "kn"; // default Kannada

    // Numeric word mappings for Kannada & English
    this.kannadaNumberWords = {
      "ಒಂದು": 1, "ಅರ್ಧ": 0.5, "ಮುಕ್ಕಾಲು": 0.75, "ಎರಡು": 2, "ಮೂರು": 3,
      "ನಾಲ್ಕು": 4, "ಐದು": 5, "ಆರು": 6, "ಏಳು": 7, "ಎಂಟು": 8, "ಒಂಬತ್ತು": 9,
      "ಹತ್ತು": 10, "ಹದಿನೈದು": 15, "ಇಪ್ಪತ್ತು": 20, "ಇಪ್ಪತ್ತೈದು": 25, "ಮೂವತ್ತು": 30,
      "ನಲವತ್ತು": 40, "ಐವತ್ತು": 50, "ಅರವತ್ತು": 60, "ಎಪ್ಪತ್ತು": 70
    };

    this.englishNumberWords = {
      "half": 0.5, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
      "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "fifteen": 15,
      "twenty": 20, "twenty five": 25, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60
    };

    if (this.isSupported) {
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 3;
    }
  }

  setLanguage(langCode) {
    this.currentLanguage = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode === "kn" ? "kn-IN" : "en-IN";
    }
  }

  /**
   * Start listening for speech for a specific question
   * @param {Object} question - The question configuration from mockData
   * @param {Object} callbacks - { onStart, onResult, onError, onEnd }
   */
  startListening(question, callbacks = {}) {
    if (!this.isSupported) {
      if (callbacks.onError) callbacks.onError("NOT_SUPPORTED");
      return;
    }

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn("Speech stop warning:", e);
      }
    }

    this.setLanguage(this.currentLanguage);

    this.recognition.onstart = () => {
      this.isListening = true;
      if (callbacks.onStart) callbacks.onStart();
    };

    this.recognition.onresult = (event) => {
      this.isListening = false;
      const transcript = event.results[0][0].transcript.trim();
      const match = this.matchSpokenInput(transcript, question);
      if (callbacks.onResult) {
        callbacks.onResult({
          rawTranscript: transcript,
          matchedOption: match.option,
          displayValue: match.displayValue,
          confidence: event.results[0][0].confidence
        });
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      console.warn("Speech recognition error:", event.error);
      if (callbacks.onError) {
        callbacks.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (callbacks.onEnd) callbacks.onEnd();
    };

    try {
      this.recognition.start();
    } catch (err) {
      this.isListening = false;
      if (callbacks.onError) callbacks.onError(err.message || "START_FAILED");
    }
  }

  stopListening() {
    if (this.isListening && this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn(e);
      }
      this.isListening = false;
    }
  }

  /**
   * Matches spoken words to the closest answer choice or extracts number
   */
  matchSpokenInput(spokenText, question) {
    const raw = spokenText.toLowerCase().trim();
    const lang = this.currentLanguage;

    // 1. Handle Yes/No questions (Bank Account, FRUITS ID)
    if (question.type === "yes_no") {
      const isYes = raw.includes("ಹೌದು") || raw.includes("ಇದೆ") || raw.includes("ಲಿಂಕ್") || 
                    raw.includes("yes") || raw.includes("yeah") || raw.includes("have");
      const isNo = raw.includes("ಇಲ್ಲ") || raw.includes("ಆಗಿಲ್ಲ") || raw.includes("ಗೊತ್ತಿಲ್ಲ") || 
                   raw.includes("no") || raw.includes("not") || raw.includes("dont");
      
      if (isYes) {
        const opt = question.options.find(o => o.id === "yes");
        return { option: opt, displayValue: opt[lang] };
      }
      if (isNo) {
        const opt = question.options.find(o => o.id === "no");
        return { option: opt, displayValue: opt[lang] };
      }
    }

    // 2. Handle Numeric Questions (Land size, Age)
    if (question.type === "number_or_choice") {
      // Check for numeric digits in speech (e.g. "2.5", "3", "50")
      const digitMatch = raw.match(/\d+(\.\d+)?/);
      if (digitMatch) {
        const numVal = parseFloat(digitMatch[0]);
        // Find closest option or return custom number
        const closest = this._findClosestNumericOption(numVal, question.options);
        return {
          option: closest,
          displayValue: `${numVal} ${question.unit ? (lang === 'kn' ? 'ಎಕರೆ' : 'Acres') : (lang === 'kn' ? 'ವರ್ಷ' : 'Years')}`
        };
      }

      // Check Kannada / English word numerals
      for (const [word, val] of Object.entries(this.kannadaNumberWords)) {
        if (raw.includes(word)) {
          const closest = this._findClosestNumericOption(val, question.options);
          return {
            option: closest,
            displayValue: `${val} ${question.unit ? (lang === 'kn' ? 'ಎಕರೆ' : 'Acres') : (lang === 'kn' ? 'ವರ್ಷ' : 'Years')}`
          };
        }
      }
      for (const [word, val] of Object.entries(this.englishNumberWords)) {
        if (raw.includes(word)) {
          const closest = this._findClosestNumericOption(val, question.options);
          return {
            option: closest,
            displayValue: `${val} ${question.unit ? (lang === 'kn' ? 'ಎಕರೆ' : 'Acres') : (lang === 'kn' ? 'ವರ್ಷ' : 'Years')}`
          };
        }
      }
    }

    // 3. Keyword and Substring Matching for Select/Button groups
    let bestMatch = null;
    let highestScore = 0;

    for (const opt of question.options) {
      let score = 0;

      // Check keywords
      if (opt.voiceKeywords && Array.isArray(opt.voiceKeywords)) {
        for (const kw of opt.voiceKeywords) {
          const kwLower = kw.toLowerCase();
          if (raw === kwLower) {
            score += 10;
          } else if (raw.includes(kwLower) || kwLower.includes(raw)) {
            score += 5;
          }
        }
      }

      // Check Kannada text
      if (opt.kn && raw.includes(opt.kn.toLowerCase())) {
        score += 8;
      }

      // Check English text
      if (opt.en && raw.includes(opt.en.toLowerCase())) {
        score += 8;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = opt;
      }
    }

    if (bestMatch && highestScore > 0) {
      return {
        option: bestMatch,
        displayValue: bestMatch[lang] || bestMatch.en
      };
    }

    // If no strong match found, return raw text for fallback confirmation
    return {
      option: question.options[0],
      displayValue: `"${spokenText}"`
    };
  }

  _findClosestNumericOption(num, options) {
    if (!options || options.length === 0) return null;
    let closest = options[0];
    let minDiff = Math.abs((options[0].value || 0) - num);

    for (let i = 1; i < options.length; i++) {
      const opt = options[i];
      const diff = Math.abs((opt.value || 0) - num);
      if (diff < minDiff) {
        minDiff = diff;
        closest = opt;
      }
    }
    return closest;
  }
}

// Global instance
window.speechController = new SpeechController();
