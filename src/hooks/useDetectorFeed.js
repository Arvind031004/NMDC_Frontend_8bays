import {useEffect, useRef, useState} from "react";
import {getState} from "../services/api";

const HISTORY_LIMIT = 20;

export default function useDetectorFeed(url, {pollMs = 500} = {}) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState("connecting");
  const [history, setHistory] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const lastState = useRef(null);

  useEffect(() => {
    setData(null);
    setConnected(false);
    setTransport("connecting");
    setHistory([]);
    setConnectionError(null);
    lastState.current = null;
    if (!url) return undefined;

    let disposed = false;

    const accept = (payload) => {
      if (disposed || !payload) return;
      setData(payload);
      setConnected(Boolean(payload.camera_connected));
      setConnectionError(null);
      if (payload.camera_connected && payload.state && payload.state !== "-" && payload.state !== lastState.current) {
        lastState.current = payload.state;
        setHistory((prev) =>
          [
            {
              state: payload.state,
              title: payload.state_title,
              severity: payload.severity,
              alert: payload.voice_alert,
              offset: payload.offset,
              ts: payload.ts,
            },
            ...prev,
          ].slice(0, HISTORY_LIMIT),
        );
      }
    };

    setTransport("polling");
    const tick = async () => {
      try {
        const res = await getState(url);
        if (!disposed) accept(res);
      } catch (error) {
        if (disposed) return;
        setConnected(false);
        const responseStatus = error?.response?.status;
        const message = responseStatus
          ? `Detector API returned HTTP ${responseStatus}.`
          : "Cannot reach the detector API. Confirm the app is running and reload this page.";
        setConnectionError(message);
        setData({
          camera_connected: false,
          camera_error: message,
          state_title: "Detector API unavailable",
          alert_main: message,
        });
      }
    };

    tick();
    const pollTimer = setInterval(tick, pollMs);

    return () => {
      disposed = true;
      clearInterval(pollTimer);
    };
  }, [url, pollMs]);

  return {data, connected, transport, history, connectionError};
}