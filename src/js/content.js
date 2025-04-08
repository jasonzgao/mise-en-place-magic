// Recipe extraction selectors
const selectors = {
  title: [
    'h1.recipe-title',
    'h1.entry-title',
    'h1.recipe-name',
    'h1[class*="title"]',
    '.recipe-title',
    '.recipe-header h1',
    'h1.heading-content',
    'h1'
  ],
  times: [
    '.recipe-meta-item-body',
    '.recipe-meta',
    '.recipe-meta-item',
    '.recipe-time',
    '.cook-and-prep-time',
    '.recipe__time',
    '.recipe-time-yield',
    '[class*="time"]',
    '.wprm-recipe-time-container',
    '.tasty-recipes-prep-time',
    '.tasty-recipes-cook-time',
    '.tasty-recipes-total-time'
  ],
  ingredients: [
    '.recipe-ingredients',
    '.ingredients',
    '.ingredient-lists',
    '.wprm-recipe-ingredients',
    '.tasty-recipes-ingredients',
    '.recipe__ingredient-items',
    '.recipe-ingredients-wrap',
    '.o-Ingredients',
    '[class*="ingredient"]',
    '[itemprop="recipeIngredient"]',
    'ul.ingredients'
  ],
  instructions: [
    '.recipe-instructions',
    '.recipe-directions',
    '.directions',
    '.preparation',
    '.wprm-recipe-instructions',
    '.tasty-recipes-instructions',
    '.recipe__steps',
    '.recipe-method',
    '.o-Method',
    '[class*="instruction"]',
    '[itemprop="recipeInstructions"]',
    'ol.preparation-steps',
    '.steps'
  ]
};

// Helper function to try multiple selectors until one works
function findElement(selectors) {
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements && elements.length > 0) {
      return elements;
    }
  }
  return null;
}

// Extract recipe data from the page
function extractRecipeData() {
  const recipeData = {
    title: "",
    times: "",
    ingredients: [],
    instructions: []
  };
  
  // Extract title
  const titleElements = findElement(selectors.title);
  if (titleElements && titleElements.length > 0) {
    recipeData.title = titleElements[0].textContent.trim();
  }
  
  // Extract times
  const timeElements = findElement(selectors.times);
  if (timeElements) {
    const timeTexts = [];
    timeElements.forEach(el => {
      const text = el.textContent.trim();
      if (text.toLowerCase().includes('time') || text.toLowerCase().includes('min') || 
          text.toLowerCase().includes('hour')) {
        timeTexts.push(text);
      }
    });
    recipeData.times = timeTexts.join(' | ');
  }
  
  // Extract ingredients
  const ingredientElements = findElement(selectors.ingredients);
  if (ingredientElements) {
    ingredientElements.forEach(container => {
      const items = container.querySelectorAll('li, p, div[class*="ingredient-item"]');
      if (items && items.length > 0) {
        items.forEach(item => {
          const text = item.textContent.trim();
          if (text && !recipeData.ingredients.includes(text)) {
            recipeData.ingredients.push(text);
          }
        });
      } else {
        // If no list items found, use the container text
        const text = container.textContent.trim();
        if (text) {
          // Split by newlines or other common separators
          const lines = text.split(/\r?\n|•/).filter(line => line.trim().length > 0);
          lines.forEach(line => {
            if (!recipeData.ingredients.includes(line.trim())) {
              recipeData.ingredients.push(line.trim());
            }
          });
        }
      }
    });
  }
  
  // Extract instructions
  const instructionElements = findElement(selectors.instructions);
  if (instructionElements) {
    instructionElements.forEach(container => {
      const items = container.querySelectorAll('li, p, [class*="step"]');
      if (items && items.length > 0) {
        items.forEach(item => {
          const text = item.textContent.trim();
          if (text && !recipeData.instructions.includes(text)) {
            recipeData.instructions.push(text);
          }
        });
      } else {
        // If no list items found, use the container text
        const text = container.textContent.trim();
        if (text) {
          // Split by newlines or numbers at the beginning of lines
          const lines = text.split(/\r?\n|(?:\d+\.\s*)/).filter(line => line.trim().length > 0);
          lines.forEach(line => {
            if (!recipeData.instructions.includes(line.trim())) {
              recipeData.instructions.push(line.trim());
            }
          });
        }
      }
    });
  }
  
  return recipeData;
}

// Generate mise-en-place instructions using the OpenAI API via background script
function generateMiseEnPlace(recipeData) {
  // Get the current URL as the cache key
  const url = window.location.href;
  
  // Use the storage manager to get recipe content
  return window.recipeStorage.getRecipeAIContent(url, recipeData).catch(error => {
    console.error("Promise rejected in generateMiseEnPlace:", error);
    
    // Return a friendly error message for the user
    return `
      MISE-EN-PLACE INSTRUCTIONS:
      
      Sorry, we couldn't generate custom mise-en-place instructions at this time.
      Here are some general tips:
      
      1. Read through the entire recipe first.
      2. Gather and measure all ingredients.
      3. Prep ingredients that require cutting, chopping, or other preparation.
      4. Group ingredients that will be added together.
      5. Arrange in order of use.
      
      Please try again later.
    `;
  });
}

