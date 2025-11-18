
// Prevent multiple script loading
if (window.zillowScraper) {
  console.log('Zillow Scraper already loaded, skipping re-initialization');
} else {



  class ZillowScraper {
    constructor () {
      this.properties = [];
      this.currentPage = 1;
      this.isScraping = false;
      this.userType = 'free'; // 'free' or 'premium'
      this.limitInfo = { currentCount: 0, limit: 10 };
    }

    // Extract property data from the page
    extractProperties () {
      const listings = [];

      const results = Array.from(document.querySelectorAll('#grid-search-results > ul > li')).map(li => ({
        address: li.querySelector('[data-test="property-card-address"]')?.innerText.trim(),
        price: li.querySelector('[data-test="property-card-price"]')?.innerText.trim(),
        link: li.querySelector('a')?.href
      }));
      console.log(results);
      console.log(`Found ${ results.length } listings`);

      // Try finding articles directly first (more reliable)
      const articles = document.querySelectorAll("#grid-search-results article[data-testid='property-card']");

      if (articles.length > 0) {
        console.log(`Found ${ articles.length } property articles directly`);
        articles.forEach((article, index) => {
          try {
            const property = {
              id: article.id || `property-${ index }`,
              address: this.getAddress(article),
              price: this.getPrice(article),
              link: this.getLink(article),
              beds: this.getBeds(article),
              baths: this.getBaths(article),
              sqft: this.getSqft(article),
              propertyType: this.getPropertyType(article),
              realtor: this.getRealtor(article),
              imageUrl: this.getImageUrl(article)
            };

            listings.push(property);
          } catch (error) {
            console.error(`Error extracting property ${ index }:`, error);
          }
        });
      } else {
        // Fallback: try finding through li elements
        console.log('No articles found directly, trying through li elements');
        const propertyCards = document.querySelectorAll("#grid-search-results > ul > li");

        propertyCards.forEach((card, index) => {
          try {
            // Find the article element within the li
            const article = card.querySelector('article[data-testid="property-card"]');
            if (!article) {
              // Check if this li has any meaningful content
              const hasContent = card.querySelector('article, a[href*="zillow.com"], address');
              if (!hasContent) {
                // Skip empty li elements
                return;
              }
              // If it has content but no article, try to extract from the card itself
              console.warn(`No article found in card ${ index }, but card has content. Attempting extraction...`);
              // Could add fallback extraction here if needed
              return;
            }

            const property = {
              id: article.id || `property-${ index }`,
              address: this.getAddress(article),
              price: this.getPrice(article),
              link: this.getLink(article),
              beds: this.getBeds(article),
              baths: this.getBaths(article),
              sqft: this.getSqft(article),
              propertyType: this.getPropertyType(article),
              realtor: this.getRealtor(article),
              imageUrl: this.getImageUrl(article)
            };

            listings.push(property);
          } catch (error) {
            console.error(`Error extracting property ${ index }:`, error);
          }
        });
      }

      console.log(`Extracted ${ listings.length } properties`);
      return listings;
    }

    getAddress (card) {
      const addressEl = card.querySelector('address');
      return addressEl ? addressEl.textContent.trim() : 'N/A';
    }

    getPrice (card) {
      const priceEl = card.querySelector('[data-test="property-card-price"]');
      return priceEl ? priceEl.textContent.trim() : 'N/A';
    }

    getLink (card) {
      const linkEl = card.querySelector('a[data-test="property-card-link"]');
      return linkEl ? linkEl.href : '';
    }

    getBeds (card) {
      const detailsList = card.querySelectorAll('[data-testid="property-card-details"] li');
      for (const li of detailsList) {
        const abbr = li.querySelector('abbr');
        if (abbr && abbr.textContent.toLowerCase().includes('bd')) {
          const bold = li.querySelector('b');
          return bold ? bold.textContent.trim() : 'N/A';
        }
      }
      return 'N/A';
    }

    getBaths (card) {
      const detailsList = card.querySelectorAll('[data-testid="property-card-details"] li');
      for (const li of detailsList) {
        const abbr = li.querySelector('abbr');
        if (abbr && (abbr.textContent.toLowerCase().includes('ba') || abbr.textContent.toLowerCase().includes('bath'))) {
          const bold = li.querySelector('b');
          return bold ? bold.textContent.trim() : 'N/A';
        }
      }
      return 'N/A';
    }

    getSqft (card) {
      const detailsList = card.querySelectorAll('[data-testid="property-card-details"] li');
      for (const li of detailsList) {
        const abbr = li.querySelector('abbr');
        if (abbr && abbr.textContent.toLowerCase().includes('sqft')) {
          const bold = li.querySelector('b');
          return bold ? bold.textContent.trim() : 'N/A';
        }
      }
      return 'N/A';
    }

    getPropertyType (card) {
      try {
        const detailsEl = card.querySelector('[data-testid="property-card-details"]');
        if (!detailsEl) return 'N/A';

        // Property type is in the parent div after the details list
        const parentDiv = detailsEl.parentElement;
        if (!parentDiv) return 'N/A';

        const text = parentDiv.textContent;
        // Look for text after the dash (e.g., "- New construction")
        const match = text.match(/-\s*(.+?)(?:\s*$)/);
        if (match) {
          return match[ 1 ].trim();
        }

        // Alternative: get all text and extract what's after the details
        const detailsText = detailsEl.textContent;
        const fullText = parentDiv.textContent.trim();
        const afterDetails = fullText.replace(detailsText, '').trim();
        if (afterDetails.startsWith('-')) {
          return afterDetails.substring(1).trim();
        }

        return 'N/A';
      } catch (error) {
        return 'N/A';
      }
    }

    getRealtor (card) {
      const realtorEl = card.querySelector('.StyledPropertyCardDataArea-c11n-8-109-3__sc-10i1r6-0.tCgTM');
      return realtorEl ? realtorEl.textContent.trim() : 'N/A';
    }

    getImageUrl (card) {
      // Get the first visible image (not hidden ones in carousel)
      const images = card.querySelectorAll('img');
      for (const img of images) {
        // Prefer the main image, check if it's in a visible carousel slide
        const slide = img.closest('[aria-hidden="false"]');
        if (slide || !img.closest('[aria-hidden="true"]')) {
          // Check if it's a webp source first, otherwise use img src
          const picture = img.closest('picture');
          if (picture) {
            const source = picture.querySelector('source[type="image/webp"]');
            if (source && source.srcset) {
              return source.srcset.split(' ')[ 0 ]; // Get first URL from srcset
            }
          }
          return img.src || '';
        }
      }
      // Fallback to first image if no visible one found
      return images.length > 0 ? images[ 0 ].src : '';
    }

    // Check if there's a next page
    hasNextPage () {
      // Look for pagination buttons using rel="next"
      const nextButton = document.querySelector('a[rel="next"]');
      if (nextButton) {
        // Check if button is disabled
        const isDisabled = nextButton.getAttribute('aria-disabled') === 'true' ||
          nextButton.hasAttribute('disabled') ||
          nextButton.classList.contains('disabled');
        return !isDisabled;
      }
      return false;
    }

    // Get next page URL
    getNextPageUrl () {
      const nextButton = document.querySelector('a[rel="next"]');
      if (nextButton) {
        // Check if button is disabled
        const isDisabled = nextButton.getAttribute('aria-disabled') === 'true' ||
          nextButton.hasAttribute('disabled') ||
          nextButton.classList.contains('disabled');
        if (!isDisabled) {
          return nextButton.href;
        }
      }
      return null;
    }

    // Scrape current page
    async scrapeCurrentPage (saveToBackendAfter = true) {
      console.log('Scraping page:', this.currentPage);
      const properties = this.extractProperties();

      // Check free user limit before adding properties
      if (this.userType === 'free') {
        const currentTotal = this.properties.length;
        const remaining = this.limitInfo.limit - currentTotal;

        if (remaining <= 0) {
          console.log(`Free user limit reached (${ this.limitInfo.limit } items). Stopping scrape.`);
          return { properties: [], limitReached: true, currentCount: currentTotal };
        }

        // Only take up to the remaining limit
        if (properties.length > remaining) {
          console.log(`Free user limit: Only taking ${ remaining } of ${ properties.length } properties`);
          properties.splice(remaining);
        }
      }

      this.properties = this.properties.concat(properties);
      console.log(`Found ${ properties.length } properties on page ${ this.currentPage }. Total: ${ this.properties.length }`);

      // Check if limit reached after adding
      const limitReached = this.userType === 'free' && this.properties.length >= this.limitInfo.limit;

      // Save to storage (always save locally)
      await this.saveToStorage();

      // Only save to backend if explicitly requested (for single page scraping)
      if (saveToBackendAfter) {
        await this.saveToBackend();
      }

      return { properties, limitReached, currentCount: this.properties.length };
    }

    // Navigate to next page
    async goToNextPage () {
      const nextUrl = this.getNextPageUrl();
      if (nextUrl) {
        window.location.href = nextUrl;
        return true;
      }
      return false;
    }

    // Scrape multiple pages
    async scrapeMultiplePages (maxPages = 1, userTypeData = 'free', limitInfoData = null) {
      // Update user type and limit info
      this.userType = userTypeData || 'free';
      if (limitInfoData) {
        this.limitInfo = limitInfoData;
      }

      // Save max pages to session storage
      sessionStorage.setItem('scrapeMaxPages', maxPages.toString());
      sessionStorage.setItem('userType', this.userType);
      if (limitInfoData) {
        sessionStorage.setItem('limitInfo', JSON.stringify(limitInfoData));
      }

      // Load existing data from storage
      await this.loadFromStorage();

      // Update limit info based on current storage count for free users
      if (this.userType === 'free') {
        this.limitInfo.currentCount = this.properties.length;
        // Recalculate remaining limit
        const remaining = this.limitInfo.limit - this.limitInfo.currentCount;
        if (remaining <= 0) {
          console.log(`Free user limit already reached (${ this.limitInfo.limit } items). Cannot scrape more.`);
          this.isScraping = false;
          return { properties: this.properties, limitReached: true, currentCount: this.properties.length };
        }
      }

      // Get current page number from session storage or default to 1
      const currentPageNum = parseInt(sessionStorage.getItem('scrapePageNum') || '1');

      if (this.isScraping) {
        console.log('Already scraping...');
        return;
      }

      this.isScraping = true;
      console.log(`Starting multi-page scrape (max ${ maxPages } pages, current page: ${ currentPageNum }, user type: ${ this.userType })`);

      // Wait for content to load
      await this.waitForContent();

      // Scroll to load all properties
      await this.hydrate();

      console.log(`Scraping page ${ currentPageNum }...`);

      // Scrape current page (don't save to backend yet - accumulate locally)
      const scrapeResult = await this.scrapeCurrentPage(false);
      const pageProperties = scrapeResult.properties || [];
      const limitReached = scrapeResult.limitReached || false;

      console.log(`Page ${ currentPageNum } complete. Found ${ pageProperties.length } properties. Total: ${ this.properties.length }`);

      // If limit reached, stop scraping
      if (limitReached) {
        console.log(`Free user limit reached! Stopping scrape at ${ this.properties.length } items.`);
        console.log('All listings stored locally. Now saving to backend...');

        // Save all accumulated listings to backend
        await this.saveToBackend();

        // Clear session storage
        sessionStorage.removeItem('scrapePageNum');
        sessionStorage.removeItem('scrapeMaxPages');
        sessionStorage.removeItem('userType');
        sessionStorage.removeItem('limitInfo');
        this.isScraping = false;

        console.log('Multi-page scrape stopped due to free user limit.');
        return { properties: this.properties, limitReached: true, currentCount: this.properties.length };
      }

      // Check if there's a next page and we haven't reached max
      if (currentPageNum < maxPages && this.hasNextPage()) {
        const nextUrl = this.getNextPageUrl();
        if (nextUrl) {
          console.log(`Navigating to page ${ currentPageNum + 1 }: ${ nextUrl }`);

          // Save next page number
          sessionStorage.setItem('scrapePageNum', (currentPageNum + 1).toString());

          // Wait before navigating
          await this.delay(2000);

          // Navigate to next page
          window.location.href = nextUrl;

          // The script will re-run on the new page and continue from here
          return;
        } else {
          console.log('No next page URL found');
        }
      } else {
        console.log(`Scraping complete! Processed ${ currentPageNum } pages, found ${ this.properties.length } total properties.`);
        console.log('All listings stored locally. Now saving to backend...');

        // Save all accumulated listings to backend after all pages are scraped
        await this.saveToBackend();

        // Clear session storage
        sessionStorage.removeItem('scrapePageNum');
        sessionStorage.removeItem('scrapeMaxPages');
        sessionStorage.removeItem('userType');
        sessionStorage.removeItem('limitInfo');
        this.isScraping = false;

        console.log('Multi-page scrape fully complete!');
      }

      return { properties: this.properties, limitReached: false, currentCount: this.properties.length };
    }

    // Scroll to load all properties (hydrate)
    async hydrate () {
      console.log('Hydrating property list via scrolling...');
      await this.scrollToBottom();
    }

    // Wait for content to load on the page
    async waitForContent () {
      // Wait for property articles to appear and stabilize
      let attempts = 0;
      let lastCount = 0;
      let stableCount = 0;
      const maxAttempts = 30; // Wait up to 15 seconds (30 * 500ms)

      while (attempts < maxAttempts) {
        // Check for articles directly (what we actually extract)
        const articles = document.querySelectorAll("#grid-search-results article[data-testid='property-card']");
        const currentCount = articles.length;

        if (currentCount > 0) {
          // If count is stable for 2 checks, assume all properties are loaded
          if (currentCount === lastCount) {
            stableCount++;
            if (stableCount >= 2) {
              console.log(`Found ${ currentCount } property articles (stable)`);
              return;
            }
          } else {
            stableCount = 0;
            console.log(`Found ${ currentCount } property articles (loading...)`);
          }
          lastCount = currentCount;
        }

        await this.delay(500);
        attempts++;
      }

      // Final count
      const finalArticles = document.querySelectorAll("#grid-search-results article[data-testid='property-card']");
      console.log(`Finished waiting. Found ${ finalArticles.length } property articles`);
    }

    waitForPageLoad () {
      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', resolve);
        }
      });
    }

    delay (ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Scroll to bottom of page to load all properties
    async scrollToBottom () {
      console.log('Scrolling to load all properties...');

      const isScrollable = (el) => el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;

      // Prefer scrolling the results container if present; fallback to document
      let resultsContainer = document.querySelector('[data-testid="search-page-list-container"]') ||
        document.querySelector('.search-page-list-container') ||
        document.scrollingElement || document.documentElement || document.body;

      /**
       * on small screen zillow seems to remove the srollable on the results container 
       * and let the window/html have the scrollable state so lets use the window as 
       * the result container to make the scrolling work
       */
      if (!isScrollable(resultsContainer)) {
        resultsContainer = window;
      }

      const getScrollHeight = () => (resultsContainer === window ? document.body.scrollHeight : resultsContainer.scrollHeight);
      const getScrollTop = () => (resultsContainer === window ? (window.pageYOffset || document.documentElement.scrollTop) : resultsContainer.scrollTop);

      const scrollToTarget = (top) => {
        if (resultsContainer === window || resultsContainer === document.scrollingElement) {
          window.scrollTo({ top, behavior: 'smooth' });
        } else {
          resultsContainer.scrollTo({ top, behavior: 'smooth' });
        }
      };

      let lastHeight = getScrollHeight();
      let scrollAttempts = 0;
      const maxScrollAttempts = 30;
      const initialCardCount = document.querySelectorAll("#grid-search-results > ul > li").length;

      console.log(`Initial property cards found: ${ initialCardCount }`);

      const scrollStep = 1000; // pixels per scroll (faster)
      const scrollDelay = 1200; // wait time between scrolls (ms)

      while (scrollAttempts < maxScrollAttempts) {
        // Get current scroll position
        const currentScroll = getScrollTop();

        // Scroll incrementally (smooth scroll)
        const targetScroll = Math.min(currentScroll + scrollStep, getScrollHeight());

        scrollToTarget(targetScroll);

        // Wait longer for content to load and scroll animation to complete
        await this.delay(scrollDelay);

        // Try clicking any visible "Load more/See more" buttons that reveal more results
        const loadMore = Array.from(document.querySelectorAll('button, a')).find(el => /see more|load more/i.test(el.textContent || ''));
        if (loadMore) {
          try { loadMore.click(); } catch (_) { }
          await this.delay(1200);
        }

        // Check how many cards we have now
        const currentCardCount = document.querySelectorAll("#grid-search-results > ul > li").length;

        // Check if page height changed
        const newHeight = getScrollHeight();
        if (newHeight === lastHeight && targetScroll >= getScrollHeight() - 100) {
          // No new content loaded and we're at the bottom
          console.log('Reached bottom of page');
          break;
        }

        lastHeight = newHeight;
        scrollAttempts++;
        console.log(`Scroll ${ scrollAttempts }: Position ${ Math.round(targetScroll) }px, Height ${ newHeight }px, Cards ${ currentCardCount }`);

        // If we're at the bottom, scroll back to top
        if (targetScroll >= getScrollHeight() - 100) {
          break;
        }
      }

      const finalCardCount = document.querySelectorAll("#grid-search-results > ul > li").length;
      console.log(`Final property cards found: ${ finalCardCount } (was ${ initialCardCount })`);

      // Scroll back to top smoothly
      scrollToTarget(0);
      await this.delay(2000);

      // Wait additional time for any remaining properties to render
      console.log('Waiting for properties to fully render...');
      await this.delay(4000);

      console.log(`Finished scrolling. Made ${ scrollAttempts } scroll attempts.`);
    }

    async saveToStorage () {
      try {
        const data = {
          properties: this.properties,
          totalCount: this.properties.length,
          lastUpdated: new Date().toISOString()
        };
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ zillowScrapedData: data }, () => {
            const err = chrome.runtime.lastError;
            if (err) {
              reject(new Error(err.message));
            } else {
              resolve();
            }
          });
        });
        console.log(`Data saved to storage (count: ${ data.totalCount })`);
      } catch (error) {
        console.error('Error saving to storage:', error);
      }
    }

    async loadFromStorage () {
      try {
        const result = await new Promise((resolve, reject) => {
          chrome.storage.local.get('zillowScrapedData', (items) => {
            const err = chrome.runtime.lastError;
            if (err) {
              reject(new Error(err.message));
            } else {
              resolve(items);
            }
          });
        });
        if (result.zillowScrapedData) {
          this.properties = result.zillowScrapedData.properties;
          return result.zillowScrapedData;
        }
      } catch (error) {
        console.error('Error loading from storage:', error);
      }
      return null;
    }

    async saveToBackend () {
      const SAVE_LISTINGS_ENDPOINT = 'https://ypkmafuyutbjluvalmki.supabase.co/functions/v1/save-listings';

      try {
        // Get stored API key
        const result = await new Promise((resolve, reject) => {
          chrome.storage.local.get([ 'apiKey' ], (items) => {
            const err = chrome.runtime.lastError;
            if (err) {
              reject(new Error(err.message));
            } else {
              resolve(items);
            }
          });
        });

        if (!result.apiKey) {
          console.error('API key not found. Cannot save to backend.');
          return false;
        }

        // Get listings from storage (use the most up-to-date data)
        const dataResult = await this.loadFromStorage();
        if (!dataResult || !dataResult.properties || dataResult.properties.length === 0) {
          console.log('No listings to save to backend.');
          return false;
        }

        const listings = dataResult.properties;

        // Remove duplicates before sending to backend to avoid ON CONFLICT issues
        const uniqueListings = [];
        const seenKeys = new Set();

        listings.forEach((listing) => {
          const normalizedId = (listing.id || '').toString().trim();
          const normalizedLink = (listing.link || '').trim();
          const normalizedAddress = (listing.address || '').trim();

          const keyParts = [ normalizedId, normalizedLink, normalizedAddress ].filter(Boolean);
          if (keyParts.length === 0) {
            // Fall back to stringified content if we have no identifying fields
            keyParts.push(JSON.stringify(listing));
          }

          const dedupeKey = keyParts.join('|');
          if (!seenKeys.has(dedupeKey)) {
            seenKeys.add(dedupeKey);
            uniqueListings.push(listing);
          }
        });

        if (uniqueListings.length < listings.length) {
          console.log(`Removed ${ listings.length - uniqueListings.length } duplicate listings before saving.`);
        }

        // Get current page URL as sourceUrl
        const sourceUrl = window.location.href || '';

        console.log(`Saving ${ uniqueListings.length } listings to backend...`);

        const response = await fetch(SAVE_LISTINGS_ENDPOINT, {
          method: 'POST',
          headers: {
            'X-API-Key': result.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            listings: uniqueListings,
            sourceUrl: sourceUrl
          })
        });

        if (response.ok) {
          const data = await response.json();
          const savedCount = data.saved || uniqueListings.length;
          console.log(`Successfully saved ${ savedCount } listings to backend!`);

          // Clear data from storage after successful save
          this.properties = [];
          await new Promise((resolve, reject) => {
            chrome.storage.local.remove('zillowScrapedData', () => {
              const err = chrome.runtime.lastError;
              if (err) {
                reject(new Error(err.message));
              } else {
                resolve();
              }
            });
          });
          console.log('Cleared scraped data from local storage after successful save.');

          return true;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to save listings' }));
          const errorMessage = errorData.error || errorData.message || 'Failed to save listings';
          console.error('Error saving listings:', errorMessage);
          return false;
        }
      } catch (error) {
        console.error('Error saving to backend:', error.message || 'Network error');
        return false;
      }
    }

    async clearData () {
      try {
        this.properties = [];
        await new Promise((resolve, reject) => {
          chrome.storage.local.remove('zillowScrapedData', () => {
            const err = chrome.runtime.lastError;
            if (err) {
              reject(new Error(err.message));
            } else {
              resolve();
            }
          });
        });
        sessionStorage.removeItem('scrapePageNum');
        sessionStorage.removeItem('scrapeMaxPages');
        console.log('Scraped data and state cleared');
        return true;
      } catch (error) {
        console.error('Error clearing data:', error);
        return false;
      }
    }

    exportToCSV () {
      if (this.properties.length === 0) {
        return 'No data to export';
      }

      // Define fixed column order to ensure consistency
      const columnOrder = [ 'address', 'baths', 'beds', 'id', 'imageUrl', 'link', 'price', 'propertyType', 'realtor', 'sqft' ];

      // Create headers
      const headers = columnOrder.join(',');

      // Create rows with consistent column order
      const rows = this.properties.map(prop => {
        return columnOrder.map(key => {
          const value = prop[ key ] !== undefined ? prop[ key ] : '';
          // Escape quotes and wrap in quotes
          const escapedValue = String(value).replace(/"/g, '""');
          return `"${ escapedValue }"`;
        }).join(',');
      });

      return [ headers, ...rows ].join('\n');
    }

    downloadCSV () {
      const csv = this.exportToCSV();
      const blob = new Blob([ csv ], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zillow_properties_${ Date.now() }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    downloadJSON () {
      const json = JSON.stringify(this.properties, null, 2);
      const blob = new Blob([ json ], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zillow_properties_${ Date.now() }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  // Create global scraper instance
  window.zillowScraper = new ZillowScraper();

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
      const maxPages = request.maxPages || 1;
      const userType = request.userType || 'free';
      const limitInfo = request.limitInfo || { currentCount: 0, limit: 10 };

      // Update scraper with user type and limit info
      window.zillowScraper.userType = userType;
      window.zillowScraper.limitInfo = limitInfo;

      // Respond immediately that we started
      sendResponse({ success: true, message: 'Scraping started' });

      // Start scraping in the background
      window.zillowScraper.scrapeMultiplePages(maxPages, userType, limitInfo)
        .then(result => {
          const properties = result.properties || [];
          const limitReached = result.limitReached || false;
          const currentCount = result.currentCount || properties.length;
          console.log(`Scraping complete: ${ properties.length } properties${ limitReached ? ' (limit reached)' : '' }`);
          if (limitReached) {
            console.log(`Free user limit reached at ${ currentCount } items`);
          }
        })
        .catch(error => {
          console.error('Scraping error:', error);
        });

      return false; // Not keeping the channel open
    }

    if (request.action === 'getData') {
      window.zillowScraper.loadFromStorage()
        .then(data => {
          sendResponse({ success: true, data: data });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === 'export') {
      if (request.format === 'csv') {
        window.zillowScraper.downloadCSV();
      } else if (request.format === 'json') {
        window.zillowScraper.downloadJSON();
      }
      sendResponse({ success: true });
    }

    if (request.action === 'scrapeCurrentPage') {
      const userType = request.userType || 'free';
      const limitInfo = request.limitInfo || { currentCount: 0, limit: 10 };

      // Update scraper with user type and limit info
      window.zillowScraper.userType = userType;
      window.zillowScraper.limitInfo = limitInfo;

      // Load existing data to get accurate count
      window.zillowScraper.loadFromStorage()
        .then(() => {
          // Update limit info based on current storage
          if (userType === 'free') {
            window.zillowScraper.limitInfo.currentCount = window.zillowScraper.properties.length;
          }

          return window.zillowScraper.scrapeCurrentPage();
        })
        .then(result => {
          const properties = result.properties || [];
          const limitReached = result.limitReached || false;
          const currentCount = result.currentCount || properties.length;
          sendResponse({
            success: true,
            count: properties.length,
            limitReached: limitReached,
            currentCount: currentCount
          });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (request.action === 'clearData') {
      window.zillowScraper.clearData()
        .then(ok => {
          sendResponse({ success: ok });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
  });

  console.log('Zillow Scraper loaded');

  // Check if we're in the middle of a multi-page scrape and continue
  (async () => {
    // Wait a bit for page to fully load
    setTimeout(async () => {
      const pageNum = sessionStorage.getItem('scrapePageNum');
      if (pageNum) {
        console.log(`Resuming multi-page scrape from page ${ pageNum }`);
        try {
          const maxPages = sessionStorage.getItem('scrapeMaxPages') || 1;
          const userType = sessionStorage.getItem('userType') || 'free';
          const limitInfoStr = sessionStorage.getItem('limitInfo');
          const limitInfo = limitInfoStr ? JSON.parse(limitInfoStr) : { currentCount: 0, limit: 10 };

          window.zillowScraper.scrapeMultiplePages(parseInt(maxPages), userType, limitInfo);
        } catch (error) {
          console.error('Error resuming scrape:', error);
        }
      }
    }, 2000);
  })();

} // End of if (window.zillowScraper) check
