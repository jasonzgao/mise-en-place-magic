
// This script will run on every webpage
console.log('Mise-en-place Magic content script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract_recipe') {
    const recipe = extractRecipeFromPage();
    sendResponse(recipe);
  }
  return true;  // Indicates we wish to send a response asynchronously
});

function extractRecipeFromPage() {
  // Leverage the existing parseRecipeFromPage function
  // You'll need to modify this to work in a content script context
  try {
    // Use the existing JSON-LD parsing logic
    const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
    
    for (const element of jsonLdElements) {
      try {
        const data = JSON.parse(element.textContent || '');
        
        // Check if it contains Recipe type data
        const recipe = findRecipeInJsonLd(data);
        
        if (recipe) {
          return {
            title: recipe.name || document.title,
            prepTime: recipe.prepTime || '',
            cookTime: recipe.cookTime || '',
            totalTime: recipe.totalTime || '',
            ingredients: Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [],
            instructions: extractInstructions(recipe),
            url: window.location.href
          };
        }
      } catch (e) {
        console.error('Error parsing JSON-LD:', e);
      }
    }
    
    // Fallback to common HTML patterns if JSON-LD wasn't found or didn't contain recipe
    return fallbackParser();
    
  } catch (error) {
    console.error('Error parsing recipe:', error);
    return null;
  }
}

// Copy these helper functions from recipeParser.ts
function findRecipeInJsonLd(data: any): any {
  // ... (copy the entire function from recipeParser.ts)
}

function extractInstructions(recipe: any): string[] {
  // ... (copy the entire function from recipeParser.ts)
}

function fallbackParser() {
  // ... (copy the entire function from recipeParser.ts)
}
