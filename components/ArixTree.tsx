import React, { useMemo, useRef, useLayoutEffect, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';
import { TreeMorphState } from '../types';
import { getRandomSpherePoint, getTreePoint, generateRandomRotation, getRandomPaletteColor } from '../utils/geometry';

interface ArixTreeProps {
  targetState: TreeMorphState;
}

const dummy = new THREE.Object3D();
const tempVec3 = new THREE.Vector3();
const tempColor = new THREE.Color();

// Define geometry layers
const LAYERS = ['box', 'sphere', 'dodecahedron', 'tetrahedron'] as const;
const COUNTS_PER_LAYER = Math.floor(CONFIG.PARTICLE_COUNT / LAYERS.length);

const CustomStar = ({ innerRadius, outerRadius, depth, count, ...props }: any) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const step = Math.PI / count;
    for (let i = 0; i < 2 * count; i++) {
      // For a standard pentagram with 36 degree tips, ratio is ~0.382
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const a = i * step;
      const x = r * Math.sin(a);
      const y = r * Math.cos(a);
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }, [innerRadius, outerRadius, count]);

  const extrudeSettings = useMemo(() => ({ depth, bevelEnabled: false }), [depth]);

  return (
    <mesh {...props}>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      {props.children}
    </mesh>
  );
};

// Spark Particles Component
const Sparks = ({ isBursting }: { isBursting: boolean }) => {
  const count = 400; // Increased count
  const meshRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      life[i] = 0; // Start dead
      // Move offscreen initially
      pos[i * 3] = 99999;
      pos[i * 3 + 1] = 99999;
      pos[i * 3 + 2] = 99999;
    }
    return { pos, vel, life };
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    let activeCount = 0;

    for (let i = 0; i < count; i++) {
      // Respawn logic
      if (particles.life[i] <= 0) {
        if (isBursting) {
          particles.life[i] = 1.0; // Reset life
          
          // Spawn in a sphere volume
          const r = 2 + Math.random() * 8;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          
          positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          positions[i * 3 + 2] = r * Math.cos(phi);

          // Tangential/Spiral velocity
          const speed = 25 + Math.random() * 20; // High speed
          particles.vel[i * 3] = (Math.random() - 0.5) * speed;
          particles.vel[i * 3 + 1] = (Math.random() - 0.5) * speed;
          particles.vel[i * 3 + 2] = (Math.random() - 0.5) * speed;
        } else {
           // Hide dead particles
           positions[i * 3] = 99999;
           positions[i * 3 + 1] = 99999;
           positions[i * 3 + 2] = 99999;
        }
      } else {
        // Update living particle
        activeCount++;
        particles.life[i] -= delta * 0.8; // Life decay

        // Movement
        positions[i * 3] += particles.vel[i * 3] * delta;
        positions[i * 3 + 1] += particles.vel[i * 3 + 1] * delta;
        positions[i * 3 + 2] += particles.vel[i * 3 + 2] * delta;

        // Drag/Friction
        particles.vel[i * 3] *= 0.95;
        particles.vel[i * 3 + 1] *= 0.95;
        particles.vel[i * 3 + 2] *= 0.95;
      }
    }
    
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.pos}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.6}
        color={COLORS.GOLD_HIGHLIGHT}
        transparent
        opacity={1.0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
      />
    </points>
  );
};

