import { GoogleGenAI, Type } from "@google/genai";
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
                    actionItems: { type: Type.STRING }
                },
                required: ["id", "category", "riskDescription", "frameworkReference", "likelihood", "impact", "mitigationControls", "complianceStatus", "actionItems"]
            }
        }
    },
    required: ["summary", "updatedRisks"]
};


export const generatePolicyDocument = async (policyTitle: string, frameworkText: string): Promise<DocumentContent> => {
    if (!API_KEY) {
        throw new Error("AI Service is not configured.");
    }
    
    const prompt = `Based on the following HRSD regulatory framework text for "${policyTitle}", generate a structured policy document.
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
    5.  Do NOT change the 'id', 'category', 'riskDescription', or 'frameworkReference'.
    6.  Only adjust 'likelihood' or 'impact' if the existing values are clearly illogical based on the description. Maintain the original values otherwise.
    7.  Return the FULL, complete list of all risk items, including those you didn't change, in the 'updatedRisks' field.
    8.  Provide a brief, bulleted summary of the most significant changes you made in the 'summary' field.

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
            return parsedJson as { updatedRisks: RiskAssessmentItem[], summary: string };
        } else {
            throw new Error("Generated JSON for risk analysis does not match the expected format.");
        }

    } catch (error) {
        console.error("Error analyzing risks with Gemini:", error);
        throw new Error("Failed to communicate with the AI model for risk analysis.");
    }
};
