/**
 * Krishi Mitra - Mock Data Source
 * Contains all schemes, profile question options with speech recognition keywords,
 * document guides, and seasonal farmer reminders.
 */

const MOCK_DATA = {
  // 10 Profile Questions and their answer choices
  questions: [
    {
      id: "district",
      type: "select",
      icon: "map-pin",
      options: [
        { id: "bagalkote", kn: "ಬಾಗಲಕೋಟೆ", en: "Bagalkote", voiceKeywords: ["bagalkote", "bagalkot", "ಬಾಗಲಕೋಟೆ"] },
        { id: "ballari", kn: "ಬಳ್ಳಾರಿ", en: "Ballari", voiceKeywords: ["ballari", "bellary", "ಬಳ್ಳಾರಿ"] },
        { id: "belagavi", kn: "ಬೆಳಗಾವಿ", en: "Belagavi", voiceKeywords: ["belagavi", "belgaum", "ಬೆಳಗಾವಿ"] },
        { id: "bengaluru_rural", kn: "ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ", en: "Bengaluru Rural", voiceKeywords: ["bengaluru rural", "bangalore rural", "ಗ್ರಾಮಾಂತರ"] },
        { id: "bengaluru_urban", kn: "ಬೆಂಗಳೂರು ನಗರ", en: "Bengaluru Urban", voiceKeywords: ["bengaluru urban", "bangalore urban", "ಬೆಂಗಳೂರು ನಗರ"] },
        { id: "bidar", kn: "ಬೀದರ್", en: "Bidar", voiceKeywords: ["bidar", "ಬೀದರ್"] },
        { id: "chamarajanagar", kn: "ಚಾಮರಾಜನಗರ", en: "Chamarajanagar", voiceKeywords: ["chamarajanagar", "chamarajnagar", "ಚಾಮರಾಜನಗರ"] },
        { id: "chikkaballapura", kn: "ಚಿಕ್ಕಬಳ್ಳಾಪುರ", en: "Chikkaballapura", voiceKeywords: ["chikkaballapura", "chikkaballapur", "ಚಿಕ್ಕಬಳ್ಳಾಪುರ"] },
        { id: "chikkamagaluru", kn: "ಚಿಕ್ಕಮಗಳೂರು", en: "Chikkamagaluru", voiceKeywords: ["chikkamagaluru", "chikmagalur", "ಚಿಕ್ಕಮಗಳೂರು"] },
        { id: "chitradurga", kn: "ಚಿತ್ರದುರ್ಗ", en: "Chitradurga", voiceKeywords: ["chitradurga", "durga", "ಚಿತ್ರದುರ್ಗ"] },
        { id: "dakshina_kannada", kn: "ದಕ್ಷಿಣ ಕನ್ನಡ", en: "Dakshina Kannada", voiceKeywords: ["dakshina kannada", "mangalore", "ಮಂಗಳೂರು", "ದಕ್ಷಿಣ ಕನ್ನಡ"] },
        { id: "davanagere", kn: "ದಾವಣಗೆರೆ", en: "Davanagere", voiceKeywords: ["davanagere", "davangere", "ದಾವಣಗೆರೆ"] },
        { id: "dharwad", kn: "ಧಾರವಾಡ", en: "Dharwad", voiceKeywords: ["dharwad", "ಧಾರವಾಡ"] },
        { id: "gadag", kn: "ಗದಗ", en: "Gadag", voiceKeywords: ["gadag", "ಗದಗ"] },
        { id: "hassan", kn: "ಹಾಸನ", en: "Hassan", voiceKeywords: ["hassan", "ಹಾಸನ"] },
        { id: "haveri", kn: "ಹಾವೇರಿ", en: "Haveri", voiceKeywords: ["haveri", "ಹಾವೇರಿ"] },
        { id: "kalaburagi", kn: "ಕಲಬುರಗಿ", en: "Kalaburagi", voiceKeywords: ["kalaburagi", "gulbarga", "ಕಲಬುರಗಿ"] },
        { id: "kodagu", kn: "ಕೊಡಗು", en: "Kodagu", voiceKeywords: ["kodagu", "coorg", "ಕೊಡಗು"] },
        { id: "kolar", kn: "ಕೋಲಾರ", en: "Kolar", voiceKeywords: ["kolar", "ಕೋಲಾರ"] },
        { id: "koppal", kn: "ಕೊಪ್ಪಳ", en: "Koppal", voiceKeywords: ["koppal", "ಕೊಪ್ಪಳ"] },
        { id: "mandya", kn: "ಮಂಡ್ಯ", en: "Mandya", voiceKeywords: ["mandya", "ಮಂಡ್ಯ"] },
        { id: "mysuru", kn: "ಮೈಸೂರು", en: "Mysuru", voiceKeywords: ["mysuru", "mysore", "ಮೈಸೂರು"] },
        { id: "raichur", kn: "ರಾಯಚೂರು", en: "Raichur", voiceKeywords: ["raichur", "ರಾಯಚೂರು"] },
        { id: "ramanagara", kn: "ರಾಮನಗರ", en: "Ramanagara", voiceKeywords: ["ramanagara", "ramanagar", "ರಾಮನಗರ"] },
        { id: "shivamogga", kn: "ಶಿವಮೊಗ್ಗ", en: "Shivamogga", voiceKeywords: ["shivamogga", "shimoga", "ಶಿವಮೊಗ್ಗ"] },
        { id: "tumakuru", kn: "ತುಮಕೂರು", en: "Tumakuru", voiceKeywords: ["tumakuru", "tumkur", "ತುಮಕೂರು"] },
        { id: "udupi", kn: "ಉಡುಪಿ", en: "Udupi", voiceKeywords: ["udupi", "ಉಡುಪಿ"] },
        { id: "uttara_kannada", kn: "ಉತ್ತರ ಕನ್ನಡ", en: "Uttara Kannada", voiceKeywords: ["uttara kannada", "karwar", "ಉತ್ತರ ಕನ್ನಡ"] },
        { id: "vijayanagara", kn: "ವಿಜಯನಗರ", en: "Vijayanagara", voiceKeywords: ["vijayanagara", "hospet", "ವಿಜಯನಗರ"] },
        { id: "vijayapura", kn: "ವಿಜಯಪುರ", en: "Vijayapura", voiceKeywords: ["vijayapura", "bijapur", "ವಿಜಯಪುರ"] },
        { id: "yadgir", kn: "ಯಾದಗಿರಿ", en: "Yadgir", voiceKeywords: ["yadgir", "ಯಾದಗಿರಿ"] }
      ]
    },
    {
      id: "land_size",
      type: "number_or_choice",
      icon: "layers",
      unit: "acres",
      options: [
        { id: "1", kn: "೧ ಎಕರೆಗಿಂತ ಕಡಿಮೆ (ಅತಿ ಸಣ್ಣ)", en: "Less than 1 Acre (Marginal)", value: 0.8, voiceKeywords: ["one", "less than 1", "ಒಂದು ಎಕರೆಗಿಂತ ಕಡಿಮೆ", "ಅರ್ಧ ಎಕರೆ", "ಮುಕ್ಕಾಲು ಎಕರೆ"] },
        { id: "2", kn: "೧ ರಿಂದ ೨ ಎಕರೆ (ಸಣ್ಣ ರೈತರು)", en: "1 to 2 Acres (Small Farmer)", value: 1.5, voiceKeywords: ["two", "one to two", "ಎರಡು ಎಕರೆ", "ಒಂದೂವರೆ ಎಕರೆ", "1 to 2"] },
        { id: "5", kn: "೨ ರಿಂದ ೫ ಎಕರೆ (ಮಧ್ಯಮ ರೈತರು)", en: "2 to 5 Acres (Medium)", value: 3.5, voiceKeywords: ["three", "four", "five", "ಮೂರು ಎಕರೆ", "ನಾಲ್ಕು ಎಕರೆ", "ಐದು ಎಕರೆ", "2 to 5"] },
        { id: "10", kn: "೫ ಎಕರೆಗಿಂತ ಹೆಚ್ಚು (ದೊಡ್ಡ ರೈತರು)", en: "More than 5 Acres (Large)", value: 7.0, voiceKeywords: ["more than 5", "above 5", "ಐದು ಎಕರೆಗಿಂತ ಹೆಚ್ಚು", "ಹತ್ತು ಎಕರೆ"] }
      ]
    },
    {
      id: "land_ownership",
      type: "button_group",
      icon: "file-text",
      options: [
        { id: "owned", kn: "ಸ್ವಂತ ಜಮೀನು (RTC)", en: "Self Owned (RTC)", icon: "home", voiceKeywords: ["owned", "self", "own", "ಸ್ವಂತ", "ನನ್ನದೇ", "ಸ್ವಂತದ್ದು"] },
        { id: "leased", kn: "ಗೇಣಿ / ಬಾಡಿಗೆ ಜಮೀನು", en: "Leased / Tenant", icon: "key", voiceKeywords: ["leased", "tenant", "rent", "ಗೇಣಿ", "ಬಾಡಿಗೆ", "ಬೇರೆಯವರದ್ದು"] },
        { id: "joint", kn: "ಕುಟುಂಬದ ಜಂಟಿ ಜಮೀನು", en: "Joint Family Land", icon: "users", voiceKeywords: ["joint", "family", "ಜಂಟಿ", "ಕುಟುಂಬದ"] }
      ]
    },
    {
      id: "crop",
      type: "button_group",
      icon: "feather",
      options: [
        { id: "ragi", kn: "ರಾಗಿ / ಸಿರಿಧಾನ್ಯ", en: "Ragi / Millets", icon: "sun", voiceKeywords: ["ragi", "millets", "millet", "ರಾಗಿ", "ಸಿರಿಧಾನ್ಯ", "ನವಣೆ", "ಸಜ್ಜೆ"] },
        { id: "paddy", kn: "ಭತ್ತ (Paddy)", en: "Paddy / Rice", icon: "droplet", voiceKeywords: ["paddy", "rice", "ಭತ್ತ", "ಅಕ್ಕಿ"] },
        { id: "sugarcane", kn: "ಕಬ್ಬು (Sugarcane)", en: "Sugarcane", icon: "zap", voiceKeywords: ["sugarcane", "cane", "ಕಬ್ಬು"] },
        { id: "cotton", kn: "ಹತ್ತಿ (Cotton)", en: "Cotton", icon: "cloud", voiceKeywords: ["cotton", "ಹತ್ತಿ"] },
        { id: "jowar", kn: "ಜೋಳ (Jowar / Maize)", en: "Jowar / Maize", icon: "grid", voiceKeywords: ["jowar", "maize", "corn", "ಜೋಳ", "ಮುಸುಕಿನ ಜೋಳ"] },
        { id: "horticulture", kn: "ತರಕಾರಿ / ಹಣ್ಣು / ತೋಟ", en: "Fruits / Veg / Plantation", icon: "compass", voiceKeywords: ["fruits", "vegetables", "horticulture", "ತರಕಾರಿ", "ಹಣ್ಣು", "ತೋಟಗಾರಿಕೆ", "ತೆಂಗು", "ಅಡಿಕೆ"] }
      ]
    },
    {
      id: "irrigation",
      type: "button_group",
      icon: "cloud-rain",
      options: [
        { id: "rainfed", kn: "ಮಳೆ ಆಶ್ರಿತ (ಖುಷ್ಕಿ)", en: "Rainfed (Dryland)", icon: "cloud-rain", voiceKeywords: ["rainfed", "dry", "rain", "ಮಳೆ", "ಖುಷ್ಕಿ", "ಮಳೆ ಆಶ್ರಿತ"] },
        { id: "borewell", kn: "ಬೋರ್‌ವೆಲ್ / ಬಾವಿ", en: "Borewell / Open Well", icon: "disc", voiceKeywords: ["borewell", "well", "bore", "ಬೋರ್‌ವೆಲ್", "ಬಾವಿ", "ಕೊಳವೆಬಾವಿ"] },
        { id: "canal", kn: "ಕಾಲುವೆ / ನದಿ ನೀರು", en: "Canal / River", icon: "activity", voiceKeywords: ["canal", "river", "water", "ಕಾಲುವೆ", "ನದಿ", "ಹಳ್ಳ"] },
        { id: "drip", kn: "ಹನಿ / ತುಂತುರು ನೀರಾವರಿ", en: "Drip / Sprinkler", icon: "droplets", voiceKeywords: ["drip", "sprinkler", "ಹನಿ", "ತುಂತುರು", "ಡ್ರಿಪ್"] }
      ]
    },
    {
      id: "category",
      type: "button_group",
      icon: "award",
      options: [
        { id: "general", kn: "ಸಾಮಾನ್ಯ (General)", en: "General", icon: "circle", voiceKeywords: ["general", "ಸಾಮಾನ್ಯ"] },
        { id: "obc", kn: "ಒಬಿಸಿ (ಹಿಂದುಳಿದ ವರ್ಗ)", en: "OBC", icon: "shield", voiceKeywords: ["obc", "backward", "ಒಬಿಸಿ", "ಹಿಂದುಳಿದ"] },
        { id: "sc", kn: "ಪರಿಶಿಷ್ಟ ಜಾತಿ (SC)", en: "SC (Scheduled Caste)", icon: "check-circle", voiceKeywords: ["sc", "scheduled caste", "ಎಸ್ ಸಿ", "ಪರಿಶಿಷ್ಟ ಜಾತಿ"] },
        { id: "st", kn: "ಪರಿಶಿಷ್ಟ ಪಂಗಡ (ST)", en: "ST (Scheduled Tribe)", icon: "check-circle", voiceKeywords: ["st", "scheduled tribe", "ಎಸ್ ಟಿ", "ಪರಿಶಿಷ್ಟ ಪಂಗಡ"] }
      ]
    },
    {
      id: "age",
      type: "number_or_choice",
      icon: "user",
      options: [
        { id: "young", kn: "೧೮ - ೪೦ ವರ್ಷ (ಯುವ ರೈತರು)", en: "18 - 40 Years (Youth)", value: 30, voiceKeywords: ["18", "25", "30", "35", "40", "young", "ಯುವ", "ಮೂವತ್ತು"] },
        { id: "middle", kn: "೪೧ - ೬೦ ವರ್ಷ", en: "41 - 60 Years", value: 50, voiceKeywords: ["45", "50", "55", "60", "middle", "ಐವತ್ತು"] },
        { id: "senior", kn: "೬೦ ವರ್ಷಕ್ಕಿಂತ ಮೇಲ್ಪಟ್ಟು", en: "Above 60 Years (Senior)", value: 65, voiceKeywords: ["above 60", "senior", "old", "ಅರವತ್ತು", "ಹಿರಿಯ", "60+"] }
      ]
    },
    {
      id: "gender",
      type: "button_group",
      icon: "heart",
      options: [
        { id: "male", kn: "ಪುರುಷ ರೈತ", en: "Male", icon: "user", voiceKeywords: ["male", "man", "ಪುರುಷ", "ಗಂಡು"] },
        { id: "female", kn: "ಮಹಿಳಾ ರೈತರು", en: "Female", icon: "user-check", voiceKeywords: ["female", "woman", "ಮಹಿಳೆ", "ಹೆಣ್ಣು", "ಹೆಂಗಸು"] },
        { id: "other", kn: "ಇತರ", en: "Other", icon: "user-plus", voiceKeywords: ["other", "ಇತರ"] }
      ]
    },
    {
      id: "bank_account",
      type: "yes_no",
      icon: "credit-card",
      options: [
        { id: "yes", kn: "ಹೌದು, ಆಧಾರ್ ಜೋಡಣೆಯಾಗಿದೆ", en: "Yes, Linked with Aadhaar", icon: "check", voiceKeywords: ["yes", "linked", "ಹೌದು", "ಲಿಂಕ್ ಆಗಿದೆ", "ಇದೆ"] },
        { id: "no", kn: "ಇಲ್ಲ / ಗೊತ್ತಿಲ್ಲ", en: "No / Not Sure", icon: "x", voiceKeywords: ["no", "not linked", "ಇಲ್ಲ", "ಆಗಿಲ್ಲ", "ಗೊತ್ತಿಲ್ಲ"] }
      ]
    },
    {
      id: "fruits_id",
      type: "yes_no",
      icon: "bookmark",
      options: [
        { id: "yes", kn: "ಹೌದು, FID ಸಂಖ್ಯೆ ಇದೆ", en: "Yes, I have FID", icon: "check", voiceKeywords: ["yes", "have", "ಹೌದು", "ಫ್ರೂಟ್ಸ್ ಐಡಿ ಇದೆ", "ಇದೆ", "ಖಾತೆಯಿದೆ"] },
        { id: "no", kn: "ಇಲ್ಲ, ಇನ್ನೂ ಮಾಡಿಸಿಲ್ಲ", en: "No, Not registered yet", icon: "x", voiceKeywords: ["no", "don't have", "ಇಲ್ಲ", "ಇಲ್ಲರೀ", "ಮಾಡಿಲ್ಲ"] }
      ]
    }
  ],

  // 6 Core Schemes: PM-KISAN, PMFBY, KCC, PM-KMY, Raitha Siri, Krishi Bhagya
  schemes: [
    {
      id: "pm_kisan",
      name: {
        kn: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ (PM-KISAN)",
        en: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)"
      },
      department: {
        kn: "ಕೃಷಿ ಮತ್ತು ರೈತರ ಕಲ್ಯಾಣ ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ",
        en: "Ministry of Agriculture & Farmers Welfare, GoI"
      },
      type: "income",
      benefitAmount: 6000,
      isAnnualCash: true,
      benefit: {
        kn: "₹೬,೦೦೦ / ಪ್ರತಿ ವರ್ಷ (₹೨,೦೦೦ ರ ೩ ಕಂತುಗಳು)",
        en: "₹6,000 / year (3 installments of ₹2,000)"
      },
      eligibilityRules: {
        ownershipAllowed: ["owned", "joint"],
        bankRequired: true,
        fruitsRecommended: true
      },
      reason: {
        kn: "ನೀವು ಸ್ವಂತ ಕೃಷಿ ಭೂಮಿ ಹೊಂದಿದ್ದು, ಬ್ಯಾಂಕ್ ಖಾತೆಯನ್ನು ಆಧಾರ್ ಜೊತೆ ಜೋಡಿಸಿದ್ದೀರಿ.",
        en: "You hold cultivable agricultural land and have a DBT bank account."
      },
      missing: {
        kn: "ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಆಧಾರ್ ಜೋಡಣೆ ಹಾಗೂ ಇ-ಕೆವೈಸಿ (e-KYC) ಪೂರ್ಣಗೊಂಡಿಲ್ಲ.",
        en: "Your bank account must be Aadhaar-seeded and e-KYC completed."
      },
      documents: ["aadhaar", "rtc_pahani", "bank_passbook", "fruits_id"],
      apply_link: "https://pmkisan.gov.in/",
      steps_to_apply: {
        kn: [
          "pmkisan.gov.in ವೆಬ್‌ಸೈಟ್‌ಗೆ ಭೇಟಿ ನೀಡಿ.",
          "'Farmers Corner' ವಿಭಾಗದಲ್ಲಿ 'New Farmer Registration' ಆಯ್ಕೆಮಾಡಿ.",
          "ನಿಮ್ಮ ಆಧಾರ್ ಸಂಖ್ಯೆ ಮತ್ತು ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ OTP ಪಡೆಯಿರಿ.",
          "ನಿಮ್ಮ ಪಹಣಿ (RTC) ಸರ್ವೆ ನಂಬರ್ ಮತ್ತು ಬ್ಯಾಂಕ್ ವಿವರ ಭರ್ತಿ ಮಾಡಿ ಸಬ್ಮಿಟ್ ಮಾಡಿ."
        ],
        en: [
          "Visit the official pmkisan.gov.in portal.",
          "Under 'Farmers Corner', tap 'New Farmer Registration'.",
          "Enter your Aadhaar number, state (Karnataka), and mobile OTP.",
          "Fill RTC/survey number and verify DBT bank account."
        ]
      }
    },
    {
      id: "pmfby",
      name: {
        kn: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಫಸಲ್ ಬಿಮಾ ಯೋಜನೆ (PMFBY)",
        en: "Pradhan Mantri Fasal Bima Yojana (PMFBY)"
      },
      department: {
        kn: "ಕೃಷಿ ಇಲಾಖೆ, ಕರ್ನಾಟಕ ಸರ್ಕಾರ & ಕೇಂದ್ರ ಸರ್ಕಾರ",
        en: "Department of Agriculture, GoK & GoI"
      },
      type: "insurance",
      benefitAmount: 25000,
      isAnnualCash: false,
      benefit: {
        kn: "ಬರ / ಅತಿವೃಷ್ಟಿ ನಷ್ಟಕ್ಕೆ ₹೨೫,೦೦೦ - ₹೪೦,೦೦೦/ಹೆಕ್ಟೇರ್ ವಿಮೆ",
        en: "Crop loss coverage up to ₹25,000 - ₹40,000/hectare"
      },
      eligibilityRules: {
        ownershipAllowed: ["owned", "leased", "joint"],
        cropsSupported: ["paddy", "ragi", "jowar", "cotton", "sugarcane", "horticulture"]
      },
      reason: {
        kn: "ನಿಮ್ಮ ಮುಖ್ಯ ಬೆಳೆ ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಅಧಿಸೂಚಿತ ವಿಮಾ ಬೆಳೆಯಾಗಿದ್ದು, ಪ್ರಕೃತಿ ವಿಕೋಪ ನಷ್ಟ ರಕ್ಷಣೆ ಸಿಗುತ್ತದೆ.",
        en: "Your crop is an officially notified seasonal crop under Samrakshane insurance."
      },
      missing: {
        kn: "ಫ್ರೂಟ್ಸ್ ಐಡಿ (FID) ಅಥವಾ ಬೆಳೆ ಸಮೀಕ್ಷೆ (Crop Survey) ವಿವರ ನವೀಕರಿಸಬೇಕಾಗಿದೆ.",
        en: "Active FRUITS ID or Karnataka Crop Survey update required."
      },
      documents: ["aadhaar", "rtc_pahani", "bank_passbook", "fruits_id", "crop_photo"],
      apply_link: "https://samrakshane.karnataka.gov.in/",
      steps_to_apply: {
        kn: [
          "ಕರ್ನಾಟಕದ ಸಂರಕ್ಷಣೆ ಪೋರ್ಟಲ್ (samrakshane.karnataka.gov.in) ತೆರೆಯಿರಿ.",
          "ನಿಮ್ಮ ಜಿಲ್ಲೆ, ತಾಲೂಕು ಮತ್ತು ಪ್ರಸ್ತುತ ಋತು (ಖಾರಿಫ್/ರಬಿ) ಆರಿಸಿ.",
          "ಫ್ರೂಟ್ಸ್ (FRUITS) ಐಡಿ ಅಥವಾ ಸರ್ವೆ ನಂಬರ್ ನಮೂದಿಸಿ.",
          "ಬೆಳೆ ಪ್ರೀಮಿಯಂ (ಕೇವಲ ೧.೫% - ೨%) ಪಾವತಿಸಿ ಸ್ವೀಕೃತಿ ರಸೀದಿ ಪಡೆಯಿರಿ."
        ],
        en: [
          "Open Karnataka Samrakshane portal (samrakshane.karnataka.gov.in).",
          "Select current season, year, and district.",
          "Enter your FRUITS ID (FID) to auto-fetch survey land details.",
          "Pay nominal premium (1.5% - 2%) and download policy receipt."
        ]
      }
    },
    {
      id: "kcc",
      name: {
        kn: "ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ (KCC - ಶೂನ್ಯ ಬಡ್ಡಿ ಸಾಲ)",
        en: "Kisan Credit Card (KCC Loan)"
      },
      department: {
        kn: "ರಾಷ್ಟ್ರೀಕೃತ ಮತ್ತು ಗ್ರಾಮೀಣ ಬ್ಯಾಂಕ್‌ಗಳು / ನಬಾರ್ಡ್",
        en: "Cooperative & Commercial Banks / NABARD"
      },
      type: "credit",
      benefitAmount: 100000,
      isAnnualCash: false,
      benefit: {
        kn: "₹೩ ಲಕ್ಷದವರೆಗೆ ಕೇವಲ ೪% ಬಡ್ಡಿದರದಲ್ಲಿ (ಸಮಯಕ್ಕೆ ಮರುಪಾವತಿಸಿದರೆ ೦%) ಕೃಷಿ ಸಾಲ",
        en: "Up to ₹3,00,000 credit at 4% effective interest (0% if paid on time)"
      },
      eligibilityRules: {
        ownershipAllowed: ["owned", "leased", "joint"],
        ageMin: 18,
        ageMax: 70
      },
      reason: {
        kn: "ನೀವು ೧೮ ವರ್ಷ ಮೇಲ್ಪಟ್ಟ ಕೃಷಿಕರಾಗಿದ್ದು, ಬೆಳೆ ಖರ್ಚುಗಳಿಗೆ ರಿಯಾಯಿತಿ ಬಡ್ಡಿದರದ ಸಾಲಕ್ಕೆ ಅರ್ಹರು.",
        en: "You are an active farmer eligible for subsidized short-term working capital."
      },
      missing: {
        kn: "ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಆಧಾರ್ ಜೋಡಣೆ ಮತ್ತು ಫ್ರೂಟ್ಸ್ ಐಡಿ (FID) ಲಿಂಕ್ ಆಗಿರಬೇಕು.",
        en: "Bank account must be Aadhaar-linked and FRUITS ID validated."
      },
      documents: ["aadhaar", "rtc_pahani", "bank_passbook", "fruits_id", "caste_cert"],
      apply_link: "https://fruits.karnataka.gov.in/",
      steps_to_apply: {
        kn: [
          "ನಿಮ್ಮ ಹತ್ತಿರದ ಗ್ರಾಮೀಣ ಅಥವಾ ಸಹಕಾರಿ ಬ್ಯಾಂಕ್ ಶಾಖೆಗೆ ಭೇಟಿ ನೀಡಿ.",
          "ಕೆಸಿಸಿ (KCC) ಒಂದು ಪುಟದ ಸರಳ ಅರ್ಜಿ ಫಾರಂ ಭರ್ತಿ ಮಾಡಿ.",
          "ಪಹಣಿ (RTC) ಮತ್ತು ಫ್ರೂಟ್ಸ್ ಐಡಿ ನಕಲು ಲಗತ್ತಿಸಿ.",
          "ಯಾವುದೇ ಅಡಮಾನವಿಲ್ಲದೆ ₹೧.೬೦ ಲಕ್ಷದವರೆಗೆ ತಕ್ಷಣ ಮಂಜೂರಾತಿ ಪಡೆಯಿರಿ."
        ],
        en: [
          "Visit your local Gramin, Cooperative, or Commercial Bank branch.",
          "Fill the simplified 1-page KCC application form.",
          "Attach RTC, Aadhaar, and FRUITS ID certificate copy.",
          "Collateral-free sanction up to ₹1.60 Lakh under simplified RBI norms."
        ]
      }
    },
    {
      id: "pm_kmy",
      name: {
        kn: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಮಾನ್ ಧನ್ ಯೋಜನೆ (PM-KMY)",
        en: "PM Kisan Maan Dhan Yojana (PM-KMY Pension)"
      },
      department: {
        kn: "ಕೃಷಿ ಸಚಿವಾಲಯ & ಎಲ್‌ಐಸಿ (LIC) ಭಾರತ",
        en: "Ministry of Agriculture & LIC India"
      },
      type: "pension",
      benefitAmount: 36000,
      isAnnualCash: true,
      benefit: {
        kn: "೬೦ ವರ್ಷದ ನಂತರ ಪ್ರತಿ ತಿಂಗಳು ₹೩,೦೦೦ (ವಾರ್ಷಿಕ ₹೩೬,೦೦೦) ನಿಶ್ಚಿತ ಪಿಂಚಣಿ",
        en: "Fixed pension of ₹3,000/month (₹36,000/year) after age 60"
      },
      eligibilityRules: {
        ageMin: 18,
        ageMax: 40,
        maxLandAcres: 5.0,
        ownershipAllowed: ["owned", "joint"]
      },
      reason: {
        kn: "ನಿಮ್ಮ ವಯಸ್ಸು ೪೦ ವರ್ಷದೊಳಗಿದ್ದು, ೫ ಎಕರೆಗಿಂತ ಕಡಿಮೆ ಜಮೀನು ಹೊಂದಿರುವ ಸಣ್ಣ ರೈತರಾಗಿದ್ದೀರಿ.",
        en: "You are between 18-40 years and possess cultivable land up to 2 hectares (5 acres)."
      },
      missing: {
        kn: "ಅರ್ಜಿದಾರರ ವಯಸ್ಸು ೧೮ ರಿಂದ ೪೦ ವರ್ಷದೊಳಗಿರಬೇಕು ಮತ್ತು ಜಮೀನು ೫ ಎಕರೆಗಿಂತ ಕಡಿಮೆಯಿರಬೇಕು.",
        en: "Farmer must be aged between 18 to 40 years with land under 5 acres."
      },
      documents: ["aadhaar", "bank_passbook", "rtc_pahani"],
      apply_link: "https://maandhan.in/",
      steps_to_apply: {
        kn: [
          "ಹತ್ತಿರದ ಸಾಮಾನ್ಯ ಸೇವಾ ಕೇಂದ್ರ (CSC) ಅಥವಾ ಗ್ರಾಮ ಒನ್ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಿ.",
          "ಆಧಾರ್ ಕಾರ್ಡ್ ಮತ್ತು ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್ ಒದಗಿಸಿ.",
          "ವಯಸ್ಸಿಗೆ ತಕ್ಕಂತೆ ಪ್ರತಿ ತಿಂಗಳು ₹೫೫ ರಿಂದ ₹೨೦೦ ಪ್ರೀಮಿಯಂ (ಸರ್ಕಾರವೂ ಅಷ್ಟೇ ಮೊತ್ತ ಭರಿಸುತ್ತದೆ).",
          "ಕಿಸಾನ್ ಪಿಂಚಣಿ ಕಾರ್ಡ್ ತಕ್ಷಣ ಪಡೆಯಿರಿ."
        ],
        en: [
          "Visit nearest Common Service Center (CSC) or Grama One.",
          "Present Aadhaar card and Savings bank passbook.",
          "Monthly contribution ₹55 to ₹200 (equal matching share by Govt of India).",
          "Receive instant Kisan Pension Card on enrollment."
        ]
      }
    },
    {
      id: "raitha_siri",
      name: {
        kn: "ಕರ್ನಾಟಕ ರೈತ ಸಿರಿ ಯೋಜನೆ (ಸಿರಿಧಾನ್ಯ ಪ್ರೋತ್ಸಾಹ)",
        en: "Karnataka Raitha Siri Scheme (Millet Incentive)"
      },
      department: {
        kn: "ಕೃಷಿ ಇಲಾಖೆ, ಕರ್ನಾಟಕ ಸರ್ಕಾರ",
        en: "Department of Agriculture, Government of Karnataka"
      },
      type: "income",
      benefitAmount: 10000,
      isAnnualCash: true,
      benefit: {
        kn: "ಪ್ರತಿ ಹೆಕ್ಟೇರ್‌ಗೆ ₹೧೦,೦೦೦ ನೇರ ನಗದು ಪ್ರೋತ್ಸಾಹ (DBT ಮೂಲಕ)",
        en: "₹10,000 per hectare direct DBT incentive for millets"
      },
      eligibilityRules: {
        cropsSupported: ["ragi"],
        fruitsRequired: true,
        bankRequired: true
      },
      reason: {
        kn: "ನೀವು ರಾಗಿ ಅಥವಾ ಸಿರಿಧಾನ್ಯ ಬೆಳೆಯುತ್ತಿದ್ದು, ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ವಿಶೇಷ ಪ್ರೋತ್ಸಾಹ ಧನಕ್ಕೆ ಅರ್ಹರು.",
        en: "You cultivate Ragi or designated millets in Karnataka state."
      },
      missing: {
        kn: "ಕರ್ನಾಟಕದ ಫ್ರೂಟ್ಸ್ (FRUITS) ಐಡಿ ನೋಂದಣಿ ಮಾಡಿಸಿಕೊಳ್ಳುವುದು ಕಡ್ಡಾಯವಾಗಿದೆ.",
        en: "Must register on Karnataka FRUITS portal and record millet crop."
      },
      documents: ["aadhaar", "fruits_id", "rtc_pahani", "bank_passbook"],
      apply_link: "https://fruits.karnataka.gov.in/",
      steps_to_apply: {
        kn: [
          "ಹೋಬಳಿಯ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ (RSK) ಅಥವಾ ಗ್ರಾಮ ಒನ್ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಿ.",
          "ನಿಮ್ಮ ಪಹಣಿ ಮತ್ತು ಬೆಳೆ ಸಮೀಕ್ಷೆಯಲ್ಲಿ ರಾಗಿ/ಸಿರಿಧಾನ್ಯ ನಮೂದಾಗಿರುವುದನ್ನು ದೃಢೀಕರಿಸಿ.",
          "ಫ್ರೂಟ್ಸ್ ಐಡಿಗೆ ಬ್ಯಾಂಕ್ ಖಾತೆ ಲಿಂಕ್ ಆಗಿರುವುದನ್ನು ಪರಿಶೀಲಿಸಿ.",
          "ಅರ್ಜಿ ಪರಿಶೀಲನೆಯ ನಂತರ ನೇರವಾಗಿ ನಿಮ್ಮ ಖಾತೆಗೆ ₹೧೦,೦೦೦ ಜಮೆಯಾಗುತ್ತದೆ."
        ],
        en: [
          "Visit nearest Raitha Samparka Kendra (RSK) or Grama One.",
          "Ensure Ragi/Millet is entered in Karnataka Digital Crop Survey.",
          "Verify your bank Aadhaar linkage in FRUITS software.",
          "Incentive will be transferred directly to Aadhaar-seeded account."
        ]
      }
    },
    {
      id: "krishi_bhagya",
      name: {
        kn: "ಕರ್ನಾಟಕ ಕೃಷಿ ಭಾಗ್ಯ ಯೋಜನೆ (ಕೃಷಿ ಹೊಂಡ & ಡ್ರಿಪ್ ಸಬ್ಸಿಡಿ)",
        en: "Karnataka Krishi Bhagya Scheme (Farm Pond & Drip)"
      },
      department: {
        kn: "ಜಲಾನಯನ ಅಭಿವೃದ್ಧಿ ಇಲಾಖೆ, ಕರ್ನಾಟಕ ಸರ್ಕಾರ",
        en: "Watershed Development Department, GoK"
      },
      type: "irrigation",
      benefitAmount: 50000,
      isAnnualCash: false,
      benefit: {
        kn: "ಕೃಷಿ ಹೊಂಡ, ಪಾಲಿಥಿನ್ ಹೊದಿಕೆ ಮತ್ತು ಡೀಸೆಲ್ ಪಂಪ್‌ಸೆಟ್‌ಗೆ ೮೦% - ೯೦% ಸಬ್ಸಿಡಿ",
        en: "80% to 90% subsidy for Farm Pond, Polythene lining & Pumpset"
      },
      eligibilityRules: {
        irrigationSupported: ["rainfed", "borewell"],
        fruitsRequired: true
      },
      reason: {
        kn: "ನಿಮ್ಮ ಜಮೀನು ಮಳೆಯಾಶ್ರಿತವಾಗಿದ್ದು, ಮಳೆನೀರು ಕೊಯ್ಲು ಮತ್ತು ಹನಿ ನೀರಾವರಿ ಸಬ್ಸಿಡಿಗೆ ಸಂಪೂರ್ಣ ಅರ್ಹತೆ ಇದೆ.",
        en: "Your farm operates under rainfed/dryland conditions needing water retention."
      },
      missing: {
        kn: "ಫ್ರೂಟ್ಸ್ ಐಡಿ (FID) ಮತ್ತು ಭೂಮಾಲೀಕತ್ವ ದೃಢೀಕರಣ ನವೀಕರಿಸಬೇಕಾಗಿದೆ.",
        en: "FRUITS ID (FID) registration with verified RTC survey mapping."
      },
      documents: ["fruits_id", "rtc_pahani", "aadhaar", "bank_passbook", "caste_cert"],
      apply_link: "https://raitamitra.karnataka.gov.in/",
      steps_to_apply: {
        kn: [
          "raitamitra.karnataka.gov.in ಅಥವಾ ಹತ್ತಿರದ RSK ಕೇಂದ್ರಕ್ಕೆ ಹೋಗಿ.",
          "ಕೃಷಿ ಭಾಗ್ಯ ಘಟಕ ೧ (ಕೃಷಿ ಹೊಂಡ ನಿರ್ಮಾಣ) ಕ್ಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.",
          "ಅಧಿಕಾರಿಗಳು ಸ್ಥಳ ಪರಿಶೀಲನೆ (GPS Field Inspection) ನಡೆಸುತ್ತಾರೆ.",
          "ಹೊಂಡ ನಿರ್ಮಾಣದ ನಂತರ ಸಬ್ಸಿಡಿ ಹಣ ನೇರವಾಗಿ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಬಿಡುಗಡೆಯಾಗುತ್ತದೆ."
        ],
        en: [
          "Visit raitamitra.karnataka.gov.in or nearest RSK center.",
          "Submit application for Krishi Bhagya farm pond package.",
          "Agri officer conducts GPS survey and issues work order.",
          "Subsidy is credited via DBT upon post-construction geo-tagging."
        ]
      }
    }
  ],

  // Master Document Reference Guide
  documentsGuide: [
    {
      id: "fruits_id",
      name: {
        kn: "ಫ್ರೂಟ್ಸ್ ಐಡಿ (FRUITS ID / FID)",
        en: "FRUITS ID (Farmer Registration ID)"
      },
      description: {
        kn: "ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಎಲ್ಲಾ ಯೋಜನೆಗಳು, ಪರಿಹಾರ ಮತ್ತು ಸಬ್ಸಿಡಿಗಳಿಗೆ ಈ ಏಕೈಕ ಸಂಖ್ಯೆ ಕಡ್ಡಾಯ.",
        en: "Single unified beneficiary registration number mandatory for all Karnataka agri schemes."
      },
      whereToGet: {
        kn: "ಹತ್ತಿರದ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ (RSK), ಗ್ರಾಮ ಒನ್ ಕೇಂದ್ರ, ಅಥವಾ fruits.karnataka.gov.in ವೆಬ್‌ಸೈಟ್.",
        en: "Nearest Raitha Samparka Kendra (RSK), Grama One, or fruits.karnataka.gov.in."
      },
      requiredDocs: {
        kn: "ಆಧಾರ್ ಕಾರ್ಡ್, ಪಹಣಿ (RTC), ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್.",
        en: "Aadhaar Card, RTC/Pahani copy, Bank Passbook."
      },
      cost: { kn: "ಸಂಪೂರ್ಣ ಉಚಿತ", en: "Free of cost" }
    },
    {
      id: "rtc_pahani",
      name: {
        kn: "ಪಹಣಿ / ಆರ್‌ಟಿಸಿ (RTC / Pahani)",
        en: "Pahani / Land Record (RTC)"
      },
      description: {
        kn: "ನಿಮ್ಮ ಜಮೀನಿನ ಮಾಲೀಕತ್ವ, ಸರ್ವೆ ನಂಬರ್ ಮತ್ತು ಬೆಳೆ ವಿವರಗಳನ್ನು ಸಾಬೀತುಪಡಿಸುವ ದಾಖಲೆ.",
        en: "Primary land record proving ownership, survey number, and cultivated crops."
      },
      whereToGet: {
        kn: "ಭೂಮಿ ಪೋರ್ಟಲ್ (bhoomi.karnataka.gov.in), ಗ್ರಾಮ ಒನ್, ನಾಡಕಚೇರಿ, ಅಥವಾ ನೆಮ್ಮದಿ ಕೇಂದ್ರ.",
        en: "Bhoomi online portal (bhoomi.karnataka.gov.in), Grama One, or Nadakacheri."
      },
      requiredDocs: {
        kn: "ಜಿಲ್ಲೆ, ತಾಲೂಕು, ಹೋಬಳಿ, ಗ್ರಾಮ ಮತ್ತು ಸರ್ವೆ ನಂಬರ್.",
        en: "District, Taluk, Hobli, Village, and Survey Number."
      },
      cost: { kn: "₹೧೫ (ಸರ್ಕಾರಿ ಶುಲ್ಕ)", en: "₹15 (Govt fee)" }
    },
    {
      id: "aadhaar",
      name: {
        kn: "ಆಧಾರ್ ಕಾರ್ಡ್ (Aadhaar Card)",
        en: "Aadhaar Card"
      },
      description: {
        kn: "ರೈತರ ಗುರುತು ಮತ್ತು ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ನೇರ ಹಣ ವರ್ಗಾವಣೆ (DBT) ಗೆ ಅತ್ಯಗತ್ಯ.",
        en: "National biometric identity required for Direct Benefit Transfer (DBT)."
      },
      whereToGet: {
        kn: "ತಾಲೂಕು ಕಚೇರಿ, ಕರ್ನಾಟಕ ಒನ್, ಗ್ರಾಮ ಒನ್ ಅಥವಾ ಅಂಚೆ ಕಚೇರಿ (Post Office).",
        en: "Taluk Office, Karnataka One, Grama One, or Post Office Aadhaar Kendra."
      },
      requiredDocs: {
        kn: "ಜನನ ಪ್ರಮಾಣಪತ್ರ ಅಥವಾ ವಿಳಾಸದ ಪುರಾವೆ.",
        en: "Proof of address / Identity."
      },
      cost: { kn: "ಉಚಿತ / ನವೀಕರಣಕ್ಕೆ ₹೫೦", en: "Free / ₹50 for update" }
    },
    {
      id: "bank_passbook",
      name: {
        kn: "ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್ (Aadhaar Seeded)",
        en: "Bank Passbook (Aadhaar Seeded)"
      },
      description: {
        kn: "ಸರಕಾರಿ ಸಬ್ಸಿಡಿ ಮತ್ತು ವಿಮಾ ಪರಿಹಾರದ ಹಣ ನೇರವಾಗಿ ಜಮೆಯಾಗಲು NPCI ಮ್ಯಾಪಿಂಗ್ ಆಗಿರುವ ಖಾತೆ.",
        en: "Aadhaar-seeded NPCI mapped bank account for instant DBT credits."
      },
      whereToGet: {
        kn: "ನಿಮ್ಮ ಖಾತೆ ಇರುವ ಯಾವುದೇ ರಾಷ್ಟ್ರೀಕೃತ, ಗ್ರಾಮೀಣ ಅಥವಾ ಸಹಕಾರಿ ಬ್ಯಾಂಕ್ ಶಾಖೆ.",
        en: "Your branch of Commercial, Grameena, or Cooperative Bank."
      },
      requiredDocs: {
        kn: "ಆಧಾರ್ ಕಾರ್ಡ್ ನಕಲು ಮತ್ತು DBT ಸಮ್ಮತಿ ಪತ್ರ (NPCI Consent Form).",
        en: "Aadhaar copy and NPCI DBT mandate form."
      },
      cost: { kn: "ಉಚಿತ", en: "Free" }
    },
    {
      id: "caste_cert",
      name: {
        kn: "ಜಾತಿ ಮತ್ತು ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ",
        en: "Caste & Income Certificate (RD Number)"
      },
      description: {
        kn: "SC / ST / OBC ರೈತರಿಗೆ ಸಿಗುವ ೯೦% ವರೆಗಿನ ಹೆಚ್ಚುವರಿ ಸಬ್ಸಿಡಿಗಳಿಗೆ ಅವಶ್ಯಕ.",
        en: "Mandatory for claiming special enhanced subsidies (up to 90%) for SC/ST/OBC."
      },
      whereToGet: {
        kn: "ನಾಡಕಚೇರಿ (nadakacheri.karnataka.gov.in) ಅಥವಾ ಗ್ರಾಮ ಒನ್ ಕೇಂದ್ರ.",
        en: "Nadakacheri online portal or Grama One center."
      },
      requiredDocs: {
        kn: "ಪಡಿತರ ಚೀಟಿ (Ration Card), ಆಧಾರ್ ಕಾರ್ಡ್.",
        en: "Ration Card, Aadhaar Card."
      },
      cost: { kn: "₹೪೦ (ಸರ್ಕಾರಿ ಶುಲ್ಕ)", en: "₹40 (Govt fee)" }
    },
    {
      id: "crop_photo",
      name: {
        kn: "ಬೆಳೆ ಸಮೀಕ್ಷೆ ದೃಢೀಕರಣ (Crop Survey)",
        en: "Karnataka Digital Crop Survey"
      },
      description: {
        kn: "ಬೆಳೆ ವಿಮೆ ಮತ್ತು ಬೆಂಬಲ ಬೆಲೆಗೆ (MSP) ಜಮೀನಿನಲ್ಲಿ ಬೆಳೆದ ಬೆಳೆಯ ಡಿಜಿಟಲ್ ಫೋಟೋ ದಾಖಲೆ.",
        en: "Digital geo-tagged photo verification required for crop insurance claims and MSP."
      },
      whereToGet: {
        kn: "ಕರ್ನಾಟಕ ಬೆಳೆ ಸಮೀಕ್ಷೆ ಮೊಬೈಲ್ ಆ್ಯಪ್ (ರೈತರೇ ಅಪ್‌ಲೋಡ್ ಮಾಡಬಹುದು) ಅಥವಾ ಪಿಆರ್‌ಒ (PRO).",
        en: "Karnataka Farmer Crop Survey App (Self-upload) or local Village PR assistant."
      },
      requiredDocs: {
        kn: "ಸ್ಮಾರ್ಟ್‌ಫೋನ್ ಮತ್ತು ಜಮೀನಿನ ಜಿಪಿಎಸ್ ಸ್ಥಳ.",
        en: "Smartphone at farm location with GPS enabled."
      },
      cost: { kn: "ಸಂಪೂರ್ಣ ಉಚಿತ", en: "Free" }
    }
  ],

  // Seasonal notices and deadline tips
  tipsAndReminders: [
    {
      id: "tip_pmfby",
      urgency: "high",
      tag: { kn: "ತುರ್ತು ಗಡುವು", en: "Deadline" },
      title: {
        kn: "ಮುಂಗಾರು ಬೆಳೆ ವಿಮೆ (PMFBY) ನೋಂದಣಿಗೆ ಕೊನೆಯ ದಿನಾಂಕ",
        en: "Kharif Crop Insurance (PMFBY) Last Date"
      },
      desc: {
        kn: "ನಿಮ್ಮ ರಾಗಿ, ಭತ್ತ, ಜೋಳ ಬೆಳೆಗೆ ಪ್ರಕೃತಿ ವಿಕೋಪ ರಕ್ಷಣೆ ಪಡೆಯಲು ಹತ್ತಿರದ ಗ್ರಾಮ ಒನ್ ಅಥವಾ ಬ್ಯಾಂಕಿನಲ್ಲಿ ಇಂದೇ ಪ್ರೀಮಿಯಂ ಪಾವತಿಸಿ.",
        en: "Enroll your Kharif crops on Samrakshane portal before cutoff to ensure drought and rain risk protection."
      },
      date: "31 Aug"
    },
    {
      id: "tip_pmkisan",
      urgency: "high",
      tag: { kn: "ಇ-ಕೆವೈಸಿ", en: "e-KYC" },
      title: {
        kn: "ಪಿಎಂ-ಕಿಸಾನ್ ಮುಂದಿನ ಕಂತಿನ ಹಣ ಪಡೆಯಲು e-KYC ಕಡ್ಡಾಯ",
        en: "PM-KISAN e-KYC Mandatory for Next Installment"
      },
      desc: {
        kn: "ನಿಮ್ಮ ಆಧಾರ್ ಸಂಖ್ಯೆಯೊಂದಿಗೆ ಒಟಿಪಿ ಅಥವಾ ಫಿಂಗರ್‌ಪ್ರಿಂಟ್ ಮೂಲಕ ಇ-ಕೆವೈಸಿ ಪೂರ್ಣಗೊಳಿಸಿ. ಇಲ್ಲದಿದ್ದರೆ ₹೨,೦೦೦ ಕಂತು ತಡೆಹಿಡಿಯಲಾಗುತ್ತದೆ.",
        en: "Complete OTP or biometric e-KYC on pmkisan.gov.in or Grama One to receive your ₹2,000 installment."
      },
      date: "Active"
    },
    {
      id: "tip_fruits",
      urgency: "normal",
      tag: { kn: "ಮಾಹಿತಿ", en: "Notice" },
      title: {
        kn: "ಫ್ರೂಟ್ಸ್ ಐಡಿಗೆ ಪಹಣಿ (RTC) ಲಿಂಕ್ ಮಾಡಿಸುವುದು ಹೇಗೆ?",
        en: "How to Link RTC Land Survey to FRUITS ID?"
      },
      desc: {
        kn: "ಹೊಸ ಜಮೀನು ಖರೀದಿಸಿದ್ದರೆ ಅಥವಾ ಸರ್ವೆ ನಂಬರ್ ಬದಲಾಗಿದ್ದರೆ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಿ ಹೊಸ ಪಹಣಿ ಅಪ್‌ಡೇಟ್ ಮಾಡಿಸಿ.",
        en: "Visit your local RSK with updated Pahani to link newly purchased parcels or corrected survey numbers."
      },
      date: "Ongoing"
    },
    {
      id: "tip_millet",
      urgency: "normal",
      tag: { kn: "ಪ್ರೋತ್ಸಾಹ ಧನ", en: "Millet Subsidy" },
      title: {
        kn: "ರೈತ ಸಿರಿ ಯೋಜನೆ: ಹೆಕ್ಟೇರ್‌ಗೆ ₹೧೦,೦೦೦ ಪ್ರೋತ್ಸಾಹ",
        en: "Raitha Siri: ₹10,000 per Hectare for Millets"
      },
      desc: {
        kn: "ಸಿರಿಧಾನ್ಯ ಬೆಳೆಯುವ ರೈತರು ಬೆಳೆ ಸಮೀಕ್ಷೆಯಲ್ಲಿ ಬೆಳೆ ಸರಿಯಾಗಿ ದಾಖಲಾಗಿರುವುದನ್ನು ದೃಢಪಡಿಸಿಕೊಳ್ಳಿ.",
        en: "Check digital crop survey to ensure millet acreage is officially marked for DBT transfer."
      },
      date: "Seasonal"
    }
  ]
};
