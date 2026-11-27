/**
 * Krishi Mitra (ಕೃಷಿ ಮಿತ್ರ) - Bilingual Translation Dictionary
 * All screen text lives in this file for instant zero-latency language switching.
 */

const TRANSLATIONS = {
  kn: {
    // App Branding
    appName: "ಕೃಷಿ ಮಿತ್ರ",
    appSubName: "ಕರ್ನಾಟಕ ರೈತ ಯೋಜನೆಗಳ ಮಾರ್ಗದರ್ಶಿ",
    appTagline: "ಕರ್ನಾಟಕದ ರೈತರಿಗೆ ಸರಕಾರಿ ಕೃಷಿ ಯೋಜನೆಗಳ ನೇರ ಮಾಹಿತಿ ಮತ್ತು ನೆರವು",
    
    // Header & Navigation (as requested in top menu)
    navEligible: "ಅರ್ಹ ಯೋಜನೆಗಳು",
    navAlmost: "ಸ್ವಲ್ಪವೇ ಬಾಕಿ ಇರುವುದು",
    navSaved: "ಉಳಿಸಿದ ಯೋಜನೆಗಳು",
    langToggle: "English",
    profile: "ರೈತರ ವಿವರ",
    signIn: "ಲಾಗಿನ್",
    register: "ನೋಂದಣಿ",
    logout: "ನಿರ್ಗಮಿಸಿ (Logout)",
    deleteData: "ನನ್ನ ಮಾಹಿತಿ ಅಳಿಸಿ",
    deleteDataConfirm: "ನಿಮ್ಮ ಎಲ್ಲಾ ಮಾಹಿತಿ ಮತ್ತು ಉಳಿಸಿದ ಯೋಜನೆಗಳನ್ನು ಅಳಿಸಬೇಕೆ? ಇದನ್ನು ಹಿಂಪಡೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ.",
    dataDeletedMsg: "ನಿಮ್ಮ ಮಾಹಿತಿ ಸಂಪೂರ್ಣವಾಗಿ ಅಳಿಸಲಾಗಿದೆ.",
    
    // Bottom Navigation (Mobile)
    navHome: "ಮುಖಪುಟ",
    navDocs: "ದಾಖಲೆಗಳು",
    navTips: "ಸಲಹೆಗಳು",
    navHelp: "ಸಹಾಯ",

    // Page 1: Login / Sign Up Screen (Exact match to reference screenshot)
    loginBrand: "Krishi Mitra",
    loginHeroKn: "ಕೃಷಿ ಮಿತ್ರ",
    loginHeroEn: "K R I S H I   M I T R A",
    loginTagline: "ನಿಮಗಾಗಿ ಇರುವ 2,066 ಸರಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ",
    loginCardTitle: "ರೈತರ ಪೋರ್ಟಲ್ ಲಾಗಿನ್",
    loginSubtitle: "ನಿಮ್ಮ ರೈತ ಗುರುತಿನ ಸಂಖ್ಯೆ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ",
    phoneLabel: "ರೈತರ ಗುರುತಿನ ಸಂಖ್ಯೆ (User ID)",
    phonePlaceholder: "ಉದಾ: KM26@0001",
    phoneError: "ದಯವಿಟ್ಟು ಸರಿಯಾದ ರೈತ ಗುರುತಿನ ಸಂಖ್ಯೆ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ",
    getOtpBtn: "ಪರಿಶೀಲಿಸಿ & ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ",
    newHereSignUp: "ಹೊಸಬರೇ? <u>ಹೊಸ ರೈತ ನೋಂದಣಿ ಮಾಡಿ</u>",
    signUpNotice: "ಹೊಸಬರಾದರೂ ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ OTP ಮೂಲಕ ಸುಲಭವಾಗಿ ಸೈನ್ ಅಪ್ ಮಾಡಬಹುದು.",
    helpLink: "<u>ಸಹಾಯ</u>",
    helpModalTitle: "ರೈತ ಸಹಾಯವಾಣಿ (Farmer Helpline)",
    helpModalContent: "ಸಹಾಯ ಬೇಕಿದ್ದಲ್ಲಿ ಕರೆ ಮಾಡಿ:\n• ಕಿಸಾನ್ ಕಾಲ್ ಸೆಂಟರ್: 1800-180-1551 (ಉಚಿತ ಕರೆ)\n• ಕರ್ನಾಟಕ ರೈತ ಸಹಾಯವಾಣಿ: 080-22212861\n• ಕೃಷಿ ಇಲಾಖೆ ವೆಬ್‌ಸೈಟ್: raithamitra.karnataka.gov.in",
    helpCloseBtn: "ಮುಚ್ಚಿ",
    otpTitle: "ಒಟಿಪಿ ನಮೂದಿಸಿ",
    otpSubtitle: "ನಾವು ಈ ಸಂಖ್ಯೆಗೆ ಒಟಿಪಿ ಕಳುಹಿಸಿದ್ದೇವೆ:",
    otpPlaceholder: "4 ಅಂಕಿಗಳ ಒಟಿಪಿ",
    otpError: "ದಯವಿಟ್ಟು ಸರಿಯಾದ ಒಟಿಪಿ ನಮೂದಿಸಿ (ಪರೀಕ್ಷೆಗೆ 1234 ಬಳಸಿ)",
    verifyOtpBtn: "ದೃಢೀಕರಿಸಿ & ಮುಂದುವರಿಯಿರಿ",
    demoOtpHint: "ಪರೀಕ್ಷಾ ಒಟಿಪಿ: 1234 (ಇಲ್ಲಿ ಒತ್ತಿ)",
    changeNumber: "ಸಂಖ್ಯೆ ಬದಲಾಯಿಸಿ",

    // Hero Banner (styled like the reference screenshot)
    heroBadge: "ಕರ್ನಾಟಕ ರೈತ ಕಲ್ಯಾಣ • Krishi Mitra",
    heroTitle: "ನಿಮ್ಮ ಜಮೀನಿಗೆ ಸಿಗುವ ಸರಕಾರಿ ಕೃಷಿ ಯೋಜನೆಗಳನ್ನು ಪಡೆಯಿರಿ",
    heroDesc: "ಕರ್ನಾಟಕದ ರೈತರಿಗೆ ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ಸರ್ಕಾರದ ಡಿಬಿಟಿ ನಗದು ನೆರವು, ಬೆಳೆ ವಿಮೆ, ಬಡ್ಡಿ ರಹಿತ ಸಾಲ ಮತ್ತು ಕೃಷಿ ಹೊಂಡ ಸಬ್ಸಿಡಿಗಳನ್ನು ಸುಲಭವಾಗಿ ಒದಗಿಸುವ ಏಕೈಕ ವೇದಿಕೆ.",
    heroBtnExplore: "ಅರ್ಹ ಯೋಜನೆಗಳನ್ನು ನೋಡಿ",
    heroBtnShare: "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ",
    heroBenefitTag: "ವಾರ್ಷಿಕವಾಗಿ ₹{amount} ವರೆಗೆ",

    // Discover & Search Card (styled like reference screenshot)
    discoverTitle: "ಲಭ್ಯವಿರುವ ಕೃಷಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ",
    searchPlaceholder: "ಯೋಜನೆಯ ಹೆಸರು ಅಥವಾ ಕೀವರ್ಡ್ (ಉದಾ: PM-KISAN, ವಿಮೆ, ಬೆಳೆ, ಸಾಲ)",
    allCategories: "ಎಲ್ಲಾ ಕೃಷಿ ವರ್ಗಗಳು",
    filterDistrictPlaceholder: "ಜಿಲ್ಲೆಯ ಪ್ರಕಾರ ಫಿಲ್ಟರ್",
    searchBtn: "ಯೋಜನೆ ಹುಡುಕಿ",

    // Page 2: Farmer Profile Wizard
    wizardTitle: "ನಿಮ್ಮ ಕೃಷಿ ವಿವರ",
    wizardStepOf: "ಪ್ರಶ್ನೆ {current} / {total}",
    btnBack: "ಹಿಂದೆ",
    btnNext: "ಮುಂದೆ",
    btnSubmit: "ಯೋಜನೆಗಳನ್ನು ತೋರಿಸಿ",
    selectPlaceholder: "ದಯವಿಟ್ಟು ಆಯ್ಕೆ ಮಾಡಿ",
    voicePrompt: "ದೊಡ್ಡ ಮೈಕ್ ಒತ್ತಿ ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ",
    listening: "ಕೇಳಿಸಿಕೊಳ್ಳಲಾಗುತ್ತಿದೆ... ಈಗ ಮಾತನಾಡಿ",
    speechNotSupported: "ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಬೆಂಬಲಿಸುತ್ತಿಲ್ಲ. ಕೆಳಗಿನ ಆಯ್ಕೆಗಳನ್ನು ಒತ್ತಿ.",
    speechError: "ಧ್ವನಿ ಸರಿಯಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ ಅಥವಾ ಕೆಳಗಿನ ಆಯ್ಕೆ ಒತ್ತಿ.",
    speechTimeout: "ಯಾವುದೇ ಧ್ವನಿ ಕೇಳಿಸಲಿಲ್ಲ. ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.",
    weHeard: "ನಾವು ಕೇಳಿಸಿಕೊಂಡಿದ್ದು:",
    isThisCorrect: "ಇದು ಸರಿಯೇ? ದಯವಿಟ್ಟು ದೃಢೀಕರಿಸಿ:",
    btnConfirmVoice: "ಸರಿ, ದೃಢೀಕರಿಸಿ (Confirm)",
    btnRetryVoice: "ಮತ್ತೊಮ್ಮೆ ಮಾತನಾಡಿ (Retry)",
    numericHint: "ಅಥವಾ ನೇರವಾಗಿ ಸಂಖ್ಯೆ ಬರೆಯಿರಿ:",

    // Questions
    q_district: "ನಿಮ್ಮ ಜಿಲ್ಲೆ ಯಾವುದು?",
    q_district_sub: "ಕರ್ನಾಟಕದ ನಿಮ್ಮ ತೋಟ/ಜಮೀನು ಇರುವ ಜಿಲ್ಲೆ",
    q_land_size: "ನಿಮ್ಮ ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣ ಎಷ್ಟು?",
    q_land_size_sub: "ಎಕರೆಗಳಲ್ಲಿ (ಉದಾಹರಣೆಗೆ 2 ಎಕರೆ)",
    q_land_ownership: "ಜಮೀನಿನ ಮಾಲೀಕತ್ವ ಯಾವ ವಿಧ?",
    q_land_ownership_sub: "ಸ್ವಂತ ಜಮೀನು ಅಥವಾ ಗೇಣಿ ಜಮೀನು?",
    q_crop: "ನೀವು ಬೆಳೆಯುವ ಮುಖ್ಯ ಬೆಳೆ ಯಾವುದು?",
    q_crop_sub: "ನಿಮ್ಮ ಪ್ರಮುಖ ಆದಾಯದ ಬೆಳೆ",
    q_irrigation: "ನಿಮ್ಮ ಜಮೀನಿಗೆ ನೀರಾವರಿ ಸೌಲಭ್ಯ ಹೇಗಿದೆ?",
    q_irrigation_sub: "ಮಳೆಯಾಶ್ರಿತವೇ ಅಥವಾ ಬೋರ್‌ವೆಲ್/ಕಾಲುವೆಯೇ?",
    q_category: "ನಿಮ್ಮ ಸಾಮಾಜಿಕ ವರ್ಗ ಯಾವುದು?",
    q_category_sub: "ವಿಶೇಷ ಸರಕಾರಿ ಸಬ್ಸಿಡಿ ಸೌಲಭ್ಯಗಳಿಗಾಗಿ",
    q_age: "ನಿಮ್ಮ ವಯಸ್ಸು ಎಷ್ಟು?",
    q_age_sub: "ಪಿಂಚಣಿ ಮತ್ತು ಯುವ ರೈತ ಯೋಜನೆಗಳಿಗೆ ಬೇಕು",
    q_gender: "ನಿಮ್ಮ ಲಿಂಗ ಯಾವುದು?",
    q_gender_sub: "ಮಹಿಳಾ ರೈತರಿಗೆ ವಿಶೇಷ ಆದ್ಯತೆ ಯೋಜನೆಗಳಿವೆ",
    q_bank_account: "ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಆಧಾರ್ ಜೋಡಣೆಯಾಗಿದೆಯೇ?",
    q_bank_account_sub: "ಡಿಬಿಟಿ (DBT) ಹಣ ನೇರವಾಗಿ ಜಮೆಯಾಗಲು ಅವಶ್ಯಕ",
    q_fruits_id: "ನಿಮ್ಮ ಬಳಿ ಫ್ರೂಟ್ಸ್ (FRUITS) ಐಡಿ ಇದೆಯೇ?",
    q_fruits_id_sub: "ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ರೈತರ ವಿಶಿಷ್ಟ ಗುರುತಿನ ಸಂಖ್ಯೆ (FID)",

    // Scheme Tabs & Cards
    tabEligible: "ಅರ್ಹ ಯೋಜನೆಗಳು",
    tabAlmost: "ಸ್ವಲ್ಪವೇ ಬಾಕಿ ಇರುವುದು",
    tabSaved: "ಉಳಿಸಿದ ಯೋಜನೆಗಳು",
    tagEligible: "ಅರ್ಹರು (Eligible)",
    tagAlmost: "ಸ್ವಲ್ಪ ಬಾಕಿ (Almost)",
    tagApplied: "ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ",
    benefitPerYear: "ವರ್ಷಕ್ಕೆ",
    oneTimeBenefit: "ಒಮ್ಮೆ ಮಾತ್ರ",
    viewDetailsBtn: "ಮಾಹಿತಿ & ಅರ್ಜಿ",
    missingLabel: "ಬಾಕಿ ಇರುವ ಅರ್ಹತೆ:",
    reasonLabel: "ಏಕೆ ಹೊಂದಾಣಿಕೆಯಾಗಿದೆ:",

    // Filter & Sort
    filterAll: "ಎಲ್ಲಾ ಯೋಜನೆಗಳು",
    filterIncome: "ನೇರ ಧನಸಹಾಯ",
    filterInsurance: "ಬೆಳೆ ವಿಮೆ",
    filterCredit: "ಬಡ್ಡಿ ರಹಿತ ಸಾಲ",
    filterIrrigation: "ನೀರಾವರಿ & ಹೊಂಡ",
    filterPension: "ರೈತ ಪಿಂಚಣಿ",
    sortBy: "ವಿಂಗಡಣೆ:",
    sortBenefitHigh: "ಹೆಚ್ಚು ಮೊತ್ತ ಮೊದಲು",
    sortBenefitLow: "ಕಡಿಮೆ ಮೊತ್ತ ಮೊದಲು",
    sortName: "ಯೋಜನೆಯ ಹೆಸರು (ಅ-ಹ)",

    // Tips & Alerts Ticker
    tipsBannerTitle: "ಮುಖ್ಯ ಗಡುವು & ರೈತ ಸೂಚನೆಗಳು",
    tipsTickerPaused: "ವಿರಾಮಗೊಳಿಸಲಾಗಿದೆ (ಸ್ಪರ್ಶಿಸಿದೆ)",

    // "What You Need" Modal / Scheme Detail
    whatYouNeedTitle: "ಯೋಜನೆಗೆ ಬೇಕಾಗುವ ವಿವರ",
    schemeAgency: "ಇಲಾಖೆ:",
    schemeBenefitLabel: "ಲಭ್ಯವಿರುವ ಆರ್ಥಿಕ ಸೌಲಭ್ಯ:",
    docChecklistTitle: "ಅಗತ್ಯ ದಾಖಲೆಗಳ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ",
    docChecklistSub: "ನಿಮ್ಮ ಬಳಿ ಇರುವ ದಾಖಲೆಗಳ ಮೇಲೆ ಟಿಕ್ (✔) ಮಾಡಿ:",
    whereToGetDoc: "ಈ ದಾಖಲೆ ಎಲ್ಲಿ ಪಡೆಯಬೇಕು?",
    officialSiteStepsTitle: "ಅಧಿಕೃತ ವೆಬ್‌ಸೈಟ್‌ನಲ್ಲಿ ಏನು ಮಾಡಬೇಕು?",
    btnGoToSite: "ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗೆ ಹೋಗಿ",
    btnMarkApplied: "ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ",
    btnAlreadyApplied: "ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ ✔",
    btnClose: "ಮುಚ್ಚಿ",
    externalSiteNotice: "ಗಮನಿಸಿ: ಅಧಿಕೃತ ಸರಕಾರಿ ವೆಬ್‌ಸೈಟ್ ಹೊಸ ವಿಂಡೋದಲ್ಲಿ ತೆರೆಯುತ್ತದೆ. ಅರ್ಜಿ ಸಲ್ಲಿಸಿದ ನಂತರ ವಾಪಸ್ ಬಂದು 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ' ಒತ್ತಿ.",

    // Documents Page
    docsPageTitle: "ರೈತರ ಪ್ರಮುಖ ದಾಖಲೆಗಳ ಕೈಪಿಡಿ",
    docsPageSubtitle: "ಯಾವ ದಾಖಲೆ ಎಲ್ಲಿ ಸಿಗುತ್ತದೆ ಮತ್ತು ಹೇಗೆ ಪಡೆಯಬೇಕು ಎಂಬುದರ ಮಾಹಿತಿ",
    docsNeededFor: "ಅಗತ್ಯವಿರುವ ಯೋಜನೆಗಳು:",
    docStatusHave: "ನನ್ನ ಬಳಿ ಇದೆ",
    docStatusMissing: "ಪಡೆಯಬೇಕಾಗಿದೆ",

    // Tips Page
    tipsPageTitle: "ಕೃಷಿ ಸಲಹೆಗಳು ಮತ್ತು ಗಡುವುಗಳು",
    tipsPageSubtitle: "ಕರ್ನಾಟಕ ಕೃಷಿ ಇಲಾಖೆಯ ಪ್ರಮುಖ ಸೂಚನೆಗಳು",

    // Help Page
    helpPageTitle: "ರೈತ ಸಹಾಯವಾಣಿ & ಸಂಪರ್ಕ",
    helpPageSubtitle: "ಯಾವುದೇ ಯೋಜನೆ ಅಥವಾ ತಾಂತ್ರಿಕ ಸಹಾಯಕ್ಕೆ ಸಂಪರ್ಕಿಸಿ",
    kisanCallCenter: "ಕಿಸಾನ್ ಕಾಲ್ ಸೆಂಟರ್ (ಟೋಲ್ ಫ್ರೀ)",
    karnatakaRaithaVani: "ಕರ್ನಾಟಕ ರೈತವಾಣಿ",
    fruitsHelp: "ಫ್ರೂಟ್ಸ್ ಪೋರ್ಟಲ್ ಸಹಾಯವಾಣಿ",
    helpDeskTiming: "ಬೆಳಿಗ್ಗೆ ೬:೦೦ ರಿಂದ ರಾತ್ರಿ ೧೦:೦೦ ರವರೆಗೆ (ಉಚಿತ ಕರೆ)",
    nearestOffice: "ನಿಮ್ಮ ಹತ್ತಿರದ ಕೃಷಿ ಕಚೇರಿ:",
    nearestOfficeDesc: "ನಿಮ್ಮ ಹೋಬಳಿಯ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ (RSK) ಅಥವಾ ತಾಲೂಕು ಸಹಾಯಕ ಕೃಷಿ ನಿರ್ದೇಶಕರ ಕಚೇರಿಗೆ ಭೇಟಿ ನೀಡಿ.",

    // Edit Profile Modal
    editProfileTitle: "ನಿಮ್ಮ ಕೃಷಿ ಮಾಹಿತಿ ತಿದ್ದುಪಡಿ",
    editProfileSub: "ಯಾವುದೇ ಮಾಹಿತಿ ಬದಲಿಸಿದರೆ ಯೋಜನೆಗಳ ಪಟ್ಟಿ ತಕ್ಷಣವೇ ನವೀಕರಣಗೊಳ್ಳುತ್ತದೆ",
    btnSaveProfile: "ಮಾಹಿತಿ ಉಳಿಸಿ",

    // Sharing & WhatsApp
    shareBtn: "ಹಂಚಿಕೊಳ್ಳಿ",
    shareOnWhatsApp: "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ",
    shareSchemeText: "ನಾನು ಕೃಷಿ ಮಿತ್ರ ಆ್ಯಪ್‌ನಲ್ಲಿ ಈ ಸರಕಾರಿ ಯೋಜನೆ ನೋಡಿದೆ: *{name}*. ಸೌಲಭ್ಯ: *{benefit}*. ನೀವು ಸಹ ಪರಿಶೀಲಿಸಿ!",
    shareAllText: "ನಮಸ್ಕಾರ, ಕೃಷಿ ಮಿತ್ರ ಆ್ಯಪ್‌ನಲ್ಲಿ ನನಗೆ ₹{amount} ವರೆಗಿನ ಸರಕಾರಿ ಕೃಷಿ ಯೋಜನೆಗಳು ಲಭ್ಯವಿವೆ ಎಂದು ತಿಳಿಯಿತು. ನೀವೂ ನಿಮ್ಮ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ!",

    // Empty States & Errors
    emptyEligible: "ಯಾವುದೇ ಯೋಜನೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ",
    emptyEligibleDesc: "ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಫಿಲ್ಟರ್‌ಗೆ ಯಾವುದೇ ಯೋಜನೆ ಹೊಂದಾಣಿಕೆಯಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಬೇರೆ ವರ್ಗ ಆರಿಸಿ.",
    emptySaved: "ನೀವು ಇನ್ನೂ ಯಾವುದೇ ಯೋಜನೆಯನ್ನು ಉಳಿಸಿಲ್ಲ",
    emptySavedDesc: "ಯಾವುದೇ ಯೋಜನೆಯ ಕಾರ್ಡ್‌ನಲ್ಲಿರುವ ನಕ್ಷತ್ರ (★) ಐಕಾನ್ ಒತ್ತಿ ಇಲ್ಲಿ ಉಳಿಸಿಕೊಳ್ಳಿ.",
    offlineTitle: "ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕವಿಲ್ಲ",
    offlineDesc: "ಆದರೆ ನೀವು ಉಳಿಸಿದ ವಿವರಗಳನ್ನು ಮತ್ತು ಆಫ್‌ಲೈನ್ ಮಾಹಿತಿಯನ್ನು ವೀಕ್ಷಿಸಬಹುದು.",
    retryBtn: "ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ",
    
    // Quick choices
    yes: "ಹೌದು",
    no: "ಇಲ್ಲ",
    acres: "ಎಕರೆ",
    saveStarAdded: "ಯೋಜನೆಯನ್ನು ಉಳಿಸಲಾಗಿದೆ",
    saveStarRemoved: "ಉಳಿಸಿದ ಪಟ್ಟಿಯಿಂದ ತೆಗೆಯಲಾಗಿದೆ"
  },

  en: {
    // App Branding (aligned with index.html Sovereign Agrarian OS)
    appName: "Krishi Mitra",
    appSubName: "SOVEREIGN AGRI-OS",
    appTagline: "Unified System for Sovereign Agrarian Governance & Entitlement Matching",

    // Header & Navigation
    navEligible: "Eligible Schemes",
    navAlmost: "Almost Eligible",
    navSaved: "Saved Schemes",
    langToggle: "ಕನ್ನಡ",
    profile: "Farmer Profile",
    signIn: "Sign In",
    register: "Register",
    logout: "Log Out",
    deleteData: "Delete My Data",
    deleteDataConfirm: "Are you sure you want to delete all your profile data and saved schemes? This cannot be undone.",
    dataDeletedMsg: "Your data has been completely removed.",

    // Bottom Navigation (Mobile)
    navHome: "Home",
    navDocs: "Documents",
    navTips: "Advisories",
    navHelp: "Help",

    // Page 1: Login / Sign Up Screen
    loginBrand: "Krishi Mitra",
    loginHeroKn: 'Krishi <span class="gt">Mitra</span>',
    loginHeroEn: "S O V E R E I G N   A G R I - O S",
    loginTagline: "Autonomous Agrarian Intelligence — Access 2,066 Statutory Schemes",
    loginCardTitle: "Farmer Portal Sign In",
    loginSubtitle: "Enter your registered User ID and Password to unlock personalized schemes",
    phoneLabel: "Farmer User ID",
    phonePlaceholder: "e.g. KM26@0001",
    phoneError: "Please enter a valid Farmer User ID or 10-digit mobile number",
    getOtpBtn: "Verify & Sign In to Farmer Portal",
    newHereSignUp: "New Farmer? <u>Register New Account</u>",
    signUpNotice: "Create your Citizen Farmer ID and PostgreSQL profile on the registration portal.",
    helpLink: "<u>Farmer Helpline &amp; Support</u>",
    helpModalTitle: "Farmer Helpline &amp; Grievance Redressal",
    helpModalContent: "Need help? Call toll-free:\n• Kisan Call Center: 1800-180-1551 (Toll Free)\n• Karnataka Raitha Helpline: 080-22212861\n• Official Agriculture Portal: raithamitra.karnataka.gov.in",
    helpCloseBtn: "Close",
    otpTitle: "Enter OTP",
    otpSubtitle: "We have sent an OTP to this number:",
    otpPlaceholder: "4-digit OTP",
    otpError: "Please enter the correct OTP (Use 1234 for testing)",
    verifyOtpBtn: "Verify & Continue",
    demoOtpHint: "Test OTP: 1234 (Click here)",
    changeNumber: "Change ID / Number",

    // Hero Banner (matched to index.html terminology)
    heroBadge: "SOVEREIGN AGRI-OS // 2,066 STATUTORY SCHEMES INDEXED",
    heroTitle: 'Direct Scheme Matching &amp; <span class="gt">Sovereign Agrarian Governance</span>',
    heroDesc: "We connect statutory schemes, citizen land records, agro-climatic conditions, and procedural mandates into direct DBT income support, crop insurance, zero-interest KCC credit, and micro-irrigation subsidies.",
    heroBtnExplore: "Explore Eligible Schemes",
    heroBtnShare: "📲 Share Eligibility Summary",
    heroBenefitTag: "Up to ₹{amount}/year",

    // Discover & Search Card
    discoverTitle: "Discover Statutory Schemes",
    searchPlaceholder: "Search by scheme name, ministry, or keyword (e.g. PM-KISAN, PMFBY, KCC, Drip)",
    allCategories: "All Statutory Categories",
    filterDistrictPlaceholder: "Filter by District",
    searchBtn: "Search Schemes",

    // Page 2: Farmer Profile Wizard
    wizardTitle: "Your Farming Details",
    wizardStepOf: "Question {current} of {total}",
    btnBack: "Back",
    btnNext: "Next",
    btnSubmit: "Show My Schemes",
    selectPlaceholder: "Please choose an option",
    voicePrompt: "Tap the big mic and speak your answer clearly",
    listening: "Listening... Speak now",
    speechNotSupported: "Speech recognition is not supported on this phone. Please tap the options below.",
    speechError: "Could not catch your voice clearly. Tap mic to retry or choose an option below.",
    speechTimeout: "No speech detected. Please tap mic and try again.",
    weHeard: "We heard:",
    isThisCorrect: "Is this correct? Please confirm:",
    btnConfirmVoice: "Confirm (Yes, Correct)",
    btnRetryVoice: "Speak Again (Retry)",
    numericHint: "Or enter number directly:",

    // Questions
    q_district: "Which is your district in Karnataka?",
    q_district_sub: "District where your agricultural land is located",
    q_land_size: "What is your total land holding?",
    q_land_size_sub: "In acres (e.g., 2 acres)",
    q_land_ownership: "What type of land ownership do you have?",
    q_land_ownership_sub: "Self-owned land or leased land?",
    q_crop: "What is your main crop?",
    q_crop_sub: "Your primary revenue or cultivated crop",
    q_irrigation: "What is your irrigation facility?",
    q_irrigation_sub: "Rainfed, borewell, or canal?",
    q_category: "What is your social category?",
    q_category_sub: "Used for targeted government subsidies",
    q_age: "What is your age?",
    q_age_sub: "Required for pension and youth farmer schemes",
    q_gender: "What is your gender?",
    q_gender_sub: "Special schemes are reserved for women farmers",
    q_bank_account: "Is your bank account linked with Aadhaar?",
    q_bank_account_sub: "Essential for direct benefit transfer (DBT)",
    q_fruits_id: "Do you have a FRUITS ID?",
    q_fruits_id_sub: "Karnataka Farmer Registration and Unified Beneficiary ID",

    // Scheme Tabs & Cards
    tabEligible: "Eligible Schemes",
    tabAlmost: "Almost Eligible",
    tabSaved: "Saved Schemes",
    tagEligible: "Eligible",
    tagAlmost: "Almost Eligible",
    tagApplied: "Applied",
    benefitPerYear: "per year",
    oneTimeBenefit: "one-time",
    viewDetailsBtn: "Details & Apply",
    missingLabel: "What is missing:",
    reasonLabel: "Why you matched:",

    // Filter & Sort
    filterAll: "All Schemes",
    filterIncome: "Direct Income",
    filterInsurance: "Crop Insurance",
    filterCredit: "Subsidized Loans",
    filterIrrigation: "Irrigation & Ponds",
    filterPension: "Farmer Pension",
    sortBy: "Sort by:",
    sortBenefitHigh: "Highest Benefit First",
    sortBenefitLow: "Lowest Benefit First",
    sortName: "Scheme Name (A-Z)",

    // Tips & Alerts Ticker
    tipsBannerTitle: "Important Deadlines & Notices",
    tipsTickerPaused: "Paused (touched)",

    // "What You Need" Modal / Scheme Detail
    whatYouNeedTitle: "What You Need For This Scheme",
    schemeAgency: "Department:",
    schemeBenefitLabel: "Financial Benefit:",
    docChecklistTitle: "Required Documents Checklist",
    docChecklistSub: "Tick the documents you currently have:",
    whereToGetDoc: "Where to get this document?",
    officialSiteStepsTitle: "What to do on official website?",
    btnGoToSite: "Go to Official Portal",
    btnMarkApplied: "Mark as Applied",
    btnAlreadyApplied: "Application Submitted ✔",
    btnClose: "Close",
    externalSiteNotice: "Note: The official government portal opens in a new tab. After applying, return here and tap 'Mark as Applied'.",

    // Documents Page
    docsPageTitle: "Karnataka Farmer Documents Guide",
    docsPageSubtitle: "Where to obtain each vital farm document and procedures",
    docsNeededFor: "Required for schemes:",
    docStatusHave: "I have this",
    docStatusMissing: "Need to get",

    // Tips Page
    tipsPageTitle: "Agri Notices & Deadlines",
    tipsPageSubtitle: "Important circulars from Karnataka Agriculture Department",

    // Help Page
    helpPageTitle: "Farmer Helpline & Support",
    helpPageSubtitle: "Contact for scheme inquiries and technical assistance",
    kisanCallCenter: "Kisan Call Centre (Toll-Free)",
    karnatakaRaithaVani: "Karnataka Raitha Vani",
    fruitsHelp: "FRUITS Portal Helpdesk",
    helpDeskTiming: "6:00 AM to 10:00 PM All Days (Toll-Free)",
    nearestOffice: "Your Nearest Agri Office:",
    nearestOfficeDesc: "Visit your Hobli Raitha Samparka Kendra (RSK) or Taluk Assistant Director of Agriculture (ADA) office.",

    // Edit Profile Modal
    editProfileTitle: "Edit Your Farm Details",
    editProfileSub: "Changing any answer immediately updates scheme eligibility",
    btnSaveProfile: "Save Changes",

    // Sharing & WhatsApp
    shareBtn: "Share",
    shareOnWhatsApp: "Share on WhatsApp",
    shareSchemeText: "I found this government scheme on Krishi Mitra: *{name}*. Benefit: *{benefit}*. Check your eligibility here!",
    shareAllText: "Hello, I checked my eligibility on Krishi Mitra and found up to ₹{amount}/year in government agri schemes. Check yours too!",

    // Empty States & Errors
    emptyEligible: "No schemes match your filter",
    emptyEligibleDesc: "Try selecting 'All Schemes' or review your profile details.",
    emptySaved: "No saved schemes yet",
    emptySavedDesc: "Tap the star (★) icon on any scheme card to save it here for quick access.",
    offlineTitle: "You are currently offline",
    offlineDesc: "Showing cached schemes and offline checklists.",
    retryBtn: "Retry Connection",

    // Quick choices
    yes: "Yes",
    no: "No",
    acres: "Acres",
    saveStarAdded: "Scheme saved",
    saveStarRemoved: "Removed from saved"
  }
};
