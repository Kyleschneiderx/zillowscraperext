// Settings script for Zillow Scraper

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');
  const userEmailEl = document.getElementById('userEmail');
  const statusDiv = document.getElementById('status');

  function showStatus(message, type = 'info') {
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
  }

  function clearStatus() {
    statusDiv.innerHTML = '';
  }

  // Load and display user email
  async function loadUserEmail() {
    try {
      const result = await chrome.storage.local.get(['userEmail', 'isAuthenticated']);
      if (result.isAuthenticated && result.userEmail) {
        userEmailEl.textContent = result.userEmail;
      } else if (result.isAuthenticated) {
        userEmailEl.textContent = 'Email not available';
        userEmailEl.style.color = '#6c757d';
      } else {
        userEmailEl.textContent = 'Not authenticated';
        userEmailEl.style.color = '#6c757d';
      }
    } catch (error) {
      console.error('Error loading user email:', error);
      userEmailEl.textContent = 'Error loading email';
      userEmailEl.style.color = '#dc3545';
    }
  }

  // Dashboard button - open dashboard page
  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:8080/dashboard' });
  });

  // Logout function
  async function logout() {
    try {
      await chrome.storage.local.remove(['apiKey', 'isAuthenticated', 'userEmail', 'userType']);
      showStatus('Logged out successfully. You can close this page.', 'success');
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Logged Out';
      dashboardBtn.disabled = true;
      userEmailEl.textContent = 'Not authenticated';
      userEmailEl.style.color = '#6c757d';
      
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

  // Load user email on page load
  loadUserEmail();
});

