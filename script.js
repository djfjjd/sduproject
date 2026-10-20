const input = document.querySelector('#url-input');
const shortenButton = document.querySelector('#shorten-btn');
const qrButton = document.querySelector('#qr-btn');
const result = document.querySelector('#result');
const shortResult = document.querySelector('#short-result');
const qrResult = document.querySelector('#qr-result');
const shortUrl = document.querySelector('#short-url');
const qrImage = document.querySelector('#qr-image');
const downloadButton = document.querySelector('#download-btn');
const copyButton = document.querySelector('#copy-btn');
const copyStatus = document.querySelector('#copy-status');
const errorMessage = document.querySelector('#error-message');
const shortenLabel = document.querySelector('#shorten-label');
const loadingDots = document.querySelector('#loading-dots');
let loadingTimer;

function getValidUrl() {
  const value = input.value.trim();
  if (!value) throw new Error('URL을 입력해 주세요.');

  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let parsed;
  try { parsed = new URL(normalized); } catch { throw new Error('올바른 URL을 입력해 주세요.'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('http 또는 https 주소만 사용할 수 있어요.');
  input.value = parsed.href;
  errorMessage.textContent = '';
  return parsed.href;
}

function showError(error) {
  errorMessage.textContent = error.message || '잠시 후 다시 시도해 주세요.';
  input.focus();
}

async function requestShortUrl(endpoint, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${endpoint}?format=json&url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('단축 서비스 오류');
    const data = await response.json();
    if (!data.shorturl) throw new Error(data.errormessage || 'URL을 단축하지 못했어요.');
    return data.shorturl;
  } finally {
    clearTimeout(timeout);
  }
}

async function shortenUrl(url) {
  const services = ['https://is.gd/create.php', 'https://v.gd/create.php'];
  for (const service of services) {
    try {
      return await requestShortUrl(service, url);
    } catch { /* 다음 단축 서비스로 자동 재시도 */ }
  }
  throw new Error('단축 서비스에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
}

function startLoading() {
  let dotCount = 1;
  shortenLabel.textContent = '단축중';
  loadingDots.hidden = false;
  loadingDots.textContent = '.';
  loadingTimer = setInterval(() => {
    dotCount = (dotCount % 3) + 1;
    loadingDots.textContent = '.'.repeat(dotCount);
  }, 450);
}

function stopLoading() {
  clearInterval(loadingTimer);
  shortenLabel.textContent = 'URL 단축하기';
  loadingDots.textContent = '';
  loadingDots.hidden = true;
}

shortenButton.addEventListener('click', async () => {
  try {
    const url = getValidUrl();
    shortenButton.disabled = true;
    startLoading();
    const shortened = await shortenUrl(url);
    shortUrl.value = shortened;
    copyStatus.textContent = '';
    result.hidden = false;
    shortResult.hidden = false;
    qrResult.hidden = true;
  } catch (error) {
    showError(error);
  } finally {
    shortenButton.disabled = false;
    stopLoading();
  }
});

qrButton.addEventListener('click', () => {
  try {
    const url = getValidUrl();
    const source = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=24&data=${encodeURIComponent(url)}`;
    qrImage.src = source;
    downloadButton.href = source;
    result.hidden = false;
    qrResult.hidden = false;
    shortResult.hidden = true;
  } catch (error) {
    showError(error);
  }
});

copyButton.addEventListener('click', async () => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shortUrl.value);
    } else {
      shortUrl.select();
      if (!document.execCommand('copy')) throw new Error('복사 실패');
      window.getSelection()?.removeAllRanges();
    }
    copyStatus.textContent = '클립보드에 복사되었어요.';
    setTimeout(() => { copyStatus.textContent = ''; }, 2200);
  } catch {
    copyStatus.textContent = '복사하지 못했어요. 결과값을 직접 복사해 주세요.';
  }
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    shortenButton.click();
  }
});
