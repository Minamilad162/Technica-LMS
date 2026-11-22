const bucket = 'technica-qualification-evidence';
const fileTypes = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const evidenceKinds = ['Workplace evidence', 'Reflective account', 'Witness testimony', 'Other'];
export const evidenceExtensions = Object.keys(fileTypes).map(extension => '.' + extension).join(',');

export async function portfolioRpc(db, name, args) {
  const {data, error} = await db.rpc('lms_qf_' + name, args);
  if (error) throw error;
  return data;
}

export function evidencePayload({title, description, kind, body, file, mode}) {
  const payload = {
    p_title: title.trim(), p_description: description.trim(), p_kind: kind,
    p_body: null, p_filename: null, p_mime: null, p_bytes: null,
  };
  if (mode === 'write') return {...payload, p_body: body.trim()};
  const extension = file?.name.split('.').pop().toLowerCase();
  const mime = Object.hasOwn(fileTypes, extension) ? fileTypes[extension] : null;
  if (!file || !mime || file.size < 1 || file.size > 10485760) {
    throw new Error('Choose a PDF, Word, Excel, JPEG or PNG file up to 10 MB.');
  }
  return {...payload, p_filename: file.name, p_mime: mime, p_bytes: file.size};
}

export async function uploadPortfolioEvidence(db, enrolment, reservation, file, mime) {
  const {error} = await db.storage.from(bucket).upload(reservation.path, file, {
    contentType: mime, upsert: false,
  });
  // A lost response after a successful upload can be retried with the same path.
  const portfolio = await portfolioRpc(db, 'portfolio', {p_enrolment: enrolment});
  if (portfolio.evidence.some(item => item.id === reservation.id)) return portfolio;
  throw error || new Error('The uploaded file could not be confirmed.');
}

async function fetchEvidenceFile(db, evidence) {
  const {data, error} = await db.storage.from(bucket).download(evidence.object_path);
  if (error) throw error;
  return data;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadPortfolioEvidence(db, evidence) {
  download(await fetchEvidenceFile(db, evidence), evidence.filename);
}

export async function downloadEvidenceShowcase(db, evidence) {
  const limit = 50 * 1024 * 1024;
  let bytes = 0;
  const {zipSync, strToU8} = await import('fflate');
  const entries = {};
  const index = [];
  for (const [position, item] of evidence.entries()) {
    const label = String(position + 1).padStart(2, '0');
    const filename = item.filename
      ? label + '-' + item.filename.replace(/[^a-z0-9._ -]/gi,'_')
      : label + '-written-evidence.txt';
    const body = item.filename
      ? new Uint8Array(await (await fetchEvidenceFile(db, item)).arrayBuffer())
      : strToU8(item.title + '\n\n' + item.body);
    bytes += body.byteLength;
    if (bytes > limit) throw new Error('Select a smaller group of evidence (50 MB per download).');
    entries[filename] = body;
    index.push(filename + '\n' + item.title + '\n' + item.kind + '\n' + item.description);
  }
  entries['index.txt'] = strToU8(index.join('\n\n'));
  const archive = zipSync(entries, {level:0});
  download(new Blob([archive], {type:'application/zip'}), 'qualification-evidence-showcase.zip');
}

export const claimLabels = {
  draft: 'In progress', submitted: 'Awaiting assessment', changes_requested: 'Changes requested',
  awaiting_verification: 'Awaiting verification', verification_returned: 'Assessment follow-up',
  verified: 'Verified', not_started: 'Not started',
};

export function claimState(outcome) {
  return outcome.claim?.state || 'not_started';
}

export function canReview(role, state) {
  return role === 'assessor' && ['submitted', 'verification_returned'].includes(state) ||
    role === 'verifier' && state === 'awaiting_verification';
}

export function programmeProgress(portfolio) {
  const outcomes = portfolio.units.flatMap(unit => unit.outcomes);
  const required = outcomes.filter(outcome => outcome.required);
  const verified = required.filter(outcome => claimState(outcome) === 'verified').length;
  const started = required.filter(outcome => claimState(outcome) !== 'not_started').length;
  const openReviews = outcomes.some(outcome => ['submitted', 'awaiting_verification', 'verification_returned'].includes(claimState(outcome)));
  return {
    outcomes, verified, started, total: required.length,
    ready: required.length > 0 && verified === required.length && !openReviews && !!portfolio.declarationAt,
  };
}
