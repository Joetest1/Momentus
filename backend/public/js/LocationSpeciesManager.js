// Frontend integration for location-based species detection
// Add this to your main user interface

class LocationSpeciesManager {
  constructor() {
    this.currentSpeciesData = null;
    this.lastKnownLocation = null;
  }

  /**
   * Get species for current location with automatic change detection
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {boolean} skipConfirmation - Skip user confirmation for location changes
   * @returns {Promise<Object>} Species data or confirmation prompt
   */
  async getSpeciesForLocation(latitude, longitude, skipConfirmation = false) {
    try {
      const response = await fetch('/api/species/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude,
          longitude,
          userConfirmed: skipConfirmation
        })
      });

      const data = await response.json();

      // Handle location change confirmation
      if (!data.success && data.requiresConfirmation) {
        const userConfirmed = await this.showLocationChangeDialog(data.confirmationPrompt);
        
        if (userConfirmed) {
          // User confirmed, fetch new species data
          return this.getSpeciesForLocation(latitude, longitude, true);
        } else {
          // User declined, return existing data if available
          return {
            success: true,
            keepExisting: true,
            message: 'Keeping existing species list'
          };
        }
      }

      if (data.success) {
        this.currentSpeciesData = data;
        this.lastKnownLocation = { latitude, longitude };
      }

      return data;

    } catch (error) {
      console.error('Failed to fetch species data:', error);
      return {
        success: false,
        error: 'Failed to fetch species data',
        fallback: true
      };
    }
  }

  /**
   * Show location change confirmation dialog
   * @param {Object} prompt - Confirmation prompt data
   * @returns {Promise<boolean>} User's choice
   */
  async showLocationChangeDialog(prompt) {
    return new Promise((resolve) => {
      // Create modal dialog
      const modal = document.createElement('div');
      modal.className = 'location-change-modal';
      modal.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content">
            <h3>${prompt.title}</h3>
            <p>${prompt.message}</p>
            <div class="modal-details">
              <p><small>${prompt.details}</small></p>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" id="cancel-location-change">
                ${prompt.options.cancel}
              </button>
              <button class="btn btn-primary" id="confirm-location-change">
                ${prompt.options.confirm}
              </button>
            </div>
          </div>
        </div>
      `;

      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .location-change-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
        }
        .modal-overlay {
          background: rgba(0, 0, 0, 0.5);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .modal-content h3 {
          margin-top: 0;
          color: #2d3748;
          margin-bottom: 15px;
        }
        .modal-content p {
          color: #718096;
          line-height: 1.5;
          margin-bottom: 15px;
        }
        .modal-details {
          background: #f7fafc;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .modal-actions .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-secondary {
          background: #e2e8f0;
          color: #4a5568;
        }
        .btn-primary {
          background: #667eea;
          color: white;
        }
        .btn:hover {
          opacity: 0.9;
        }
      `;

      document.head.appendChild(style);
      document.body.appendChild(modal);

      // Handle button clicks
      document.getElementById('confirm-location-change').onclick = () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
        resolve(true);
      };

      document.getElementById('cancel-location-change').onclick = () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
        resolve(false);
      };

      // Handle overlay click
      modal.onclick = (e) => {
        if (e.target === modal.querySelector('.modal-overlay')) {
          document.body.removeChild(modal);
          document.head.removeChild(style);
          resolve(false);
        }
      };
    });
  }

  /**
   * Display species data in UI
   * @param {Object} speciesData 
   * @param {HTMLElement} container 
   */
  displaySpeciesData(speciesData, container) {
    if (!speciesData.success) {
      container.innerHTML = `<div class="error">Failed to load species data: ${speciesData.error}</div>`;
      return;
    }

    let html = `
      <div class="species-summary">
        <h3>🌍 Species in Your Area</h3>
        ${speciesData.ecoregion ? `<p><strong>Ecoregion:</strong> ${speciesData.ecoregion.name}</p>` : ''}
        <p><strong>Total Species:</strong> ${speciesData.summary.total}</p>
        ${speciesData.cached ? '<p class="cache-indicator">📋 Using cached data</p>' : ''}
        ${speciesData.fallback ? '<p class="fallback-indicator">⚠️ Using fallback data</p>' : ''}
      </div>
      
      <div class="species-categories">
    `;

    // Display each category
    Object.entries(speciesData.summary.byClass).forEach(([className, count]) => {
      if (count > 0) {
        const species = speciesData.species[className] || [];
        const icons = {
          birds: '🐦', mammals: '🐾', insects: '🦋',
          fish: '🐟', amphibians: '🐸', reptiles: '🦎'
        };
        
        html += `
          <div class="species-category">
            <h4>${icons[className] || '🔬'} ${className.charAt(0).toUpperCase() + className.slice(1)} (${count})</h4>
            <div class="species-list">
        `;
        
        species.slice(0, 10).forEach(sp => {
          html += `
            <div class="species-item">
              <span class="species-name">${sp.name}</span>
              ${sp.scientificName ? `<span class="species-scientific">${sp.scientificName}</span>` : ''}
            </div>
          `;
        });
        
        if (species.length > 10) {
          html += `<div class="species-more">... and ${species.length - 10} more</div>`;
        }
        
        html += `</div></div>`;
      }
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  /**
   * Get current species data
   * @returns {Object|null} Current species data
   */
  getCurrentSpeciesData() {
    return this.currentSpeciesData;
  }

  /**
   * Check if location needs species update
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {boolean} True if location changed significantly
   */
  needsLocationUpdate(latitude, longitude) {
    if (!this.lastKnownLocation) return true;
    
    const distance = this.calculateDistance(
      this.lastKnownLocation.latitude,
      this.lastKnownLocation.longitude,
      latitude,
      longitude
    );
    
    return distance > 50; // 50km threshold
  }

  /**
   * Calculate distance between two points
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
   * @returns {number} Distance in km
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(value) {
    return value * Math.PI / 180;
  }
}

// Export for use in your application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocationSpeciesManager;
} else {
  window.LocationSpeciesManager = LocationSpeciesManager;
}