
export const COLORS = {
  EMERALD_DEEP: "#002816",
  EMERALD_LIGHT: "#006B3C",
  GOLD_METALLIC: "#D4AF37",
  GOLD_HIGHLIGHT: "#FFED8A",
  BG_DARK: "#020202",
  // Weighted Palette: More Greens and Golds, with accents of Red, Orange, Silver
  PALETTE: [
    "#006B3C", // Emerald
    "#006B3C", // Emerald
    "#D4AF37", // Gold
    "#D4AF37", // Gold
    "#C0392B", // Deep Red
    "#D35400", // Pumpkin Orange
    "#F1C40F", // Bright Yellow/Gold
    "#ECF0F1", // Silver
  ]
};

export const CONFIG = {
  // Total particles divided into 4 geometry layers
  PARTICLE_COUNT: 2400, 
  ORNAMENT_COUNT: 0, // Merged into main particles
  TREE_HEIGHT: 16,
  TREE_RADIUS: 6,
  SCATTER_RADIUS: 30,
  ANIMATION_SPEED: 1.0, // Restored to 1.0 (2x of previous 0.5)
  // Increased bloom settings for "dazzle/glare" effect (炫光)
  BLOOM_INTENSITY: 3.5,
  BLOOM_THRESHOLD: 0.2,
  BLOOM_RADIUS: 0.8
};
