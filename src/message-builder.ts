import { type GitHubContext, getRunUrl, getShaShort } from './github-context';

const ALLOWED_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  'ins',
  's',
  'strike',
  'del',
  'a',
  'code',
  'pre'
]);

export function escapeHtml(text: string): string {
  if (!text) return '';

  // First, escape all HTML
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Then unescape allowed tags
  for (const tag of ALLOWED_TAGS) {
    // Opening tags
    escaped = escaped.replace(new RegExp(`&lt;${tag}&gt;`, 'g'), `<${tag}>`);
    // Closing tags
    escaped = escaped.replace(new RegExp(`&lt;/${tag}&gt;`, 'g'), `</${tag}>`);

    // Special handling for <a> with href
    if (tag === 'a') {
      escaped = escaped.replace(/&lt;a href=&quot;([^&]+)&quot;&gt;/g, '<a href="$1">');
    }
  }

  return escaped;
}

function makeLink(text: string, url: string): string {
  const safeUrl = escapeHtml(url);
  const safeText = escapeHtml(text);
  return `<a href="${safeUrl}">${safeText}</a>`;
}

export function buildStartMessage(github: GitHubContext): string {
  const refType = github.ref.startsWith('refs/tags/') ? 'tag' : 'branch';
  const refName = github.ref.replace('refs/heads/', '').replace('refs/tags/', '');

  const header = github.isDeployment ? '🚀 Deployment in progress...' : '⏳ Workflow started...';
  const commitUrl = `${github.serverUrl}/${github.repository}/commit/${github.sha}`;
  const startTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const lines = [
    `<b>${header}</b>`,
    '',
    `📦 <b>Repository:</b> ${makeLink(github.repository, `${github.serverUrl}/${github.repository}`)}`,
    `🔀 <b>${refType.charAt(0).toUpperCase() + refType.slice(1)}:</b> <code>${escapeHtml(refName)}</code>`,
    `🔖 <b>Commit:</b> ${makeLink(getShaShort(github.sha), commitUrl)}`,
    `⚡ <b>Workflow:</b> ${escapeHtml(github.workflow)}`,
    `🔢 <b>Run #:</b> ${github.runNumber}`,
    `👤 <b>Triggered by:</b> ${escapeHtml(github.actor)}`,
    `🕐 <b>Started:</b> ${startTime} UTC`,
    '',
    `▶️ <a href="${getRunUrl(github)}">View run</a>`
  ];

  return lines.join('\n');
}

export function buildCompleteMessage(
  github: GitHubContext,
  status: string,
  durationSeconds?: string
): string {
  const refType = github.ref.startsWith('refs/tags/') ? 'tag' : 'branch';
  const refName = github.ref.replace('refs/heads/', '').replace('refs/tags/', '');

  let statusEmoji: string;
  let header: string;

  if (status === 'success') {
    statusEmoji = '✅';
    header = github.isDeployment ? '🚀 Deployment successful' : '✨ Workflow completed';
  } else if (status === 'failure') {
    statusEmoji = '❌';
    header = github.isDeployment ? '💥 Deployment failed' : '🔴 Workflow failed';
  } else if (status === 'cancelled') {
    statusEmoji = '🚫';
    header = github.isDeployment ? '⛔ Deployment cancelled' : '🚫 Workflow cancelled';
  } else {
    statusEmoji = '❔';
    header = github.isDeployment ? `❓ Deployment ${status}` : `❓ Workflow ${status}`;
  }

  const commitUrl = `${github.serverUrl}/${github.repository}/commit/${github.sha}`;
  const endTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const lines = [
    `<b>${statusEmoji} ${header}</b>`,
    '',
    `📦 <b>Repository:</b> ${makeLink(github.repository, `${github.serverUrl}/${github.repository}`)}`,
    `🔀 <b>${refType.charAt(0).toUpperCase() + refType.slice(1)}:</b> <code>${escapeHtml(refName)}</code>`,
    `🔖 <b>Commit:</b> ${makeLink(getShaShort(github.sha), commitUrl)}`,
    `⚡ <b>Workflow:</b> ${escapeHtml(github.workflow)}`,
    `🔢 <b>Run #:</b> ${github.runNumber}`,
    `👤 <b>Triggered by:</b> ${escapeHtml(github.actor)}`,
    `🏁 <b>Finished:</b> ${endTime} UTC`
  ];

  if (durationSeconds) {
    const duration = formatDuration(parseInt(durationSeconds, 10));
    if (duration) {
      lines.push(`⏱️ <b>Duration:</b> ${duration}`);
    }
  }

  lines.push('', `▶️ <a href="${getRunUrl(github)}">View run</a>`);

  return lines.join('\n');
}

function formatDuration(seconds: number): string {
  if (Number.isNaN(seconds)) return '';

  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
