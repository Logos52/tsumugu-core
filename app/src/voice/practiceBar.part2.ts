export interface PracticeBar {
  
  setCue(cueIndex: number): void;
  
  toggleLoop(): void;
  
  nudge(dir: -1 | 1): void;
  
  cycleSpeed(): number;
  
  playPause(): void;
  isLooping(): boolean;
  
  destroy(): void;
}
