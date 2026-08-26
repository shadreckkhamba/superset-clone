# Dashboard Slideshow Feature

## Overview
The Dashboard Slideshow feature allows you to automatically rotate between the "Clinical Service Monitoring" and "Patient Stay Times" dashboards in fullscreen mode using iframes.

## Features
- ✅ Smooth transitions between dashboard views
- ✅ Auto-rotation every 15 seconds (configurable)
- ✅ Progress bar showing time until next slide
- ✅ Keyboard controls (←, →, Space, Esc)
- ✅ Mouse controls (play/pause, previous/next)
- ✅ Auto-hiding controls (fade after 3 seconds of inactivity)
- ✅ Dark mode support
- ✅ Uses iframes for isolated dashboard rendering

## How to Use

### Starting the Slideshow
1. Navigate to your dashboard
2. Click the "Slideshow" button in the header (next to Reports and Edit buttons)
3. The slideshow will start in fullscreen mode

### Controls

#### Keyboard Shortcuts
- `←` (Left Arrow): Previous slide
- `→` (Right Arrow): Next slide
- `Space`: Play/Pause
- `Esc`: Exit slideshow

#### Mouse Controls
- Click the play/pause button to toggle auto-rotation
- Click the left/right arrows to navigate manually
- Click the X button to exit
- Click on the dots to jump to a specific slide
- Move your mouse to show controls (they auto-hide after 3 seconds)

## Configuration

### Changing Rotation Interval
Edit `ROTATION_INTERVAL` in `index.tsx`:
```typescript
const ROTATION_INTERVAL = 15000; // milliseconds (15 seconds)
```

### Adding More Slides
Edit the `SLIDES` array in `index.tsx`:
```typescript
const SLIDES = [
  { key: 'clinical', label: 'Clinical Service Monitoring', view: 'main' },
  { key: 'stay', label: 'Patient Stay Times', view: 'stay' },
  // Add more slides here
];
```

### URL Parameters
The slideshow uses these URL parameters:
- `standalone=1`: Hides unnecessary UI elements
- `slideshow=1`: Hides the header completely for clean fullscreen
- `view=stay`: Switches to Patient Stay Times view

## Technical Details

### How It Works
1. The slideshow opens in a fullscreen overlay (z-index: 9999)
2. Each dashboard view is loaded in a separate iframe
3. Only the active iframe is visible (opacity transition)
4. All iframes are pre-loaded for smooth transitions
5. The header is hidden when `slideshow=1` parameter is present

### iframe URLs
- Clinical Service Monitoring: `/superset/dashboard/{id}/?standalone=1&slideshow=1`
- Patient Stay Times: `/superset/dashboard/{id}/?standalone=1&slideshow=1&view=stay`

## Browser Compatibility
- Modern browsers with iframe support
- Fullscreen API support recommended
- CSS transitions and transforms required
