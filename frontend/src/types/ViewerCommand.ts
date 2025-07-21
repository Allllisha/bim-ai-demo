// Viewer command types for visual manipulation
export type ViewerCommandType = 
  | 'color'           // Change element color
  | 'visibility'      // Show/hide elements
  | 'highlight'       // Highlight specific elements
  | 'isolate'         // Show only specific elements
  | 'reset'           // Reset to default view
  | 'camera'          // Camera movement
  | 'transparency';   // Set transparency

export interface ColorCommand {
  type: 'color';
  target: {
    elementType?: string;     // e.g., "Wall", "Window", "Door"
    elementName?: string;     // Specific element name
    material?: string;        // Material name
    floor?: string;          // Floor name/number
  };
  color: string;              // Hex color or color name
}

export interface VisibilityCommand {
  type: 'visibility';
  action: 'show' | 'hide';
  target: {
    elementType?: string;
    elementName?: string;
    floor?: string;
  };
}

export interface HighlightCommand {
  type: 'highlight';
  target: {
    elementType?: string;
    elementName?: string;
    floor?: string;
  };
  color?: string;             // Optional highlight color
}

export interface IsolateCommand {
  type: 'isolate';
  target: {
    elementType?: string;
    floor?: string;
  };
}

export interface ResetCommand {
  type: 'reset';
  aspect?: 'all' | 'color' | 'visibility' | 'camera';
}

export interface CameraCommand {
  type: 'camera';
  action: 'top' | 'front' | 'side' | 'isometric' | 'focus';
  target?: {
    elementType?: string;
    elementName?: string;
  };
}

export interface TransparencyCommand {
  type: 'transparency';
  target: {
    elementType?: string;
    elementName?: string;
    material?: string;
  };
  opacity: number;            // 0-1
}

export type ViewerCommand = 
  | ColorCommand 
  | VisibilityCommand 
  | HighlightCommand 
  | IsolateCommand 
  | ResetCommand 
  | CameraCommand 
  | TransparencyCommand;

// Helper to create commands
export const ViewerCommands = {
  color: (target: ColorCommand['target'], color: string): ColorCommand => ({
    type: 'color',
    target,
    color
  }),
  
  hide: (target: VisibilityCommand['target']): VisibilityCommand => ({
    type: 'visibility',
    action: 'hide',
    target
  }),
  
  show: (target: VisibilityCommand['target']): VisibilityCommand => ({
    type: 'visibility',
    action: 'show',
    target
  }),
  
  highlight: (target: HighlightCommand['target'], color?: string): HighlightCommand => ({
    type: 'highlight',
    target,
    color
  }),
  
  isolate: (target: IsolateCommand['target']): IsolateCommand => ({
    type: 'isolate',
    target
  }),
  
  reset: (aspect?: ResetCommand['aspect']): ResetCommand => ({
    type: 'reset',
    aspect: aspect || 'all'
  }),
  
  camera: (action: CameraCommand['action'], target?: CameraCommand['target']): CameraCommand => ({
    type: 'camera',
    action,
    target
  }),
  
  transparency: (target: TransparencyCommand['target'], opacity: number): TransparencyCommand => ({
    type: 'transparency',
    target,
    opacity: Math.max(0, Math.min(1, opacity))
  })
};