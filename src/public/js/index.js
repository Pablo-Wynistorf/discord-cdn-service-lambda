document.addEventListener("DOMContentLoaded", init);

function init() {
    setupElements();
    loadUploadedFilesFromLocalStorage();
    attachEventListeners();
}

let fileInput, uploadText, loadingIcon, cliModal, cliButton, closeModal, copyCommand, statusMessage, cdnTable;
let mappedUploadUrls = [];
let latestUploadedUrls = [];

function setupElements() {
    fileInput = document.getElementById("fileInput");
    uploadText = document.getElementById("uploadText");
    loadingIcon = document.getElementById("loadingIcon");
    cliModal = document.getElementById("cliModal");
    cliButton = document.getElementById("cliButton");
    closeModal = document.getElementById("closeModal");
    copyCommand = document.getElementById("copyCommand");
    statusMessage = document.getElementById("statusMessage");
    cdnTable = document.getElementById("cdnTable");
}

function attachEventListeners() {
    fileInput.addEventListener("change", handleFileUpload);
    cliButton.addEventListener("click", showCliModal);
    closeModal.addEventListener("click", closeCliModal);
    document.getElementById("filePathInput").addEventListener("keypress", updateCurlCommand);
    copyCommand.addEventListener("click", copyCliCommand);
    document.getElementById("toggleTableButton").addEventListener("click", toggleCdnTable);
}

function showCliModal() {
    cliModal.classList.remove("hidden");
    document.getElementById("filePathInput").focus();
}

function closeCliModal() {
    cliModal.classList.add("hidden");
}

function updateCurlCommand(event) {
    const filePath = event.target.value.trim();
    const curlCommand = `curl -X POST ${window.location.origin}/api/upload -F "file=@${filePath}"`;
    document.getElementById("curlCommand").textContent = curlCommand;
}

function copyCliCommand() {
    const curlCommand = document.getElementById("curlCommand");
    navigator.clipboard.writeText(curlCommand.textContent).then(() => {
        showStatusMessage("CLI command copied to clipboard!");
    });
}

async function handleFileUpload() {
    const files = Array.from(fileInput.files);
    if (files.length === 0) {
        return;
    }

    uploadText.textContent = "Uploading files...";
    loadingIcon.classList.remove("hidden");

    try {
        const formData = new FormData();
        files.forEach(file => formData.append("files", file));

        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Upload failed");
        }

        const { cdnLinks } = await response.json();
        latestUploadedUrls = cdnLinks.map(link => {
            const [fileName, url] = Object.entries(link)[0];
            return { name: fileName, cdnUrl: url };
        });

        saveUploadedFilesToLocalStorage(latestUploadedUrls);
        showUploadedFiles(latestUploadedUrls);
    } catch (error) {
        console.error("Upload error:", error);
        showStatusMessage("Upload failed. Please try again.");
    } finally {
        cleanupAfterUpload();
    }
}

function cleanupAfterUpload() {
    loadingIcon.classList.add("hidden");
    uploadText.textContent = "Click or drag and drop files to upload to CDN";
    fileInput.value = "";
    mappedUploadUrls = [];

    setTimeout(() => {
        updateProgressBar(0); 
        const uploadProgress = document.getElementById("uploadProgress");
        uploadProgress.classList.add("hidden");
    }, 3000);
}

function updateProgressBar(percent) {
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const uploadProgress = document.getElementById("uploadProgress");

    uploadProgress.classList.remove("hidden");
    const cappedPercent = Math.min(percent, 100);
    progressBar.style.width = `${cappedPercent}%`;
    progressText.textContent = `${Math.round(cappedPercent)}%`;

    if (cappedPercent < 100) {
        progressBar.classList.remove("bg-green-500");
        progressBar.classList.add("bg-blue-500");
    } else {
        progressBar.classList.remove("bg-blue-500");
        progressBar.classList.add("bg-green-500");
    }
}

function saveUploadedFilesToLocalStorage(files) {
    const storedFiles = JSON.parse(localStorage.getItem("uploadedFiles")) || [];
    const newFiles = files.map(({ name, cdnUrl }) => ({ name, cdnUrl }));
    const updatedFiles = [...storedFiles, ...newFiles];
    localStorage.setItem("uploadedFiles", JSON.stringify(updatedFiles));
}

function loadUploadedFilesFromLocalStorage() {
    const storedFiles = JSON.parse(localStorage.getItem("uploadedFiles")) || [];
    if (storedFiles.length > 0) {
        mappedUploadUrls = storedFiles;
    }
}

function showUploadedFiles(files) {
    const cdnTableBody = cdnTable.querySelector("tbody");
    const toggleTableButton = document.getElementById("toggleTableButton");
    cdnTable.classList.remove("hidden");
    toggleTableButton.textContent = "Hide Uploaded Files";
    cdnTableBody.innerHTML = "";

    files.forEach((file) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                <button class="cdn-link-copy-button bg-gray-700 text-white px-2 py-1 rounded border border-slate-500 hover:border-slate-100" data-cdn-url="${file.cdnUrl}">Copy URL</button>
            </td>
            <td class="py-2 pl-4 pr-3 text-sm text-white sm:pl-4">${file.name}</td>
            <td class="py-2 pl-4 pr-3 text-sm text-white sm:pl-4">
                <a href="${file.cdnUrl}" target="_blank" class="text-blue-500 hover:underline">${file.cdnUrl}</a>
            </td>
        `;
        cdnTableBody.appendChild(row);
    });

    attachCopyButtons();
}

function attachCopyButtons() {
    const copyButtons = cdnTable.querySelectorAll(".cdn-link-copy-button");
    copyButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const cdnUrl = button.getAttribute("data-cdn-url");
            navigator.clipboard.writeText(cdnUrl).then(() => {
                showStatusMessage("CDN URL copied to clipboard!");
            });
        });
    });
}

function showStatusMessage(message) {
    statusMessage.textContent = message;
    statusMessage.classList.remove("hidden");
    setTimeout(() => {
        statusMessage.classList.add("hidden");
    }, 3000);
}

function toggleCdnTable() {
    const toggleTableButton = this;

    if (cdnTable.classList.contains("hidden")) {
        loadUploadedFilesFromLocalStorage();
        showUploadedFiles(mappedUploadUrls);
        cdnTable.classList.remove("hidden");
        toggleTableButton.textContent = "Hide Uploaded Files";
    } else {
        cdnTable.classList.add("hidden");
        toggleTableButton.textContent = "Show Uploaded Files";
    }
}
