// Simple service to track broken image URLs
class BrokenImageTracker {
  private brokenUrls = new Set<string>()
  private cardNameToUrl = new Map<string, string>()

  // Register a broken URL
  registerBrokenUrl(url: string, cardName: string) {
    this.brokenUrls.add(url)
    this.cardNameToUrl.set(cardName, url)
    
    // Store in localStorage for persistence
    const stored = JSON.parse(localStorage.getItem('brokenImageUrls') || '[]')
    const entry = { url, cardName, timestamp: Date.now() }
    
    // Avoid duplicates
    const exists = stored.find((item: any) => item.url === url && item.cardName === cardName)
    if (!exists) {
      stored.push(entry)
      localStorage.setItem('brokenImageUrls', JSON.stringify(stored))
      console.log(`Registered broken image URL for ${cardName}: ${url}`)
    }
  }

  // Check if URL is known to be broken
  isKnownBroken(url: string): boolean {
    return this.brokenUrls.has(url)
  }

  // Get all broken URLs for batch fixing
  getBrokenUrls(): Array<{url: string, cardName: string, timestamp: number}> {
    return JSON.parse(localStorage.getItem('brokenImageUrls') || '[]')
  }

  // Clear tracked broken URLs (after batch fix)
  clearBrokenUrls() {
    localStorage.removeItem('brokenImageUrls')
    this.brokenUrls.clear()
    this.cardNameToUrl.clear()
  }

  // Debug method to see what's stored
  debugBrokenUrls() {
    const stored = this.getBrokenUrls()
    console.log('Current broken URLs in localStorage:', stored)
    console.log('In-memory broken URLs:', Array.from(this.brokenUrls))
    return stored
  }

  removeUrlFromBrokenUrls(index: number) {
    const stored = this.getBrokenUrls()
    stored.splice(index, 1)
    localStorage.setItem('brokenImageUrls', JSON.stringify(stored))
  }

  // Send broken URLs to backend for batch processing
  async sendBrokenUrlsToBackend() {
    const brokenUrls = this.getBrokenUrls()
    console.log('Broken URLs found in storage:', brokenUrls)
    
    if (brokenUrls.length === 0) {
      console.log('No broken URLs to send')
      return
    }

    try {
      const response = await fetch('http://localhost:80/api/report-broken-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ broken_urls: brokenUrls })
      })

      if (response.ok) {
        console.log(`Sent ${brokenUrls.length} broken URLs to backend for processing`)
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to send broken URLs to backend:', error)
    }
  }
}

// Export singleton instance
export const brokenImageTracker = new BrokenImageTracker()