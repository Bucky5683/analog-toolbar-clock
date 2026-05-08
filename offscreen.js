const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");

function getColorScheme() {
  return darkModeQuery.matches ? "dark" : "light";
}

function notifyColorSchemeChanged() {
  chrome.runtime.sendMessage({
    type: "COLOR_SCHEME_CHANGED",
    colorScheme: getColorScheme()
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "GET_COLOR_SCHEME") {
    return false;
  }

  sendResponse({
    colorScheme: getColorScheme()
  });

  return false;
});

darkModeQuery.addEventListener("change", notifyColorSchemeChanged);
