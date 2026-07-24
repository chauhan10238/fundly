# Final interactive world map fix

This replaces the hand-drawn map with `react-simple-maps`, rendering a genuine world map from world-atlas TopoJSON.

## Required dependency

Merge this into the existing `dependencies` object in the root `package.json`:

```json
"react-simple-maps": "^3.0.0"
```

Vercel installs it automatically during the next deployment.

## Replace

- `components/WorldCoverageMap.tsx`
- `app/globals.css`

## Features

- genuine world geography
- drag and zoom
- clickable blue overseas pins
- clickable saffron Indian pins
- animated dotted connections to India
- hover city details
- city and region buttons that focus the map
- zoom and reset controls
- responsive layout
