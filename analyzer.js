// ReadmeRx core analyzer — pure client-side heuristics
export function analyzeReadme(md) {
  const text = md || '';
  const lower = text.toLowerCase();
  const lines = text.split('\n');
  const checks = [];
  const add = (id, label, weight, pass, tip) => checks.push({ id, label, weight, pass, tip });

  const has = (...pats) => pats.some(p => p.test(lower));
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const headings = (text.match(/^#{1,6}\s/gm) || []).length;
  const codeBlocks = (text.match(/```/g) || []).length / 2;
  const badges = (text.match(/!\[[^\]]*\]\([^)]*(shields|badge)[^)]*\)/gi) || []).length;
  const links = (text.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
  const images = (text.match(/!\[[^\]]*\]\(/g) || []).length;

  add('title', 'Has a clear title', 10, /^#\s+\S/m.test(text), 'Start with a single # project name.');
  add('length', 'Substantial length (250+ words)', 10, wordCount >= 250, `Only ${wordCount} words. Explain what/why/how.`);
  add('what', 'Says what the project does', 15, has(/what|does|is a|is an|provides|enables/) || lines.slice(0, 12).some(l => l.length > 60), 'One sentence up top: what it does and for whom.');
  add('install', 'Installation instructions', 15, has(/install|npm i|pip install|cargo add|brew install|getting started/), 'Add an Install or Getting Started section.');
  add('usage', 'Usage example', 15, has(/usage|example|quickstart|quick start/) || codeBlocks >= 1, 'Show the smallest working example in a code block.');
  add('code', 'Code blocks present', 10, codeBlocks >= 1, 'Fenced code blocks make commands copy-pasteable.');
  add('structure', 'Structured with headings', 8, headings >= 3, 'Break it up: Features, Install, Usage, Contributing.');
  add('badges', 'Badges (CI/version/license)', 5, badges >= 1, 'shields.io badges build instant trust.');
  add('links', 'Links to docs/demo', 5, links >= 3, 'Link to docs, demo, issues, related projects.');
  add('visual', 'A screenshot or diagram', 7, images >= 1, 'One screenshot beats three paragraphs.');
  add('license', 'License mentioned', 5, has(/license/), 'Say how it can be used.');
  add('contrib', 'Contributing notes', 5, has(/contribut|pull request/), 'Invite contributions explicitly.');

  const maxScore = checks.reduce((s, c) => s + c.weight, 0);
  const score = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
  const pct = Math.round((score / maxScore) * 100);
  const missing = checks.filter(c => !c.pass);
  const grade = pct >= 85 ? 'A' : pct >= 70 ? 'B' : pct >= 55 ? 'C' : pct >= 40 ? 'D' : 'F';
  const roasts = {
    A: 'This README slaps. Recruiters weep. Other READMEs study it.',
    B: 'Solid. A few touches away from greatness.',
    C: 'Mid. It exists, which is more than most, but barely.',
    D: 'This README is a cry for help.',
    F: 'Did you write this during a fire drill? In the dark?',
  };
  return { pct, grade, roast: roasts[grade], missing, passed: checks.filter(c => c.pass), wordCount };
}
