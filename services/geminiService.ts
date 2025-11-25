
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DocumentContent, Policy, CompliancePlan, PolicyArticle, RiskAssessmentItem } from '../types';

// In a real production environment, this key would be managed securely and not hardcoded.
// It's assumed process.env.API_KEY is populated by the execution environment.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API Key not found in environment variables. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const documentContentSchema = {
    type: Type.OBJECT,
    properties: {
        description: {
            type: Type.STRING,
            description: "A brief, one-paragraph overview of the policy's intent, purpose, and legal reference based on the framework text."
        },
        scope: {
            type: Type.STRING,
            description: "Who and what this policy applies to. Summarize this from the articles if not explicitly stated."
        },
        purpose: {
            type: Type.STRING,
            description: "The primary objective or reason for this policy's existence. What problem does it solve or what goal does it achieve? Summarize from the framework."
        },
        articles: {
            type: Type.ARRAY,
            description: "An array of objects, where each object represents a distinct 'Article' from the framework text.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: "The full title of the article, for example, 'Article (1): Controls for Amendment and Demotion'."
                    },
                    content: {
                        type: Type.STRING,
                        description: "The full content of the article as a single string. Preserve original line breaks with newline characters (\\n)."
                    }
                },
                required: ["title", "content"]
            }
        }
    },
    required: ["description", "scope", "purpose", "articles"]
};

const compliancePlanSchema = {
    type: Type.OBJECT,
    properties: {
        steps: {
            type: Type.ARRAY,
            description: "A list of actionable steps to achieve compliance for the given policy.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: "A short, clear title for the compliance step."
                    },
                    description: {
                        type: Type.STRING,
                        description: "A detailed explanation of the step, what needs to be done, and why it's important for compliance."
                    }
                },
                required: ["title", "description"]
            }
        }
    },
    required: ["steps"]
};

const riskAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A brief, user-friendly summary of the key changes made to the risk items in plain text. Use bullet points for clarity. For example: '- Updated mitigation controls for PERF-001 to include automated notifications.\\n- Added a specific deadline to the action item for TITLE-001.'"
        },
        updatedRisks: {
            type: Type.ARRAY,
            description: "The complete and updated list of all risk assessment items.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    category: { type: Type.STRING },
                    riskDescription: { type: Type.STRING },
                    frameworkReference: { type: Type.STRING },
                    likelihood: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                    impact: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                    mitigationControls: { type: Type.STRING },
                    complianceStatus: { type: Type.STRING, enum: ['Compliant', 'Partially Compliant', 'Non-Compliant'] },
                    actionItems: { type: Type.STRING },
                    approvalStatus: { type: Type.STRING, enum: ['Draft', 'Pending Approval', 'Approved', 'Rejected'] },
                    managementComments: { type: Type.STRING },
                },
                required: ["id", "category", "riskDescription", "frameworkReference", "likelihood", "impact", "mitigationControls", "complianceStatus", "actionItems", "approvalStatus"]
            }
        }
    },
    required: ["summary", "updatedRisks"]
};

const partialRiskItemSchema = {
    type: Type.OBJECT,
    properties: {
        category: { type: Type.STRING, description: "The policy category this risk falls under (e.g., 'Performance Management', 'Sick Leave')." },
        riskDescription: { type: Type.STRING, description: "A clear and concise description of the potential risk." },
        frameworkReference: { type: Type.STRING, description: "The specific article or section of the HRSD framework that this risk relates to (e.g., 'Art. 14')." },
        likelihood: { type: Type.STRING, enum: ['Low', 'Medium', 'High'], description: "The likelihood of the risk occurring." },
        impact: { type: Type.STRING, enum: ['Low', 'Medium', 'High'], description: "The potential impact if the risk occurs." },
        mitigationControls: { type: Type.STRING, description: "Specific measures, processes, or systems in place to reduce the likelihood or impact of the risk." },
        actionItems: { type: Type.STRING, description: "Concrete, time-bound tasks required to address the risk." },
    },
};

