import * as THREE from 'three';
import { CONFIG } from '../constants';

const { TREE_HEIGHT, TREE_RADIUS, SCATTER_RADIUS } = CONFIG;

/**
 * Generates a random point inside a sphere.
 */
export const getRandomSpherePoint = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  
  const sinPhi = Math.sin(phi);
  const x = r * sinPhi * Math.cos(theta);
  const y = r * sinPhi * Math.sin(theta);
  const z = r * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
};

/**
 * Generates a point on a cone surface (Christmas tree shape) using a spiral distribution.
 * Normalized Y from 0 (bottom) to 1 (top).
 */
export const getTreePoint = (index: number, total: number, offset: number = 0): THREE.Vector3 => {
  // Add an offset to the index to interleave layers nicely in the spiral
  const adjustedIndex = index + offset;
  const yNormal = adjustedIndex / total; // 0 to 1
  const y = (yNormal * TREE_HEIGHT) - (TREE_HEIGHT / 2); // Center vertically
  
  // Radius decreases as we go up
  // Power function to make the tree fuller at bottom
  const r = Math.pow((1 - yNormal), 1.2) * TREE_RADIUS;
  
  // Golden angle for organic distribution
  const theta = adjustedIndex * 2.39996; 
  
  // Add random depth jitter to fill the volume, not just surface
  const rJittered = r * (0.8 + Math.random() * 0.4);

  const x = rJittered * Math.cos(theta);
  const z = rJittered * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
};

export const generateRandomRotation = (): THREE.Euler => {
  return new THREE.Euler(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  );
};

export const getRandomPaletteColor = (palette: string[]): string => {
  return palette[Math.floor(Math.random() * palette.length)];
};