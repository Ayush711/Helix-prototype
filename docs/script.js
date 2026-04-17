let generatedMarkdown = '';

const appState = {
    currentStep: 1,
    parsed: false,
    planReady: false,
    data: [],
    groupedData: {},
    summary: '',
    insights: null,
    github: {
        owner: '',
        repo: '',
        repoUrl: '',
        lastCommitUrl: '',
        issues: [],
        actionsUrl: ''
    }
};

document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    setupDragDrop();
    initGitHubDefaults();
    updateStepper(1);
    renderGitHubStatus('Ready for GitHub automation actions.', 'pending');
});

function bindEvents() {
    document.getElementById('analyzeBtn').addEventListener('click', processDesignInput);
    document.getElementById('presenterToggle').addEventListener('click', togglePresenterMode);
    document.getElementById('toStep2').addEventListener('click', () => goToStep(2));
    document.getElementById('backToStep1').addEventListener('click', () => goToStep(1));
    document.getElementById('runPlanBtn').addEventListener('click', runPlanningFlow);
    document.getElementById('toStep3').addEventListener('click', () => {
        if (!appState.planReady) {
            showError('Run planning flow before moving to delivery pack.');
            return;
        }
        goToStep(3);
    });
    document.getElementById('backToStep2').addEventListener('click', () => goToStep(2));
    document.getElementById('generateIssueBtn').addEventListener('click', generateGitHubIssue);
    document.getElementById('downloadBtn').addEventListener('click', downloadDesign);

    const createRepoBtn = document.getElementById('createRepoBtn');
    const commitMarkdownBtn = document.getElementById('commitMarkdownBtn');
    const createIssuesBtn = document.getElementById('createIssuesBtn');
    const triggerWorkflowBtn = document.getElementById('triggerWorkflowBtn');

    if (createRepoBtn) createRepoBtn.addEventListener('click', createRepoFromTemplate);
    if (commitMarkdownBtn) commitMarkdownBtn.addEventListener('click', commitGeneratedMarkdown);
    if (createIssuesBtn) createIssuesBtn.addEventListener('click', createIssuesPerContext);
    if (triggerWorkflowBtn) triggerWorkflowBtn.addEventListener('click', triggerScaffoldWorkflow);
}

function initGitHubDefaults() {
    const ownerInput = document.getElementById('ghOwner');
    const repoInput = document.getElementById('ghRepo');
    const templateOwnerInput = document.getElementById('ghTemplateOwner');

    if (!ownerInput || !repoInput || !templateOwnerInput) return;

    const hostname = window.location.hostname || '';
    if (hostname.endsWith('.github.io')) {
        const detectedOwner = hostname.replace('.github.io', '');
        ownerInput.value = ownerInput.value || detectedOwner;
        templateOwnerInput.value = templateOwnerInput.value || detectedOwner;
    }

    repoInput.value = repoInput.value || buildDefaultRepoName();
}

function buildDefaultRepoName() {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    return `helix-design-${stamp}`;
}

function togglePresenterMode() {
    const panel = document.getElementById('presenterPanel');
    const toggle = document.getElementById('presenterToggle');
    const willShow = panel.classList.contains('hidden');

    panel.classList.toggle('hidden', !willShow);
    toggle.textContent = willShow ? 'Disable Presenter Mode' : 'Enable Presenter Mode';
    toggle.setAttribute('aria-expanded', String(willShow));

    if (willShow) {
        updateCriteriaStatus();
    }
}

