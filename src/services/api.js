import axios from "axios";

axios.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401) window.dispatchEvent(new Event("session-expired"));
  return Promise.reject(error);
});

// Hook Detection API URLs may carry a trailing slash.
export const normalizeBase = (url) => String(url ?? "").trim().replace(/\/+$/, "");

const TIMEOUT_MS = 4000;

export async function getPerformanceSnapshot(url, signal) {
  const response = await axios.get(`${normalizeBase(url)}/system/performance`, {timeout: TIMEOUT_MS, signal});
  return response.data;
}

export async function getEngagementSummary(url, params, signal) {
  const response = await axios.get(`${normalizeBase(url)}/system/engagements`, {params, timeout: TIMEOUT_MS, signal});
  return response.data;
}

export async function getEngagementEvents(url, {before, bay, day, grouped}, signal) {
  const response = await axios.get(`${normalizeBase(url)}/system/engagement-events`, {
    params: {before, bay, day, grouped: grouped ? 1 : undefined}, timeout: TIMEOUT_MS, signal,
  });
  return response.data;
}

export async function getNetworkCameraAddresses(url, signal) {
  const response = await axios.get(`${normalizeBase(url)}/camera-admin/network-devices`, {timeout: 7000, signal});
  return response.data.addresses;
}

export async function getPoeAssignments(url, signal) {
  const response = await axios.get(`${normalizeBase(url)}/camera-admin/poe-assignments`, {timeout: TIMEOUT_MS, signal});
  return response.data.assignments;
}

const poeAssignmentEndpoint = (url, cameraId) => `${normalizeBase(url)}/camera-admin/poe-assignments/${encodeURIComponent(cameraId)}`;

export async function requestPoeAssignment(url, cameraId, {assignment, signal} = {}) {
  const response = await axios.request({
    url: poeAssignmentEndpoint(url, cameraId),
    method: assignment ? "POST" : "GET",
    data: assignment,
    timeout: TIMEOUT_MS,
    signal,
  });
  return response.data.assignment;
}

export async function removePoeAssignment(url, cameraId, assignment) {
  await axios.delete(poeAssignmentEndpoint(url, cameraId), {data: assignment, timeout: TIMEOUT_MS});
}

/** Hook Detector status in the shape consumed by the dashboard components. */
export async function getState(url, signal) {
  const r = await axios.get(`${normalizeBase(url)}/status`, {timeout: TIMEOUT_MS, signal});
  const status = r.data;
  const cameraConnected = Boolean(status.camera_connected ?? status.frame_ready);
  return {
    ...status,
    api_url: normalizeBase(url),
    state: status.alert_state || status.state,
    state_title: cameraConnected
      ? status.status || status.state
      : status.camera_error || "Camera unavailable",
    severity: status.severity,
    camera_connected: cameraConnected,
    camera_error: status.camera_error || (status.frame_ready ? "" : status.status),
    hook_found: status.hook === "Detected",
    inserted: status.inserted === "Yes",
    inserted_text: status.inserted,
    lift_enabled: status.lift === "Normal",
    voice_alert: status.alert_main,
    ts: Date.now() / 1000,
  };
}

/** Liveness and camera status of the Hook Detector service. */
export async function getHealth(url) {
  const r = await axios.get(`${normalizeBase(url)}/health`, {timeout: TIMEOUT_MS});
  return r.data;
}
