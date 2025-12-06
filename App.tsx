import React, { useState, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Stars, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Overlay } from './components/Overlay';
import { ArixTree } from './components/ArixTree';
import { TreeMorphState } from './types';
import { COLORS, CONFIG } from './constants';

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeMorphState>(TreeMorphState.SCATTERED);
  const controlsRef = useRef<any>(null);
  const lastInteractionRef = useRef(Date.now());

  const toggleState = () => {
    setTreeState((prev) => 
      prev === TreeMorphState.TREE_SHAPE 
        ? TreeMorphState.SCATTERED 
        : TreeMorphState.TREE_SHAPE
    );
  };

  return (
    <div className="relative w-full h-screen bg-black">
      {/* 2D UI Overlay */}
      <Overlay currentState={treeState} onToggle={toggleState} />

      {/* 3D Scene */}
      <Canvas
        dpr={[1, 2]} 
        gl={{ 
          antialias: false,
          toneMapping: 3, 
          toneMappingExposure: 1.2 
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 40]} fov={45} />
        
        <OrbitControls 
          ref={controlsRef}
          enablePan={false} 
          minPolarAngle={Math.PI / 4} // Allow some top down view
          maxPolarAngle={Math.PI / 1.2} // Allow some bottom up view
          minDistance={15}
          maxDistance={60}
          autoRotate={treeState === TreeMorphState.TREE_SHAPE}
          autoRotateSpeed={0.5}
          dampingFactor={0.05}
          onStart={() => { lastInteractionRef.current = Date.now() + 999999; }} // Disable timer while dragging
          onEnd={() => { lastInteractionRef.current = Date.now(); }} // Reset timer on release
        />

        {/* Custom Auto-Reset Logic */}
        <ResetHandler controlsRef={controlsRef} treeState={treeState} lastInteractionRef={lastInteractionRef} />

        <Suspense fallback={null}>
          <Environment preset="city" />
          <ambientLight intensity={0.2} />
          
          <spotLight 
            position={[20, 20, 10]} 
            angle={0.3} 
            penumbra={1} 
            intensity={2} 
            color={COLORS.GOLD_HIGHLIGHT} 
            castShadow 
          />
          <pointLight position={[-10, -10, -10]} intensity={1} color={COLORS.EMERALD_LIGHT} />

          <Float 
            speed={treeState === TreeMorphState.SCATTERED ? 2 : 0} 
            rotationIntensity={treeState === TreeMorphState.SCATTERED ? 1 : 0} 
            floatIntensity={treeState === TreeMorphState.SCATTERED ? 2 : 0}
          >
            <ArixTree targetState={treeState} />
          </Float>
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </Suspense>

        <EffectComposer enableNormalPass={false}>
          <Bloom 
            luminanceThreshold={CONFIG.BLOOM_THRESHOLD} 
            mipmapBlur 
            intensity={CONFIG.BLOOM_INTENSITY} 
            radius={CONFIG.BLOOM_RADIUS} 
          />
          <Noise opacity={0.05} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

// Extracted internal component to access useFrame
const ResetHandler = ({ controlsRef, treeState, lastInteractionRef }: any) => {
  useFrame((state, delta) => {
    // Only active in TREE state
    if (treeState !== TreeMorphState.TREE_SHAPE) return;

    // Check time since last interaction
    const timeSince = Date.now() - lastInteractionRef.current;
    
    // If > 3 seconds, gently nudge camera Y towards 0 (Vertical Center)
    if (timeSince > 3000) {
      // Lerp camera Y to 0 for a centered vertical alignment
      const targetY = 0;
      if (Math.abs(state.camera.position.y - targetY) > 0.05) {
        state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, targetY, 2.0, delta);
        controlsRef.current?.update();
      }
    }
  });
  return null;
}

export default App;