export const extractRiskDataFromConversation = async (
    question: string,
    answer: string,
    fieldToExtract: keyof Omit<RiskAssessmentItem, 'id' | 'complianceStatus' | 'approvalStatus' | 'managementComments'>
): Promise<Partial<RiskAssessmentItem>> => {
    if (!API_KEY) throw new Error("AI Service is not configured.");

    const prompt = `
    You are an AI assistant helping a user create a risk assessment item by asking questions.
    The user is answering the following question: "${question}"
    The user's raw transcribed answer is: "${answer}"

    Your task is to analyze the user's answer and extract the information for the specific field: "${fieldToExtract}".
    - If the user says "low", "medium", or "high" for likelihood or impact, use that value.
    - For descriptions, controls, and actions, capture the essence of their statement concisely.
    - If the answer doesn't seem to relate to the question or is unclear, return an empty object.
    - DETECT THE LANGUAGE of the user's answer. If the answer is in Arabic, the extracted data MUST be in Arabic. If English, use English.

    Return a JSON object containing ONLY the extracted data for the "${fieldToExtract}" field, adhering to the provided schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        [fieldToExtract]: partialRiskItemSchema.properties[fieldToExtract],
                    },
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error(`Error extracting data for field ${fieldToExtract}:`, error);
        return {}; // Return empty object on failure
    }
};


export const generatePolicyDocument = async (policyTitle: string, frameworkText: string): Promise<DocumentContent> => {
    if (!API_KEY) {
        throw new Error("AI Service is not configured.");
    }
    
    const prompt = `Based on the following HRSD regulatory framework text for "${policyTitle}", generate a structured policy document.
    
    CRITICAL INSTRUCTION: Identify the language of the "Framework Text" below. You MUST generate the 'description', 'scope', 'purpose', and 'articles' content IN THE SAME LANGUAGE as the framework text.
    - If the framework is in Arabic, the entire JSON output content must be in Arabic.
    - If the framework is in English, the entire JSON output content must be in English.

    The document must include:
    1. A very clear and concise 'description' summarizing the policy's core intent, primary purpose, and legal basis. This should be a single, well-crafted paragraph.
    2. A clear 'scope' defining who the policy applies to.
    3. A defined 'purpose' explaining the policy's objective.
    4. A detailed list of 'articles'. Each article object must have a 'title' and a 'content' string. It is critical that the 'content' string is an exact, verbatim copy of the source article text. All original line breaks, paragraphing, and formatting must be perfectly preserved using newline characters (\\n). Do not summarize, alter, or rephrase any part of the article content.

    Adhere strictly to the provided JSON schema for the output. Ensure the language is professional and clear.

    Framework Text:
    ---
    ${frameworkText}
    ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: documentContentSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        // Basic validation
        if (parsedJson.description && parsedJson.scope && parsedJson.purpose && Array.isArray(parsedJson.articles)) {
            return parsedJson as DocumentContent;
        } else {
            throw new Error("Generated JSON does not match the expected format.");
        }

    } catch (error) {
        console.error("Error generating document with Gemini:", error);
        throw new Error("Failed to communicate with the AI model.");
    }
};

export const generateCompliancePlan = async (policy: Policy, currentDocumentContent: DocumentContent): Promise<CompliancePlan> => {
    if (!API_KEY) {
        throw new Error("AI Service is not configured.");
    }

    const prompt = `
    You are an expert HRSD compliance agent. Your task is to create a step-by-step compliance action plan for an organization based on a specific regulatory framework.
    I am providing you with the policy title, the official framework text, and the organization's current document for that policy.
    Analyze the current document against the framework and identify gaps or areas for improvement.
    Generate a clear, actionable plan to bring the organization into full compliance. The plan should be a series of concrete steps.

    IMPORTANT: Detect the language of the 'Framework Text' and 'Current Document Content'. The output 'Compliance Plan' MUST be in the same language (e.g., if input is Arabic, output Arabic).

    Policy Title: "${policy.title}"

    Regulatory Framework:
    ---
    ${policy.frameworkText}
    ---

    Current Document Content:
    ---
    ${JSON.stringify(currentDocumentContent, null, 2)}
    ---

    Generate the compliance plan based on this information, adhering strictly to the provided JSON schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: compliancePlanSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        
        if (parsedJson.steps && Array.isArray(parsedJson.steps)) {
            return parsedJson as CompliancePlan;
        } else {
            throw new Error("Generated JSON for compliance plan does not match the expected format.");
        }

    } catch (error) {
        console.error("Error generating compliance plan with Gemini:", error);
        throw new Error("Failed to communicate with the AI model for compliance analysis.");
    }
};

export const analyzeRisks = async (risks: RiskAssessmentItem[]): Promise<{ updatedRisks: RiskAssessmentItem[], summary: string }> => {
    if (!API_KEY) {
        throw new Error("AI Service is not configured.");
    }

    const prompt = `
    You are an expert HRSD risk analyst for a large organization in Saudi Arabia.
    Your task is to review a list of pre-identified risks and improve them.
    Analyze the following JSON array of risk assessment items. For each item:
    1.  Critically evaluate the 'mitigationControls' and 'actionItems'.
    2.  Focus on items with a 'complianceStatus' of "Non-Compliant" or "Partially Compliant".
    3.  Rewrite the 'mitigationControls' to be more specific, preventative, and practical. Suggest system-based controls (e.g., "HRIS validation rule") where possible.
    4.  Rewrite the 'actionItems' to be more concrete and time-bound. For example, instead of "Implement system", suggest "Configure and deploy system notifications by Q3 2024".
    5.  Do NOT change the 'id', 'category', 'riskDescription', 'frameworkReference', or 'approvalStatus'.
    6.  Only adjust 'likelihood' or 'impact' if the existing values are clearly illogical based on the description. Maintain the original values otherwise.
    7.  Return the FULL, complete list of all risk items, including those you didn't change, in the 'updatedRisks' field.
    8.  Provide a brief, bulleted summary of the most significant changes you made in the 'summary' field.
    
    IMPORTANT: Detect the language of the input risk items (English or Arabic). The output 'updatedRisks' and 'summary' MUST be in the same language as the input.

    Current Risk Data:
    ---
    ${JSON.stringify(risks, null, 2)}
    ---

    Adhere strictly to the provided JSON schema for your response.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: riskAnalysisSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        if (parsedJson.summary && Array.isArray(parsedJson.updatedRisks)) {
            // Ensure managementComments is preserved if it exists
            const mergedRisks = parsedJson.updatedRisks.map((updated: RiskAssessmentItem) => {
                const original = risks.find(r => r.id === updated.id);
                return {
                    ...updated,
                    managementComments: original?.managementComments || updated.managementComments || undefined
                };
            });
            return { updatedRisks: mergedRisks, summary: parsedJson.summary };

        } else {
            throw new Error("Generated JSON for risk analysis does not match the expected format.");
        }

    } catch (error) {
        console.error("Error analyzing risks with Gemini:", error);
        throw new Error("Failed to communicate with the AI model for risk analysis.");
    }
};

