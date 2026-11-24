// The Python app serves both this frontend and the configured camera feed.
export const HOOK_DETECTION_API =
  (import.meta.env.VITE_HOOK_DETECTION_API || window.location.origin).replace(/\/+$/, "");

const BAY_COUNT = 8;
const HOOKS_PER_BAY = 2;

export const bays = Array.from({length: BAY_COUNT}, (_, bayIndex) => ({
  id: `Bay-${String(bayIndex + 1).padStart(2, "0")}`,
  hooks: Array.from({length: HOOKS_PER_BAY}, (_, hookIndex) => ({
    id: `Bay-${String(bayIndex + 1).padStart(2, "0")}-Camera-${hookIndex + 1}`,
    name: hookIndex === 0 ? "Left camera" : "Right camera",
    side: hookIndex === 0 ? "Left" : "Right",
    url: HOOK_DETECTION_API,
    endpoint: `${HOOK_DETECTION_API}/camera/Bay-${String(bayIndex + 1).padStart(2, "0")}-Camera-${hookIndex + 1}`,
  })),
}));
