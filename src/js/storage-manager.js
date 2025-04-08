// LRU Cache Structure for Recipe Data Storage
const recipeCache = {
  // Metadata about all cached items
  metadata: {
    size: 0,
    maxSize: 4 * 1024 * 1024, // 4MB max size (leaving buffer)
    urls: [] // URLs in order of recent access (most recent at end)
  },
  // Actual content - each with a URL key
  items: {
    // 'url1': { content: 'AI text', lastAccessed: timestamp, size: byteSize }
  }
};

// Check current storage usage
function checkStorageUsage() {
  return new Promise((resolve) => {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      const megabytesUsed = bytesInUse / (1024 * 1024);
      console.log(`Current storage use: ${megabytesUsed.toFixed(2)} MB out of 5 MB`);
      
      // Check if approaching limit (80% of 5MB)
      if (bytesInUse > 0.8 * 5 * 1024 * 1024) {
        console.log("Warning: Storage limit approaching");
        // Trigger LRU cleanup if needed
        cleanupLRUCache();
      }
      
      resolve(bytesInUse);
    });
  });
}

// Access an item from cache (updates LRU order)
function accessCacheItem(url) {
  // Check if item exists
  if (recipeCache.items[url]) {
    // Update timestamp
    recipeCache.items[url].lastAccessed = Date.now();
    
    // Update LRU order (remove and add to end)
    const index = recipeCache.metadata.urls.indexOf(url);
    if (index > -1) {
      recipeCache.metadata.urls.splice(index, 1);
    }
    recipeCache.metadata.urls.push(url);
    
    // Save updated access info
    saveCache();
    
    return recipeCache.items[url].content;
  }
  return null;
}

// Add a new item to cache
function addToCacheWithLRU(url, content) {
  const contentSize = new Blob([content]).size;
  
  // Check if adding this would exceed max size
  if (contentSize + recipeCache.metadata.size > recipeCache.metadata.maxSize) {
    // Need to make room by removing oldest items
    makeRoomInCache(contentSize);
  }
  
  // Add the new item
  recipeCache.items[url] = {
    content: content,
    lastAccessed: Date.now(),
    size: contentSize
  };
  
  // Update size and LRU order
  recipeCache.metadata.size += contentSize;
  recipeCache.metadata.urls.push(url);
  
  // Save to persistent storage
  saveCache();
}

// Remove oldest items to make room
function makeRoomInCache(neededSpace) {
  while (recipeCache.metadata.size + neededSpace > recipeCache.metadata.maxSize 
         && recipeCache.metadata.urls.length > 0) {
    // Get oldest URL (first in array)
    const oldestUrl = recipeCache.metadata.urls[0];
    const removedSize = recipeCache.items[oldestUrl].size;
    
    console.log(`Removing from cache: ${oldestUrl}`);
    
    // Remove it
    delete recipeCache.items[oldestUrl];
    recipeCache.metadata.urls.shift();
    recipeCache.metadata.size -= removedSize;
  }
}

// Cleanup LRU cache when approaching storage limits
function cleanupLRUCache() {
  // If we have items to remove
  if (recipeCache.metadata.urls.length > 0) {
    // Remove the oldest 20% of items
    const itemsToRemove = Math.ceil(recipeCache.metadata.urls.length * 0.2);
    console.log(`Cleaning up LRU cache, removing ${itemsToRemove} oldest items`);
    
    for (let i = 0; i < itemsToRemove && recipeCache.metadata.urls.length > 0; i++) {
      const oldestUrl = recipeCache.metadata.urls[0];
      const removedSize = recipeCache.items[oldestUrl].size;
      
      // Remove it
      delete recipeCache.items[oldestUrl];
      recipeCache.metadata.urls.shift();
      recipeCache.metadata.size -= removedSize;
    }
    
    // Save updated cache
    saveCache();
  }
}

// Save the entire cache to chrome.storage
function saveCache() {
  chrome.storage.local.set({ recipeCache: recipeCache }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving cache:', chrome.runtime.lastError);
    }
  });
}

// Load cache from storage on startup
function loadCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['recipeCache'], (result) => {
      if (result.recipeCache) {
        // Copy the loaded cache to our variable
        Object.assign(recipeCache.metadata, result.recipeCache.metadata);
        Object.assign(recipeCache.items, result.recipeCache.items);
        console.log(`Loaded cache with ${recipeCache.metadata.urls.length} recipes`);
      } else {
        console.log('No existing cache found, starting fresh');
      }
      resolve();
    });
  });
}

// Primary function to get AI content - either from cache or API
function getRecipeAIContent(url, recipeData) {
  // Initialize cache if needed
  return loadCache().then(() => {
    // Check for cached content
    const cachedContent = accessCacheItem(url);
    if (cachedContent) {
      console.log(`Using cached AI content for: ${url}`);
      return Promise.resolve(cachedContent);
    } else {
      console.log(`Generating new AI content for: ${url}`);
      // Make API call via the background script
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { 
            action: "generateMiseEnPlace", 
            data: recipeData 
          },
          (response) => {
            // Check for messaging errors
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError);
            }
            
            if (response && response.success) {
              // Cache the new content before returning
              addToCacheWithLRU(url, response.miseEnPlaceInstructions);
              resolve(response.miseEnPlaceInstructions);
            } else {
              reject(new Error(response ? response.error : "Failed to generate mise-en-place instructions"));
            }
          }
        );
      });
    }
  });
}

// Initialize cache when module loads
loadCache().then(() => {
  console.log('Storage manager initialized');
  checkStorageUsage();
});

// Add functions to window for content script to access
window.recipeStorage = {
  getRecipeAIContent,
  loadCache,
  checkStorageUsage
}; 