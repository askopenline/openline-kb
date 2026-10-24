// Openline KB — shared rendering helpers (browser + server).
// Imported by app.js in the browser and by server.mjs for server-side
// rendering, so article HTML is identical in both places.

// --- Per-category color palette ---
export const CATEGORY_COLORS = {
  "Getting started":         { fg: "#FF6A00", bg: "#FFF3E9" },
  "Installation":            { fg: "#2563EB", bg: "#EEF3FE" },
  "Devices & compatibility": { fg: "#7C3AED", bg: "#F3EEFE" },
  "Plans & coverage":        { fg: "#0891B2", bg: "#E6F6FA" },
  "Coverage by country":     { fg: "#0EA5A4", bg: "#E4F6F5" },
  "Payment & billing":       { fg: "#128A3D", bg: "#E3F4E8" },
  "Data usage":              { fg: "#9333EA", bg: "#F5ECFB" },
  "Troubleshooting":         { fg: "#B3261E", bg: "#FBE6E4" },
  "Account":                 { fg: "#E85E00", bg: "#FFEADC" },
  "App & website":           { fg: "#4F46E5", bg: "#ECECFB" },
  "Security & privacy":      { fg: "#334155", bg: "#EEF0F3" },
  "Legal & policy":          { fg: "#475569", bg: "#EFF1F4" },
  "Business & IoT":          { fg: "#0F766E", bg: "#E4F1EF" },
  "Referrals":               { fg: "#DB2777", bg: "#FCE9F2" },
  "Special use cases":       { fg: "#CA8A04", bg: "#FBF3D9" },
  "Technical":               { fg: "#1F2937", bg: "#EDEEF1" },
  "Support":                 { fg: "#E11D48", bg: "#FCE7EC" },
  "Company & brand":         { fg: "#B45309", bg: "#FBEEDA" },
};
export const FALLBACK_COLOR = { fg: "#6B7280", bg: "#F1F2F5" };
export function colorFor(cat) { return CATEGORY_COLORS[cat] || FALLBACK_COLOR; }
export function categoryStyle(cat) {
  const c = colorFor(cat);
  return `--cat:${c.fg};--cat-bg:${c.bg}`;
}

// --- Markdown → HTML (minimal, safe) ---
export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function renderMarkdown(md) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let inUL = false, inOL = false, inTable = false, para = [];
  const closePara = () => { if (para.length) { out.push(`<p>${inlineMd(para.join(" "))}</p>`); para = []; } };
  const closeLists = () => {
    if (inUL) { out.push("</ul>"); inUL = false; }
    if (inOL) { out.push("</ol>"); inOL = false; }
  };
  const closeTable = () => { if (inTable) { out.push("</tbody></table>"); inTable = false; } };
  const closeAll = () => { closePara(); closeLists(); closeTable(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    let m = line.match(/^(#{1,4})\s+(.+)$/);
    if (m) { closeAll(); const level = m[1].length + 1; out.push(`<h${level}>${inlineMd(m[2])}</h${level}>`); continue; }
    if (/^\s*---\s*$/.test(line)) { closeAll(); out.push("<hr />"); continue; }
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      if (/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line)) continue;
      if (!inTable) {
        closePara(); closeLists();
        out.push('<table><thead><tr>' + cells.map((c) => `<th>${inlineMd(c)}</th>`).join("") + '</tr></thead><tbody>');
        inTable = true; continue;
      }
      out.push("<tr>" + cells.map((c) => `<td>${inlineMd(c)}</td>`).join("") + "</tr>");
      continue;
    } else if (inTable && line.trim() === "") { closeTable(); continue; }
    m = line.match(/^\s*-\s+(.+)$/);
    if (m) {
      closePara();
      if (inOL) { out.push("</ol>"); inOL = false; }
      if (!inUL) { out.push("<ul>"); inUL = true; }
      out.push(`<li>${inlineMd(m[1])}</li>`); continue;
    }
    m = line.match(/^\s*\d+\.\s+(.+)$/);
    if (m) {
      closePara();
      if (inUL) { out.push("</ul>"); inUL = false; }
      if (!inOL) { out.push("<ol>"); inOL = true; }
      out.push(`<li>${inlineMd(m[1])}</li>`); continue;
    }
    if (line.trim() === "") { closePara(); closeLists(); continue; }
    if (inUL || inOL) closeLists();
    para.push(line);
  }
  closeAll();
  return out.join("\n");
}
export function inlineMd(s) {
  s = escapeHtml(s);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
    const safe = u.startsWith("http") || u.startsWith("mailto:") || u.startsWith("/") || u.startsWith("#") ? u : "#";
    const ext = safe.startsWith("http") ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${safe}"${ext}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}


// URL helpers shared by app and server.
export function slugifyCategory(cat) {
  return cat.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export function articlePath(slug) { return "/" + encodeURIComponent(slug); }
export function categoryPath(cat) { return "/category/" + slugifyCategory(cat); }

// Plain-text summary used for meta descriptions and snippets.
export function plainSummary(md, max = 158) {
  const text = md
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => !/^\s*(#{1,4}\s|\||---)/.test(l))
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*`_>]/g, "")
    .replace(/^\s*[-\d.]+\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const dot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  if (dot > max * 0.55) return cut.slice(0, dot + 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:\s]+$/, "") + "…";
}

export const TROUBLE_CATS = new Set(["Troubleshooting", "Support"]);

// Breadcrumb trail shown above an article (category links to its listing).
export function crumbsHTML(a) {
  const cat = `<a href="${categoryPath(a.category)}">${escapeHtml(a.category)}</a>`;
  return a.subcategory ? `${cat}<span class="sep"> › </span>${escapeHtml(a.subcategory)}` : cat;
}

// Related — rank other articles by shared tags first, then shared
// subcategory, then shared category.
export function relatedArticles(a, all, limit = 5) {
  const aTags = new Set((a.tags || []).map((t) => t.toLowerCase()));
  const aSub = (a.subcategory || "").toLowerCase();
  const score = (x) => {
    if (x.slug === a.slug) return -1;
    let s = 0;
    for (const t of (x.tags || [])) if (aTags.has(t.toLowerCase())) s += 10;
    if ((x.subcategory || "").toLowerCase() === aSub && aSub) s += 6;
    if (x.category === a.category) s += 3;
    return s;
  };
  return all.map((x) => ({ x, s: score(x) })).filter((r) => r.s > 0)
    .sort((r1, r2) => r2.s - r1.s).slice(0, limit).map((r) => r.x);
}
