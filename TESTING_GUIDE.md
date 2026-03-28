# 🧪 AarogyaVaani - Feature Testing Guide

## Quick Access Links
- **Server**: http://localhost:3000
- **Report**: See `REQUIREMENTS_VALIDATION_REPORT.md`

---

## ✅ WORKING FEATURES TO TEST

### 1. Hospital Search (Most Complete Feature)
**What to do:**
1. Open http://localhost:3000
2. Grant location permission when prompted
3. UI shows map link below messages

**Try saying:**
- "Find me hospitals nearby"
- "I need a clinic"
- "Where's the nearest pharmacy?"

**Result:** ✅ Shows 5 nearby facilities with:
- Name
- Address  
- Phone number
- OpenStreetMap link (clickable)

---

### 2. Symptom Discussion (Conversational AI)
**What to do:**
1. Click the microphone button
2. Tap record, then stop
3. Type symptoms instead (STT not working yet)

**Try typing:**
- "I have a mild headache and took rest at home"
  - **Expected**: Home remedies, asking follow-up questions
  - **Result**: ✅ Works - warm response, suggestions

- "I have severe chest pain and difficulty breathing"  
  - **Expected**: Urgent tone, hospital recommendations
  - **Result**: ✅ Works - shows hospitals, emergency message

- "I'm feeling a bit dizzy"
  - **Expected**: Questions about symptoms, concern
  - **Result**: ✅ Works - empathetic response

---

### 3. Upload Medical Report (OCR)
**What to do:**
1. Click "Upload Report" button
2. Choose "Take Photo" or "Choose from Gallery"
3. Upload image of text/prescription

**Expected Result:** ✅ 
- Text extracted from image
- Language auto-detected
- Explanation generated in simple terms
- Shown in chat

**Test with:**
- Handwritten prescription photos
- Medical reports
- Any text image

---

### 4. Language Detection & Translation
**What to do:**
1. When uploading medical report, watch the flow:
   - Extract text with OCR
   - Auto-detect language
   - If not English, translate
   - Generate explanation

**Result:** ✅ Works for these language pairs:
- English ↔ Hindi
- English ↔ Tamil  
- English ↔ Bengali
- English ↔ Marathi
- English ↔ Gujarati
- And 50+ other pairs

---

## ❌ NOT WORKING (Missing Features)

### 1. Voice Input (Microphone)
**What happens:**
1. Click microphone button
2. Audio is recorded ✅
3. **But**: It's NOT converted to text ❌

**Current State:**
- Microphone captures audio
- Records successfully (red indicator)
- But no speech-to-text backend
- User must type instead

**What's Missing:**
- Speech-to-Text API integration

---

### 2. Voice Output (Hearing Responses)
**What's Missing:**
- No Text-to-Speech
- Can't hear responses
- Can't hear medical explanations

**What you get:**
- Text responses (readable)
- No audio playback

---

### 3. Specialist Recommendations
**What's Missing:**
- When you say "chest pain", it should say "See a Cardiologist"
- Currently: Shows hospitals only
- Missing: Specialist type mapping

**Example:**
```
Current: "Here are hospitals near you"
Expected: "You should see a Cardiologist. Here are Cardiologists near you"
```

---

## 🎯 Quick Test Scenarios

### Scenario 1: Mild Symptoms (Testing Empathy)
```
Input: "I have a small headache"
Expected: 
  - "Oh no, I'm sorry..."
  - Show home remedies
  - Ask follow-up questions
  - No hospital suggestion

Status: ✅ WORKING
```

### Scenario 2: Severe Symptoms (Testing Urgency)
```
Input: "I have severe chest pain and can't breathe"
Expected:
  - "This sounds serious..."
  - Show nearby hospitals immediately
  - Urgent tone
  - "Please visit immediately"

Status: ✅ WORKING
```

### Scenario 3: Medical Report (Testing OCR)
```
Input: Upload prescription image
Expected:
  - Text extracted
  - Medical terms explained simply
  - Language translated if needed

Status: ✅ WORKING
```

### Scenario 4: Voice Input (Testing Speech)
```
Input: Tap microphone, speak symptoms
Expected:
  - Audio recorded
  - Converted to text automatically
  - Processed like text input

Status: ❌ NOT WORKING
(Audio recorded, but not converted to text)
```

---

## 📊 Feature Scorecard

| Feature | Status | Works | Example |
|---------|--------|-------|---------|
| Chat | ✅ | YES | Type "hello" |
| Hospital Search | ✅ | YES | Type "find hospitals" |
| Symptom Assessment | ✅ | YES | Type symptoms |
| OCR Text Extraction | ✅ | YES | Upload image |
| Language Detection | ✅ | YES | Auto-detected |
| Translation | ✅ | YES | English→Hindi→English |
| Voice Recording | ⚠️ | PARTIAL | Records but doesn't convert |
| Voice Playback | ❌ | NO | No audio output |
| Specialist Mapping | ❌ | NO | Not implemented |
| Location Search | ✅ | YES | Auto-detected |

