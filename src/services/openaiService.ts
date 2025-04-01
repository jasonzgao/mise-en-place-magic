
// Service for interacting with OpenAI API

type MiseEnPlaceResult = {
  steps: string[];
  bowlCount: number;
};

export async function generateMiseEnPlace(
  ingredients: string[],
  instructions: string[],
  apiKey: string
): Promise<MiseEnPlaceResult> {
  try {
    const prompt = createMiseEnPlacePrompt(ingredients, instructions);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef specialized in mise-en-place optimization. Your goal is to help home cooks prepare ingredients efficiently, minimizing the number of bowls and steps needed.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to connect to OpenAI API');
    }

    const data = await response.json();
    return parseMiseEnPlaceResponse(data.choices[0]?.message?.content || '');
    
  } catch (error) {
    console.error('Error generating mise-en-place:', error);
    return {
      steps: ['Could not generate mise-en-place optimization. Please check your API key and try again.'],
      bowlCount: 0
    };
  }
}

function createMiseEnPlacePrompt(ingredients: string[], instructions: string[]): string {
  return `
I need help optimizing my mise-en-place (ingredient preparation) for this recipe.

INGREDIENTS:
${ingredients.join('\n')}

RECIPE INSTRUCTIONS:
${instructions.join('\n')}

Please analyze this recipe and provide:
1. A step-by-step guide for the most efficient mise-en-place preparation
2. The minimum number of prep bowls needed
3. Which ingredients can be combined in the same bowl
4. Any prep work that can be done simultaneously
5. Suggestions for efficiency (e.g., cutting techniques, order of operations)

Format your response in JSON with these fields:
{
  "mise_en_place_steps": ["step1", "step2", ...],
  "bowl_count": number,
  "efficiency_notes": "any additional efficiency notes"
}
`;
}

function parseMiseEnPlaceResponse(responseText: string): MiseEnPlaceResult {
  try {
    // Extract JSON from the response if it's wrapped in text
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                   responseText.match(/{[\s\S]*?}/);
    
    let jsonText = jsonMatch ? jsonMatch[0] : responseText;
    
    // Clean up the string if needed
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n/, '').replace(/\n```/, '');
    }
    
    // Parse the JSON
    const parsed = JSON.parse(jsonText);
    
    return {
      steps: parsed.mise_en_place_steps || [],
      bowlCount: parsed.bowl_count || 0
    };
  } catch (error) {
    console.error('Failed to parse mise-en-place response:', error);
    
    // Fallback: try to extract steps from plain text if JSON parsing fails
    const steps = responseText
      .split(/\d+\.|\n-|\*/)
      .map(step => step.trim())
      .filter(step => step.length > 10);
    
    return {
      steps: steps.length > 0 ? steps : [responseText],
      bowlCount: 0
    };
  }
}