function processDesignInput() {
    const fileInput = document.getElementById('fileInput');
    const loading = document.getElementById('loading');

    clearMessages();

    if (!fileInput.files || fileInput.files.length === 0) {
        showError('Please select a CSV file first.');
        return;
    }

    const file = fileInput.files[0];
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showError('Please upload a valid CSV file.');
        return;
    }

    loading.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const csvText = e.target.result;
            const data = parseCSV(csvText);

            if (data.length === 0) {
                throw new Error('No valid data found in the CSV file.');
            }

            const groupedData = groupByDomain(data);
            const summary = generateSummary(data, groupedData);
            const insights = calculateInsights(data, groupedData);

            appState.data = data;
            appState.groupedData = groupedData;
            appState.summary = summary;
            appState.insights = insights;
            appState.parsed = true;
            appState.planReady = false;

            generatedMarkdown = generateMarkdown(groupedData, summary, insights);
            renderBuildPlan();
            renderDeliveryPack();
            resetRunboard();

            document.getElementById('toStep2').disabled = false;
            loading.classList.add('hidden');
            showSuccess('Design input analyzed successfully. Continue to build planning.');
            updateCriteriaStatus();
        } catch (err) {
            loading.classList.add('hidden');
            showError('Error processing file: ' + err.message);
        }
    };

    reader.onerror = function () {
        loading.classList.add('hidden');
        showError('Error reading file. Please try again.');
    };

    reader.readAsText(file);
}

