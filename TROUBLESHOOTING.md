# Troubleshooting Guide

## "Could not establish connection" Error

This error means the content script isn't loaded or the extension needs to be reloaded.

### Fix Steps:

1. **Reload the Extension**
   - Go to `chrome://extensions/`
   - Find "Zillow Scraper"
   - Click the reload button (circular arrow icon)

2. **Reload the Zillow Page**
   - Make sure you're on a Zillow search results page
   - Refresh the page (F5 or Cmd+R)

3. **Check the Console**
   - Open Developer Tools (F12)
   - Look for any error messages
   - You should see "Zillow Scraper loaded" message

4. **Verify URL**
   - Make sure the URL contains `zillow.com`
   - The extension only works on Zillow search results pages

## Other Common Issues

### No Properties Being Scraped

**Possible Causes:**
1. You're not on a search results page
2. The page hasn't fully loaded
3. Zillow changed their HTML structure

**Solutions:**
- Wait for the page to fully load (all property cards visible)
- Try the "Scrape Current Page Only" button first
- Check browser console for errors

### Extension Not Working at All

**Solutions:**
1. Make sure Developer Mode is enabled in chrome://extensions/
2. Remove and re-add the extension
3. Check that all files are in the correct location
4. Try restarting Chrome

### Can't Export Data

**Solutions:**
- Make sure you've successfully scraped data first
- Check browser console for any errors
- Try refreshing the page and rescraping

## Still Having Issues?

1. Open Chrome DevTools (F12)
2. Go to the Console tab
3. Look for error messages
4. Share these errors if you need further help

## Testing the Extension

1. Go to a Zillow search page (e.g., search for homes in a city)
2. Click the extension icon
3. You should see the popup with no error message
4. If you see the error, follow the troubleshooting steps above
