/**
 * Scene-aware Control Registry
 * 
 * Defines numeric control IDs that map to sliders in the conductor UI.
 * Control numbers are consistent within a scene, allowing Max/MSP patches
 * to use integer-only commands: target, control, value
 * 
 * Control IDs start at 1 (0 is reserved for global/scene controls in OSC)
 */

export interface ControlDefinition {
  id: number;
  name: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export interface SceneControls {
  sceneName: string;
  controls: ControlDefinition[];
}

// Audio Score scene controls
export const AUDIO_SCORE_CONTROLS: SceneControls = {
  sceneName: "audioScore",
  controls: [
    {
      id: 1,
      name: "pitch",
      min: 36,
      max: 84,
      step: 1,
      defaultValue: 69,
      unit: "MIDI",
    },
    {
      id: 2,
      name: "interval",
      min: 50,
      max: 3000,
      step: 50,
      defaultValue: 1000,
      unit: "ms",
    },
  ],
};

// Registry of all scene controls
export const SCENE_CONTROLS: Record<string, SceneControls> = {
  audioScore: AUDIO_SCORE_CONTROLS,
};

// Get control definition by numeric ID for a scene
export function getControlById(sceneName: string, controlId: number): ControlDefinition | undefined {
  const scene = SCENE_CONTROLS[sceneName];
  if (!scene) return undefined;
  return scene.controls.find((c) => c.id === controlId);
}

// Get control definition by name for a scene
export function getControlByName(sceneName: string, controlName: string): ControlDefinition | undefined {
  const scene = SCENE_CONTROLS[sceneName];
  if (!scene) return undefined;
  return scene.controls.find((c) => c.name === controlName);
}

// Resolve control (accepts either ID or name)
export function resolveControl(sceneName: string, control: number | string): ControlDefinition | undefined {
  if (typeof control === "number") {
    return getControlById(sceneName, control);
  }
  return getControlByName(sceneName, control);
}

// Get all controls for a scene
export function getSceneControls(sceneName: string): ControlDefinition[] {
  return SCENE_CONTROLS[sceneName]?.controls || [];
}

// List all available scenes
export function getAvailableScenes(): string[] {
  return Object.keys(SCENE_CONTROLS);
}