function goToStep(step) {
    if (step > 1 && !appState.parsed) {
        showError('Complete step 1 before moving forward.');
        return;
    }

    appState.currentStep = step;
    ['step-1', 'step-2', 'step-3'].forEach((id, idx) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (idx + 1 === step) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    updateStepper(step);
    clearMessages();
}

function updateStepper(step) {
    document.querySelectorAll('.step').forEach((stepBtn) => {
        const btnStep = Number(stepBtn.dataset.step);
        stepBtn.classList.remove('active', 'complete');
        if (btnStep < step) {
            stepBtn.classList.add('complete');
        }
        if (btnStep === step) {
            stepBtn.classList.add('active');
        }
    });
}

function runPlanningFlow() {
    if (!appState.parsed || !appState.insights) {
        showError('Please complete design intake first.');
        return;
    }

    clearMessages();
    const runPlanBtn = document.getElementById('runPlanBtn');
    const toStep3 = document.getElementById('toStep3');

    runPlanBtn.disabled = true;
    runPlanBtn.textContent = 'Running...';
    resetRunboard();

    setAgentStatus('agent-design', 'running', 'Running');
    setTimeout(() => {
        setAgentStatus('agent-design', 'done', 'Complete');
        setAgentStatus('agent-architecture', 'running', 'Running');
    }, 600);

    setTimeout(() => {
        setAgentStatus('agent-architecture', 'done', 'Complete');
        setAgentStatus('agent-delivery', 'running', 'Running');
    }, 1200);

    setTimeout(() => {
        setAgentStatus('agent-delivery', 'done', 'Complete');
        appState.planReady = true;
        toStep3.disabled = false;
        runPlanBtn.disabled = false;
        runPlanBtn.textContent = 'Run Planning Flow';
        showSuccess('Planning flow complete. Delivery pack is ready.');
        renderDeliveryPack();
        updateCriteriaStatus();
    }, 1800);
}

function setAgentStatus(id, statusClass, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `badge ${statusClass}`;
    el.textContent = text;
}

function resetRunboard() {
    setAgentStatus('agent-design', 'pending', 'Pending');
    setAgentStatus('agent-architecture', 'pending', 'Pending');
    setAgentStatus('agent-delivery', 'pending', 'Pending');
    document.getElementById('toStep3').disabled = true;
}

function renderBuildPlan() {
    const { domainCount, eventCount, estimatedHours, complexityScore, eventsPerDomain } = appState.insights;

    document.getElementById('kpiDomains').textContent = String(domainCount);
    document.getElementById('kpiEvents').textContent = String(eventCount);
    document.getElementById('kpiHours').textContent = `${estimatedHours}h`;
    document.getElementById('kpiComplexity').textContent = String(complexityScore);

    const domainCoverage = document.getElementById('domainCoverage');
    domainCoverage.innerHTML = '';

    eventsPerDomain.forEach((item) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${escapeHtml(item.domain)}</span><strong>${item.count} events</strong>`;
        domainCoverage.appendChild(li);
    });
}

function renderDeliveryPack() {
    const outputEl = document.getElementById('output');
    const executiveSummary = document.getElementById('executiveSummary');
    const insights = appState.insights;

    if (!insights) return;

    executiveSummary.innerHTML = `
        <h3>Executive Summary</h3>
        <p>${appState.summary}</p>
        <p>Estimated process model effort is <strong>${insights.estimatedHours} hours</strong>, based on event volume and domain spread. Planning status: <strong>${appState.planReady ? 'Ready for delivery' : 'Awaiting planning run'}</strong>.</p>
    `;

    if (typeof marked !== 'undefined') {
        outputEl.innerHTML = marked.parse(generatedMarkdown);
    } else {
        outputEl.textContent = generatedMarkdown;
    }
}

function calculateInsights(data, groupedData) {
    const domainNames = Object.keys(groupedData);
    const domainCount = domainNames.length;
    const eventCount = data.length;
    const averageEventsPerDomain = domainCount ? eventCount / domainCount : 0;

    const estimatedHours = Math.max(4, Math.round(6 + domainCount * 2.5 + eventCount * 1.35 + averageEventsPerDomain * 0.8));
    const complexityScore = Math.round(domainCount * 1.8 + eventCount * 0.7);

    const eventsPerDomain = domainNames
        .map((domain) => ({ domain, count: groupedData[domain].length }))
        .sort((a, b) => b.count - a.count);

    return {
        domainCount,
        eventCount,
        estimatedHours,
        complexityScore,
        eventsPerDomain
    };
}

function parseCSV(csv) {
    const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
    const domainIndex = headers.findIndex((h) => h.includes('domain') || h.includes('category') || h.includes('epic') || h.includes('milestone'));
    const eventIndex = headers.findIndex((h) => h.includes('event') || h.includes('name') || h.includes('title') || h.includes('summary') || h.includes('task'));
    const descriptionIndex = headers.findIndex((h) => h.includes('description') || h.includes('desc') || h.includes('detail') || h.includes('body'));
    const statusIndex = headers.findIndex((h) => h.includes('status'));

    const dIdx = domainIndex >= 0 ? domainIndex : 0;
    const eIdx = eventIndex >= 0 ? eventIndex : (dIdx === 0 ? 1 : 0);
    const descIdx = descriptionIndex >= 0 ? descriptionIndex : 2;

    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0 || values.every((v) => !v.trim())) continue;

        const event = (values[eIdx] || '').trim();
        const domain = (values[dIdx] || 'Uncategorized').trim();
        const description = (values[descIdx] || 'No description available').trim();
        const status = statusIndex >= 0 ? (values[statusIndex] || '').trim() : '';

        if (!event) continue;

        data.push({
            domain: domain || 'Uncategorized',
            event,
            description: description + (status ? ` [Status: ${status}]` : '')
        });
    }

    return data;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

function groupByDomain(data) {
    const grouped = {};
    data.forEach((item) => {
        const domain = item.domain || 'Uncategorized';
        if (!grouped[domain]) grouped[domain] = [];
        grouped[domain].push({ event: item.event, description: item.description });
    });
    return grouped;
}

function generateSummary(data, groupedData) {
    const domainCount = Object.keys(groupedData).length;
    const eventCount = data.length;
    return `This design model contains ${domainCount} domain${domainCount !== 1 ? 's' : ''} and ${eventCount} event${eventCount !== 1 ? 's' : ''}.`;
}

function generateMarkdown(groupedData, summary, insights) {
    let markdown = '# Design Flow Document\n\n';
    markdown += `> ${summary}\n\n`;
    markdown += `> Estimated Process Model Hours: ${insights.estimatedHours}h | Complexity Score: ${insights.complexityScore}\n\n`;
    markdown += '---\n\n';

    const domains = Object.keys(groupedData).sort();
    domains.forEach((domain) => {
        markdown += `## Domain: ${domain}\n\n`;
        groupedData[domain].forEach((item) => {
            markdown += `* **Event: ${item.event}**\n`;
            markdown += `  Description: ${item.description}\n\n`;
        });
        markdown += '---\n\n';
    });

    markdown += `*Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*\n`;
    return markdown;
}

