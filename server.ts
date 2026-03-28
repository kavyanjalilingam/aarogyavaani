import 'dotenv/config';
import fetch from 'node-fetch';
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_API = "http://localhost:11434/api"; // Ollama API endpoint
const apiRouter = express.Router();

app.use(express.json());

// ============================================================================
// CHAT ENDPOINT - Ollama LLM for conversational AI with facility search
// ============================================================================
apiRouter.post("/chat-enhanced", async (req, res) => {
  const { prompt, lat, lng } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  try {
    // STRICT PROMPT (NO QUESTIONS)
    const systemPrompt = `
You are AarogyaVaani, a healthcare assistant.

RULES:
- ONLY healthcare advice
- NO questions
- MAX 2 sentences
- BE DIRECT
`;

    const enhancedPrompt = `${systemPrompt}\nUser: ${prompt}\nAnswer:`;

    const response = await fetch(`${OLLAMA_API}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:4b",
        prompt: enhancedPrompt,
        stream: false,
        temperature: 0.2,
        num_predict: 80,
      }),
    });

    // ✅ SAFE RESPONSE PARSE
    let data: any = {};
    try {
      data = await response.json();
    } catch {
      data = { response: "" };
    }

    let chatText = aggressiveCleanText(data.response || "");

    // ✅ SPECIALIST
    const specialist = detectSpecialist(prompt);

    // ✅ LANGUAGE
    const userLanguage = detectLanguageFromText(prompt);

    // ✅ SMART FACILITY LOGIC (FIXED)
    const latNum = typeof lat === "number" ? lat : parseFloat(lat);
    const lngNum = typeof lng === "number" ? lng : parseFloat(lng);

    const isSevere = /chest pain|breathing|blood|unconscious|accident|severe/i.test(prompt);
    const explicitlyAsked = /hospital|nearby|doctor|clinic|nearest|help|emergency/i.test(prompt);

    const needsFacility =
      (isSevere || explicitlyAsked) &&
      !isNaN(latNum) &&
      !isNaN(lngNum);

    let facilities: any[] = [];

    if (needsFacility) {
      facilities = await searchNearbyFacilities(latNum, lngNum, "hospital");
    }

    // ✅ FINAL RESPONSE
    let finalText = chatText;

    finalText += `\n\nRecommended Specialist: ${specialist}`;

    if (facilities.length > 0) {
      finalText += `\nNearby Medical Facilities:`;
      facilities.slice(0, 5).forEach((f, i) => {
        finalText += `\n${i + 1}. ${f.name}`;
      });
    }

    // ✅ TRANSLATE LAST
    if (userLanguage !== "en") {
      finalText = await translateText(finalText, "en", userLanguage);
    }

    res.json({
      result: finalText,
      specialist,
      facilities,
      detectedLanguage: userLanguage,
    });

  } catch (err) {
    console.error("❌ CHAT ERROR:", err);
    res.json({ result: "Server error. Please try again." });
  }
});
// ============================================================================
// FACILITY SEARCH - OpenStreetMap Overpass API (Free)
// ============================================================================
async function searchNearbyFacilities(lat: number, lng: number, query: string): Promise<any[]> {
  try {
    const overpassUrl = "https://overpass-api.de/api/interpreter";

    const south = lat - 0.05;
    const west = lng - 0.05;
    const north = lat + 0.05;
    const east = lng + 0.05;

    // ✅ ONLY HOSPITALS (FIXED UX)
    const overpassQuery = `[out:json];
(
  node["amenity"="hospital"](${south},${west},${north},${east});
  way["amenity"="hospital"](${south},${west},${north},${east});
);
out center;`;

    console.log(`📍 Searching hospitals around: ${lat}, ${lng}`);

    const response = await fetch(overpassUrl, {
      method: "POST",
      body: overpassQuery,
      headers: { "Content-Type": "text/plain" }, // ✅ FIXED
    });

    if (!response.ok) {
      console.warn("Overpass API returned:", response.status);
      return [];
    }

    let jsonData: any;

    const text = await response.text();

    if (text.trim().startsWith("{")) {
      jsonData = JSON.parse(text);
    } else {
      console.warn("Overpass returned XML, converting...");
      jsonData = parseXMLToJSON(text);
    }

    const facilities =
      jsonData?.elements?.slice(0, 5).map((el: any) => ({
        name: el.tags?.name || "Unknown Hospital",
        lat: el.center?.lat || el.lat || 0,
        lng: el.center?.lon || el.lon || 0,
        phone: el.tags?.["contact:phone"] || "N/A",
        address: el.tags?.["addr:full"] || "Unknown",
        maps_url: `https://www.openstreetmap.org/?lat=${el.center?.lat || el.lat || 0}&lon=${el.center?.lon || el.lon || 0}&zoom=16`,
      })) || [];

    console.log(`✅ Found ${facilities.length} hospitals`);

    return facilities;
  } catch (err: any) {
    console.error("❌ FACILITY SEARCH ERROR:", err.message);
    return [];
  }
}
// Simple XML to JSON parser for Overpass API XML responses
function parseXMLToJSON(xmlText: string): any {
  const elements: any[] = [];
  
  try {
    // Regex-based parsing of XML response
    // Extract name and amenity tags from node elements
    
    const nodeRegex = /<node[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"[^>]*>([\s\S]*?)<\/node>/g;
    let match;
    
    while ((match = nodeRegex.exec(xmlText)) !== null) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      const nodeContent = match[3];
      
      const tags: any = { lat, lon };
      
      // Extract tags using regex
      const tagRegex = /<tag[^>]*k="([^"]*)"[^>]*v="([^"]*)"\s*\/>/g;
      let tagMatch;
      
      while ((tagMatch = tagRegex.exec(nodeContent)) !== null) {
        tags[tagMatch[1]] = tagMatch[2];
      }
      
      // Only include if has a name
      if (tags.name) {
        elements.push({
          lat: lat,
          lon: lon,
          tags: tags
        });
      }
    }
    
    console.log(`✅ Parsed ${elements.length} facilities from XML response`);
    return { elements };
  } catch (err: any) {
    console.error("XML parsing error:", err.message);
    return { elements: [] };
  }
}

