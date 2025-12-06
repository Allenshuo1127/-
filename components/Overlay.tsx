import React from 'react';
import { TreeMorphState } from '../types';
import { Sparkles, Box, Maximize2 } from 'lucide-react';

interface OverlayProps {
  currentState: TreeMorphState;
  onToggle: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({ currentState, onToggle }) => {
  const isTree = currentState === TreeMorphState.TREE_SHAPE;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
      {/* Header */}
      <div className="flex flex-col items-start pointer-events-auto animate-fade-in-down">
        <h1 className="text-4xl md:text-6xl text-white font-serif tracking-tighter drop-shadow-lg">
          MERRY <span className="text-[#D4AF37]">CHRISTMAS</span>
        </h1>
        <p className="text-emerald-100/60 mt-2 font-light tracking-widest text-sm uppercase">
          Est. December 25, 336 AD
        </p>
      </div>

      {/* Center Controls */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto">
        <button
          onClick={onToggle}
          className={`
            group relative flex items-center justify-center gap-3 px-8 py-4 
            backdrop-blur-md border border-white/20 rounded-full 
            transition-all duration-500 ease-out
            hover:border-[#D4AF37]/80 hover:bg-white/5
            ${isTree ? 'bg-emerald-900/30' : 'bg-black/30'}
          `}
        >
          {/* Animated Glow behind button */}
          <div className="absolute inset-0 rounded-full bg-[#D4AF37] opacity-0 blur-xl group-hover:opacity-20 transition-opacity duration-500" />
          
          <span className={`text-[#D4AF37] transition-transform duration-500 ${isTree ? 'rotate-180' : ''}`}>
             {isTree ? <Maximize2 size={20} /> : <Sparkles size={20} />}
          </span>
          
          <span className="text-white font-serif text-lg tracking-widest">
            {isTree ? 'DISPERSE' : 'ASSEMBLE'}
          </span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-end text-white/30 text-xs font-mono">
        <div>
          COORD: {isTree ? 'CONE_SPIRAL_V2' : 'SPHERICAL_CHAOS'}
        </div>
        <div className="text-right">
          INTERACTIVE EXPERIENCE<br/>
          RENDER: WEBGL 2.0
        </div>
      </div>
    </div>
  );
};