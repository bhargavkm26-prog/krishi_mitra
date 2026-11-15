# ಕೃಷಿ ಮಿತ್ರ (Krishi Mitra): Smart Farmer Assistance System

**Krishi Mitra** is a mobile-first, zero-framework web application designed specifically for small and marginal farmers across Karnataka. It assists farmers in discovering government agriculture schemes they are eligible for, understanding required documents, and applying via official government portals.

---

## 🌾 Highlights & Tech Stack

- **Zero Frameworks**: Pure standard HTML5, CSS3, and modern Vanilla JavaScript (ES6+).
- **Mobile-First & Low Literacy Friendly**:
  - Minimum touch targets of 52px–56px.
  - Large typography (16px base, 20px–26px headings).
  - Clear agricultural icons for every option.
  - Kannada-first interface with instant one-tap toggle to English.
- **Instant Language Switching**: All screen text, labels, questions, and guides live in a single dictionary file (`js/translations.js`). Switching between ಕನ್ನಡ and English occurs instantly with zero latency or network requests.
- **Voice-Enabled Profile Wizard**:
  - Uses the browser's native **Web Speech API** in `kn-IN` (Kannada) and `en-IN` (English).
  - Matches spoken words (districts, crops, irrigation, numerals) to closest choices.
  - **Mandatory Confirmation**: Every spoken answer requires confirmation with a big green tick (`✔`) or retry (`🔄`) before proceeding.
  - Graceful fallback: If microphone permission is denied, offline, or unsupported, voice is disabled with a friendly notice and touch buttons remain active.
- **FastAPI-Ready Data Layer**: All mock data calls live strictly in `js/api.js`. Swapping mock storage with real FastAPI endpoints requires updating only this file.

---

## 📁 Project Structure

```
krishi-mitra/
├── index.html              # Single entry point / SPA container
├── css/
│   ├── style.css           # High-contrast, mobile-first styling & theme
│   └── responsive.css      # Adaptations for budget phones & desktop preview
├── js/
│   ├── translations.js     # Single-source bilingual dictionary (Kannada & English)
│   ├── mockData.js         # 6 Core schemes, 10 question options, documents & tips
│   ├── api.js              # Central data service (mock layer ready for FastAPI)
│   ├── speech.js           # Web Speech API engine with fuzzy voice matcher
│   └── app.js              # Main application coordinator & view controllers
└── README.md               # Documentation & setup guide
```

---

## 🚀 How to Run Locally

Because the application uses standard browser features (including the Web Speech API and LocalStorage), it runs best on a local web server (to allow microphone permissions).

### Option 1: Using Python (Recommended)
Open a terminal in the `krishi-mitra` folder and run:

```bash
# Python 3
python -m http.server 8000
```
Then open your browser at:
```
http://localhost:8000
```

### Option 2: Using Node.js / npx
```bash
npx serve .
```

### Option 3: VS Code / Live Server
Right-click `index.html` in VS Code and select **"Open with Live Server"**.

---

## 🧪 Demo Credentials & Testing Walkthrough

1. **Page 1: Login / Sign Up**
   - Designed with the full-screen lush Karnataka corn farm field background.
   - Floating top bar with leaf brand and interactive bilingual capsule: `[ ಕನ್ನಡ | English ]`.
   - Prominent white hero typography: **ಕೃಷಿ ಮಿತ್ರ** (`K R I S H I  M I T R A`) and tagline.
   - Centered floating white card: Enter any 10-digit mobile number (pre-filled with `9845012345`).
   - Tap **"OTP ಪಡೆಯಿರಿ"** (Get OTP).
   - Enter OTP `1234` or tap **"⚡ ಪರೀಕ್ಷಾ ಒಟಿಪಿ: 1234"**.
   - Tap **"ದೃಢೀಕರಿಸಿ & ಮುಂದುವರಿಯಿರಿ"** (Verify & Continue).
   - Under the card: Tap **<u>ಸಹಾಯ</u>** to view 24x7 toll-free farmer helplines (1800-180-1551).

2. **Page 2: Farmer Profile Wizard**
   - 1 question per screen with progress bar (Step 1 to 10).
   - **Touch way**: Tap any card / dropdown / chip.
   - **Voice way**: Tap the large green mic button and speak in Kannada or English (e.g. *"Mandya"*, *"ಮಂಡ್ಯ"*, *"2 acres"*, *"ರಾಗಿ"*, *"ಹೌದು"*).
   - The app shows *"We heard: [Choice]"* and asks you to confirm with the **Big Green Tick ✔**.
   - Complete all 10 questions and tap **"ಯೋಜನೆಗಳನ್ನು ತೋರಿಸಿ"** (Show My Schemes).

3. **Page 3: Main Page**
   - **Benefit Banner**: Calculates annual cash benefit based on eligible schemes (e.g. ₹16,000+).
   - **Tabs**: Switch between *Eligible*, *Almost eligible*, and *Saved*.
   - **Card Details**: Shows reason for match; for Almost Eligible cards, clearly shows what is missing (e.g. FRUITS ID).
   - **Save & Share**: Tap the star (`★`) to bookmark, or share to WhatsApp.
   - **Tips Strip**: Auto-rotating advisory ticker that pauses when touched.
   - **Bottom Navigation**: Access *Home*, *Documents* guide, *Tips & Deadlines*, and *Help* (Toll-Free Helplines: 1800-425-3553).

4. **When Tapping Any Scheme**
   - Opens the **"What you need"** bottom sheet.
   - Interactive document checklist with tick boxes.
   - Guide on where to obtain each document (Nadakacheri, RSK, Grama One, Bhoomi).
   - Tap **"ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗೆ ಹೋಗಿ"** to visit the government site.
   - Tap **"ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ"** to mark as applied.

5. **Profile Menu & Data Management**
   - Tap the top-right profile avatar.
   - Tap **"ನಿಮ್ಮ ಕೃಷಿ ಮಾಹಿತಿ ತಿದ್ದುಪಡಿ"** to edit profile answers — scheme eligibility immediately recalculates!
   - Tap **"ನನ್ನ ಮಾಹಿತಿ ಅಳಿಸಿ"** (Delete my data) to clear all storage and reset.

---

## 🔌 FastAPI Backend Integration Guide

When connecting the real backend, replace the mock methods in `js/api.js`:

```javascript
// Example FastAPI integration inside js/api.js:
const API_BASE = "https://your-fastapi-backend.gov.in/api/v1";

const ApiService = {
  async getSchemes() {
    const res = await fetch(`${API_BASE}/schemes/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await this.getProfile())
    });
    return await res.json();
  },
  // ... other endpoints
};
```
