// Recipe site detection patterns
const recipePatterns = [
  /recipe/i,
  /cooking/i,
  /food/i,
  /allrecipes\.com/i,
  /foodnetwork\.com/i,
  /epicurious\.com/i,
  /seriouseats\.com/i,
  /bonappetit\.com/i,
  /simplyrecipes\.com/i,
  /tasty\.co/i,
  /eatingwell\.com/i,
  /cooking\.nytimes\.com/i,
  /taste\.com/i,
  /ingredient/i,
  /baking/i,
  /instruction/i
];

// HTML structure patterns common in recipe sites
const recipeStructureSelectors = [
  'article[itemtype*="Recipe"]',
  '[itemtype*="Recipe"]',
  '.recipe-ingredients',
  '.recipe-instructions',
  '.ingredients',
  '.directions',
  '.recipe-directions',
  '.recipe-method',
  '.preparation',
  '.wprm-recipe',
  '.tasty-recipe',
  '.recipe-content',
  '.recipe',
  'section.ingredients',
  'section.instructions'
];

// Check if the current page is likely a recipe page
async function isRecipePage(tabId) {
  try {
    // Check URL patterns first
    let tab = await chrome.tabs.get(tabId);
    if (recipePatterns.some(pattern => pattern.test(tab.url))) {
      return true;
    }

    // Check page content and HTML structure
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (selectors) => {
        // Check for recipe selectors in HTML structure
        for (const selector of selectors) {
          if (document.querySelector(selector)) {
            return true;
          }
        }

        // Check the page content for recipe-related terms
        const pageText = document.body.innerText.toLowerCase();
        const recipeKeywords = ['ingredients', 'instructions', 'recipe', 'preparation', 'cook time', 'prep time', 'serves', 'yield'];
        
        let keywordCount = 0;
        for (const keyword of recipeKeywords) {
          if (pageText.includes(keyword)) {
            keywordCount++;
          }
        }
        
        // If multiple recipe keywords are found, it's likely a recipe page
        return keywordCount >= 3;
      },
      args: [recipeStructureSelectors]
    });

    // Check if any script execution returned true
    return results.some(result => result.result === true);
  } catch (error) {
    console.error("Error detecting recipe page:", error);
    return false;
  }
}

// Update the extension icon based on page content
async function updateExtensionState(tabId) {
  try {
    const isRecipe = await isRecipePage(tabId);
    
    // Enable or disable the extension action based on whether it's a recipe page
    if (isRecipe) {
      chrome.action.enable(tabId);
    } else {
      chrome.action.disable(tabId);
    }
  } catch (error) {
    console.error("Error updating extension state:", error);
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act when the page is fully loaded
  if (changeInfo.status === 'complete') {
    updateExtensionState(tabId);
  }
});

// Listen for tab activation to check current tab
chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateExtensionState(tabId);
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractRecipe") {
    // When the user clicks the extension icon, extract the recipe
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "extractRecipe" });
      }
    });
  } else if (request.action === "generateMiseEnPlace") {
    // Proxy API requests to maintain extension origin
    handleMiseEnPlaceRequest(request.data, sendResponse);
    return true; // Required to use sendResponse asynchronously
  } else if (request.action === "checkRecipePage") {
    // Return if the current page is a recipe page
    isRecipePage(sender.tab.id).then(isRecipe => {
      sendResponse({ isRecipe });
    });
    return true; // Required to use sendResponse asynchronously
  }
  return true;
});

// Handle API requests to the backend
async function handleMiseEnPlaceRequest(recipeData, sendResponse) {
  try {
    // Backend URL - replace with your actual deployed backend URL
    const backendUrl = 'http://localhost:3000/api/mise-en-place';
    
    console.log('Making API request from background script with recipe:', recipeData.title);
    
    // Make the API request from the background script
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: recipeData.title,
        times: recipeData.times,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions
      })
    });
    
    if (!response.ok) {
      throw new Error(`Backend API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Send the response back to the content script
    sendResponse({ 
      success: true, 
      miseEnPlaceInstructions: data.miseEnPlaceInstructions 
    });
  } catch (error) {
    console.error("Error in background script when generating mise-en-place:", error);
    
    // Send error response back to content script
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
} 