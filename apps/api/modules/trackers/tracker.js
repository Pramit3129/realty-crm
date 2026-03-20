export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname !== "/tracker.js") {
      return new Response("Not found", { status: 404 });
    }

    const script = `
(function () {
  const script = document.currentScript;
  const apiKey = script?.getAttribute("data-key");

  const backendBase = "https://realty-crm-130961755900.northamerica-northeast2.run.app";
  const API_URL = backendBase + "/api/v1/trackers/track-batch";
  const IDENTIFY_URL = backendBase + "/api/v1/trackers/identify";

  function getVisitorId() {
    let id = localStorage.getItem("visitorId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("visitorId", id);
    }
    return id;
  }

  const visitorId = getVisitorId();
  let queue = [];

  function track(event, data = {}) {
    queue.push({
      event,
      data,
      timestamp: Date.now()
    });
  }

  function sendBatch() {
    if (queue.length === 0) return;

    const payload = {
      apiKey,
      visitorId,
      events: queue
    };

    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon(API_URL, blob);
    queue = [];
  }

  track("page_view", { url: window.location.href });

  setInterval(sendBatch, 5000);
  window.addEventListener("beforeunload", sendBatch);

  document.addEventListener("submit", function (e) {
    try {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;

      const emailInput = form.querySelector(
        "input[type='email'], input[name='email'], input[name*='mail']"
      );

      if (!emailInput || !emailInput.value) return;

      const email = emailInput.value.trim();
      if (!email.includes("@")) return;

      const nameInput = form.querySelector("input[name='name'], input[name*='name']");
      const name = nameInput?.value || "";

      navigator.sendBeacon(
        IDENTIFY_URL,
        new Blob([JSON.stringify({
          apiKey,
          visitorId,
          email,
          name
        })], { type: "application/json" })
      );

      track("form_submit", {
        formId: form.id || "unknown",
        emailCaptured: true
      });
    } catch (err) {
      console.warn("CRM form capture error", err);
    }
  });

  window.crmTracker = {
    track,
    identify: async function(email, name) {
      if (!email) return console.error("Email required");

      try {
        await fetch(IDENTIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey,
            visitorId,
            email,
            name
          })
        });
      } catch (err) {
        console.error("Identify failed:", err);
      }
    }
  };
})();
`;

    return new Response(script, {
      headers: {
        "content-type": "application/javascript; charset=UTF-8",
        "cache-control": "public, max-age=86400"
      }
    });
  }
};