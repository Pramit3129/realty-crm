(function () {
  const API_URL = "https://api.yourcrm.com/api/track-batch";

  const script = document.currentScript;
  const apiKey = script?.getAttribute("data-key");

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

    navigator.sendBeacon(API_URL, JSON.stringify(payload));
    queue = [];
  }

  track("page_view", { url: window.location.href });

  setInterval(sendBatch, 5000);

  window.addEventListener("beforeunload", sendBatch);

})();