// Chrome Extension Manifest V3 Background Service Worker

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('LinkedIn Outreach Copilot installed successfully.');
    // Set initial default settings
    chrome.storage.sync.set({
      settings: {
        aiProvider: 'gemini',
        dailyQuota: 5,
        usedToday: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
        isPro: false,
      },
    });
  }
});

// Message listener for communication between content scripts and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendResponse({ status: 'PONG' });
  }
  return true;
});
