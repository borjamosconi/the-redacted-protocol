import { GoogleGenAI } from "@google/genai";

/**
 * RED-X Intelligence Engine
 * Handles high-fidelity document processing and multi-vector data triangulation.
 */

export interface DeclassifiedIntel {
  metadata: {
    projectName: string;
    date: string;
    confidence: number;
    clearanceLevel: string;
  };
  censorship: {
    detected: boolean;
    count: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  reconstruction: string;
  truthSummary: string;
  keyFindings: string[];
}

const getEffectiveApiKey = (): string => {
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyDaac7wLjO3ncOszIFDDPJZXwgMOI7Vv88';
};

const cleanAndParseJSON = (text: string): DeclassifiedIntel => {
  if (!text) throw new Error("Empty intelligence response");
  
  let cleanText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > -1) {
      try { 
        const extracted = cleanText.substring(firstBrace, lastBrace + 1);
        return JSON.parse(extracted);
      } catch (e2) { 
        console.error("Failed to recover JSON from text:", cleanText);
      }
    }
    throw new Error("Could not parse intelligence data. Fragmented response.");
  }
};

export const extractDeclassifiedData = async (file: File) => {
  const apiKey = getEffectiveApiKey();
  const genAI = new GoogleGenAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const base64Data = await convertFileToBase64(file);

  const prompt = `
    Analyze the provided document for declassification and neural reconstruction.
    
    1. EXTRACT: Analyze all visible text and identify redactions.
    2. CENSORSHIP: Map all high-density redaction zones (███, [REDACTED], black bars).
    3. NEURAL RECONSTRUCTION: Perform context-aware inference to reconstruct the hidden or missing text.
    4. KEY FINDINGS: List the most critical secrets or data points uncovered.
    
    Output MUST be a valid JSON object following this schema:
    {
      "metadata": { "projectName": "string", "date": "string", "confidence": number, "clearanceLevel": "TOP SECRET/CONFIDENTIAL/UNCLASSIFIED" },
      "censorship": { "detected": boolean, "count": number, "riskLevel": "LOW/MEDIUM/HIGH/CRITICAL" },
      "reconstruction": "string (the full reconstructed text)",
      "truthSummary": "string (short summary of the declassified truth)",
      "keyFindings": ["string", "string"]
    }
  `;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Data,
        mimeType: file.type
      }
    }
  ]);

  const text = result.response.text();
  return cleanAndParseJSON(text);
};
