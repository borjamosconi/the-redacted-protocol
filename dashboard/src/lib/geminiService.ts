import { GoogleGenAI } from "@google/genai";

/**
 * RED-X Intelligence Engine
 * Handles high-fidelity document processing and multi-vector data triangulation.
 */

export interface DeclassifiedIntel {
  metadata: {
    projectName: string;
    clientName: string;
    date: string;
    confidence: number;
  };
  censorship: {
    detected: boolean;
    count: number;
    locations: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    status: 'verified' | 'redacted' | 'estimated';
    evidence?: string;
  }>;
  reconstruction: string;
  truthSummary: string;
}

const getEffectiveApiKey = (): string => {
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyDaac7wLjO3ncOszIFDDPJZXwgMOI7Vv88';
};

const cleanAndParseJSON = (text: string): DeclassifiedIntel => {
  if (!text) throw new Error("Empty intelligence response");
  
  // More aggressive cleaning for markdown blocks
  let cleanText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    // Fallback: try to extract anything between the first { and last }
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
    Analyze the provided document for declassification and economic reconstruction.
    
    1. EXTRACT: Full document parsing.
    2. CENSORSHIP: Locate and map all high-density redaction zones (███, [REDACTED]).
    3. ECONOMIC ANALYSIS: Itemize all line items, unit costs, and total allocations.
    4. RECONSTRUCTION: Perform context-aware inference to estimate missing data points.
    
    Output MUST be a valid JSON object following this schema:
    {
      "metadata": { "projectName": "string", "clientName": "string", "date": "string", "confidence": number },
      "censorship": { "detected": boolean, "count": number, "locations": ["string"], "riskLevel": "LOW/MEDIUM/HIGH/CRITICAL" },
      "items": [{ "description": "string", "quantity": number, "unitPrice": number, "total": number, "status": "verified/redacted/estimated", "evidence": "string" }],
      "reconstruction": "string",
      "truthSummary": "string"
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