function downloadDesign() {
    if (!generatedMarkdown) {
        showError('No design to download. Please upload and analyze a CSV first.');
        return;
    }

    const blob = new Blob([generatedMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'design.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    markCriteriaPass('criteria-delivery', 'Pass');
}

function generateGitHubIssue() {
    if (!appState.parsed || !appState.insights) {
        showError('Please complete the design flow before generating a GitHub issue.');
        return;
    }

    const { repoOwner, repoName } = resolveGitHubIssueTarget();
    const title = buildIssueTitle();
    const body = buildIssueBody();
    const labels = ['design-intake', 'prototype-handoff'];

    const url = `https://github.com/${repoOwner}/${repoName}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${encodeURIComponent(labels.join(','))}`;

    window.open(url, '_blank', 'noopener,noreferrer');
    markCriteriaPass('criteria-issue', 'Pass');
    showSuccess('GitHub issue form opened with a prefilled title and body. Review and submit in GitHub.');
}

function resolveGitHubIssueTarget() {
    const owner = document.getElementById('ghOwner')?.value?.trim();
    const repo = document.getElementById('ghRepo')?.value?.trim();
    if (owner && repo) {
        return { repoOwner: owner, repoName: repo };
    }

    const hostname = window.location.hostname || '';
    const pathSegments = window.location.pathname.split('/').filter(Boolean);

    if (hostname.endsWith('.github.io')) {
        const repoOwner = hostname.replace('.github.io', '');
        const repoName = pathSegments[0] || 'helix';
        return { repoOwner, repoName };
    }

    return {
        repoOwner: 'AIS-Commercial-Business-Unit',
        repoName: 'Helix'
    };
}

function buildIssueTitle() {
    const topDomain = appState.insights?.eventsPerDomain?.[0]?.domain || 'Design';
    return `Helix design handoff: ${topDomain} workflow review`;
}

function buildIssueBody() {
    const insights = appState.insights;
    const domains = insights.eventsPerDomain
        .map((item) => `- ${item.domain}: ${item.count} events`)
        .join('\n');

    return [
        '## Helix Design Handoff',
        '',
        appState.summary,
        '',
        '### Planning Snapshot',
        `- Estimated Process Model Hours: ${insights.estimatedHours}h`,
        `- Complexity Score: ${insights.complexityScore}`,
        `- Planning Flow Status: ${appState.planReady ? 'Completed in prototype' : 'Not yet executed in prototype'}`,
        '',
        '### Domain Coverage',
        domains,
        '',
        '### Generated Output',
        '```md',
        generatedMarkdown.trim(),
        '```',
        '',
        '### Notes',
        '- Generated from GitHub Pages prototype UI',
        '- Issue form was prefilled from browser-side data',
        '- Review labels, title, and body before submitting'
    ].join('\n');
}

async function createRepoFromTemplate() {
    const cfg = getGitHubConfig();
    if (!cfg.ok) return;

    setButtonBusy('createRepoBtn', true, 'Creating...');
    renderGitHubStatus('Creating repository in GitHub...', 'pending');

    try {
        const repoName = sanitizeRepoName(cfg.repo);
        if (!repoName) {
            throw new Error('Repository name is required.');
        }

        let payload;
        if (cfg.templateOwner && cfg.templateRepo) {
            payload = await githubRequest(`/repos/${cfg.templateOwner}/${cfg.templateRepo}/generate`, cfg.token, {
                method: 'POST',
                body: {
                    owner: cfg.owner,
                    name: repoName,
                    private: cfg.visibility === 'private',
                    include_all_branches: false,
                    description: 'Generated by Helix Design Studio prototype'
                }
            });
        } else {
            try {
                payload = await githubRequest(`/orgs/${cfg.owner}/repos`, cfg.token, {
                    method: 'POST',
                    body: {
                        name: repoName,
                        private: cfg.visibility === 'private',
                        auto_init: true,
                        description: 'Generated by Helix Design Studio prototype'
                    }
                });
            } catch (orgErr) {
                payload = await githubRequest('/user/repos', cfg.token, {
                    method: 'POST',
                    body: {
                        name: repoName,
                        private: cfg.visibility === 'private',
                        auto_init: true,
                        description: 'Generated by Helix Design Studio prototype'
                    }
                });
            }
        }

        appState.github.owner = cfg.owner;
        appState.github.repo = repoName;
        appState.github.repoUrl = payload.html_url || `https://github.com/${cfg.owner}/${repoName}`;

        renderGitHubStatus(`Repository ready: ${cfg.owner}/${repoName}`, 'ok', appState.github.repoUrl, 'Open Repository');
        markCriteriaPass('criteria-repo', 'Pass');
        updateCriteriaStatus();
        showSuccess('Repository creation succeeded. Continue with commit and issue creation.');
    } catch (err) {
        renderGitHubStatus(`Repository creation failed: ${err.message}`, 'error');
        showError(err.message);
    } finally {
        setButtonBusy('createRepoBtn', false, '1) Create Repo from Template');
    }
}

async function commitGeneratedMarkdown() {
    if (!generatedMarkdown) {
        showError('Generate markdown first by uploading CSV and analyzing data.');
        return;
    }

    const cfg = getGitHubConfig();
    if (!cfg.ok) return;

    setButtonBusy('commitMarkdownBtn', true, 'Committing...');
    renderGitHubStatus('Committing design/design.md to repository...', 'pending');

    try {
        const repo = appState.github.repo || sanitizeRepoName(cfg.repo);
        const owner = appState.github.owner || cfg.owner;
        const path = 'design/design.md';

        let existingSha = null;
        try {
            const existing = await githubRequest(`/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(cfg.ref)}`, cfg.token, { method: 'GET' });
            existingSha = existing.sha || null;
        } catch {
            existingSha = null;
        }

        const payload = {
            message: 'chore(helix): add generated design markdown',
            content: toBase64Utf8(generatedMarkdown),
            branch: cfg.ref
        };

        if (existingSha) payload.sha = existingSha;

        const result = await githubRequest(`/repos/${owner}/${repo}/contents/${path}`, cfg.token, {
            method: 'PUT',
            body: payload
        });

        const commitUrl = result?.commit?.html_url || `https://github.com/${owner}/${repo}/blob/${cfg.ref}/${path}`;
        appState.github.lastCommitUrl = commitUrl;
        appState.github.owner = owner;
        appState.github.repo = repo;

        renderGitHubStatus('design/design.md committed successfully.', 'ok', commitUrl, 'Open Commit/File');
        markCriteriaPass('criteria-repo', 'Pass');
        updateCriteriaStatus();
        showSuccess('Markdown committed to GitHub repository.');
    } catch (err) {
        renderGitHubStatus(`Markdown commit failed: ${err.message}`, 'error');
        showError(err.message);
    } finally {
        setButtonBusy('commitMarkdownBtn', false, '2) Commit design.md');
    }
}

async function createIssuesPerContext() {
    if (!appState.parsed || !appState.groupedData || !Object.keys(appState.groupedData).length) {
        showError('Please complete CSV analysis first.');
        return;
    }

    const cfg = getGitHubConfig();
    if (!cfg.ok) return;

    setButtonBusy('createIssuesBtn', true, 'Creating...');
    renderGitHubStatus('Creating issues per context...', 'pending');

    try {
        const repo = appState.github.repo || sanitizeRepoName(cfg.repo);
        const owner = appState.github.owner || cfg.owner;
        const domainEntries = Object.entries(appState.groupedData);
        const created = [];

        for (const [domain, events] of domainEntries) {
            const issueTitle = `[Context] ${domain} implementation handoff`;
            const issueBody = buildContextIssueBody(domain, events);

            const issue = await githubRequest(`/repos/${owner}/${repo}/issues`, cfg.token, {
                method: 'POST',
                body: {
                    title: issueTitle,
                    body: issueBody,
                    labels: ['helix-context', 'design-handoff']
                }
            });

            created.push(issue.html_url);
        }

        appState.github.issues = created;
        markCriteriaPass('criteria-issue', 'Pass');
        updateCriteriaStatus();

        const firstIssue = created[0];
        renderGitHubStatus(`Created ${created.length} context issues.`, 'ok', firstIssue, 'Open First Issue');
        showSuccess(`Created ${created.length} GitHub issues for context modules.`);
    } catch (err) {
        renderGitHubStatus(`Issue creation failed: ${err.message}`, 'error');
        showError(err.message);
    } finally {
        setButtonBusy('createIssuesBtn', false, '3) Create Issues per Context');
    }
}

function buildContextIssueBody(domain, events) {
    const eventLines = events
        .slice(0, 30)
        .map((evt) => `- **${evt.event}**: ${evt.description}`)
        .join('\n');

    return [
        '## Helix Context Handoff',
        '',
        `Context: **${domain}**`,
        '',
        '### Design Events',
        eventLines || '- No events found.',
        '',
        '### Actions',
        '- Validate context boundaries and naming',
        '- Convert events to commands and policies',
        '- Implement service/module structure',
        '- Link resulting PR to this issue',
        '',
        '_Generated by Helix Design Studio UI_' 
    ].join('\n');
}

async function triggerScaffoldWorkflow() {
    const cfg = getGitHubConfig();
    if (!cfg.ok) return;

    setButtonBusy('triggerWorkflowBtn', true, 'Triggering...');
    renderGitHubStatus('Triggering scaffold workflow...', 'pending');

    try {
        const repo = appState.github.repo || sanitizeRepoName(cfg.repo);
        const owner = appState.github.owner || cfg.owner;
        const workflowFile = cfg.workflowFile;

        if (!workflowFile) {
            throw new Error('Workflow file name is required, for example scaffold.yml.');
        }

        await githubRequest(`/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowFile)}/dispatches`, cfg.token, {
            method: 'POST',
            body: {
                ref: cfg.ref,
                inputs: {
                    generated_by: 'helix-design-studio',
                    domain_count: String(appState.insights?.domainCount || 0),
                    event_count: String(appState.insights?.eventCount || 0)
                }
            }
        });

        const actionsUrl = `https://github.com/${owner}/${repo}/actions`;
        appState.github.actionsUrl = actionsUrl;
        renderGitHubStatus('Workflow dispatch submitted. Check Actions for run status.', 'ok', actionsUrl, 'Open Actions');
        markCriteriaPass('criteria-workflow', 'Pass');
        updateCriteriaStatus();
        showSuccess('Workflow dispatch succeeded. Open Actions to monitor status.');
    } catch (err) {
        renderGitHubStatus(`Workflow trigger failed: ${err.message}`, 'error');
        showError(err.message);
    } finally {
        setButtonBusy('triggerWorkflowBtn', false, '4) Trigger Scaffold Workflow');
    }
}

function getGitHubConfig() {
    const token = (document.getElementById('ghToken')?.value || '').trim();
    const owner = (document.getElementById('ghOwner')?.value || '').trim();
    const repo = (document.getElementById('ghRepo')?.value || '').trim();
    const visibility = (document.getElementById('ghVisibility')?.value || 'private').trim();
    const templateOwner = (document.getElementById('ghTemplateOwner')?.value || '').trim();
    const templateRepo = (document.getElementById('ghTemplateRepo')?.value || '').trim();
    const workflowFile = (document.getElementById('ghWorkflowFile')?.value || '').trim();
    const ref = (document.getElementById('ghRef')?.value || 'main').trim();

    if (!token) {
        showError('GitHub token is required for API actions.');
        return { ok: false };
    }

    if (!owner) {
        showError('Target owner is required.');
        return { ok: false };
    }

    if (!repo) {
        showError('Repository name is required.');
        return { ok: false };
    }

    return {
        ok: true,
        token,
        owner,
        repo,
        visibility,
        templateOwner,
        templateRepo,
        workflowFile,
        ref
    };
}

function sanitizeRepoName(repoName) {
    return String(repoName || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function githubRequest(path, token, options = {}) {
    const url = `https://api.github.com${path}`;
    const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
    };

    const fetchOptions = {
        method: options.method || 'GET',
        headers
    };

    if (options.body) {
        headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    if (response.status === 204) {
        return {};
    }

    const responseText = await response.text();
    const data = responseText ? safeJsonParse(responseText) : {};

    if (!response.ok) {
        const apiMessage = data?.message || response.statusText || 'GitHub API request failed.';
        throw new Error(`${apiMessage} [${response.status}]`);
    }

    return data;
}

function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}

function toBase64Utf8(input) {
    return btoa(unescape(encodeURIComponent(input)));
}

function setButtonBusy(buttonId, busy, busyLabel) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    if (!button.dataset.defaultLabel) {
        button.dataset.defaultLabel = button.textContent;
    }

    button.disabled = busy;
    button.textContent = busy ? busyLabel : button.dataset.defaultLabel;
}

function renderGitHubStatus(message, state = 'pending', link = '', linkText = 'Open') {
    const container = document.getElementById('githubStatus');
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'status-item';

    const left = document.createElement('div');
    left.innerHTML = `<strong>${escapeHtml(message)}</strong>`;

    if (link) {
        const linkEl = document.createElement('a');
        linkEl.href = link;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
        linkEl.textContent = linkText;
        left.appendChild(document.createElement('br'));
        left.appendChild(linkEl);
    }

    const badge = document.createElement('span');
    const normalized = state === 'ok' || state === 'error' ? state : 'pending';
    badge.className = `status-state ${normalized}`;
    badge.textContent = normalized === 'ok' ? 'Success' : (normalized === 'error' ? 'Failed' : 'Running');

    wrapper.appendChild(left);
    wrapper.appendChild(badge);

    container.prepend(wrapper);
}

function setupDragDrop() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-active'), false);
    });

    ['dragleave', 'drop'].forEach((eventName) => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-active'), false);
    });

    uploadArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
        }
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function clearMessages() {
    document.getElementById('error').classList.add('hidden');
    document.getElementById('success').classList.add('hidden');
}

function showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.classList.remove('hidden');
}

function showSuccess(message) {
    const success = document.getElementById('success');
    success.textContent = message;
    success.classList.remove('hidden');
}

function updateCriteriaStatus() {
    markCriteriaStatus('criteria-intake', appState.parsed ? 'pass' : 'pending');
    markCriteriaStatus('criteria-metrics', appState.parsed && !!appState.insights ? 'pass' : 'pending');
    markCriteriaStatus('criteria-planning', appState.planReady ? 'pass' : (appState.parsed ? 'running' : 'pending'));
    markCriteriaStatus('criteria-delivery', generatedMarkdown ? 'ready' : 'pending');
    markCriteriaStatus('criteria-issue', appState.github.issues.length ? 'pass' : (generatedMarkdown ? 'ready' : 'pending'));
    markCriteriaStatus('criteria-repo', appState.github.repoUrl || appState.github.lastCommitUrl ? 'pass' : (generatedMarkdown ? 'ready' : 'pending'));
    markCriteriaStatus('criteria-workflow', appState.github.actionsUrl ? 'pass' : (appState.github.repo ? 'ready' : 'pending'));
}

function markCriteriaPass(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'criteria-status pass';
    el.textContent = text;
}

function markCriteriaStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;

    const map = {
        pending: { className: 'criteria-status pending', text: 'Pending' },
        running: { className: 'criteria-status running', text: 'In Progress' },
        ready: { className: 'criteria-status ready', text: 'Ready' },
        pass: { className: 'criteria-status pass', text: 'Pass' }
    };

    const selected = map[state] || map.pending;
    el.className = selected.className;
    el.textContent = selected.text;
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