// Create and show the canvas overlay
async function showRecipeCanvas(recipeData) {
  // First, create the overlay container if it doesn't exist
  let overlay = document.getElementById('recipe-canvas-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'recipe-canvas-overlay';
    document.body.appendChild(overlay);
  }
  
  // Show loading state first
  overlay.innerHTML = `
    <div class="recipe-canvas-content">
      <div class="recipe-canvas-header">
        <h1>${recipeData.title || 'Recipe'}</h1>
        <div class="recipe-times">${recipeData.times || ''}</div>
        <button id="close-recipe-canvas" class="close-button">×</button>
      </div>
      
      <div class="recipe-canvas-body">
        <div class="recipe-section">
          <h2>Ingredients</h2>
          <ul class="ingredients-list">
            ${recipeData.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
          </ul>
        </div>
        
        <div class="recipe-section mise-en-place">
          <h2>Mise-en-Place Guide</h2>
          <div class="mise-en-place-text">
            <div class="loading-indicator">
              <div class="spinner"></div>
              <p>Generating intelligent mise-en-place instructions...</p>
            </div>
          </div>
        </div>
        
        <div class="recipe-section">
          <h2>Instructions</h2>
          <ol class="instructions-list">
            ${recipeData.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
          </ol>
        </div>
      </div>
    </div>
  `;
  
  // Show the overlay
  overlay.classList.add('visible');
  
  // Add close button event listener
  document.getElementById('close-recipe-canvas').addEventListener('click', () => {
    overlay.classList.remove('visible');
  });
  
  // Close overlay when clicking outside of it
  overlay.addEventListener('click', (e) => {
    // Check if the click was directly on the overlay (not its children)
    if (e.target === overlay) {
      overlay.classList.remove('visible');
    }
  });
  
  // Add keyboard event listener to close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('visible')) {
      overlay.classList.remove('visible');
    }
  });
  
  try {
    // Generate mise-en-place instructions
    const miseEnPlace = await generateMiseEnPlace(recipeData);
    
    // Update the mise-en-place section with the generated content
    const miseEnPlaceElement = overlay.querySelector('.mise-en-place-text');
    miseEnPlaceElement.innerHTML = miseEnPlace;
  } catch (error) {
    console.error('Error updating mise-en-place content:', error);
    const miseEnPlaceElement = overlay.querySelector('.mise-en-place-text');
    miseEnPlaceElement.innerHTML = `
      <div class="error-message">
        <p>Sorry, we couldn't generate mise-en-place instructions. Please try again later.</p>
      </div>
    `;
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractRecipe") {
    const recipeData = extractRecipeData();
    showRecipeCanvas(recipeData);
  }
  return true;
});

// Create the floating chef hat button if on a recipe page
function createFloatingButton() {
  // Check if button already exists
  if (document.getElementById('chef-hat-button')) {
    return;
  }
  
  // Ask background script if this is a recipe page
  chrome.runtime.sendMessage({ action: "checkRecipePage" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error checking if recipe page:", chrome.runtime.lastError);
      return;
    }
    
    // Only add button if it's a recipe page
    if (response && response.isRecipe) {
      const button = document.createElement('button');
      button.id = 'chef-hat-button';
      button.title = 'Simplify Recipe';
      
      // Add the chef hat icon
      const img = document.createElement('img');
      img.src = chrome.runtime.getURL('src/images/icon128.png');
      img.alt = 'Chef Hat';
      button.appendChild(img);
      
      // Add click handler to show recipe canvas
      button.addEventListener('click', () => {
        const recipeData = extractRecipeData();
        showRecipeCanvas(recipeData);
      });
      
      // Add to page
      document.body.appendChild(button);
    }
  });
}

// Initialize the storage cache on load
window.addEventListener('load', () => {
  // Wait for storage manager to be available
  if (window.recipeStorage) {
    window.recipeStorage.loadCache().then(() => {
      console.log('Recipe cache initialized');
      createFloatingButton();
    });
  } else {
    // If storage manager isn't loaded yet, just create the button
    createFloatingButton();
  }
});

// Also check when DOM changes, as some sites load content dynamically
const observer = new MutationObserver((mutations) => {
  // Only check if our button doesn't exist yet
  if (!document.getElementById('chef-hat-button')) {
    createFloatingButton();
  }
});

// Start observing document for changes
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// Handle page visibility changes (e.g., when the tab becomes visible again)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Make sure our button is present when the page becomes visible again
    if (!document.getElementById('chef-hat-button')) {
      createFloatingButton();
    }
  }
});

// For debugging/testing only
console.log("Mise en Place Magic content script loaded"); 