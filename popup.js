// Popup script for Zillow Scraper

const AUTH_ENDPOINT = 'https://ypkmafuyutbjluvalmki.supabase.co/functions/v1/authenticate-api-key';

document.addEventListener('DOMContentLoaded', () => {
  const scrapeBtn = document.getElementById('scrapeBtn');
  const scrapeCurrentBtn = document.getElementById('scrapeCurrentBtn');
  const authBtn = document.getElementById('authBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const apiKeyInput = document.getElementById('apiKey');
  const authStatusDiv = document.getElementById('authStatus');
  const mainFeatures = document.getElementById('mainFeatures');
  const authSection = document.getElementById('authSection');
  const maxPagesInput = document.getElementById('maxPages');
  const statusDiv = document.getElementById('status');
  const listingCountEl = document.getElementById('listingCount');
  const listingUpdatedEl = document.getElementById('listingUpdated');

  let isAuthenticated = false;
  let userType = 'free'; // 'free' or 'premium'

  function showStatus(message, type = 'info') {
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
  }

  function clearStatus() {
    statusDiv.innerHTML = '';
  }

  function showAuthStatus(message, isAuthenticated) {
    authStatusDiv.innerHTML = `<div class="auth-status ${isAuthenticated ? 'authenticated' : 'unauthenticated'}">${message}</div>`;
  }

  function setListingSummary(count, lastUpdated) {
    const safeCount = Number.isFinite(count) ? count : 0;
    listingCountEl.textContent = `${safeCount.toLocaleString()} listing${safeCount === 1 ? '' : 's'} scraped`;
    if (lastUpdated) {
      const parsed = new Date(lastUpdated);
      listingUpdatedEl.textContent = `Last updated: ${isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString()}`;
    } else {
      listingUpdatedEl.textContent = 'Last updated: —';
    }
  }

  async function refreshListingSummary() {
    try {
      const result = await chrome.storage.local.get('zillowScrapedData');
      if (result.zillowScrapedData) {
        setListingSummary(result.zillowScrapedData.totalCount || 0, result.zillowScrapedData.lastUpdated);
      } else {
        setListingSummary(0, null);
      }
    } catch (error) {
      console.error('Error loading listing summary:', error);
      setListingSummary(0, null);
    }
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.zillowScrapedData) {
      const newValue = changes.zillowScrapedData.newValue;
      if (newValue) {
        setListingSummary(newValue.totalCount || 0, newValue.lastUpdated);
      } else {
        setListingSummary(0, null);
      }
    }
  });

  // Initialize summary display
  setListingSummary(0, null);

  // Check authentication with server
  async function checkAuthentication(apiKey) {
    try {
      const response = await fetch(AUTH_ENDPOINT, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,  // ← Change this from Authorization to X-API-Key
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Authentication data:', data);
        // Extract user type from response (check user.plan first, then fallback options)
        // Normalize to lowercase for consistency
        const plan = data.user?.plan || data.userType || data.user_type || data.subscription || 'free';
        const userType = plan.toLowerCase() === 'premium' ? 'premium' : 'free';
        return { success: true, data: { ...data, userType } };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
        const errorMessage = errorData.error || errorData.message || 'Invalid API key';
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Network error' };
    }
  }

  // Load API key from storage
  async function loadApiKey() {
    try {
      const result = await chrome.storage.local.get(['apiKey', 'isAuthenticated', 'userType']);
      if (result.apiKey && result.isAuthenticated) {
        // Check if we're still authenticated
        authSection.classList.add('hidden');
        showAuthStatus('<span class="loading"></span>Verifying stored key...', false);
        const authResult = await checkAuthentication(result.apiKey);
        if (authResult.success) {
          const detectedUserType = authResult.data.userType || result.userType || 'free';
          userType = detectedUserType;
          await chrome.storage.local.set({ userType: detectedUserType });
          setAuthenticated(true);
          // Don't show the API key in the input field when authenticated
          apiKeyInput.value = '';
        } else {
          setAuthenticated(false);
          await chrome.storage.local.remove(['apiKey', 'isAuthenticated', 'userType']);
          apiKeyInput.value = '';
        }
      } else {
        // Not authenticated, clear the input
        apiKeyInput.value = '';
        setAuthenticated(false);
        userType = 'free';
      }
    } catch (error) {
      console.error('Error loading API key:', error);
      setAuthenticated(false);
      userType = 'free';
    }
  }

  // Save API key to storage
  async function saveApiKey(apiKey, userTypeData) {
    try {
      await chrome.storage.local.set({ 
        apiKey: apiKey,
        isAuthenticated: true,
        userType: userTypeData || 'free'
      });
    } catch (error) {
      console.error('Error saving API key:', error);
    }
  }

  // Set authenticated state
  function setAuthenticated(authenticated, userTypeData = null) {
    isAuthenticated = authenticated;
    if (userTypeData) {
      userType = userTypeData;
    }
    if (authenticated) {
      // Hide auth section, show main features
      authSection.classList.add('hidden');
      mainFeatures.classList.remove('hidden');
      const statusText = userType === 'premium' ? '✓ Authenticated (Premium)' : '✓ Authenticated (Free - 10 items limit)';
      showAuthStatus(statusText, true);
      updateUpgradeCTA();
      refreshListingSummary();
    } else {
      // Show auth section, hide main features
      authSection.classList.remove('hidden');
      mainFeatures.classList.add('hidden');
      showAuthStatus('Not authenticated', false);
      setListingSummary(0, null);
      hideUpgradeCTA();
    }
  }


  // Get the active tab
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  // Check if authenticated before allowing actions
  function requireAuth() {
    if (!isAuthenticated) {
      showStatus('Please authenticate first', 'error');
      return false;
    }
    return true;
  }

  // Check free user limit
  async function checkFreeUserLimit() {
    if (userType === 'premium') {
      return { allowed: true };
    }

    try {
      const result = await chrome.storage.local.get('zillowScrapedData');
      const currentCount = result.zillowScrapedData?.totalCount || 0;
      const FREE_USER_LIMIT = 10;
      
      if (currentCount >= FREE_USER_LIMIT) {
        return { 
          allowed: false, 
          message: `Free users can only scrape ${FREE_USER_LIMIT} items total. You've reached the limit.`,
          currentCount,
          limit: FREE_USER_LIMIT
        };
      }
      
      return { allowed: true, currentCount, limit: FREE_USER_LIMIT };
    } catch (error) {
      console.error('Error checking limit:', error);
      return { allowed: true }; // Allow on error to not block users
    }
  }

  // Update upgrade CTA visibility
  function updateUpgradeCTA() {
    const upgradeCTA = document.getElementById('upgradeCTA');
    if (!upgradeCTA) return;

    if (userType === 'free') {
      upgradeCTA.classList.remove('hidden');
    } else {
      upgradeCTA.classList.add('hidden');
    }
  }

  // Hide upgrade CTA
  function hideUpgradeCTA() {
    const upgradeCTA = document.getElementById('upgradeCTA');
    if (upgradeCTA) {
      upgradeCTA.classList.add('hidden');
    }
  }

  // Authentication handler
  async function handleAuthentication() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showAuthStatus('Please enter an API key', false);
      return;
    }

    authBtn.disabled = true;
    authBtn.textContent = 'Authenticating...';
    apiKeyInput.disabled = true;
    authSection.classList.add('hidden');
    showAuthStatus('<span class="loading"></span>Checking authentication...', false);

    const result = await checkAuthentication(apiKey);
    
    if (result.success) {
      const detectedUserType = result.data.userType || 'free';
      await saveApiKey(apiKey, detectedUserType);
      setAuthenticated(true, detectedUserType);
      showStatus('Authentication successful!', 'success');
    } else {
      setAuthenticated(false);
      showAuthStatus(`Authentication failed: ${result.error}`, false);
      showStatus(`Authentication failed: ${result.error}`, 'error');
    }

    authBtn.disabled = false;
    authBtn.textContent = 'Authenticate';
    apiKeyInput.disabled = false;
    authSection.classList.remove('hidden');
  }

  // Authentication button
  authBtn.addEventListener('click', handleAuthentication);

  // Allow Enter key to authenticate
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAuthentication();
    }
  });

  // Settings button - open settings page
  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  });

  // Upgrade button - open upgrade page (you can customize this URL)
  const upgradeBtn = document.getElementById('upgradeBtn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
      // Replace with your actual upgrade URL
      chrome.tabs.create({ url: 'http://localhost:8080/settings' });
    });
  }

  // Scrape multiple pages
  scrapeBtn.addEventListener('click', async () => {
    if (!requireAuth()) return;
    
    // Check free user limit
    const limitCheck = await checkFreeUserLimit();
    if (!limitCheck.allowed) {
      showStatus(limitCheck.message, 'error');
      updateUpgradeCTA();
      return;
    }

    const maxPages = parseInt(maxPagesInput.value) || 5;
    const tab = await getActiveTab();

    if (!tab.url.includes('zillow.com')) {
      showStatus('Please navigate to Zillow.com first', 'error');
      return;
    }

    // Inject content script if needed
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (error) {
      // Script might already be injected
    }

    // Pass user type and limit info to content script
    const limitInfo = limitCheck.allowed ? { currentCount: limitCheck.currentCount || 0, limit: limitCheck.limit || 10 } : null;

    showStatus(`<span class="loading"></span>Starting scrape... This may take a while.`, 'info');

    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'scrape',
        maxPages: maxPages,
        userType: userType,
        limitInfo: limitInfo
      }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
          return;
        }

        if (response && response.success) {
          if (response.limitReached) {
            showStatus(`Free limit reached! You've scraped ${response.currentCount} items. Upgrade to continue.`, 'error');
            updateUpgradeCTA();
          } else {
            showStatus('Scraping started! Check the console for progress. The page will navigate automatically.', 'success');
          }
          
          // Poll for updates every 3 seconds
          const pollInterval = setInterval(async () => {
            try {
              const result = await chrome.storage.local.get('zillowScrapedData');
              if (result.zillowScrapedData) {
                const count = result.zillowScrapedData.totalCount || 0;
                const lastUpdated = result.zillowScrapedData.lastUpdated;
                const updateTime = new Date(lastUpdated).toLocaleTimeString();
                const limitMsg = userType === 'free' ? ` (Limit: ${limitCheck.limit || 10})` : '';
                showStatus(`Currently scraped: ${count} properties${limitMsg} (Updated: ${updateTime})`, 'info');
                
                // Check if limit reached during polling
                if (userType === 'free' && count >= (limitCheck.limit || 10)) {
                  clearInterval(pollInterval);
                  showStatus(`Free limit reached! You've scraped ${count} items. Upgrade to continue.`, 'error');
                  updateUpgradeCTA();
                }
              }
            } catch (error) {
              console.error('Polling error:', error);
            }
          }, 3000);
          
          // Stop polling after 5 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
          }, 300000);
        } else {
          showStatus('Failed to start scraping', 'error');
        }
      });
    } catch (error) {
      showStatus('Error: ' + error.message, 'error');
    }
  });

  // Scrape current page only
  scrapeCurrentBtn.addEventListener('click', async () => {
    if (!requireAuth()) return;
    
    // Check free user limit
    const limitCheck = await checkFreeUserLimit();
    if (!limitCheck.allowed) {
      showStatus(limitCheck.message, 'error');
      updateUpgradeCTA();
      return;
    }

    const tab = await getActiveTab();

    if (!tab.url.includes('zillow.com')) {
      showStatus('Please navigate to Zillow.com first', 'error');
      return;
    }

    showStatus(`<span class="loading"></span>Scraping current page...`, 'info');

    const limitInfo = limitCheck.allowed ? { currentCount: limitCheck.currentCount || 0, limit: limitCheck.limit || 10 } : null;

    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'scrapeCurrentPage',
        userType: userType,
        limitInfo: limitInfo
      }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
          return;
        }

        if (response && response.success) {
          if (response.limitReached) {
            showStatus(`Free limit reached! You've scraped ${response.currentCount} items. Upgrade to continue.`, 'error');
            updateUpgradeCTA();
          } else {
            showStatus(`Scraped ${response.count} properties from current page!`, 'success');
          }
        } else {
          showStatus('Error scraping page', 'error');
        }
      });
    } catch (error) {
      showStatus('Error: ' + error.message, 'error');
    }
  });



  // Initialize on popup open
  (async () => {
    // Load API key and check authentication
    await loadApiKey();
    
    // Load existing data count if authenticated
    await refreshListingSummary();

    if (isAuthenticated) {
      // Load user type from storage
      const result = await chrome.storage.local.get('userType');
      if (result.userType) {
        userType = result.userType;
        updateUpgradeCTA();
      }
      
      try {
        chrome.tabs.sendMessage((await getActiveTab()).id, {
          action: 'getData'
        }, (response) => {
          if (response && response.success && response.data) {
            const count = response.data.totalCount || 0;
            setListingSummary(count, response.data.lastUpdated);
            const lastUpdated = response.data.lastUpdated ? new Date(response.data.lastUpdated).toLocaleString() : '—';
            showStatus(`Found ${count} properties in storage (Updated: ${lastUpdated})`, 'info');
          }
        });
      } catch (error) {
        // Silently fail - not on Zillow page
      }
    }
  })();
});
