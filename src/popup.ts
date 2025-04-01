
document.addEventListener('DOMContentLoaded', () => {
  const extractButton = document.getElementById('extract-recipe');
  
  extractButton?.addEventListener('click', () => {
    // Send message to content script to extract recipe
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id!, 
        {action: 'extract_recipe'}, 
        (recipe) => {
          if (recipe) {
            // Open the recipe canvas with extracted data
            console.log('Recipe extracted:', recipe);
            // You might want to pass this to your existing RecipeCanvas component
          } else {
            console.log('No recipe detected');
            // Show a toast or error message
          }
        }
      );
    });
  });
});
