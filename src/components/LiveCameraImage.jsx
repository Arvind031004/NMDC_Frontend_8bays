import {useEffect, useRef} from "react";

// Request the newest frame only after decoding the previous one, so slow
// clients cannot accumulate a playback queue or occupy a connection per feed.
export default function LiveCameraImage({endpoint, aiToken, onAiExpired, onLoad, onError, ...props}) {
  const image = useRef(null);
  const callbacks = useRef({onLoad, onError});
  callbacks.current = {onLoad, onError, onAiExpired};

  useEffect(() => {
    let stopped = false;
    let busy = false;
    let timer;
    let currentUrl;
    let controller;
    const next = async () => {
      if (stopped || document.hidden || busy) return;
      busy = true;
      const started = performance.now();
      let delay = 0;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      let candidate;
      try {
        const resource = aiToken ? "ai-snapshot.jpg" : "snapshot.jpg";
        const response = await fetch(`${endpoint}/${resource}`, {
          cache: "no-store", signal: controller.signal,
          headers: aiToken ? {"X-AI-Token": aiToken} : {},
        });
        if (!stopped && aiToken && [401, 403].includes(response.status)) {
          callbacks.current.onAiExpired?.();
          return;
        }
        if (!response.ok) throw new Error(`Camera returned HTTP ${response.status}`);
        candidate = URL.createObjectURL(await response.blob());
        const decoded = new Image();
        decoded.src = candidate;
        await decoded.decode();
        if (!stopped && !document.hidden && image.current) {
          image.current.src = candidate;
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          currentUrl = candidate;
          candidate = undefined;
          callbacks.current.onLoad?.();
        }
      } catch (error) {
        if (!stopped && !document.hidden) callbacks.current.onError?.(error);
        delay = 1000;
      } finally {
        busy = false;
        clearTimeout(timeout);
        if (candidate) URL.revokeObjectURL(candidate);
        if (!stopped && !document.hidden) {
          timer = setTimeout(next, Math.max(delay, 1000 / 30 - (performance.now() - started)));
        }
      }
    };
    const visibilityChanged = () => {
      clearTimeout(timer);
      if (document.hidden) controller?.abort();
      else next();
    };
    next();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibilityChanged);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [endpoint, aiToken]);

  return <img ref={image} {...props} />;
}
