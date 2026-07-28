'use client';
import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingTorusProps {
  hover: boolean;
}

function FloatingTorus({ hover }: FloatingTorusProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Continuous rotation
      meshRef.current.rotation.y += 0.25 * delta;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime / 3) * 0.15;
      // Subtle vertical floating
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.08;
    }
  });

  return (
    <Float floatIntensity={0.9} rotationIntensity={0.6} speed={2}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <torusKnotGeometry args={[0.8, 0.28, 128, 32]} />
        <meshStandardMaterial
          metalness={0.9}
          roughness={0.15}
          color={hover ? '#7efcff' : '#6b21a8'}
        />
      </mesh>
    </Float>
  );
}

export default function Hero3D() {
  const [hover, setHover] = useState(false);

  return (
    <div className="relative h-[60vh] md:h-[75vh] w-full rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl">
      <Canvas camera={{ position: [0, 0.6, 3], fov: 45 }} shadows>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
        <Suspense fallback={null}>
          <Sparkles count={80} size={4} scale={[6, 2, 6]} color="#6b21a8" />
          <FloatingTorus hover={hover} />
        </Suspense>
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
      <div className="absolute left-6 bottom-6 md:left-12 md:bottom-12 text-white z-10 pointer-events-auto">
        <h1 className="text-3xl md:text-5xl font-extrabold leading-tight drop-shadow-lg">
          Aura-IDToken
        </h1>
        <p className="mt-2 max-w-xl text-slate-200 drop-shadow-md">
          Identity, reputation and vector intelligence — real-time trust built on the Cathedral
          architecture.
        </p>
        <button
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-all duration-300 hover:scale-105"
        >
          Explore
        </button>
      </div>
    </div>
  );
}