export const ArixTree: React.FC<ArixTreeProps> = ({ targetState }) => {
  // Refs
  const boxRef = useRef<THREE.InstancedMesh>(null);
  const sphereRef = useRef<THREE.InstancedMesh>(null);
  const dodecaRef = useRef<THREE.InstancedMesh>(null);
  const tetraRef = useRef<THREE.InstancedMesh>(null);
  const starRef = useRef<THREE.Group>(null);
  
  // Animation State
  const [isBursting, setIsBursting] = useState(false);
  const currentSpeedMultRef = useRef(1); 
  const progress = useRef(0);

  // Map layer names
  const layerRefs = {
    box: boxRef,
    sphere: sphereRef,
    dodecahedron: dodecaRef,
    tetrahedron: tetraRef
  };

  // Manage Burst State
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (targetState === TreeMorphState.SCATTERED) {
      setIsBursting(true);
      // Strictly 3 seconds of high speed
      timeout = setTimeout(() => {
        setIsBursting(false);
      }, 3000);
    } else {
      setIsBursting(false);
    }
    return () => clearTimeout(timeout);
  }, [targetState]);

  // Generate Data
  const particles = useMemo(() => {
    const allIndices = Array.from({ length: CONFIG.PARTICLE_COUNT }, (_, i) => i);
    // Shuffle
    for (let i = allIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
    }

    let globalIndexPointer = 0;

    return LAYERS.map((type) => {
      return new Array(COUNTS_PER_LAYER).fill(null).map((_, i) => {
        const treeIndex = allIndices[globalIndexPointer++];
        return {
          id: i,
          scatterPos: getRandomSpherePoint(CONFIG.SCATTER_RADIUS),
          treePos: getTreePoint(treeIndex, CONFIG.PARTICLE_COUNT, 0),
          scatterRot: generateRandomRotation(),
          burstAxis: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(),
          scale: 0.15 + Math.random() * 0.35,
          color: getRandomPaletteColor(COLORS.PALETTE),
          rotationSpeed: (Math.random() - 0.5) * 1.5
        };
      });
    });
  }, []);

  // Tree Topper Data
  const starData = useMemo(() => ({
    scatterPos: getRandomSpherePoint(CONFIG.SCATTER_RADIUS),
    treePos: new THREE.Vector3(0, CONFIG.TREE_HEIGHT / 2 + 1.5, 0),
  }), []);

  // Initialize Colors
  useLayoutEffect(() => {
    particles.forEach((layerData, index) => {
      const type = LAYERS[index];
      const ref = layerRefs[type].current;
      if (ref) {
        layerData.forEach((data, i) => {
          tempColor.set(data.color);
          ref.setColorAt(i, tempColor);
        });
        ref.instanceColor!.needsUpdate = true;
      }
    });
  }, [particles]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    // 1. Transition Progress
    const target = targetState === TreeMorphState.TREE_SHAPE ? 1 : 0;
    const step = delta * CONFIG.ANIMATION_SPEED;
    
    if (progress.current < target) {
      progress.current = Math.min(progress.current + step, target);
    } else if (progress.current > target) {
      progress.current = Math.max(progress.current - step, target);
    }

    const t = progress.current;
    const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // 2. Speed Logic
    // If bursting, target is high; otherwise normal
    const targetSpeed = isBursting ? 50.0 : 1.0; 
    // Smooth transition
    currentSpeedMultRef.current = THREE.MathUtils.lerp(currentSpeedMultRef.current, targetSpeed, delta * 3);

    // 3. Update Particles
    particles.forEach((layerData, index) => {
      const type = LAYERS[index];
      const ref = layerRefs[type].current;
      
      if (!ref) return;

      layerData.forEach((data, i) => {
        // Position
        tempVec3.lerpVectors(data.scatterPos, data.treePos, easeT);

        // Noise
        if (t < 0.95) {
          tempVec3.y += Math.sin(time + data.id * 0.1) * 0.1 * (1 - t);
          tempVec3.x += Math.cos(time * 0.5 + data.id) * 0.1 * (1 - t);
        }

        // Rotation
        const speed = currentSpeedMultRef.current;
        
        // Spin axis selection
        if (targetState === TreeMorphState.SCATTERED) {
             dummy.rotation.set(
                data.scatterRot.x + time * speed * data.burstAxis.x,
                data.scatterRot.y + time * speed * data.burstAxis.y,
                data.scatterRot.z + time * speed * data.burstAxis.z
             );
        } else {
             dummy.rotation.set(
                data.scatterRot.x + time * data.rotationSpeed,
                data.scatterRot.y + time * data.rotationSpeed,
                data.scatterRot.z + time * data.rotationSpeed
             );
        }

        const pulse = 1 + Math.sin(time * 2 + data.id) * 0.1;
        dummy.scale.setScalar(data.scale * pulse);
        dummy.position.copy(tempVec3);
        dummy.updateMatrix();
        ref.setMatrixAt(i, dummy.matrix);
      });
      ref.instanceMatrix.needsUpdate = true;
    });

    // 4. Star Update
    if (starRef.current) {
      starRef.current.position.lerpVectors(starData.scatterPos, starData.treePos, easeT);
      
      // Star rotates slowly
      starRef.current.rotation.y = time * 0.5;
      
      const starScale = 1.0 * (0.5 + 0.5 * easeT);
      starRef.current.scale.setScalar(starScale);
    }
  });

  const material = (
    <meshStandardMaterial
      roughness={0.05} 
      metalness={1.0} 
      emissiveIntensity={0.5} 
      color="#ffffff" 
    />
  );

  return (
    <group>
      {/* Explicitly pass burst state to sparks */}
      <Sparks isBursting={isBursting} />

      <instancedMesh ref={boxRef} args={[undefined, undefined, COUNTS_PER_LAYER]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        {material}
      </instancedMesh>

      <instancedMesh ref={sphereRef} args={[undefined, undefined, COUNTS_PER_LAYER]} castShadow receiveShadow>
        <sphereGeometry args={[0.6, 16, 16]} />
        {material}
      </instancedMesh>

      <instancedMesh ref={dodecaRef} args={[undefined, undefined, COUNTS_PER_LAYER]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.7, 0]} />
        {material}
      </instancedMesh>

      <instancedMesh ref={tetraRef} args={[undefined, undefined, COUNTS_PER_LAYER]} castShadow receiveShadow>
        <tetrahedronGeometry args={[0.8, 0]} />
        {material}
      </instancedMesh>

      {/* Tree Topper: Pure 5-Point Star */}
      <group ref={starRef}>
         <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            {/* 36 degree angle star: ratio 0.382 for standard Pentagram */}
            <CustomStar 
              innerRadius={1.5 * 0.382} // approx 0.573
              outerRadius={1.5} 
              depth={0.4} 
              count={5} 
              position={[0,0,0]}
            >
              <meshStandardMaterial 
                color={COLORS.GOLD_METALLIC} 
                emissive="#ffaa00"
                emissiveIntensity={6} // High Glow
                roughness={0.1}
                metalness={1}
              />
            </CustomStar>
         </Float>
      </group>
    </group>
  );
};