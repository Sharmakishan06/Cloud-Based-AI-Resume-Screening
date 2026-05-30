/* ═══════════════════════════════════════════
   RecruitAI – Dashboard JavaScript
   Cloud-Based AI Resume Screening System
═══════════════════════════════════════════ */

const API = '';   // empty = same origin; set to 'https://your-render-url.onrender.com' when deployed separately

/* ── Utility ─────────────────────────────── */
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function scoreClass(s) {
  if (s >= 70) return 'score-high';
  if (s >= 45) return 'score-medium';
  return 'score-low';
}

function initials(name) {
  return (name || 'NA').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarColor(name) {
  const colors = ['#6366f1','#8b5cf6','#06b6d4','#22c55e','#f59e0b','#ef4444','#ec4899'];
  let h = 0;
  for (const c of (name || 'A')) h += c.charCodeAt(0);
  return colors[h % colors.length];
}

/* ── Section switcher ────────────────────── */
function showSection(name) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  document.getElementById('page-title').textContent =
    { overview: 'Overview', jobs: 'Job Postings', upload: 'Upload Resumes', candidates: 'Candidates' }[name];
  event?.currentTarget?.classList.add('active');

  if (name === 'overview')   loadOverview();
  if (name === 'jobs')       loadJobs();
  if (name === 'upload')     populateJobSelects();
  if (name === 'candidates') { populateJobSelects(); loadCandidates(); }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ── Overview ───────────────────────────── */
async function loadOverview() {
  try {
    const res = await fetch(`${API}/api/stats`);
    const d   = await res.json();
    document.getElementById('ov-jobs').textContent        = d.total_jobs;
    document.getElementById('ov-candidates').textContent  = d.total_candidates;
    document.getElementById('ov-shortlisted').textContent = d.shortlisted;
    document.getElementById('ov-score').textContent       = (d.average_score || 0).toFixed(1) + '%';

    const tbody = document.getElementById('recent-body');
    if (!d.recent_candidates?.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">No candidates yet. Upload some resumes!</td></tr>';
      return;
    }
    tbody.innerHTML = d.recent_candidates.map(c => `
      <tr>
        <td><b>${c.name}</b></td>
        <td>${c.job_title}</td>
        <td><span class="score-badge ${scoreClass(c.match_score)}">${c.match_score.toFixed(1)}%</span></td>
        <td>${c.shortlisted ? '<span class="badge-shortlisted">✓ Shortlisted</span>' : '<span class="badge-pending">Pending</span>'}</td>
      </tr>`).join('');
  } catch (e) {
    console.error(e);
  }
}

/* ── Jobs ────────────────────────────────── */
let jobsCache = [];

async function loadJobs() {
  const container = document.getElementById('jobs-list');
  container.innerHTML = '<div class="loading-cell">Loading…</div>';
  try {
    const res  = await fetch(`${API}/api/jobs`);
    jobsCache  = await res.json();
    if (!jobsCache.length) {
      container.innerHTML = '<div class="loading-cell">No jobs yet. Create your first job posting!</div>';
      return;
    }
    container.innerHTML = jobsCache.map(j => {
      const skills = JSON.parse(j.required_skills || '[]');
      return `
      <div class="job-card">
        <div class="job-title">${j.title}</div>
        <div class="job-desc">${j.description}</div>
        <div class="job-meta">
          ${skills.slice(0, 4).map(s => `<span class="job-badge">${s}</span>`).join('')}
          ${skills.length > 4 ? `<span class="job-badge">+${skills.length - 4}</span>` : ''}
        </div>
        <div class="job-meta" style="color:var(--text3);font-size:.8rem">
          📅 ${new Date(j.created_at).toLocaleDateString('en-IN')}
          ${j.experience_years > 0 ? `· ${j.experience_years}+ yrs exp` : '· Fresher OK'}
        </div>
        <div class="job-actions">
          <button class="btn btn-primary btn-sm" onclick="goUpload(${j.id})">Upload Resumes</button>
          <button class="btn btn-outline btn-sm" onclick="viewCandidates(${j.id})">View Candidates</button>
          <button class="btn btn-danger btn-sm" onclick="deleteJob(${j.id})">Delete</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    container.innerHTML = '<div class="loading-cell" style="color:red">Failed to load jobs.</div>';
  }
}

function goUpload(jobId) {
  showSection('upload');
  setTimeout(() => {
    const sel = document.getElementById('upload-job-select');
    if (sel) sel.value = jobId;
  }, 300);
}

function viewCandidates(jobId) {
  showSection('candidates');
  setTimeout(() => {
    const sel = document.getElementById('filter-job');
    if (sel) { sel.value = jobId; loadCandidates(); }
  }, 300);
}

async function deleteJob(jobId) {
  if (!confirm('Delete this job and all its candidates?')) return;
  await fetch(`${API}/api/jobs/${jobId}`, { method: 'DELETE' });
  toast('Job deleted');
  loadJobs();
}

/* Job Modal */
function showJobModal() {
  document.getElementById('job-modal').style.display = 'flex';
}
function closeJobModal() {
  document.getElementById('job-modal').style.display = 'none';
  ['job-title','job-desc','job-skills'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('job-exp').value = '0';
}

async function createJob() {
  const title = document.getElementById('job-title').value.trim();
  const desc  = document.getElementById('job-desc').value.trim();
  const skills= document.getElementById('job-skills').value.trim();
  const exp   = document.getElementById('job-exp').value;

  if (!title || !desc) { toast('Title and description are required', 'error'); return; }

  const res = await fetch(`${API}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description: desc, skills, experience_years: exp })
  });
  if (res.ok) {
    toast('Job created successfully!');
    closeJobModal();
    loadJobs();
  } else {
    toast('Failed to create job', 'error');
  }
}

