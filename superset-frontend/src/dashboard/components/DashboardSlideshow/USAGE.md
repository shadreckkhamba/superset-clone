# Dashboard Slideshow - Quick Start Guide

## 🎯 What It Does
Automatically rotates between "Clinical Service Monitoring" and "Patient Stay Times" dashboards in fullscreen mode using iframes.

## 🚀 Quick Start

### Step 1: Start the Slideshow
```
Dashboard → Click "Slideshow" button (📊 icon)
```

### Step 2: Controls Appear
- **Title**: Shows current dashboard name
- **Dots**: Click to jump to specific slide
- **Arrows**: Navigate previous/next
- **Play/Pause**: Control auto-rotation
- **X**: Exit slideshow

### Step 3: Auto-Rotation
- Slides change every 15 seconds
- Progress bar at bottom shows timing
- Controls auto-hide after 3 seconds

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` | Previous slide |
| `→` | Next slide |
| `Space` | Play/Pause |
| `Esc` | Exit |

## 🎨 Features

### iframe Architecture
- Each dashboard loads in isolated iframe
- Smooth fade transitions (0.6s)
- All slides pre-loaded for instant switching
- No interference between views

### Smart Controls
- Auto-hide after 3 seconds
- Show on mouse movement
- Gradient overlay for visibility
- Dark mode support

### Progress Indicator
- Visual timer bar at bottom
- Shows time until next slide
- Pauses when you pause
- Resets on manual navigation

## 🔧 Configuration

### Change Rotation Speed
In `index.tsx`, modify:
```typescript
const ROTATION_INTERVAL = 15000; // milliseconds
```

Examples:
- 10 seconds: `10000`
- 30 seconds: `30000`
- 1 minute: `60000`

### Add More Slides
In `index.tsx`, add to SLIDES array:
```typescript
const SLIDES = [
  { key: 'clinical', label: 'Clinical Service Monitoring', view: 'main' },
  { key: 'stay', label: 'Patient Stay Times', view: 'stay' },
  { key: 'new', label: 'New Dashboard', view: 'new' },
];
```

Then update `getSlideUrl()` to handle the new view parameter.

## 🎬 How It Works

```
User clicks "Slideshow" button
    ↓
Fullscreen overlay opens (z-index: 9999)
    ↓
iframe 1: Clinical Service Monitoring (?standalone=1&slideshow=1)
iframe 2: Patient Stay Times (?standalone=1&slideshow=1&view=stay)
    ↓
Auto-rotate every 15 seconds
    ↓
Smooth fade between iframes
    ↓
User can pause, navigate, or exit anytime
```

## 📱 URL Parameters

### Clinical Service Monitoring
```
/superset/dashboard/{id}/?standalone=1&slideshow=1
```

### Patient Stay Times
```
/superset/dashboard/{id}/?standalone=1&slideshow=1&view=stay
```

**Parameters:**
- `standalone=1`: Minimal UI mode
- `slideshow=1`: Hides header completely
- `view=stay`: Activates Patient Stay Times overlay

## 💡 Tips

1. **Fullscreen Experience**: The header is hidden in slideshow mode for maximum screen space
2. **Pause to Interact**: Pause the slideshow to interact with charts in the iframe
3. **Quick Navigation**: Click dots to jump directly to any slide
4. **Dark Mode**: Automatically uses current theme setting
5. **Keyboard First**: Use keyboard shortcuts for fastest control

## 🐛 Troubleshooting

### Slideshow button not visible?
- Make sure you're not in edit mode
- Check that you're not in standalone mode already

### iframes not loading?
- Check browser console for errors
- Verify dashboard ID is correct
- Ensure you have permissions to view the dashboard

### Controls not hiding?
- This is normal - they hide after 3 seconds of no mouse movement
- Move mouse to show them again

### Dark mode not working?
- Dark mode is inherited from parent dashboard
- Check that dark mode is enabled in main dashboard

## 🎯 Use Cases

1. **Display Dashboards**: Show rotating dashboards on wall-mounted displays
2. **Presentations**: Present multiple dashboard views automatically
3. **Monitoring**: Continuous monitoring of different metrics
4. **Demos**: Showcase different dashboard capabilities
5. **Kiosks**: Public information displays with auto-rotation
