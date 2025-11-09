// background.js
importScripts("jszip.min.js");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadArtifacts") {
    chrome.storage.local.get([`chat_${request.uuid}`], (result) => {
      const payload = result[`chat_${request.uuid}`];
      if (!payload) {
        const msg = "No payload found, try refreshing the page.";
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "artifactsProcessed",
          message: msg,
        });
        return;
      }

      const chatData = payload;
      console.log(payload);
      const zip = new JSZip();
      let artifactCount = 0;
      const usedNames = new Set();

      // Find the most recent root message
      const mostRecentRootMessage = payload.chat_messages
        .filter(
          (message) =>
            message.parent_message_uuid ===
            "00000000-0000-4000-8000-000000000000",
        )
        .reduce((latest, current) => {
          return new Date(current.updated_at) > new Date(latest.updated_at)
            ? current
            : latest;
        });

      // Use the directory structure option from the request
      const useDirectoryStructure = request.useDirectoryStructure;

      // Start processing from the most recent root message
      if (mostRecentRootMessage) {
        artifactCount = processMessage(
          mostRecentRootMessage,
          payload,
          zip,
          usedNames,
          0,
          useDirectoryStructure,
        );
      }

      if (artifactCount === 0) {
        const msg = "No artifacts found in this conversation.";
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "artifactsProcessed",
          success: true,
          message: msg,
        });
        return;
      }

      zip.generateAsync({ type: "blob" }).then((content) => {
        const reader = new FileReader();
        reader.onload = function (e) {
          const arrayBuffer = e.target.result;
          chrome.downloads.download(
            {
              url:
                "data:application/zip;base64," +
                arrayBufferToBase64(arrayBuffer),
              filename: `${chatData.name}.zip`,
              saveAs: true,
            },
            (downloadId) => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                chrome.tabs.sendMessage(sender.tab.id, {
                  action: "artifactsProcessed",
                  failure: true,
                  message: "Error downloading artifacts.",
                });
              } else {
                chrome.tabs.sendMessage(sender.tab.id, {
                  action: "artifactsProcessed",
                  success: true,
                  message: `${artifactCount} artifacts downloaded successfully.`,
                });
              }
            },
          );
        };
        reader.readAsArrayBuffer(content);
      });
    });
  }
});

function processMessage(
  message,
  payload,
  zip,
  usedNames,
  artifactCount,
  useDirectoryStructure,
  depth = 0,
) {
  // Process assistant messages
  if (message.sender === "assistant" && message.text) {
    try {
      const artifacts = extractArtifacts(message.text);
      artifacts.forEach((artifact, artifactIndex) => {
        artifactCount++;
        const fileName = getUniqueFileName(
          artifact.title,
          artifact.language,
          message.index,
          usedNames,
          useDirectoryStructure,
        );
        zip.file(fileName, artifact.content);
        console.log(`Added artifact: ${fileName}`);
      });
    } catch (error) {
      console.error(`Error processing message ${message.uuid}:`, error);
    }
  }

  // Prevent excessive recursion
  if (depth > 100) {
    console.warn(
      "Maximum recursion depth reached. Stopping message processing.",
    );
    return artifactCount;
  }

  // Find child messages
  const childMessages = payload.chat_messages.filter(
    (m) => m.parent_message_uuid === message.uuid,
  );

  // Process child messages in chronological order
  childMessages
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((childMessage) => {
      artifactCount = processMessage(
        childMessage,
        payload,
        zip,
        usedNames,
        artifactCount,
        useDirectoryStructure,
        depth + 1,
      );
    });

  return artifactCount;
}

function extractArtifacts(text) {
  const artifactRegex = /<antArtifact[^>]*>([\s\S]*?)<\/antArtifact>/g;
  const artifacts = [];
  let match;

  while ((match = artifactRegex.exec(text)) !== null) {
    const fullTag = match[0];
    const content = match[1];

    const titleMatch = fullTag.match(/title="([^"]*)/);
    const languageMatch = fullTag.match(/language="([^"]*)/);

    artifacts.push({
      title: titleMatch ? titleMatch[1] : "Untitled",
      language: languageMatch ? languageMatch[1] : "txt",
      content: content.trim(),
    });
  }

  return artifacts;
}

function getUniqueFileName(
  title,
  language,
  messageIndex,
  usedNames,
  useDirectoryStructure,
) {
  let baseName = title.replace(/[^\w\-._]+/g, "_");
  let extension = getFileExtension(language);

  let fileName = useDirectoryStructure
    ? inferDirectoryStructure(baseName, extension)
    : `${messageIndex + 1}_${baseName}${extension}`;
  if (usedNames.has(fileName)) {
    let suffix = "";
    let suffixCount = 1;
    while (usedNames.has(fileName)) {
      suffix = `_${"*".repeat(suffixCount)}`;
      fileName = useDirectoryStructure
        ? inferDirectoryStructure(baseName, extension, messageIndex, suffix)
        : `${messageIndex + 1}_${baseName}${suffix}${extension}`;
      suffixCount++;
    }
  }

  usedNames.add(fileName);
  return fileName;
}

function inferDirectoryStructure(
  baseName,
  extension,
  messageIndex = null,
  suffix = "",
) {
  const parts = baseName.split("/");
  if (parts.length > 1) {
    const fileName = `${parts.pop()}${suffix}${extension}`;
    const directory = parts.join("/");
    return messageIndex !== null
      ? `${directory}/${messageIndex + 1}_${fileName}`
      : `${directory}/${fileName}`;
  }
  return messageIndex !== null
    ? `${messageIndex + 1}_${baseName}${suffix}${extension}`
    : `${baseName}${suffix}${extension}`;
}

function getFileExtension(language) {
  const languageToExt = {
    javascript: ".js",
    html: ".html",
    css: ".css",
    python: ".py",
    java: ".java",
    c: ".c",
    cpp: ".cpp",
    ruby: ".rb",
    php: ".php",
    swift: ".swift",
    go: ".go",
    rust: ".rs",
    typescript: ".ts",
    shell: ".sh",
    sql: ".sql",
    kotlin: ".kt",
    scala: ".scala",
    r: ".r",
    matlab: ".m",
  };
  return languageToExt[language.toLowerCase()] || ".txt";
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url && changeInfo.url.startsWith("https://claude.ai/chat/")) {
    chrome.tabs.sendMessage(tabId, { action: "checkAndAddDownloadButton" });
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  (obj) => {
    if (isChatRequest(obj) && !isOwnRequest(obj)) {
      fetchChat(obj).then((resp) => {
        if (resp.chat_messages && resp.uuid) {
          chrome.storage.local.set({ [`chat_${resp.uuid}`]: resp });
        }
      });
    }
  },
  { urls: ["https://api.claude.ai/api/*chat_conversations*"] },
  ["requestHeaders", "extraHeaders"],
);

function isChatRequest(obj) {
  return (
    obj.url.endsWith("?tree=True&rendering_mode=raw") && obj.method === "GET"
  );
}

function isOwnRequest(obj) {
  return (
    obj.requestHeaders?.some((header) => header.name === "X-Own-Request") ??
    false
  );
}

async function fetchChat(obj) {
  const headers = {};
  obj.requestHeaders.forEach((header) => (headers[header.name] = header.value));
  headers["X-Own-Request"] = "true";
  try {
    const response = await fetch(obj.url, {
      method: obj.method,
      headers: headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}
