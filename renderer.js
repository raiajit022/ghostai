import { marked } from './node_modules/marked/lib/marked.esm.js';
import DOMPurify from './node_modules/dompurify/dist/purify.es.mjs';

const answer = document.querySelector('#answer');
const emptyState = document.querySelector('#empty-state');
const loading = document.querySelector('#loading');
const status = document.querySelector('#status');
const modelLabel = document.querySelector('#model');
let responseText = '';
let renderFrame = null;
let activeRequestId = null;

marked.setOptions({ gfm: true, breaks: true });

function resizeToContent() {
  const width = answer.querySelector('pre') ? 920 : 760;
  const height = Math.max(320, document.documentElement.scrollHeight + 24);
  window.simpleGhost.resizeWindow({ width, height }).catch(() => {});
}

function renderResponse() {
  renderFrame = null;
  answer.innerHTML = DOMPurify.sanitize(marked.parse(responseText), { USE_PROFILES: { html: true } });
  answer.hidden = false;
  resizeToContent();
}

function scheduleRender() {
  if (!renderFrame) renderFrame = requestAnimationFrame(renderResponse);
}

window.simpleGhost.onAnalysisEvent((event) => {
  if (!event || typeof event.type !== 'string') return;
  if (event.type === 'start') {
    activeRequestId = event.requestId;
    responseText = '';
    answer.replaceChildren();
    answer.hidden = true;
    emptyState.hidden = true;
    loading.hidden = false;
    status.textContent = 'Analysing screenshot…';
    modelLabel.textContent = event.model || '';
  } else if (event.type === 'chunk') {
    if (event.requestId !== activeRequestId) return;
    loading.hidden = true;
    responseText += typeof event.text === 'string' ? event.text : '';
    scheduleRender();
  } else if (event.type === 'complete') {
    if (event.requestId !== activeRequestId) return;
    loading.hidden = true;
    status.textContent = 'Ready';
    scheduleRender();
  } else if (event.type === 'clear') {
    activeRequestId = null;
    responseText = '';
    answer.replaceChildren();
    answer.hidden = true;
    loading.hidden = true;
    emptyState.hidden = false;
    status.textContent = 'Ready';
    resizeToContent();
  } else if (event.type === 'error') {
    if (event.requestId !== activeRequestId) return;
    loading.hidden = true;
    emptyState.hidden = true;
    answer.hidden = false;
    answer.replaceChildren();
    const message = document.createElement('p');
    message.className = 'error';
    message.textContent = event.message || 'Unexpected analysis error.';
    answer.append(message);
    status.textContent = 'Error';
    resizeToContent();
  }
});

document.querySelector('.actions').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (button) window.simpleGhost.runAction(button.dataset.action).catch(() => {});
});
