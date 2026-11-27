with open('frontend/js/api.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    const session = {
      phone: cleanPhone,
      loggedInAt: new Date().toISOString(),
      isNewUser: !localStorage.getItem(this.STORAGE_KEYS.PROFILE_DATA)
    };
    localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
    return session;
  },"""

print("Target found in api.js:", target in text)
