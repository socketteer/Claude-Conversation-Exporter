function addDownloadButton() {
  let buttonContainer = document.querySelector(
    ".flex.min-w-0.items-center.max-md\\:text-sm",
  );

  if (
    buttonContainer &&
    !buttonContainer.querySelector(".claude-download-button")
  ) {
    let faLink = document.createElement("link");
    faLink.rel = "stylesheet";
    faLink.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
    document.head.appendChild(faLink);

    let downloadContainer = document.createElement("div");
    downloadContainer.className =
      "claude-download-container ml-1 flex items-center";

    let downloadButton = createButton(
      "download",
      "Download artifacts",
      "downloadArtifacts",
    );

    let optionsDropdown = createOptionsDropdown();

    downloadContainer.appendChild(optionsDropdown);
    downloadContainer.appendChild(downloadButton);
    buttonContainer.appendChild(downloadContainer);
  }
}

function createButton(icon, text, onClick) {
  let button = document.createElement("button");
  button.className =
    "claude-download-button ml-1 flex items-center rounded-md bg-gray-100 py-1 px-3 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2";
  button.innerHTML = `<i class="fa fa-${icon} mr-2"></i>${text}`;
  button.onclick = window[onClick];
  return button;
}

function createOptionsDropdown() {
  let select = document.createElement("select");
  select.className =
    "claude-download-options rounded-md bg-gray-100 py-1 px-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2";

  let flatOption = document.createElement("option");
  flatOption.value = "flat";
  flatOption.textContent = "Flat structure";

  let structuredOption = document.createElement("option");
  structuredOption.value = "structured";
  structuredOption.textContent = "Inferred structure";

  select.appendChild(flatOption);
  select.appendChild(structuredOption);

  return select;
}

function downloadArtifacts() {
  const url = new URL(window.location.href);
  const uuid = url.pathname.split("/").pop();
  const optionsDropdown = document.querySelector(".claude-download-options");
  const useDirectoryStructure = optionsDropdown.value === "structured";
  chrome.runtime.sendMessage({
    action: "downloadArtifacts",
    uuid: uuid,
    useDirectoryStructure: useDirectoryStructure,
  });
}

function checkAndAddShareButtons() {
  if (window.location.href.startsWith("https://claude.ai/chat/")) {
    const maxAttempts = 15;
    let attempts = 0;

    function tryAddButtons() {
      if (attempts < maxAttempts) {
        addDownloadButton();
        if (!document.querySelector(".claude-download-button")) {
          attempts++;
          setTimeout(tryAddButtons, 1000);
        }
      } else {
        console.log("Failed to add share buttons after maximum attempts");
      }
    }
    tryAddButtons();
  }
}

// for already cached pages
checkAndAddShareButtons();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "artifactsProcessed") {
    if (request.success) {
      createBanner(request.message, "success", 1000);
    } else if (request.failure) {
      createBanner(request.message, "error", 1000);
    }
  } else if (request.action === "checkAndAddDownloadButton") {
    // Observe DOM changes to add the button when the container is available
    checkAndAddShareButtons();
  }
  return true;
});
