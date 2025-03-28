// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const originalPreview = document.getElementById('originalPreview');
const transformedPreview = document.getElementById('transformedPreview');
const tabsList = document.getElementById('tabsList');
const tabContents = document.querySelectorAll('.tab-content');
const widthSlider = document.getElementById('widthSlider');
const heightSlider = document.getElementById('heightSlider');
const widthValue = document.getElementById('widthValue');
const heightValue = document.getElementById('heightValue');
const greyscaleToggle = document.getElementById('greyscaleToggle');
const hueSlider = document.getElementById('hueSlider');
const saturateSlider = document.getElementById('saturateSlider');
const hueValue = document.getElementById('hueValue');
const saturateValue = document.getElementById('saturateValue');
const formatButtons = document.getElementById('formatButtons');
const transformButton = document.getElementById('transformButton');
const downloadButton = document.getElementById('downloadButton');
const toastContainer = document.getElementById('toastContainer');
const currentYear = document.getElementById('currentYear');

// Set current year in footer
currentYear.textContent = new Date().getFullYear();

// State management
let selectedFile = null;
let transformedImageUrl = null;
let isTransforming = false;

// Default transformation options
const transformOptions = {
	resize: {
		width: 1,
		height: 1,
	},
	filter: {
		greyscale: false,
		hue: 1,
		saturate: 1,
	},
	format: undefined,
};

const transfromDefaults = _.cloneDeep(transformOptions);

// Initialize event listeners
function initEventListeners() {
	// File upload events
	uploadArea.addEventListener('click', () => fileInput.click());
	fileInput.addEventListener('change', handleFileSelect);
	uploadArea.addEventListener('dragover', handleDragOver);
	uploadArea.addEventListener('dragleave', handleDragLeave);
	uploadArea.addEventListener('drop', handleDrop);

	// Tab navigation
	tabsList.addEventListener('click', handleTabClick);

	// Slider inputs
	widthSlider.addEventListener('input', updateWidthValue);
	heightSlider.addEventListener('input', updateHeightValue);
	hueSlider.addEventListener('input', updateHueValue);
	saturateSlider.addEventListener('input', updateSaturateValue);

	// Toggle inputs
	greyscaleToggle.addEventListener('change', updateGreyscaleValue);

	// Format selection
	formatButtons.addEventListener('click', handleFormatSelection);

	// Transform and download actions
	transformButton.addEventListener('click', handleTransform);
	downloadButton.addEventListener('click', handleDownload);
}

// File handling functions
function handleFileSelect(event) {
	const file = event.target.files[0];
	if (file && file.type.startsWith('image/')) {
		processSelectedFile(file);
	}
}

function handleDragOver(event) {
	event.preventDefault();
	uploadArea.classList.add('drag-over');
}

function handleDragLeave() {
	uploadArea.classList.remove('drag-over');
}

function handleDrop(event) {
	event.preventDefault();
	uploadArea.classList.remove('drag-over');

	if (event.dataTransfer.files && event.dataTransfer.files[0]) {
		const file = event.dataTransfer.files[0];
		if (file.type.startsWith('image/')) {
			processSelectedFile(file);
		} else {
			showToast('Error', 'Please upload an image file', 'error');
		}
	}
}

function processSelectedFile(file) {
	selectedFile = file;
	createImagePreview(file, originalPreview);
	transformButton.disabled = false;
	downloadButton.disabled = true;
	transformedPreview.innerHTML = '<p class="no-image-text">Transform the image to see preview</p>';
	transformedImageUrl = null;
}

function createImagePreview(file, container) {
	const reader = new FileReader();

	// Clear the container
	container.innerHTML = '';

	// Show loading state
	const loadingElement = document.createElement('div');
	loadingElement.className = 'spinner';
	container.appendChild(loadingElement);

	reader.onload = function (e) {
		container.innerHTML = '';
		const img = document.createElement('img');
		img.src = e.target.result;
		img.style.opacity = '0';

		img.onload = function () {
			img.style.opacity = '1';
		};

		img.onerror = function () {
			container.innerHTML = '<p class="no-image-text">Failed to load image</p>';
		};

		container.appendChild(img);
	};

	reader.onerror = function () {
		container.innerHTML = '<p class="no-image-text">Failed to load image</p>';
	};

	reader.readAsDataURL(file);
}

// Tab handling
function handleTabClick(event) {
	if (event.target.classList.contains('tab-trigger')) {
		const tabId = event.target.dataset.tab;

		// Update active tab
		document.querySelectorAll('.tab-trigger').forEach((tab) => {
			tab.classList.remove('active');
		});
		event.target.classList.add('active');

		// Show corresponding content
		tabContents.forEach((content) => {
			content.classList.remove('active');
		});
		document.getElementById(`${tabId}Tab`).classList.add('active');
	}
}

// Update transform option values
function updateWidthValue() {
	const value = widthSlider.value;
	widthValue.textContent = value;
	transformOptions.resize.width = parseInt(value);
}

function updateHeightValue() {
	const value = heightSlider.value;
	heightValue.textContent = value;
	transformOptions.resize.height = parseInt(value);
}

function updateHueValue() {
	const value = hueSlider.value;
	hueValue.textContent = value;
	transformOptions.filter.hue = parseInt(value);
}

function updateSaturateValue() {
	const value = saturateSlider.value;
	saturateValue.textContent = value;
	transformOptions.filter.saturate = parseInt(value);
}

function updateGreyscaleValue() {
	transformOptions.filter.greyscale = greyscaleToggle.checked;
}

// Format selection handling
function handleFormatSelection(event) {
	if (event.target.classList.contains('format-button')) {
		const format = event.target.dataset.format;

		// Update active format button
		document.querySelectorAll('.format-button').forEach((button) => {
			button.classList.remove('active');
		});
		event.target.classList.add('active');

		// Update format option
		transformOptions.format = format;
	}
}

