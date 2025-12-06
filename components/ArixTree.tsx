
import React, { useMemo, useRef, useLayoutEffect } from 'react';
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

// Snow Particles (Falling white glowing particles)
const SnowParticles = () => {
  const count = 6000; 
  const meshRef = useRef<THREE.Points>(null);

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Random position in a large cylinder volume
      const r = Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      
      pos[i * 3] = r * Math.cos(theta); // x
      pos[i * 3 + 1] = Math.random() * 60 - 30; // y: spread vertically
      pos[i * 3 + 2] = r * Math.sin(theta); // z
      
      // Fall speed - Reduced speed
      vel[i * 3] = (Math.random() - 0.5) * 0.5; // drift x
      vel[i * 3 + 1] = -(Math.random() * 0.05 + 0.05); // fall y
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5; // drift z
    }
    return [pos, vel];
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const posAttribute = meshRef.current.geometry.attributes.position;
    const currentPositions = posAttribute.array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Update Y
      currentPositions[i * 3 + 1] += velocities[i * 3 + 1]; // Fall down
      
      // Update X/Z drift
      currentPositions[i * 3] += velocities[i * 3];
      currentPositions[i * 3 + 2] += velocities[i * 3 + 2];

      // Respawn at top if too low
      if (currentPositions[i * 3 + 1] < -30) {
        currentPositions[i * 3 + 1] = 30;
        // Randomize x/z again slightly on respawn for variety
        const r = Math.random() * 40;
        const theta = Math.random() * Math.PI * 2;
        currentPositions[i * 3] = r * Math.cos(theta);
        currentPositions[i * 3 + 2] = r * Math.sin(theta);
      }
    }
    posAttribute.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15} 
        color="#ffffff"
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
      />
    </points>
  );
};

// Ambient Background Particles (Breathing Effect)
const AmbientParticles = () => {
  const count = 3500;
  const meshRef = useRef<THREE.Points>(null);

  const [positions, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const r = 45 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      phase[i] = Math.random() * Math.PI * 2;
    }
    return [pos, phase];
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    meshRef.current.rotation.y = time * 0.03;
    const opacity = 0.3 + 0.2 * Math.sin(time * 0.5);
    (meshRef.current.material as THREE.PointsMaterial).opacity = opacity;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.25}
        color={COLORS.GOLD_METALLIC}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
      />
    </points>
  );
};

export const ArixTree: React.FC<ArixTreeProps> = ({ targetState }) => {
  const boxRef = useRef<THREE.InstancedMesh>(null);
  const sphereRef = useRef<THREE.InstancedMesh>(null);
  const dodecaRef = useRef<THREE.InstancedMesh>(null);
  const tetraRef = useRef<THREE.InstancedMesh>(null);
  const starRef = useRef<THREE.Group>(null);
  
  const progress = useRef(0);
  
  // Rotation Sequence Logic
  const rotationSequenceStartRef = useRef<number | null>(null);

  const layerRefs = {
    box: boxRef,
    sphere: sphereRef,
    dodecahedron: dodecaRef,
    tetrahedron: tetraRef
  };

  // Generate Data
  const particles = useMemo(() => {
    const allIndices = Array.from({ length: CONFIG.PARTICLE_COUNT }, (_, i) => i);
    for (let i = allIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
    }

    let globalIndexPointer = 0;

    return LAYERS.map((type) => {
      return new Array(COUNTS_PER_LAYER).fill(null).map((_, i) => {
        const treeIndex = allIndices[globalIndexPointer++];
        const rotEuler = generateRandomRotation();
        return {
          id: i,
          scatterPos: getRandomSpherePoint(CONFIG.SCATTER_RADIUS),
          treePos: getTreePoint(treeIndex, CONFIG.PARTICLE_COUNT, 0),
          // We need a mutable current rotation vector for variable speed integration
          currentRot: new THREE.Vector3(rotEuler.x, rotEuler.y, rotEuler.z),
          scale: 0.15 + Math.random() * 0.35,
          color: getRandomPaletteColor(COLORS.PALETTE),
          rotationSpeed: (Math.random() + 0.2) * 1.0
        };
      });
    });
  }, []);

  const starData = useMemo(() => ({
    scatterPos: getRandomSpherePoint(CONFIG.SCATTER_RADIUS),
    treePos: new THREE.Vector3(0, CONFIG.TREE_HEIGHT / 2 + 1.5, 0),
  }), []);

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

    // 2. Rotation Sequence Logic
    // If we switch back to TREE mode, reset the sequence
    if (targetState === TreeMorphState.TREE_SHAPE) {
      rotationSequenceStartRef.current = null;
    }

    // Trigger when entering Scatter State and ALMOST there (progress < 0.25 means > 75% complete scatter)
    // This creates the effect of speeding up "as it arrives"
    if (targetState === TreeMorphState.SCATTERED && progress.current < 0.25 && rotationSequenceStartRef.current === null) {
      rotationSequenceStartRef.current = time;
    }

    // Calculate speed multiplier based on timeline
    let speedMult = 1.0;
    if (rotationSequenceStartRef.current !== null) {
      const dt = time - rotationSequenceStartRef.current;
      
      if (dt < 1.0) {
        // Phase 1: Ramp Up (0 to 1s) -> Speed goes 1x to 20x
        const tRamp = dt / 1.0;
        speedMult = 1.0 + (19.0 * tRamp);
      } else if (dt < 4.0) {
        // Phase 2: Hold High Speed (1s to 4s, duration 3s) -> Speed 20x
        speedMult = 20.0;
      } else {
        // Phase 3: Decay (4s onwards) -> Speed 20x to 1x
        // Let's decay over 2 seconds
        const decayDuration = 2.0;
        const decayDt = dt - 4.0;
        if (decayDt < decayDuration) {
           const tDecay = decayDt / decayDuration;
           speedMult = 20.0 - (19.0 * tDecay);
        } else {
           speedMult = 1.0;
        }
      }
    }

    // Interpolation Ease for Position
    const t = progress.current;
    const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // 3. Update Particles
    particles.forEach((layerData, index) => {
      const type = LAYERS[index];
      const ref = layerRefs[type].current;
      
      if (!ref) return;

      layerData.forEach((data, i) => {
        // Position
        tempVec3.lerpVectors(data.scatterPos, data.treePos, easeT);

        // Noise movement (Only when not in tree shape or strictly transitioning)
        if (t < 0.95) {
          tempVec3.y += Math.sin(time + data.id * 0.1) * 0.1 * (1 - t);
          tempVec3.x += Math.cos(time * 0.5 + data.id) * 0.1 * (1 - t);
        }

        // Variable Speed Rotation Integration
        const currentSpeed = data.rotationSpeed * speedMult;
        data.currentRot.x += currentSpeed * delta;
        data.currentRot.y += currentSpeed * delta;
        data.currentRot.z += currentSpeed * delta;

        dummy.rotation.set(
          data.currentRot.x,
          data.currentRot.y,
          data.currentRot.z
        );

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
      <AmbientParticles />
      <SnowParticles />
      
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

      <group ref={starRef}>
         <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <CustomStar 
              innerRadius={1.5 * 0.382} 
              outerRadius={1.5} 
              depth={0.4} 
              count={5} 
              position={[0,0,0]}
            >
              <meshStandardMaterial 
                color={COLORS.GOLD_METALLIC} 
                emissive="#ffaa00"
                emissiveIntensity={6} 
                roughness={0.1}
                metalness={1}
              />
            </CustomStar>
         </Float>
      </group>
    </group>
  );
};