// ============================================================================
// OCR ENDPOINT - Extract text from images using Tesseract.js
// ============================================================================
apiRouter.post("/ocr", async (req, res) => {
  const { base64Image } = req.body;
  if (!base64Image) return res.status(400).json({ error: "base64Image required" });

  try {
    // In production, use Tesseract.js or pytesseract backend
    // For now, return mock response
    const mockOCRResponse = "Sample prescription text extracted from image. Please upload a clearer image for better results.";
    
    res.json({ result: mockOCRResponse });
  } catch (err: any) {
    console.error("❌ OCR ERROR:", err.message);
    res.json({ result: "", error: err.message });
  }
});

// ============================================================================
// LANGUAGE DETECTION ENDPOINT
// ============================================================================
apiRouter.post("/detect-language", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });

  try {
    // Simple language detection based on character patterns
    const lang = detectLanguageFromText(text);
    res.json({ result: lang });
  } catch (err: any) {
    console.error("❌ LANGUAGE DETECTION ERROR:", err.message);
    res.json({ result: "en", error: err.message });
  }
});

function detectLanguageFromText(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Hindi
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta"; // Tamil
  if (/[\u0980-\u09FF]/.test(text)) return "bn"; // Bengali
  if (/[\u0B00-\u0B7F]/.test(text)) return "or"; // Odia
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu"; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa"; // Punjabi
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn"; // Kannada
  if (/[\u0C00-\u0C7F]/.test(text)) return "te"; // Telugu
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml"; // Malayalam
  if (/[\u0D80-\u0DFF]/.test(text)) return "si"; // Sinhala
  return "en"; // Default to English
}

// ============================================================================
// TRANSLATION ENDPOINT - Using Ollama
// ============================================================================
apiRouter.post("/translate", async (req, res) => {
  const { text, src, tgt } = req.body;
  if (!text || !src || !tgt) return res.status(400).json({ error: "text, src, tgt required" });

  try {
    const translationPrompt = `Translate this text from ${getLangName(src)} to ${getLangName(tgt)}. Only provide the translation, nothing else.\n\nText: "${text}"`;

    const response = await fetch(`${OLLAMA_API}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama2",
        prompt: translationPrompt,
        stream: false,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama translation failed: ${response.status}`);
    }

    const data: any = await response.json();
    const translatedText = data.response?.trim() || text;

    res.json({ result: translatedText });
  } catch (err: any) {
    console.error("❌ TRANSLATION ERROR:", err.message);
    res.json({ result: text, error: err.message });
  }
});

