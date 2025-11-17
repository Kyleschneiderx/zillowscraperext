// Settings script for Zillow Scraper

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  const statusDiv = document.getElementById('status');

  function showStatus(message, type = 'info') {
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
  }

  function clearStatus() {
    statusDiv.innerHTML = '';
  }

  // Logout function
  async function logout() {
    try {
      await chrome.storage.local.remove(['apiKey', 'isAuthenticated']);
      showStatus('Logged out successfully. You can close this page.', 'success');
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Logged Out';
      
      // Optionally close the settings page after a delay
      setTimeout(() => {
        window.close();
      }, 2000);
    } catch (error) {
      showStatus('Error logging out: ' + error.message, 'error');
    }
  }

  // Logout button
  logoutBtn.addEventListener('click', logout);
});