// Transform image
async function handleTransform() {
	if (!selectedFile || isTransforming) return;

	isTransforming = true;
	transformButton.disabled = true;

	// Update button to show loading state
	const originalButtonText = transformButton.innerHTML;
	transformButton.innerHTML = '<div class="spinner"></div><span>Transforming...</span>';

	try {
		await transformImage();
		showToast('Success', 'Image transformed successfully', 'success');
	} catch (error) {
		console.error('Transformation error:', error);
		showToast('Error', 'Failed to transform image. Please try again.', 'error');
	} finally {
		// Restore button state
		transformButton.innerHTML = originalButtonText;
		transformButton.disabled = false;
		isTransforming = false;
	}
}

async function transformImage() {
	// Build the URL with query parameters
	const url = buildTransformUrl();

	// Create FormData and append the image
	const formData = new FormData();
	formData.append('image', selectedFile);

	// Send the request
	const response = await fetch(url, {
		method: 'POST',
		body: formData,
	});

	if (!response.ok) {
		throw new Error(`Error: ${response.status}`);
	}

	const res = await response.json();
	const jobid = res.id;

	// Show loading animation in the transformed preview
	transformedPreview.innerHTML = `
    <div class="loading-animation">
      <div class="loading-spinner"></div>
      <p class="loading-text">Transforming your image...</p>
      <div class="loading-progress">
        <div class="loading-bar"></div>
      </div>
      <p class="loading-subtext">This may take a few seconds</p>
    </div>
  `;

	// Start animated progress bar
	const loadingBar = transformedPreview.querySelector('.loading-bar');
	if (loadingBar) {
		loadingBar.style.width = '0%';
		setTimeout(() => {
			loadingBar.style.width = '100%';
			loadingBar.style.transition = 'width 5s linear';
		}, 500);
	}

	// Check for image status
	try {
		let intervalid;
		await new Promise((resolve, reject) => {
			intervalid = setInterval(async () => {
				const response = await fetch(`/status/${jobid}`);
				if (!response.ok) {
					clearInterval(intervalid);
					reject(response.status);
				}
				const res = await response.json();
				switch (res.status) {
					case 'waiting':
					case 'complete':
						clearInterval(intervalid);
						resolve(res.status);
						break;
					case 'paused':
					case 'errored':
					case 'unknown':
					case 'terminated':
						clearInterval(intervalid);
						reject(res.status);
						break;
					default:
						break;
				}
			}, 3000);
		});
	} catch (error) {
		showToast('Error', error.message, 'error');
	}

	// Fetch the transformed image
	const viewResponse = await fetch(`/view/${jobid}`);
	if (!viewResponse.ok) {
		throw new Error(`Error fetching transformed image: ${viewResponse.status}`);
	}

	const blob = await viewResponse.blob();
	transformedImageUrl = URL.createObjectURL(blob);

	// Display the transformed image
	transformedPreview.innerHTML = '';
	const img = document.createElement('img');
	img.src = transformedImageUrl;
	img.style.opacity = '0';

	img.onload = function () {
		img.style.opacity = '1';
		downloadButton.disabled = false;
	};

	transformedPreview.appendChild(img);
}

function buildTransformUrl() {
	const baseUrl = '/upload';
	const params = new URLSearchParams();

	// Add resize parameters
	if (!_.isEqual(transformOptions.resize, transfromDefaults.resize)) {
		params.append('resize[w]', transformOptions.resize.width);
		params.append('resize[h]', transformOptions.resize.height);
	}

	// Add format parameter
	if (!_.isEqual(transformOptions.format, transfromDefaults.format)) {
		params.append('format', transformOptions.format);
	} else {
		transformOptions.format = selectedFile.type.split('/')[1];
	}

	// Add filter parameters

	if (!_.isEqual(transformOptions.filter.greyscale, transfromDefaults.filter.greyscale)) {
		if (transformOptions.filter.greyscale) {
			params.append('filter[greyscale]', '');
		}
	}

	if (!_.isEqual(transformOptions.filter.hue, transfromDefaults.filter.hue)) {
		params.append('filter[hue]', transformOptions.filter.hue);
	}
	if (!_.isEqual(transformOptions.filter.saturate, transfromDefaults.filter.saturate)) {
		params.append('filter[saturate]', transformOptions.filter.saturate);
	}

	return `${baseUrl}?${params.toString()}`;
}

// Download transformed image
async function handleDownload() {
	if (!transformedImageUrl) {
		showToast('Error', 'No transformed image to download', 'error');
		return;
	}

	try {
		const response = await fetch(transformedImageUrl);
		const blob = await response.blob();

		// Create a download link and trigger it
		const downloadLink = document.createElement('a');
		downloadLink.href = URL.createObjectURL(blob);
		downloadLink.download = `transformed.${transformOptions.format}`;
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);

		showToast('Success', 'Image downloaded successfully', 'success');
	} catch (error) {
		console.error('Download error:', error);
		showToast('Error', 'Failed to download image', 'error');
	}
}

// Toast notifications
function showToast(title, message, type = 'success') {
	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;

	toast.innerHTML = `
    <div class="toast-icon">
      ${
				type === 'success'
					? '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
					: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
			}
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <div class="toast-progress"></div>
  `;

	toastContainer.appendChild(toast);

	// Remove the toast after animation completes
	setTimeout(() => {
		toast.style.opacity = '0';
		toast.style.transform = 'translateX(100%)';
		setTimeout(() => {
			toastContainer.removeChild(toast);
		}, 300);
	}, 3000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
	initEventListeners();
});
