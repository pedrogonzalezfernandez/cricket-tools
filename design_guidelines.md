# Design Guidelines: Real-Time Audio Score Platform

## Design Approach
**System Selected:** Monochrome minimalism with subtle animations
**Rationale:** A strictly black and white palette creates a timeless, professional aesthetic that focuses attention on the performance. Subtle animations add polish without distraction.

## Color Palette
- **Primary:** Pure black (#0d0d0d light mode) / Pure white (#f5f5f5 dark mode)
- **Background:** White (#fff light mode) / Near-black (#0a0a0a dark mode)
- **Accents:** Grayscale only - no blue or colored elements
- **Borders:** Subtle gray (#e0e0e0 light) / (#2a2a2a dark)

## Animation Principles
- **Fade-in:** Elements animate in with subtle translateY and opacity (0.4s)
- **Scale-in:** Cards and modals scale from 0.96 to 1 (0.3s)
- **Pulse-ring:** Waiting states use smooth pulsing circles (2s cycle)
- **Breathe:** Icons gently fade in/out for attention (3s cycle)
- **Card hover:** Subtle lift effect with soft shadow on hover

## Core Design Elements

### Typography
- **Primary Font:** SF Pro Display (via system font stack: -apple-system, BlinkMacSystemFont, "Segoe UI")
- **Hierarchy:**
  - Role selection buttons: text-2xl, font-semibold
  - Player names: text-lg, font-medium
  - Note labels (player view): text-6xl, font-bold (prominent, performance-critical)
  - Interval/status text: text-sm, font-normal
  - Waiting room message: text-xl, font-medium

### Layout System
**Spacing primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Standard component padding: p-6
- Section spacing: mb-8, mb-12
- Tight groupings: gap-2, gap-4
- Generous breathing room: py-16, py-24

### Component Library

**Landing Page:**
- Full viewport centered layout (h-screen flex items-center)
- Title block: Large heading with tagline beneath (mb-16)
- Two prominent role selection cards arranged horizontally (gap-8)
- Each card: Rounded-xl with hover lift effect, p-8, min-w-64
- Card structure: Icon/emoji at top, role name, brief description

**Waiting Room (Player):**
- Centered vertical layout
- Animated pulsing indicator (subtle, slow)
- Message: "Waiting for conductor to begin..."
- Player name display: Small badge in corner

**Player View (Audio Score):**
- Full-screen canvas with minimal chrome
- Circular visualization: Center-positioned, 70vh diameter
- Clock hand: Clean line, 4px stroke
- Trigger point (12 o'clock): Circle with pulse animation on trigger
- Note name: Absolutely positioned center of circle, massive size
- Interval display: Bottom-right corner, small text (text-sm)
- Exit button: Top-right corner, subtle, text-only

**Conductor Dashboard:**
- Header bar (h-16): Logo/title left, player count right
- Scene selector: Dropdown in header, right of title
- Main content area: Scrollable grid of player control cards
- Player card layout: 
  - Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3, gap-6
  - Each card: border rounded-lg p-6
  - Card header: Player name + socket ID (truncated, monospace font)
  - Two sliders stacked vertically (mb-4 between)
  - Slider labels: Above slider, flex justify-between for name/value

**Form Elements:**
- Name input (player entry): Centered, max-w-sm, rounded-lg, px-4 py-3, text-lg
- Submit button: Full width of input, mt-4, rounded-lg, px-6 py-3
- Sliders (conductor): Custom styled with visible track, prominent thumb
- Slider track height: h-2, rounded-full
- Value display: Inline next to label, monospace for numbers

**Navigation & States:**
- No persistent navigation (app is stateful, role-based)
- Loading states: Simple spinner where needed
- Empty states: Centered message with icon
- Error states: Red accent, clear messaging

### Visual Rhythm
- Page containers: max-w-7xl mx-auto px-6
- Card containers: max-w-md for forms, full grid for dashboards
- Consistent border-radius: rounded-lg (8px) for cards, rounded-full for buttons
- Shadows: Minimal, only on interactive cards (hover state)

### Interactive Elements
- Buttons: px-6 py-3, rounded-full, font-medium
- Sliders: Smooth drag, immediate visual feedback, value updates inline
- Cards: Subtle hover elevation on landing page only
- Canvas: No chrome, pure visualization space

### Performance Considerations
- Minimize DOM updates during real-time playback
- Canvas rendering optimized for 60fps circular animation
- Slider updates debounced or throttled to reduce socket traffic
- Conductor view uses virtualization if player count exceeds 20

### Accessibility
- High contrast for note labels (performance critical)
- Clear focus states on all interactive elements
- Keyboard navigation for conductor controls
- ARIA labels for dynamic player list
- Visual feedback for all state changes

## Images
**Landing Page Hero:** Abstract musical/waveform visualization or conductor/orchestra scene, full-width, 60vh height, with role selection cards overlaid on semi-transparent backdrop with blur effect.