---

## 🔧 API Endpoints You Can Test

### 1. Health Check
```
GET http://localhost:3000/api/health
Response: {"status":"online","version":"1.0.0",...}
```

### 2. Enhanced Chat
```
POST http://localhost:3000/api/chat-enhanced
Body: {
  "prompt": "I have a headache",
  "lat": 28.6139,
  "lng": 77.2090
}
```

### 3. Search Hospitals
```
POST http://localhost:3000/api/search-facilities
Body: {
  "lat": 28.6139,
  "lng": 77.2090,
  "query": "hospital"
}
```

### 4. Detect Language
```
POST http://localhost:3000/api/detect-language
Body: {"text": "I have a fever"}
Response: {"result": "en"}
```

### 5. Translate Text
```
POST http://localhost:3000/api/translate
Body: {
  "text": "I have a fever",
  "src": "en",
  "tgt": "hi"
}
```

### 6. OCR Extract
```
POST http://localhost:3000/api/ocr
Body: {"base64Image": "data:image/jpeg;base64,..."}
```

---

## 🌍 Test Coordinates

Use these coordinates for hospital search:

| City | Latitude | Longitude | Notes |
|------|----------|-----------|-------|
| Delhi | 28.6139 | 77.2090 | Many hospitals |
| Mumbai | 19.0760 | 72.8777 | Major city |
| Bangalore | 12.9716 | 77.5946 | IT hub |
| Hyderabad | 17.3850 | 78.4867 | Good hospitals |
| Chennai | 13.0827 | 80.2707 | South India |

---

## 📝 What to Report When Testing

When you test, check:
- [ ] Response time (should be <30 seconds)
- [ ] Error messages (should be clear)
- [ ] Hospital results (should show real data)
- [ ] Text quality (should be readable)
- [ ] UI responsiveness (should be smooth)

---

## 🚀 What Works Best Right Now

1. **Text-based symptom discussion** ✅
2. **Hospital recommendations** ✅
3. **Medical report OCR** ✅
4. **Multi-language understanding** ✅
5. **Warm, empathetic responses** ✅

---

## ⚠️ What Needs Work

1. **Speech-to-Text** (voice input)
2. **Text-to-Speech** (voice output)
3. **Specialist recommendations** (which doctor to see)

---

## 📞 Example Conversations

### Example 1: Mild Symptom
```
User: I have a mild fever and cough
AI: Oh no, I'm sorry to hear that you're not feeling well. 
    A mild fever and cough could be from a common cold or 
    upper respiratory infection. Here are some things that 
    might help:
    - Rest and get plenty of sleep
    - Stay hydrated - drink water, warm tea with honey
    - Gargle with salt water for the cough
    - Take paracetamol if needed for the fever
    
    If it persists for more than 3-4 days or gets worse, 
    please see a doctor. How are you feeling otherwise?

Hospitals shown: NO (symptoms too mild)
```

### Example 2: Severe Symptom
```
User: I have severe chest pain and cannot breathe properly
AI: Oh no, this sounds serious. I really think you should 
    visit a hospital nearby to get proper medical attention 
    as soon as possible.

🚑 NEARBY HOSPITALS (Please visit immediately):
• Apollo Hospital, New Delhi - +91-11-47444444
• AIIMS Delhi - +91-11-26589123
• Max Healthcare - +91-11-30305050

Please do not delay and visit the nearest one immediately. 
This requires professional medical evaluation.

Hospitals shown: YES (severity level: high)
```

### Example 3: Medical Report
```
User: [Uploads prescription photo]
AI: I can see you've uploaded a medical prescription. 
    The text appears to be a prescription for an antibiotic.
    
    Here's what I understand:
    - Medication: Amoxicillin 500mg
    - Dosage: Take one tablet three times a day
    - Duration: For 7 days
    - Take with: Water, can be with or without food
    
    Remember: Always complete the full course even if you 
    feel better. This is a common antibiotic for infections.
    
    Do you have any questions about this medication?

Explanation shown: YES
Language detected: YES (auto-translated if needed)
```

---

## 🎓 Learning Outcomes

After testing AarogyaVaani, you'll understand:
1. How LLMs understand symptom severity
2. How location-based APIs work (Overpass/OpenStreetMap)
3. How OCR extracts text from images
4. How language detection and translation work
5. What's needed for production voice AI

---

## 💡 Tips for Best Results

1. **Be specific with symptoms** - "severe headache" vs "mild headache" triggers different responses
2. **Use real prescriptions** - Clearer images = better OCR
3. **Try different languages** - See translation in action
4. **Check hospital details** - Click OpenStreetMap links
5. **Allow location** - Needed for nearby hospitals

---

**Last Updated**: March 28, 2026  
**Status**: Server Running & Tested  
Ready for feature completion!
