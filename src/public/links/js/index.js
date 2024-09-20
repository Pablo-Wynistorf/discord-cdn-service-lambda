document.addEventListener("DOMContentLoaded", function () {
  const links = JSON.parse(localStorage.getItem("cdnLinks")) || [];
  displayLinksInTable(links);
});

function displayLinksInTable(links) {
  const cdnTableBody = document.getElementById("cdnTableBody");
  cdnTableBody.innerHTML = "";

  if (links.length === 0) {
    displayStatus("Error", "You have not uploaded any files yet.");
    return;
  }

  
  const cdnTable = document.getElementById("cdnTable");
  cdnTable.classList.remove("hidden");

  links.forEach((linkObj) => {
    for (const [fileName, cdnLink] of Object.entries(linkObj)) {
      const row = document.createElement("tr");

      const copyCell = document.createElement("td");
      copyCell.className = "whitespace-nowrap px-3 py-4 text-sm text-gray-300";
      const copyButton = document.createElement("button");
      copyButton.className = "copy-btn bg-gray-700 text-white px-2 py-1 rounded border border-slate-500 hover:border-slate-100";
      copyButton.textContent = "Copy";
      copyButton.addEventListener("click", () => copyToClipboard(cdnLink));
      copyCell.appendChild(copyButton);
      row.appendChild(copyCell);

      const fileNameCell = document.createElement("td");
      fileNameCell.className = "whitespace-nowrap px-3 py-4 text-sm text-gray-300";
      fileNameCell.textContent = fileName;
      row.appendChild(fileNameCell);

      const cdnLinkCell = document.createElement("td");
      cdnLinkCell.className = "whitespace-nowrap px-3 py-4 text-sm text-gray-300";
      const cdnLinkAnchor = document.createElement("a");
      cdnLinkAnchor.href = cdnLink;
      cdnLinkAnchor.target = "_blank";
      cdnLinkAnchor.textContent = cdnLink;
      cdnLinkCell.appendChild(cdnLinkAnchor);
      row.appendChild(cdnLinkCell);

      cdnTableBody.appendChild(row);
    }
  });
}

function copyToClipboard(text) {
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "absolute";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
  displayStatus("Success", "Link copied to clipboard");
}

document.getElementById("upload-button").addEventListener("click", function () {
  window.location.href = "/";
});

function displayStatus(status, message) {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.innerText = message;
  if (status === "Success") {
    statusMessage.classList.remove("bg-red-400");
    statusMessage.classList.add("bg-green-400");
  } else {
    statusMessage.classList.remove("bg-green-400");
    statusMessage.classList.add("bg-red-400");
  }
  statusMessage.style.display = "flex";

  setTimeout(() => {
    dismissStatusMessage();
  }, 5000);
}

function dismissStatusMessage() {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.style.display = "none";
}
