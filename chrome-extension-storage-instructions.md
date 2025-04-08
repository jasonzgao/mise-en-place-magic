# Chrome Extension Recipe Data Storage Implementation Guide

## Overview
This guide outlines how to implement persistent storage for AI-generated content in a Chrome extension that scrapes recipe data. The goal is to avoid making redundant OpenAI API calls when a user revisits a page or refreshes the tab.

## Implementation Requirements

1. Use a Least Recently Used (LRU) cache strategy to manage storage efficiently
2. Store AI-generated content keyed by URL as unique identifier
3. Implement memory usage monitoring to stay within Chrome's storage limits
4. Clean up old entries when approaching storage limits

## Storage Solution

Use `chrome.storage.local` as the primary storage mechanism because:
- It's extension-specific (not tied to website domains)
- Has a 5MB quota for your entire extension
- Persists data until the extension is uninstalled
- Provides unified storage across all websites the extension operates on

## Core Implementation

### 1. Storage Structure

```javascript
// LRU Cache structure
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
```

### 2. Storage Monitoring

```javascript
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
```

### 3. LRU Cache Core Functions

```javascript
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
        recipeCache = result.recipeCache;
        console.log(`Loaded cache with ${recipeCache.metadata.urls.length} recipes`);
      } else {
        console.log('No existing cache found, starting fresh');
      }
      resolve();
    });
  });
}
```

### 4. Main Function for Getting AI Content

```javascript
// Primary function to get AI content - either from cache or API
async function getRecipeAIContent(url) {
  // Initialize cache if needed
  await loadCache();
  
  // Check for cached content
  const cachedContent = accessCacheItem(url);
  if (cachedContent) {
    console.log(`Using cached AI content for: ${url}`);
    return cachedContent;
  } else {
    console.log(`Generating new AI content for: ${url}`);
    // Make API call
    try {
      const content = await callOpenAI(/* your recipe data */);
      addToCacheWithLRU(url, content);
      return content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }
}
```

### 5. Integration with Extension

```javascript
// Initialize cache when extension loads
document.addEventListener('DOMContentLoaded', () => {
  loadCache().then(() => {
    console.log('Cache initialized');
  });
});

// When recipe is scraped and ready to generate content
async function handleRecipeData(recipeData) {
  const currentUrl = window.location.href;
  
  try {
    // Either get from cache or generate new
    const aiContent = await getRecipeAIContent(currentUrl);
    
    // Update your UI with the content
    displayAIContent(aiContent);
  } catch (error) {
    console.error('Failed to get AI content:', error);
    // Handle error in UI
  }
}

// Helper to create a unique ID from URL if needed
function createIdFromUrl(url) {
  // For simplicity, using the URL directly
  // Consider using a hash function for very long URLs
  return url;
}
```

## Implementation Steps

1. Add storage permission to your manifest.json:
   ```json
   "permissions": ["storage"]
   ```

2. Implement the cache system in a dedicated file (e.g., `storage-manager.js`)

3. Integrate with your existing code:
   - Import/load the storage manager
   - Call `getRecipeAIContent()` instead of directly calling OpenAI's API
   - Make sure to handle both cached and fresh content scenarios

4. Test with multiple recipe sites to verify persistence

## Best Practices

1. Add version information to your cache in case your AI prompt format changes
2. Consider adding a "force refresh" button for users who want new content
3. Add error handling if storage limits are reached
4. Monitor performance impact of storage operations

This implementation will significantly reduce API calls by storing generated content per URL, while efficiently managing memory usage through an LRU cache strategy.
