# Aura-IDToken Epic 3D Website

An immersive, high-performance marketing website for Aura-IDToken featuring:

- **3D WebGL Hero** with React Three Fiber
- **Smooth Page Transitions** with Framer Motion
- **Levitating UI Elements** with interactive effects
- **Particle Systems** and sparkle effects
- **Responsive Design** optimized for mobile
- **Performance Optimizations** with progressive degradation

## Tech Stack

- **Next.js 14** - React framework with SSR/SSG
- **React 18** - UI library
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first styling
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for R3F
- **Framer Motion** - Animation library
- **Three.js** - WebGL 3D graphics

## Getting Started

Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build & Export

Build for production:

```bash
npm run build
```

Export static site:

```bash
npm run export
```

The static files will be in the `out/` directory, ready for deployment to Vercel, GitHub Pages, or any static host.

## Performance Features

- **Client-side only WebGL**: Dynamic imports with `ssr: false` prevent server-side rendering of 3D content
- **Reduced motion support**: Respects user's `prefers-reduced-motion` preference
- **Lazy loading**: 3D components load only when needed
- **Optimized assets**: Compressed textures and low-poly models
- **Mobile optimizations**: Adjusted effects for lower-power devices

## Deployment

### Vercel (Recommended)

The easiest way to deploy is using [Vercel](https://vercel.com):

```bash
vercel
```

### GitHub Pages

1. Build and export: `npm run export`
2. Deploy the `out/` directory to GitHub Pages

### Other Hosts

Deploy the `out/` directory after running `npm run export` to any static hosting service (Cloudflare Pages, Netlify, etc.).

## Customization

- **Colors**: Edit `tailwind.config.js` for custom color schemes
- **3D Models**: Replace the torus knot in `components/Hero3D.tsx` with custom GLTF models
- **Animations**: Adjust timing and easing in Framer Motion components
- **Content**: Update features and text in `pages/index.tsx`

## Accessibility

- Semantic HTML5 elements
- ARIA labels for interactive components
- Keyboard navigation support
- Motion preference detection
- High contrast text
