// Content script — runs on teamtreehouse.com pages
// Extracts page info and responds to messages from the popup

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_PAGE_INFO") {
    const h1 = document.querySelector("h1");
    const title = h1
      ? h1.textContent.trim()
      : document.title.replace(/\s*[-|].*$/, "").trim();

    sendResponse({
      url: window.location.href,
      title: title,
    });
  }
  return true; // keep channel open for async response
});