/* ── Upload / Screen ─────────────────────── */
let selectedFiles = [];

async function populateJobSelects() {
  if (!jobsCache.length) {
    try {
      const res = await fetch(`${API}/api/jobs`);
      jobsCache = await res.json();
    } catch { return; }
  }
  ['upload-job-select', 'filter-job'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    const extra = id === 'filter-job' ? '<option value="">All Jobs</option>' : '<option value="">— Select Job —</option>';
    sel.innerHTML = extra + jobsCache.map(j => `<option value="${j.id}">${j.title}</option>`).join('');
    if (cur) sel.value = cur;
  });
}

function handleFileSelect(files) {
  selectedFiles = Array.from(files);
  renderFileList();
  document.getElementById('upload-btn').disabled = selectedFiles.length === 0;
}

function renderFileList() {
  const container = document.getElementById('file-list');
  container.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-item">
      📄 <span>${f.name}</span>
      <small style="color:var(--text3);margin-left:.3rem">(${(f.size / 1024).toFixed(1)} KB)</small>
      <button class="file-item-remove" onclick="removeFile(${i})">✕</button>
    </div>`).join('');
}

function removeFile(i) {
  selectedFiles.splice(i, 1);
  renderFileList();
  document.getElementById('upload-btn').disabled = selectedFiles.length === 0;
}

// Drag and drop
document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('drop-zone');
  if (!dz) return;
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', ()  => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    handleFileSelect(e.dataTransfer.files);
  });
  loadOverview();
  populateJobSelects();
});

async function uploadResumes() {
  const jobId = document.getElementById('upload-job-select').value;
  if (!jobId)          { toast('Please select a job first', 'error'); return; }
  if (!selectedFiles.length) { toast('Please select resume files', 'error'); return; }

  const btn = document.getElementById('upload-btn');
  btn.textContent = '⏳ Screening…';
  btn.disabled = true;

  const formData = new FormData();
  selectedFiles.forEach(f => formData.append('resumes', f));

  try {
    const res  = await fetch(`${API}/api/jobs/${jobId}/upload`, { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) { toast(data.error || 'Upload failed', 'error'); return; }

    toast(`${data.candidates.length} resume(s) screened successfully!`);
    renderUploadResults(data.candidates);
    selectedFiles = [];
    renderFileList();
    document.getElementById('upload-btn').disabled = true;
  } catch (e) {
    toast('Server error – is the backend running?', 'error');
  } finally {
    btn.textContent = '🚀 Screen Resumes';
    btn.disabled = false;
  }
}

function renderUploadResults(candidates) {
  const box = document.getElementById('upload-results');
  box.style.display = 'block';
  const sorted = [...candidates].sort((a, b) => b.match_score - a.match_score);
  document.getElementById('results-body').innerHTML = sorted.map((c, i) => `
    <div class="result-item ${c.shortlisted ? 'shortlisted' : ''}">
      <div>
        <span class="rank-badge">${i + 1}</span>
        <span class="result-name" style="margin-left:.5rem">${c.name}</span>
        ${c.shortlisted ? ' <span class="badge-shortlisted">✓ Shortlisted</span>' : ''}
      </div>
      <div class="result-skills">
        ${(c.skills || []).slice(0, 4).map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
      <span class="score-badge ${scoreClass(c.match_score)}">${c.match_score.toFixed(1)}%</span>
    </div>`).join('');
}

/* ── Candidates ──────────────────────────── */
async function loadCandidates() {
  const jobId      = document.getElementById('filter-job')?.value;
  const shortOnly  = document.getElementById('shortlist-filter')?.checked;
  const container  = document.getElementById('candidates-container');
  container.innerHTML = '<div class="loading-cell">Loading candidates…</div>';

  try {
    let url;
    if (jobId) {
      url = `${API}/api/jobs/${jobId}/candidates?shortlisted=${shortOnly ? 'true' : 'false'}`;
    } else {
      // Load from all jobs
      const jobRes = await fetch(`${API}/api/jobs`);
      const jobs   = await jobRes.json();
      const allCands = [];
      for (const j of jobs) {
        const r = await fetch(`${API}/api/jobs/${j.id}/candidates`);
        const cs = await r.json();
        cs.forEach(c => c._jobTitle = j.title);
        allCands.push(...cs);
      }
      allCands.sort((a, b) => b.match_score - a.match_score);
      renderCandidateCards(allCands, container);
      return;
    }
    const res   = await fetch(url);
    const cands = await res.json();
    renderCandidateCards(cands, container);
  } catch (e) {
    container.innerHTML = '<div class="loading-cell" style="color:red">Failed to load candidates.</div>';
  }
}

function renderCandidateCards(cands, container) {
  if (!cands.length) {
    container.innerHTML = '<div class="loading-cell">No candidates found. Upload some resumes!</div>';
    return;
  }
  container.innerHTML = cands.map(c => {
    const color = avatarColor(c.name);
    const skills= Array.isArray(c.skills) ? c.skills : JSON.parse(c.skills || '[]');
    return `
    <div class="candidate-card">
      <div class="cand-avatar" style="background:${color}">${initials(c.name)}</div>
      <div class="cand-info">
        <div class="cand-name">${c.name} ${c.rank_position ? `<span class="rank-badge">#${c.rank_position}</span>` : ''}</div>
        <div class="cand-email">${c.email || 'No email found'} ${c._jobTitle ? `· ${c._jobTitle}` : ''}</div>
        <div class="result-skills" style="margin:.3rem 0">
          ${skills.slice(0, 5).map(s => `<span class="skill-tag">${s}</span>`).join('')}
          ${skills.length > 5 ? `<span class="skill-tag">+${skills.length - 5}</span>` : ''}
        </div>
        <div class="cand-actions">
          <button class="shortlist-btn ${c.shortlisted ? 'active' : 'inactive'}" onclick="toggleShortlist(${c.id}, ${!c.shortlisted}, this)">
            ${c.shortlisted ? '✓ Shortlisted' : '+ Shortlist'}
          </button>
          <button class="btn btn-outline btn-sm" onclick="viewCandidate(${c.id})">View Details</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCandidate(${c.id}, this)">Remove</button>
        </div>
      </div>
      <div class="score-ring">
        <div class="ring-val" style="color:${c.match_score >= 70 ? '#16a34a' : c.match_score >= 45 ? '#a16207' : '#b91c1c'}">${c.match_score.toFixed(1)}%</div>
        <div class="ring-lbl">Match</div>
      </div>
    </div>`;
  }).join('');
}

async function toggleShortlist(id, shortlisted, btn) {
  await fetch(`${API}/api/candidates/${id}/shortlist`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shortlisted })
  });
  btn.textContent = shortlisted ? '✓ Shortlisted' : '+ Shortlist';
  btn.className = `shortlist-btn ${shortlisted ? 'active' : 'inactive'}`;
  toast(shortlisted ? 'Candidate shortlisted!' : 'Removed from shortlist');
}

async function deleteCandidate(id, btn) {
  if (!confirm('Remove this candidate?')) return;
  await fetch(`${API}/api/candidates/${id}`, { method: 'DELETE' });
  btn.closest('.candidate-card').remove();
  toast('Candidate removed');
}

async function viewCandidate(id) {
  const res  = await fetch(`${API}/api/candidates/${id}`);
  const c    = await res.json();
  const skills = Array.isArray(c.skills) ? c.skills : JSON.parse(c.skills || '[]');

  document.getElementById('cand-modal-name').textContent = c.name || 'Candidate Details';
  document.getElementById('cand-modal-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div><b>Email:</b><br/><span style="color:var(--text2)">${c.email || '—'}</span></div>
      <div><b>Phone:</b><br/><span style="color:var(--text2)">${c.phone || '—'}</span></div>
      <div><b>Match Score:</b><br/><span style="font-size:1.4rem;font-weight:700;color:${c.match_score >= 70 ? '#16a34a' : c.match_score >= 45 ? '#a16207' : '#b91c1c'}">${c.match_score.toFixed(1)}%</span></div>
      <div><b>Rank:</b><br/><span style="color:var(--text2)">#${c.rank_position || '—'}</span></div>
    </div>
    <div style="margin-bottom:1rem">
      <b>Education:</b>
      <p style="color:var(--text2);font-size:.88rem;margin-top:.3rem">${c.education || '—'}</p>
    </div>
    <div style="margin-bottom:1rem">
      <b>Skills Detected (${skills.length}):</b>
      <div class="result-skills" style="margin-top:.5rem">
        ${skills.map(s => `<span class="skill-tag">${s}</span>`).join('') || '<span style="color:var(--text3)">None detected</span>'}
      </div>
    </div>
    <div>
      <b>Extracted Text Preview:</b>
      <pre style="margin-top:.4rem;padding:.8rem;background:var(--surface);border-radius:8px;font-size:.78rem;overflow:auto;max-height:160px;white-space:pre-wrap">${(c.extracted_text || 'No text extracted').substring(0, 800)}…</pre>
    </div>`;
  document.getElementById('cand-modal').style.display = 'flex';
}

function closeCandModal() {
  document.getElementById('cand-modal').style.display = 'none';
}

// Close modals on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    closeJobModal(); closeCandModal();
  }
});

/* ── Dataset Seed Panel ─────────────────── */
async function seedDataset(perCat) {
  const btn = document.getElementById('seed-btn');
  if (btn) { btn.textContent = '⏳ Seeding…'; btn.disabled = true; }
  try {
    const res  = await fetch(`${API}/api/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ per_category: perCat || 10 })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Seed failed', 'error'); return; }
    toast(`✅ Dataset seeded! ${data.total_candidates} resumes across 24 categories.`);
    loadOverview();
    loadJobs();
    populateJobSelects();
  } catch (e) {
    toast('Could not reach server.', 'error');
  } finally {
    if (btn) { btn.textContent = '🌱 Load Dataset'; btn.disabled = false; }
  }
}

async function loadDatasetCategories() {
  const res  = await fetch(`${API}/api/dataset/categories`);
  const data = await res.json();
  const box  = document.getElementById('dataset-categories');
  if (!box) return;
  box.innerHTML = data.categories.map(c =>
    `<span class="job-badge" style="cursor:pointer" title="${c.count} resumes">${c.name} (${c.count})</span>`
  ).join(' ');
}
