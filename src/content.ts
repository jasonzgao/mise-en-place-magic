
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

// Extract recipe data from JSON-LD
function findRecipeInJsonLd(data: any): any {
  // Handle array of items
  if (Array.isArray(data)) {
    for (const item of data) {
      const recipe = findRecipeInJsonLd(item);
      if (recipe) return recipe;
    }
    return null;
  }
  
  // Handle single object
  if (data && typeof data === 'object') {
    // Direct match
    if (data['@type'] === 'Recipe') {
      return data;
    }
    
    // Check for Recipe as a property
    if (data.recipe && data.recipe['@type'] === 'Recipe') {
      return data.recipe;
    }
    
    // Nested in graph
    if (data['@graph'] && Array.isArray(data['@graph'])) {
      for (const item of data['@graph']) {
        if (item['@type'] === 'Recipe') {
          return item;
        }
      }
    }
    
    // Recursively check all object properties
    for (const key in data) {
      if (typeof data[key] === 'object' && data[key] !== null) {
        const recipe = findRecipeInJsonLd(data[key]);
        if (recipe) return recipe;
      }
    }
  }
  
  return null;
}

// Extract instructions from recipe data
function extractInstructions(recipe: any): string[] {
  if (!recipe.recipeInstructions) return [];
  
  // Handle string instructions
  if (typeof recipe.recipeInstructions === 'string') {
    return [recipe.recipeInstructions];
  }
  
  // Handle array of strings
  if (Array.isArray(recipe.recipeInstructions) && 
      typeof recipe.recipeInstructions[0] === 'string') {
    return recipe.recipeInstructions;
  }
  
  // Handle array of objects with text property
  if (Array.isArray(recipe.recipeInstructions) && 
      typeof recipe.recipeInstructions[0] === 'object') {
    return recipe.recipeInstructions.map(step => 
      step.text || step.description || ''
    ).filter(Boolean);
  }
  
  return [];
}

// Fallback parser for sites without structured data
function fallbackParser() {
  // Title - look for common patterns
  const possibleTitleElements = [
    document.querySelector('h1'),
    document.querySelector('.recipe-title'),
    document.querySelector('.entry-title'),
    document.querySelector('[itemprop="name"]'),
  ];
  
  let title = '';
  for (const element of possibleTitleElements) {
    if (element && element.textContent) {
      title = element.textContent.trim();
      break;
    }
  }
  
  if (!title) {
    title = document.title;
  }
  
  // Ingredients
  let ingredients: string[] = [];
  
  // Look for itemprops
  const ingredientElements = document.querySelectorAll('[itemprop="recipeIngredient"], [itemprop="ingredients"]');
  if (ingredientElements.length > 0) {
    ingredients = Array.from(ingredientElements).map(el => el.textContent?.trim() || '').filter(Boolean);
  } else {
    // Look for common ingredient list patterns
    const possibleIngredientLists = [
      document.querySelectorAll('.ingredients li'),
      document.querySelectorAll('.ingredient-list li'),
      document.querySelectorAll('.recipe-ingredients li'),
      document.querySelectorAll('ul.ingredients li'),
    ];
    
    for (const list of possibleIngredientLists) {
      if (list.length > 0) {
        ingredients = Array.from(list).map(el => el.textContent?.trim() || '').filter(Boolean);
        break;
      }
    }
  }
  
  // Instructions
  let instructions: string[] = [];
  
  // Look for itemprops
  const instructionElements = document.querySelectorAll('[itemprop="recipeInstructions"]');
  if (instructionElements.length > 0) {
    // Check if these are step elements or a container
    if (instructionElements.length === 1 && instructionElements[0].querySelectorAll('li, p, div').length > 1) {
      // It's likely a container, get steps from children
      const steps = instructionElements[0].querySelectorAll('li, p, div[itemprop="step"]');
      instructions = Array.from(steps).map(el => el.textContent?.trim() || '').filter(Boolean);
    } else {
      // Each element is a step
      instructions = Array.from(instructionElements).map(el => el.textContent?.trim() || '').filter(Boolean);
    }
  } else {
    // Look for common instruction patterns
    const possibleInstructionLists = [
      document.querySelectorAll('.instructions li'),
      document.querySelectorAll('.recipe-directions li'),
      document.querySelectorAll('.recipe-instructions li'),
      document.querySelectorAll('.directions li'),
      document.querySelectorAll('.steps li'),
    ];
    
    for (const list of possibleInstructionLists) {
      if (list.length > 0) {
        instructions = Array.from(list).map(el => el.textContent?.trim() || '').filter(Boolean);
        break;
      }
    }
    
    // If no list found, look for paragraphs in common containers
    if (instructions.length === 0) {
      const possibleInstructionContainers = [
        document.querySelector('.instructions'),
        document.querySelector('.recipe-directions'),
        document.querySelector('.recipe-instructions'),
        document.querySelector('.directions'),
        document.querySelector('.steps'),
      ];
      
      for (const container of possibleInstructionContainers) {
        if (container) {
          const paragraphs = container.querySelectorAll('p');
          if (paragraphs.length > 0) {
            instructions = Array.from(paragraphs).map(el => el.textContent?.trim() || '').filter(Boolean);
            break;
          }
        }
      }
    }
  }
  
  // If we have at least title + one of ingredients or instructions, return the data
  if (title && (ingredients.length > 0 || instructions.length > 0)) {
    return {
      title,
      ingredients,
      instructions,
      url: window.location.href
    };
  }
  
  return null;
}
