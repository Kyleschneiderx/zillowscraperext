# Zillow Scraper

A tool for scraping property listings from Zillow with multi-page support. Available as both a Chrome extension and a standalone web app.

## Features

- Scrape property listings from Zillow search results
- Multi-page scraping (configurable number of pages)
- Extract property details including:
  - Address
  - Price
  - Bedrooms, Bathrooms, Square Footage
  - Property Type
  - Realtor information
  - Property images
  - Property links
- Export data to CSV or JSON format
- Available as Chrome extension or web app

## Installation Options

### Option 1: Web App (Standalone/Iframe)

1. Run the server:
```bash
node server.js
```

2. Open your browser and go to: `http://localhost:3000`

3. You can also embed it in an iframe:
```html
<iframe src="http://localhost:3000" width="100%" height="800px"></iframe>
```

### Option 2: Chrome Extension

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right corner)
4. Click "Load unpacked"
5. Select the folder containing the extension files

## Usage

### Web App Usage

1. Start the server: `node server.js`
2. Open `http://localhost:3000` in your browser
3. Enter your Zillow search URL
4. Click "Start Scraping" - it will open Zillow in a new window
5. Data will be extracted and displayed
6. Export as CSV or JSON

**Note:** The web app works by opening Zillow in a popup window due to browser security restrictions (CORS).

### Chrome Extension Usage

1. Go to any Zillow search results page (e.g., search for properties in a specific area)
2. Click the extension icon in your Chrome toolbar
3. Choose your scraping options:
   - **Max Pages**: Select how many pages to scrape (default: 5)
   - **Start Scraping**: Scrape multiple pages automatically
   - **Scrape Current Page Only**: Only scrape the current page
4. Wait for the scraping to complete (check browser console for progress)
5. Export your data:
   - **Export CSV**: Download data as a CSV file
   - **Export JSON**: Download data as a JSON file

## Data Structure

Each property includes:
```json
{
  "id": "zpid_113145226",
  "address": "5421 W Fairway Ln #10, Rathdrum, ID 83858",
  "price": "$349,500",
  "link": "https://www.zillow.com/homedetails/...",
  "bedBathSqft": "2 bds, 2 ba, 1,193 sqft",
  "propertyType": "Condo for sale",
  "realtor": "JOHN L. SCOTT",
  "imageUrl": "https://photos.zillowstatic.com/..."
}
```

## Important Notes

- The extension only works on Zillow.com
- Respect Zillow's Terms of Service and robots.txt
- Be mindful of rate limiting - the extension includes delays between page navigations
- Some data may vary based on Zillow's HTML structure changes

## Troubleshooting

### Extension not working?
- Make sure you're on a Zillow search results page
- Check the browser console (F12) for errors
- Reload the extension if needed

### No data being scraped?
- Ensure you're on a page with visible property cards
- Try the "Scrape Current Page Only" option first
- Check that the HTML structure hasn't changed on Zillow

### Export not working?
- Make sure you've scraped data first
- Try refreshing the page and rescraping

## Legal Disclaimer

This extension is for educational purposes only. Make sure to comply with:
- Zillow's Terms of Service
- Local laws and regulations regarding web scraping
- Rate limiting best practices

## Embedding in Your Site

To embed the scraper in your website, use an iframe:

```html
<iframe 
  src="http://localhost:3000" 
  width="100%" 
  height="800px"
  frameborder="0">
</iframe>
```

Or use the example file:
```bash
open example.html
```

## Project Structure

```
Zillowscaper/
├── index.html          # Web app (can be served/embedded)
├── server.js           # Simple Node.js server
├── example.html        # Example iframe embedding
├── manifest.json       # Chrome extension manifest
├── content.js          # Extension content script
├── popup.html          # Extension popup UI
├── popup.js            # Extension popup script
├── icon.png            # Extension icon
├── package.json        # Node.js dependencies
└── README.md           # This file
```

## License

MIT License - Feel free to modify and use as needed.
