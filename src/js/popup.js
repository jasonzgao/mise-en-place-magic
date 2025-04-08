// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', () => {
  const simplifyButton = document.getElementById('simplify-button');
  const statusElement = document.getElementById('status');
  
  // Set initial state
  simplifyButton.disabled = true;
  simplifyButton.classList.add('disabled');
  statusElement.textContent = 'Checking page for recipe content...';
  
  // Check if current tab is a recipe page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      updateStatus('Could not access the current tab.', true);
      return;
    }
    
    const currentTab = tabs[0];
    
    // Execute script to check if this is a recipe page
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: isRecipePage
    }).then((results) => {
      const isRecipe = results && results[0] && results[0].result;
      
      if (isRecipe) {
        // It's a recipe page, enable the button
        enableButton();
        statusElement.textContent = 'Recipe detected! Click the button to simplify.';
        statusElement.classList.add('status-success');
      } else {
        // Not a recipe page, keep the button disabled
        updateStatus('No recipe detected on this page.', true);
      }
    }).catch((error) => {
      // Handle any errors
      console.error('Error checking if page is a recipe:', error);
      updateStatus('Could not check page content.', true);
    });
  });
  
  // Add click handler for the simplify button
  simplifyButton.addEventListener('click', () => {
    // Show loading state
    simplifyButton.disabled = true;
    simplifyButton.textContent = 'Processing...';
    statusElement.textContent = 'Extracting recipe data...';
    statusElement.classList.remove('status-error');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        updateStatus('Could not access the current tab.', true);
        resetButton();
        return;
      }
      
      const currentTab = tabs[0];
      
      try {
        // Send message to extract and display the recipe
        chrome.tabs.sendMessage(currentTab.id, { action: "extractRecipe" });
        
        // Close the popup
        window.close();
      } catch (error) {
        console.error('Error sending message to content script:', error);
        updateStatus('Error processing recipe. Please try again.', true);
        resetButton();
      }
    });
  });
  
  // Helper function to update status message
  function updateStatus(message, isError = false) {
    statusElement.textContent = message;
    if (isError) {
      statusElement.classList.add('status-error');
    } else {
      statusElement.classList.remove('status-error');
    }
  }
  
  // Helper function to enable the button
  function enableButton() {
    simplifyButton.disabled = false;
    simplifyButton.classList.remove('disabled');
  }
  
  // Helper function to reset the button
  function resetButton() {
    simplifyButton.disabled = false;
    simplifyButton.textContent = 'Simplify Recipe';
  }
});

// Function to determine if the current page is a recipe page
function isRecipePage() {
  try {
    // Common recipe page selectors
    const recipeSelectors = [
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
    
    // Check for recipe selectors in HTML structure
    for (const selector of recipeSelectors) {
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
  } catch (error) {
    console.error('Error in isRecipePage function:', error);
    return false;
  }
} 