export const refineTextForRiskAssessment = async (rawText: string, fieldType: 'mitigation' | 'action'): Promise<string> => {
    if (!API_KEY) {
        throw new Error("AI Service is not configured.");
    }
    if (!rawText.trim()) {
        return rawText; // Don't call API for empty text
    }

    const fieldDescription = fieldType === 'mitigation'
        ? "a 'Mitigation Control'. This should be a specific, preventative, and practical measure."
        : "an 'Action Item'. This should be a concrete, measurable, and time-bound task.";

    const prompt = `
    You are an expert HRSD risk analyst. A user provided a voice note that has been transcribed into the following text.
    Your task is to refine this text to be professional, clear, and suitable for a formal risk assessment matrix.
    The text is for ${fieldDescription}.

    IMPORTANT: Detect the language of the input text. The output must be in the same language (English or Arabic).

    Original transcribed text: "${rawText}"

    Return ONLY the refined text as a single string, without any additional explanations, labels, or markdown.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const refinedText = response.text.trim();
        return refinedText;

    } catch (error) {
        console.error("Error refining text with Gemini:", error);
        // In case of error, return the original text so user input is not lost
        return rawText;
    }
};

export const generateTemplateContent = async (templateTitle: string, language: 'en' | 'ar'): Promise<string> => {
    if (!API_KEY) {
        throw new Error("AI Service is not configured.");
    }

    const prompt = `
    You are an expert HR writer for a major corporation in Saudi Arabia.
    Your task is to generate the body content for a standard HR document.
    The language for the document must be ${language === 'en' ? 'professional English' : 'professional Arabic'}.
    The document type is: "${templateTitle}".

    Please generate a well-formatted, professional text for this document.
    Include common placeholders for dynamic information, such as:
    - For an Offer Letter: [Employee Name], [Position Title], [Start Date], [Salary], [Reporting Manager].
    - For a Warning Letter: [Employee Name], [Date of Incident], [Description of Violation], [Required Improvement], [Consequences].
    - For an Experience Certificate: [Employee Name], [Start Date], [End Date], [Last Position Held], [Brief Job Description].
    - For a Promotion Letter: [Employee Name], [Current Position], [New Position], [Effective Date], [New Salary].

    The response should ONLY contain the body text of the letter. Do not include a subject line, header, or closing signature block, as those are part of the UI template. Use newline characters (\\n) for paragraph breaks.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text.trim();

    } catch (error) {
        console.error(`Error generating template content for "${templateTitle}" in ${language}:`, error);
        throw new Error("Failed to communicate with the AI model for template generation.");
    }
};

export const generateSpeech = async (textToRead: string): Promise<string> => {
    if (!API_KEY) {
        throw new Error("AI Service is not configured.");
    }
    
    // Use 'Zephyr' for English, but TTS support for Arabic might vary. 
    // The Gemini 2.5 Flash TTS model supports multiple languages.
    // We rely on the model to auto-detect or handle the text.
    const voiceName = 'Zephyr';
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: textToRead }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio;
        } else {
            throw new Error("No audio data received from API.");
        }

    } catch (error) {
        console.error("Error generating speech with Gemini:", error);
        throw new Error("Failed to communicate with the AI model for speech generation.");
    }
};
