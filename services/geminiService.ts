import { GoogleGenAI, Type } from "@google/genai";
import { DocumentContent, Policy, CompliancePlan, PolicyArticle } from '../types';

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
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING
                        },
                        description: "An array of strings, where each string is a clause, point (e.g., 'A. The approval to amend...'), or paragraph from within that article."
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


export const generatePolicyDocument = async (policyTitle: string, frameworkText: string): Promise<DocumentContent> => {
    if (!API_KEY) {
        throw new Error("AI Service is not configured.");
    }
    
    const prompt = `Based on the following HRSD regulatory framework text for "${policyTitle}", generate a structured policy document.
    The document must include:
    1. A concise 'description' summarizing the policy's intent, purpose, and legal basis.
    2. A clear 'scope' defining who the policy applies to.
    3. A defined 'purpose' explaining the policy's objective.
    4. A detailed list of 'articles', where each article from the source text is an object with a 'title' and an array of its 'content' clauses.

    Preserve the exact wording and structure of the articles and their clauses.
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
                temperature: 0.3,
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
                temperature: 0.5,
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
