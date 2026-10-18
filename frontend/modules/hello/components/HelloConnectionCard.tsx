"use client";

import { useEffect, useState } from "react";
import { fetchHello } from "@/modules/hello/api/hello";
import type { GreetingState } from "@/modules/hello/types/hello";

export function HelloConnectionCard() {
  const [greeting, setGreeting] = useState<GreetingState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGreeting() {
      setGreeting({ status: "loading" });
      try {
        const data = await fetchHello(controller.signal);
        setGreeting({ status: "success", message: data.message });
      } catch {
        if (!controller.signal.aborted) setGreeting({ status: "error" });
      }
    }

    void loadGreeting();
    return () => controller.abort();
  }, [attempt]);

  const connectionLabel = {
    loading: "CONNECTING",
    success: "CONNECTED",
    error: "OFFLINE",
  }[greeting.status];

  return (
    <article
      className="connection-card"
      id="connection"
      aria-live="polite"
      aria-busy={greeting.status === "loading"}
    >
      <div className="connection-card-top">
        <div className="window-dots" aria-hidden="true"><span /><span /><span /></div>
        <span className="preview-label">LIVE PREVIEW</span>
        <span className={`connection-state ${greeting.status}`}>
          <span className="state-dot" />
          {connectionLabel}
        </span>
      </div>

      <div className="request-row">
        <span className="method-badge">GET</span>
        <code>/api/hello</code>
        <span className="request-arrow" aria-hidden="true">↗</span>
      </div>

      <div className={`response-panel ${greeting.status}`}>
        <span className="response-overline">RESPONSE</span>
        {greeting.status === "loading" ? (
          <p className="greeting-text muted">Waiting for your API<span className="ellipsis">...</span></p>
        ) : greeting.status === "error" ? (
          <div className="error-message">
            <p className="greeting-text">Backend not responding</p>
            <p className="error-detail">Start the services with Docker Compose and try again.</p>
            <button
              className="retry-button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry connection <span aria-hidden="true">↗</span>
            </button>
          </div>
        ) : (
          <>
            <p className="greeting-text">{greeting.message}</p>
            <pre className="json-preview" aria-label="API response JSON">
              <span className="json-brace">{`{`}</span>{"\n"}
              <span className="json-key">  &quot;message&quot;</span>
              <span className="json-punctuation">: </span>
              <span className="json-value">&quot;{greeting.message}&quot;</span>{"\n"}
              <span className="json-brace">{`}`}</span>
            </pre>
          </>
        )}
      </div>

      <div className="flow-row" aria-label="Request flow from frontend to backend">
        <div className="flow-service">
          <span className="service-icon frontend-icon">N</span>
          <span><strong>Next.js</strong><small>Frontend</small></span>
        </div>
        <div className="flow-track" aria-hidden="true">
          <span className="flow-track-line" /><span className="flow-track-node">↗</span>
        </div>
        <div className="flow-service">
          <span className="service-icon backend-icon">ϟ</span>
          <span><strong>FastAPI</strong><small>Backend</small></span>
        </div>
      </div>
    </article>
  );
}