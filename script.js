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
const errorMessage = document.querySelector('#error-message');

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

function shortenWithJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `isgd_${Date.now()}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => finish(new Error('단축 서비스 응답이 늦어지고 있어요. 다시 시도해 주세요.')), 10000);

    function finish(error, value) {
      clearTimeout(timer);
      script.remove();
      delete window[callbackName];
      error ? reject(error) : resolve(value);
    }

    window[callbackName] = (data) => {
      if (data.shorturl) finish(null, data.shorturl);
      else finish(new Error(data.errormessage || 'URL을 단축하지 못했어요.'));
    };

    script.onerror = () => finish(new Error('단축 서비스에 연결할 수 없어요.'));
    script.src = `https://is.gd/create.php?format=json&callback=${callbackName}&url=${encodeURIComponent(url)}`;
    document.body.appendChild(script);
  });
}

shortenButton.addEventListener('click', async () => {
  try {
    const url = getValidUrl();
    shortenButton.disabled = true;
    shortenButton.lastChild.textContent = ' 단축 중...';
    const shortened = await shortenWithJsonp(url);
    shortUrl.textContent = shortened;
    shortUrl.href = shortened;
    result.hidden = false;
    shortResult.hidden = false;
    qrResult.hidden = true;
  } catch (error) {
    showError(error);
  } finally {
    shortenButton.disabled = false;
    shortenButton.lastChild.textContent = ' URL 단축하기';
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
    await navigator.clipboard.writeText(shortUrl.href);
    copyButton.textContent = '복사됨';
    setTimeout(() => { copyButton.textContent = '복사'; }, 1400);
  } catch {
    shortUrl.focus();
    errorMessage.textContent = '주소를 길게 눌러 직접 복사해 주세요.';
  }
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    shortenButton.click();
  }
});