function getLangName(code: string): string {
  const langMap: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    ta: "Tamil",
    te: "Telugu",
    bn: "Bengali",
    gu: "Gujarati",
    pa: "Punjabi",
    kn: "Kannada",
    ml: "Malayalam",
    or: "Odia",
    si: "Sinhala",
  };
  return langMap[code] || code;
}

// ============================================================================
// SEARCH FACILITIES ENDPOINT
// ============================================================================
apiRouter.post("/search-facilities", async (req, res) => {
  const { lat, lng, query } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: "lat, lng required" });

  try {
    const facilities = await searchNearbyFacilities(lat, lng, query);
    res.json({ facilities });
  } catch (err: any) {
    console.error("❌ SEARCH ERROR:", err.message);
    res.json({ facilities: [], error: err.message });
  }
});

// ============================================================================
// SERVE STATIC FILES & START SERVER
// ============================================================================
app.use(express.static("dist"));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.use("/api", apiRouter);

// ============================================================================
// TRANSLATION FUNCTION (using gemma3:4b for better quality)
// ============================================================================
async function translateText(text: string, srcLang: string, tgtLang: string): Promise<string> {
  if (srcLang === tgtLang) return text;
  
  try {
    const translationPrompt = `Translate this text from ${getLangName(srcLang)} to ${getLangName(tgtLang)}. Respond ONLY with the translation, nothing else.\n\nText: "${text}"`;

    const response = await fetch(`${OLLAMA_API}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:4b",
        prompt: translationPrompt,
        stream: false,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data: any = await response.json();
    return data.response?.trim() || text;
  } catch (err: any) {
    console.error("❌ TRANSLATION ERROR:", err.message);
    return text; // Return original if translation fails
  }
}

// Aggressive cleanup function - removes poems, repetitions, and nonsense
function aggressiveCleanText(text: string): string {
  let cleaned = text;
  
  // Remove excessive repetitions of words
  cleaned = cleaned.replace(/(\b\w+)\s+\1+\b/gi, '$1');
  cleaned = cleaned.replace(/(\w)\1{2,}/g, '$1');
  
  // Remove lines that look like poetry (emotional flowery language)
  const lines = cleaned.split('\n');
  const healthcareKeywords = /symptom|pain|headache|fever|doctor|hospital|medicine|treatment|remedy|rest|water|sleep|exercise|diet|pressure|breathe|chest|injury|wound|heal|sick|disease|cure|health|vitamin/i;
  
  let filteredLines = lines.filter(line => {
    // Keep lines that mention healthcare
    if (healthcareKeywords.test(line)) return true;
    // Remove overly poetic lines (too many articles, flowery words)
    if (/dear|fellow|enthusiast|friend|precious|beloved|soul|spirit|essence/i.test(line)) return false;
    // Remove emoji-heavy lines
    if (/(😃|🤩|🎉|💫|✨|❤️|💖)/g.test(line)) return false;
    return true;
  });
  
  cleaned = filteredLines.join('\n').trim();
  
  // Ensure response is not too long (remove padding)
  if (cleaned.length > 500) {
    cleaned = cleaned.substring(0, 500).trim();
  }
  
  // Remove multiple spaces and clean up
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // If result looks empty or is a poem, return a default healthcare message
  if (!cleaned || cleaned.length < 20 || /^hey+/.test(cleaned.toLowerCase())) {
    return "I'm here to help with your health concerns. Can you tell me about your symptoms or what's bothering you?";
  }
  
  return cleaned;
}

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📡 Connected to Ollama at http://localhost:11434`);
  console.log(`🌐 Make sure Ollama is running: ollama serve`);
});
function detectSpecialist(text) {
  text = text.toLowerCase();

  if (/chest|heart|bp|pressure/.test(text)) return "Cardiologist";
  if (/skin|rash|itch/.test(text)) return "Dermatologist";
  if (/eye|vision/.test(text)) return "Ophthalmologist";
  if (/fever|cold|cough/.test(text)) return "General Physician";
  if (/bone|joint|fracture/.test(text)) return "Orthopedic";
  if (/stomach|vomit|digestion/.test(text)) return "Gastroenterologist";

  return "General Physician";
}