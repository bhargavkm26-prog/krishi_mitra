with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

init_target = """  async init() {
    // Set speech controller language
    if (window.speechController) {
      window.speechController.setLanguage(this.currentLang);
    }

    // Check existing session
    const session = ApiService.getSession();
    const savedProfile = await ApiService.getProfile();
    this.profile = savedProfile;

    // Route to appropriate view
    if (session) {"""

otp_target = """  async handleSendOtp() {
    const phoneInput = document.getElementById("login-phone");
    const phoneError = document.getElementById("phone-error-msg");
    const phone = phoneInput ? phoneInput.value.trim() : "";

    if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      if (phoneError) phoneError.textContent = this.t("phoneError");
      return;
    }
    if (phoneError) phoneError.textContent = "";

    // Show OTP container
    document.getElementById("phone-step-container").style.display = "none";
    document.getElementById("otp-step-container").style.display = "block";
    document.getElementById("otp-sent-phone").textContent = `+91 ${phone}`;
    
    const otpInput = document.getElementById("login-otp");
    if (otpInput) {
      otpInput.value = "";
      otpInput.focus();
    }
  }"""

print("init_target in text:", init_target in text)
print("otp_target in text:", otp_target in text)
