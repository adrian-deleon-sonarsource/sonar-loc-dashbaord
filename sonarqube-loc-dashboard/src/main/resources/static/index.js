(function () {
  'use strict';

  const LANG_COLORS = {
    java:'#b07219', cs:'#178600', js:'#f1e05a', ts:'#3178c6', py:'#3572A5',
    go:'#00ADD8', rb:'#701516', php:'#4F5D95', cpp:'#f34b7d', c:'#555555',
    html:'#e34c26', css:'#563d7c', xml:'#0060ac', swift:'#F05138',
    kotlin:'#A97BFF', scala:'#c22d40', rs:'#dea584', dart:'#00B4AB',
    vue:'#41b883', web:'#e8d44d', plsql:'#dad8d8', objc:'#438eff',
    abap:'#E8274B', flex:'#cc6600', vbnet:'#945db7', vb6:'#945db7',
    groovy:'#4298b8', lua:'#000080', apex:'#1797c0', cobol:'#005ca5',
    r:'#198ce7', terraform:'#7b42bc', ps1:'#012456', sol:'#AA6746',
    bash:'#89e051', yaml:'#cb171e', json:'#c8c8c8',
  };

  function langColor(lang, idx) {
    const c = LANG_COLORS[(lang || '').toLowerCase()];
    if (c) return c;
    return `hsl(${(idx * 137.508) % 360},62%,55%)`;
  }

  const state = {
    projects: [],
    metricsData: {},
    allLangs: [],
    selProjects: new Set(),
    selLangs: new Set(),
    compSelProjects: new Set(),
    compKeys: [],
    drillProject: null,
    drillLang: null,
    timelineLang: null,
    timelineMode: 'stacked',
    dateFrom: null,
    dateTo: null,
    compTopN: 20,
    langDetailTopN: 15,
    langDetailSearch: '',
    compSearch: '',
  };

  const charts = { timeline: null, dist: null, comp: null, projDetail: null, langDetail: null };
  let root = null;

  function $(id) { return document.getElementById('lcd-' + id); }

  // ─── Styles ────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('lcd-styles')) return;
    const s = document.createElement('style');
    s.id = 'lcd-styles';
    s.textContent = [
      '#lcd-root{font:var(--echoes-typography-text-default-regular);color:var(--echoes-color-text-default);background:var(--echoes-color-surface-canvas-default);min-height:100%;padding:20px 24px;box-sizing:border-box;overflow-y:auto}',
      '#lcd-root *{box-sizing:border-box;margin:0;padding:0}',
      '.lcd-topbar{display:flex;align-items:center;gap:10px;margin-bottom:20px}',
      '.lcd-topbar h2{font:var(--echoes-typography-heading-medium);color:var(--echoes-color-text-default);flex:1}',
      '.lcd-badge{display:inline-flex;align-items:center;padding:2px 10px;border-radius:var(--echoes-border-radius-full);font:var(--echoes-typography-text-small-medium)}',
      '.lcd-ok{background:var(--echoes-color-background-success-weak-default);color:var(--echoes-color-text-success,#538027)}',
      '.lcd-err{background:var(--echoes-color-background-danger-weak-default);color:var(--echoes-color-text-danger)}',
      '.lcd-card{background:var(--echoes-color-surface-default);border:var(--echoes-border-width-default) solid var(--echoes-color-border-weak);border-radius:var(--echoes-border-radius-400);padding:14px;box-shadow:var(--echoes-box-shadow-xsmall)}',
      '.lcd-load{margin-bottom:14px}',
      '.lcd-load-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}',
      '.lcd-spinner{width:14px;height:14px;border:2px solid var(--echoes-color-border-weak);border-top-color:var(--echoes-color-background-accent-default);border-radius:50%;animation:lcd-spin .7s linear infinite;flex-shrink:0}',
      '@keyframes lcd-spin{to{transform:rotate(360deg)}}',
      '.lcd-load-text{font:var(--echoes-typography-text-small-regular);color:var(--echoes-color-text-subtle)}',
      '.lcd-load-count{font:var(--echoes-typography-text-small-regular);color:var(--echoes-color-text-subtle);margin-left:auto}',
      '.lcd-prog{background:var(--echoes-color-background-neutral-subtle-default);border-radius:var(--echoes-border-radius-full);height:4px;overflow:hidden}',
      '.lcd-prog-fill{height:100%;background:var(--echoes-color-background-accent-default);border-radius:var(--echoes-border-radius-full);transition:width .4s}',
      '.lcd-alert{padding:10px 14px;border-radius:var(--echoes-border-radius-200);font:var(--echoes-typography-text-small-regular);margin-bottom:14px;background:var(--echoes-color-background-danger-weak-default);border:var(--echoes-border-width-default) solid var(--echoes-color-border-danger-weak);color:var(--echoes-color-text-danger)}',
      '.lcd-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}',
      '.lcd-stat .lbl{font:var(--echoes-typography-text-small-medium);color:var(--echoes-color-text-subtle);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}',
      '.lcd-stat .val{font:var(--echoes-typography-heading-large);color:var(--echoes-color-text-default);line-height:1}',
      '.lcd-stat .sub{font:var(--echoes-typography-text-small-regular);color:var(--echoes-color-text-subtle);margin-top:5px}',
      '.lcd-grid{display:grid;grid-template-columns:200px 1fr;gap:14px;align-items:start}',
      '.lcd-sidebar{display:flex;flex-direction:column;gap:12px}',
      '.lcd-fhdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}',
      '.lcd-flbl{font:var(--echoes-typography-text-small-medium);color:var(--echoes-color-text-subtle);text-transform:uppercase;letter-spacing:.06em}',
      '.lcd-fbtns{display:flex;gap:4px}',
      '.lcd-flist{display:flex;flex-direction:column;gap:1px;max-height:180px;overflow-y:auto}',
      '.lcd-flist::-webkit-scrollbar{width:4px}',
      '.lcd-flist::-webkit-scrollbar-thumb{background:var(--echoes-color-border-weak);border-radius:2px}',
      '.lcd-fi{display:flex;align-items:center;gap:7px;padding:5px 6px;border-radius:var(--echoes-border-radius-200);cursor:pointer;transition:background .1s}',
      '.lcd-fi:hover{background:var(--echoes-color-surface-hover)}',
      '.lcd-fi input[type=checkbox]{accent-color:var(--echoes-color-background-accent-default);cursor:pointer;flex-shrink:0}',
      '.lcd-fi-name{flex:1;font:var(--echoes-typography-text-small-regular);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.lcd-fi-cnt{color:var(--echoes-color-text-subtle);font:var(--echoes-typography-text-small-regular);flex-shrink:0}',
      '.lcd-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}',
      '.lcd-area{display:flex;flex-direction:column;gap:14px;min-width:0}',
      '.lcd-section-hdr{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px}',
      '.lcd-section-hdr h3{font:var(--echoes-typography-heading-small);color:var(--echoes-color-text-default)}',
      '.lcd-section-sub{font:var(--echoes-typography-text-small-regular);color:var(--echoes-color-text-subtle)}',
      '.lcd-chart-card{background:var(--echoes-color-surface-default);border:var(--echoes-border-width-default) solid var(--echoes-color-border-weak);border-radius:var(--echoes-border-radius-400);padding:20px;height:380px;display:flex;flex-direction:column;box-shadow:var(--echoes-box-shadow-xsmall)}',
      '.lcd-chart-card-sm{height:320px}',
      '.lcd-chart-card canvas{flex:1;min-height:0}',
      '.lcd-charts-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
      '.lcd-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--echoes-color-text-subtle);gap:10px}',
      '.lcd-empty svg{opacity:.3}',
      '.lcd-empty p{font:var(--echoes-typography-text-default-regular)}',
      '.lcd-dr{display:flex;flex-direction:column;gap:6px}',
      '.lcd-dr-row{display:flex;align-items:center;gap:6px}',
      '.lcd-dr-row span{font:var(--echoes-typography-text-small-regular);color:var(--echoes-color-text-subtle);width:28px}',
      '.lcd-dr input{flex:1;background:var(--echoes-form-control-colors-background-default,var(--echoes-color-surface-default));border:var(--echoes-border-width-default) solid var(--echoes-form-control-colors-border-default,var(--echoes-color-border-weak));border-radius:var(--echoes-form-control-border-radius-default,var(--echoes-border-radius-400));height:2rem;padding:0 8px;color:var(--echoes-color-text-default);font:var(--echoes-typography-text-small-regular);outline:none;width:100%}',
      '.lcd-dr input:focus{border-color:var(--echoes-color-background-accent-default);box-shadow:0 0 0 2px var(--echoes-color-background-accent-weak-default)}',
      '.lcd-btn{padding:0 12px;height:2rem;border-radius:var(--echoes-border-radius-200);border:var(--echoes-border-width-default) solid var(--echoes-color-border-weak);cursor:pointer;font:var(--echoes-typography-text-small-regular);transition:all .15s;white-space:nowrap;background:var(--echoes-color-surface-default);color:var(--echoes-color-text-default);width:100%}',
      '.lcd-btn:hover{background:var(--echoes-color-surface-hover)}',
      '.lcd-btn-xs{padding:0 8px;height:1.5rem;font:var(--echoes-typography-text-small-regular);border-radius:var(--echoes-border-radius-100);width:auto}',
      '.lcd-hidden{display:none!important}',
      '#lcd-root::-webkit-scrollbar{width:6px;height:6px}',
      '#lcd-root::-webkit-scrollbar-track{background:var(--echoes-color-surface-canvas-default)}',
      '#lcd-root::-webkit-scrollbar-thumb{background:var(--echoes-color-border-weak);border-radius:3px}',
      '@media(max-width:1100px){.lcd-charts-row{grid-template-columns:1fr}}',
      '@media(max-width:960px){.lcd-stats{grid-template-columns:repeat(2,1fr)}.lcd-grid{grid-template-columns:1fr}}',
      '.lcd-comp-wrap{position:relative}',
      '.lcd-comp-trigger{display:flex;align-items:center;gap:6px;background:var(--echoes-color-surface-default);border:var(--echoes-border-width-default) solid var(--echoes-color-border-weak);border-radius:var(--echoes-border-radius-200);padding:0 10px;height:2rem;color:var(--echoes-color-text-default);font:var(--echoes-typography-text-small-regular);cursor:pointer;min-width:140px;justify-content:space-between}',
      '.lcd-comp-trigger:hover,.lcd-comp-trigger.open{border-color:var(--echoes-color-background-accent-default)}',
      '.lcd-comp-panel{position:absolute;top:calc(100% + 4px);right:0;background:var(--echoes-color-surface-default);border:var(--echoes-border-width-default) solid var(--echoes-color-border-weak);border-radius:var(--echoes-border-radius-400);padding:8px;min-width:240px;z-index:100;box-shadow:var(--echoes-box-shadow-medium,0 4px 16px rgba(0,0,0,0.2))}',
      '.lcd-comp-actions{display:flex;gap:4px;margin-bottom:8px;padding-bottom:8px;border-bottom:var(--echoes-border-width-default) solid var(--echoes-color-border-weak)}',
      '.lcd-comp-list{display:flex;flex-direction:column;gap:1px;max-height:200px;overflow-y:auto}',
      '.lcd-comp-search{width:100%;background:var(--echoes-form-control-colors-background-default,var(--echoes-color-surface-default));border:var(--echoes-border-width-default) solid var(--echoes-form-control-colors-border-default,var(--echoes-color-border-weak));border-radius:var(--echoes-form-control-border-radius-default,var(--echoes-border-radius-400));height:1.75rem;padding:0 8px;color:var(--echoes-color-text-default);font:var(--echoes-typography-text-small-regular);outline:none;box-sizing:border-box;margin-bottom:6px}',
      '.lcd-comp-search:focus{border-color:var(--echoes-color-background-accent-default)}',
      '.lcd-topn-sel{padding:0 6px;height:1.5rem;border-radius:var(--echoes-border-radius-100);border:var(--echoes-border-width-default) solid var(--echoes-color-border-weak);background:var(--echoes-color-surface-default);color:var(--echoes-color-text-default);font:var(--echoes-typography-text-small-regular);cursor:pointer}',
      '.lcd-detail-panel{margin-top:10px;padding-top:12px;border-top:var(--echoes-border-width-default) solid var(--echoes-color-border-weak)}',
      '.lcd-detail-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}',
      '.lcd-detail-title{font:var(--echoes-typography-heading-small);color:var(--echoes-color-text-default)}',
      '.lcd-detail-close{background:none;border:none;color:var(--echoes-color-text-subtle);font-size:18px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:var(--echoes-border-radius-200)}',
      '.lcd-detail-close:hover{background:var(--echoes-color-surface-hover);color:var(--echoes-color-text-default)}',
      '.lcd-detail-toolbar{display:flex;align-items:center;gap:6px;margin-bottom:8px}',
      '.lcd-detail-search{flex:1;background:var(--echoes-form-control-colors-background-default,var(--echoes-color-surface-default));border:var(--echoes-border-width-default) solid var(--echoes-form-control-colors-border-default,var(--echoes-color-border-weak));border-radius:var(--echoes-form-control-border-radius-default,var(--echoes-border-radius-400));height:1.75rem;padding:0 8px;color:var(--echoes-color-text-default);font:var(--echoes-typography-text-small-regular);outline:none}',
      '.lcd-detail-search:focus{border-color:var(--echoes-color-background-accent-default)}',
      '.lcd-growth{display:flex;gap:16px;margin-bottom:8px;flex-wrap:wrap}',
      '.lcd-growth-item{font:var(--echoes-typography-text-small-regular);color:var(--echoes-color-text-subtle)}',
      '.lcd-growth-item strong{font:var(--echoes-typography-text-small-medium);color:var(--echoes-color-text-default)}',
      '.lcd-growth-pos{color:var(--echoes-color-text-success,#538027)!important;font:var(--echoes-typography-text-small-medium)!important}',
      '.lcd-growth-neg{color:var(--echoes-color-text-danger)!important;font:var(--echoes-typography-text-small-medium)!important}',
      '.lcd-stats-col{display:flex;flex-direction:column;gap:12px;min-width:0}',
      '.lcd-movers-card{padding:12px 14px}',
      '.lcd-movers-hdr{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;padding-bottom:8px;border-bottom:var(--echoes-border-width-default) solid var(--echoes-color-border-weak)}',
      '.lcd-movers-list{display:flex;flex-direction:column}',
      '.lcd-mover{display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:var(--echoes-border-width-default) solid var(--echoes-color-border-weak)}',
      '.lcd-mover:last-child{border-bottom:none}',
      '.lcd-mover-lang{font:var(--echoes-typography-text-small-medium);color:var(--echoes-color-text-default)}',
      '.lcd-mover-right{margin-left:auto;display:flex;align-items:center;gap:5px}',
      '.lcd-mover-badge-new{background:var(--echoes-color-background-accent-weak-default);color:var(--echoes-color-text-accent);padding:1px 6px;border-radius:var(--echoes-border-radius-full);font:var(--echoes-typography-text-small-medium);font-size:10px;letter-spacing:.05em}',
      '.lcd-mover-pos{font:var(--echoes-typography-text-small-medium);color:var(--echoes-color-text-success,#538027)}',
      '.lcd-mover-neg{font:var(--echoes-typography-text-small-medium);color:var(--echoes-color-text-danger)}',
      '.lcd-mover-pct{font:var(--echoes-typography-text-small-regular);color:var(--echoes-color-text-subtle)}',
    ].join('');
    document.head.appendChild(s);
  }

  // ─── HTML template ─────────────────────────────────────────────────────────
  function renderTemplate(el) {
    el.id = 'lcd-root';
    el.innerHTML = [
      '<div class="lcd-topbar">',
        '<h2>LOC Dashboard</h2>',
        '<span id="lcd-badge" class="lcd-badge"></span>',
        '<button class="lcd-btn lcd-btn-xs" onclick="window.__lcdReload()" style="width:auto;margin-left:6px">&#8635; Refresh</button>',
      '</div>',

      '<div id="lcd-loading" class="lcd-card lcd-load">',
        '<div class="lcd-load-row">',
          '<div class="lcd-spinner"></div>',
          '<span id="lcd-load-text" class="lcd-load-text">Fetching projects\u2026</span>',
          '<span id="lcd-load-count" class="lcd-load-count"></span>',
        '</div>',
        '<div class="lcd-prog"><div id="lcd-prog-fill" class="lcd-prog-fill" style="width:0%"></div></div>',
      '</div>',

      '<div id="lcd-err" class="lcd-alert lcd-hidden"></div>',

      '<div id="lcd-dash" class="lcd-hidden">',

        '<div class="lcd-stats">',
          '<div class="lcd-card lcd-stat"><div class="lbl">Total Lines of Code</div><div class="val" id="lcd-s-loc">\u2014</div><div class="sub" id="lcd-s-loc-sub"></div></div>',
          '<div class="lcd-card lcd-stat"><div class="lbl">Projects</div><div class="val" id="lcd-s-proj">\u2014</div><div class="sub" id="lcd-s-proj-sub"></div></div>',
          '<div class="lcd-card lcd-stat"><div class="lbl">Languages</div><div class="val" id="lcd-s-lang">\u2014</div><div class="sub" id="lcd-s-lang-sub"></div></div>',
          '<div class="lcd-stats-col">',
            '<div class="lcd-card lcd-stat"><div class="lbl">History Span</div><div class="val" style="font-size:15px;line-height:1.4" id="lcd-s-date">\u2014</div><div class="sub" id="lcd-s-date-sub"></div></div>',
            '<div id="lcd-movers" class="lcd-card lcd-movers-card lcd-hidden">',
              '<div class="lcd-movers-hdr">',
                '<span class="lcd-flbl">Top Movers</span>',
                '<span class="lcd-section-sub" id="lcd-movers-sub"></span>',
              '</div>',
              '<div id="lcd-movers-list" class="lcd-movers-list"></div>',
            '</div>',
          '</div>',
        '</div>',

        '<div class="lcd-grid">',

          '<div class="lcd-sidebar">',

            '<div class="lcd-card">',
              '<div class="lcd-fhdr"><span class="lcd-flbl">Date Range</span></div>',
              '<div class="lcd-dr">',
                '<div class="lcd-dr-row"><span>From</span><input type="date" id="lcd-date-from"></div>',
                '<div class="lcd-dr-row"><span>To</span><input type="date" id="lcd-date-to"></div>',
                '<button class="lcd-btn" style="margin-top:4px" onclick="window.__lcdResetDates()">Reset dates</button>',
              '</div>',
            '</div>',

            '<div class="lcd-card">',
              '<div class="lcd-fhdr"><span class="lcd-flbl">Projects</span>',
                '<div class="lcd-fbtns">',
                  '<button id="lcd-btn-all-proj" class="lcd-btn lcd-btn-xs">All</button>',
                  '<button id="lcd-btn-none-proj" class="lcd-btn lcd-btn-xs">None</button>',
                '</div>',
              '</div>',
              '<div id="lcd-proj-filter" class="lcd-flist"></div>',
            '</div>',

            '<div class="lcd-card">',
              '<div class="lcd-fhdr"><span class="lcd-flbl">Languages</span>',
                '<div class="lcd-fbtns">',
                  '<button id="lcd-btn-all-lang" class="lcd-btn lcd-btn-xs">All</button>',
                  '<button id="lcd-btn-none-lang" class="lcd-btn lcd-btn-xs">None</button>',
                '</div>',
              '</div>',
              '<div id="lcd-lang-filter" class="lcd-flist"></div>',
            '</div>',

          '</div>',

          '<div class="lcd-area">',

            '<div>',
              '<div class="lcd-section-hdr">',
                '<h3>LOC Over Time</h3>',
                '<div style="display:flex;align-items:center;gap:8px">',
                  '<span class="lcd-section-sub" id="lcd-title-timeline"></span>',
                  '<select id="lcd-timeline-lang-sel" class="lcd-topn-sel">',
                    '<option value="">All languages</option>',
                  '</select>',
                  '<select id="lcd-timeline-mode" class="lcd-topn-sel">',
                    '<option value="stacked">Stacked</option>',
                    '<option value="lines">Lines</option>',
                  '</select>',
                '</div>',
              '</div>',
              '<div class="lcd-chart-card">',
                '<canvas id="lcd-chart-timeline"></canvas>',
                '<div id="lcd-empty-timeline" class="lcd-empty lcd-hidden">',
                  '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></svg>',
                  '<p>No data for the selected filters</p>',
                '</div>',
              '</div>',
            '</div>',

            '<div class="lcd-charts-row">',

              '<div>',
                '<div class="lcd-section-hdr">',
                  '<h3>By Language</h3>',
                  '<div style="display:flex;align-items:center;gap:8px">',
                    '<span class="lcd-section-sub" id="lcd-title-dist"></span>',
                    '<select id="lcd-drill-lang-sel" class="lcd-topn-sel">',
                      '<option value="">Drill down\u2026</option>',
                    '</select>',
                  '</div>',
                '</div>',
                '<div class="lcd-chart-card lcd-chart-card-sm" style="cursor:pointer">',
                  '<canvas id="lcd-chart-dist"></canvas>',
                  '<div id="lcd-empty-dist" class="lcd-empty lcd-hidden">',
                    '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></svg>',
                    '<p>No data for the selected filters</p>',
                  '</div>',
                '</div>',
                '<div id="lcd-lang-detail" class="lcd-detail-panel lcd-hidden">',
                  '<div class="lcd-detail-hdr">',
                    '<span id="lcd-lang-detail-title" class="lcd-detail-title"></span>',
                    '<button id="lcd-lang-detail-close" class="lcd-detail-close">\u00d7</button>',
                  '</div>',
                  '<div class="lcd-detail-toolbar">',
                    '<input id="lcd-lang-detail-search" class="lcd-detail-search" type="text" placeholder="Filter projects\u2026">',
                    '<select id="lcd-topn-lang" class="lcd-topn-sel">',
                      '<option value="10">Top 10</option>',
                      '<option value="15" selected>Top 15</option>',
                      '<option value="25">Top 25</option>',
                      '<option value="50">Top 50</option>',
                      '<option value="0">All</option>',
                    '</select>',
                  '</div>',
                  '<div id="lcd-lang-detail-card" class="lcd-chart-card lcd-chart-card-sm" style="margin-top:0">',
                    '<canvas id="lcd-chart-lang-detail"></canvas>',
                    '<div id="lcd-empty-lang-detail" class="lcd-empty lcd-hidden">',
                      '<p>No projects have this language in the current selection</p>',
                    '</div>',
                  '</div>',
                '</div>',
              '</div>',

              '<div>',
                '<div class="lcd-section-hdr">',
                  '<h3>By Project</h3>',
                  '<div style="display:flex;align-items:center;gap:8px">',
                    '<span class="lcd-section-sub" id="lcd-title-comp"></span>',
                    '<select id="lcd-drill-proj-sel" class="lcd-topn-sel">',
                      '<option value="">Drill down\u2026</option>',
                    '</select>',
                    '<select id="lcd-topn-comp" class="lcd-topn-sel">',
                      '<option value="10">Top 10</option>',
                      '<option value="20" selected>Top 20</option>',
                      '<option value="50">Top 50</option>',
                      '<option value="100">Top 100</option>',
                      '<option value="0">All</option>',
                    '</select>',
                    '<div id="lcd-comp-wrap" class="lcd-comp-wrap">',
                      '<button id="lcd-comp-trigger" class="lcd-comp-trigger">',
                        '<span id="lcd-comp-label">All projects</span>',
                        '<svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1l4 4 4-4"/></svg>',
                      '</button>',
                      '<div id="lcd-comp-panel" class="lcd-comp-panel lcd-hidden">',
                        '<input id="lcd-comp-search" class="lcd-comp-search" type="text" placeholder="Search projects\u2026">',
                        '<div class="lcd-comp-actions">',
                          '<button id="lcd-comp-all" class="lcd-btn lcd-btn-xs">All</button>',
                          '<button id="lcd-comp-none" class="lcd-btn lcd-btn-xs">None</button>',
                        '</div>',
                        '<div id="lcd-comp-list" class="lcd-comp-list"></div>',
                      '</div>',
                    '</div>',
                  '</div>',
                '</div>',
                '<div class="lcd-chart-card lcd-chart-card-sm" style="cursor:pointer">',
                  '<canvas id="lcd-chart-comp"></canvas>',
                  '<div id="lcd-empty-comp" class="lcd-empty lcd-hidden">',
                    '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></svg>',
                    '<p>No data for the selected filters</p>',
                  '</div>',
                '</div>',
                '<div id="lcd-proj-detail" class="lcd-detail-panel lcd-hidden">',
                  '<div class="lcd-detail-hdr">',
                    '<span id="lcd-proj-detail-title" class="lcd-detail-title"></span>',
                    '<button id="lcd-proj-detail-close" class="lcd-detail-close">\u00d7</button>',
                  '</div>',
                  '<div class="lcd-growth" id="lcd-proj-growth"></div>',
                  '<div class="lcd-chart-card lcd-chart-card-sm" style="margin-top:0">',
                    '<canvas id="lcd-chart-proj-detail"></canvas>',
                    '<div id="lcd-empty-proj-detail" class="lcd-empty lcd-hidden">',
                      '<p>No history data for this project</p>',
                    '</div>',
                  '</div>',
                '</div>',
              '</div>',

            '</div>',

          '</div>',
        '</div>',
      '</div>',
    ].join('');
  }

  // ─── Script loader ─────────────────────────────────────────────────────────
  function loadScript(src, globalCheck) {
    if (globalCheck && window[globalCheck]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.appendChild(s);
    });
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ─── API ───────────────────────────────────────────────────────────────────
  function apiFetch(path) {
    return fetch(path, { credentials: 'same-origin' }).then(res => {
      if (res.status === 401) throw new Error('Session expired \u2014 please log in and reload.');
      if (res.status === 403) throw new Error('403 Forbidden \u2014 check Browse permissions.');
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res.json();
    });
  }

  function fetchAllProjects() {
    let all = [];
    function page(n) {
      return apiFetch(`/api/projects/search?ps=500&p=${n}`).then(data => {
        all = all.concat(data.components);
        if (all.length < data.paging.total) return page(n + 1);
        return all;
      });
    }
    return page(1);
  }

  function fetchMetrics(key) {
    return apiFetch(`/api/measures/search_history?component=${encodeURIComponent(key)}&metrics=ncloc_language_distribution&ps=1000`)
      .then(data => {
        const history = (data.measures && data.measures[0] && data.measures[0].history) || [];
        return history
          .filter(h => h.value)
          .map(h => ({ date: new Date(h.date), langs: parseLangDist(h.value) }))
          .sort((a, b) => a.date - b.date);
      })
      .catch(() => []);
  }

  function parseLangDist(value) {
    const out = {};
    for (const seg of value.split(';')) {
      const eq = seg.indexOf('=');
      if (eq === -1) continue;
      const lang = seg.slice(0, eq).toLowerCase().trim();
      const n = parseInt(seg.slice(eq + 1), 10);
      if (lang && !isNaN(n)) out[lang] = n;
    }
    return out;
  }

  // ─── Load ──────────────────────────────────────────────────────────────────
  function load() {
    $('loading').classList.remove('lcd-hidden');
    $('dash').classList.add('lcd-hidden');
    $('err').classList.add('lcd-hidden');
    setStatus('', false);
    setProgress(0, 'Fetching project list\u2026');

    fetchAllProjects()
      .then(projects => {
        if (!projects.length) throw new Error('No projects found. Check Browse permissions.');
        state.projects = projects;
        state.selProjects = new Set(projects.map(p => p.key));
        state.compSelProjects = new Set(projects.map(p => p.key));
        setProgress(5, `Found ${projects.length} project${projects.length !== 1 ? 's' : ''}. Fetching metrics\u2026`);
        return fetchMetricsBatch(projects);
      })
      .then(() => {
        const langSet = new Set();
        Object.values(state.metricsData).forEach(h =>
          h.forEach(pt => Object.keys(pt.langs).forEach(l => langSet.add(l)))
        );
        state.allLangs = [...langSet].sort();
        state.selLangs = new Set(state.allLangs);
        resetDatesFromData();
        setProgress(100, 'Done');
        $('loading').classList.add('lcd-hidden');
        setStatus(`${state.projects.length} projects`, true);
        $('dash').classList.remove('lcd-hidden');
        renderProjFilter();
        renderLangFilter();
        renderCompDropdown();
        updateStats();
        renderAllCharts();
      })
      .catch(err => {
        $('loading').classList.add('lcd-hidden');
        const el = $('err');
        el.textContent = err.message;
        el.classList.remove('lcd-hidden');
        setStatus('Error', false);
      });
  }

  function fetchMetricsBatch(projects) {
    const BATCH = 6;
    let i = 0;
    function next() {
      if (i >= projects.length) return Promise.resolve();
      const batch = projects.slice(i, i + BATCH);
      i += BATCH;
      return Promise.all(batch.map(p => fetchMetrics(p.key)))
        .then(results => {
          batch.forEach((p, j) => { state.metricsData[p.key] = results[j]; });
          const done = Math.min(i, projects.length);
          setProgress(5 + (done / projects.length) * 90, `Fetched ${done} / ${projects.length}\u2026`);
          $('load-count').textContent = `${done} / ${projects.length}`;
          return next();
        });
    }
    return next();
  }

  // ─── UI helpers ────────────────────────────────────────────────────────────
  function setProgress(pct, txt) {
    $('prog-fill').style.width = `${pct}%`;
    if (txt) $('load-text').textContent = txt;
  }

  function setStatus(txt, ok) {
    const el = $('badge');
    el.textContent = txt;
    el.className = `lcd-badge${txt ? (' ' + (ok ? 'lcd-ok' : 'lcd-err')) : ''}`;
  }

  function fmtN(n) { return n == null ? '\u2014' : Number(n).toLocaleString(); }
  function fmtK(n) {
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3)}K`;
    return n;
  }
  function fmtDate(d) { return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  function toInput(d) { return d.toISOString().slice(0, 10); }

  // ─── Filters ───────────────────────────────────────────────────────────────
  function renderProjFilter() {
    const c = $('proj-filter');
    c.innerHTML = '';
    state.projects.forEach(p => {
      const lbl = document.createElement('label');
      lbl.className = 'lcd-fi';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.selProjects.has(p.key);
      cb.addEventListener('change', () => {
        cb.checked ? state.selProjects.add(p.key) : state.selProjects.delete(p.key);
        renderLangFilter(); updateStats(); renderAllCharts();
      });
      const nm = document.createElement('span');
      nm.className = 'lcd-fi-name';
      nm.textContent = p.name || p.key;
      nm.title = nm.textContent;
      lbl.appendChild(cb); lbl.appendChild(nm);
      c.appendChild(lbl);
    });
  }

  function renderLangFilter() {
    const snap = getSnapshot();
    const totals = {};
    Object.values(snap).forEach(langs =>
      Object.entries(langs).forEach(([l, n]) => { totals[l] = (totals[l] || 0) + n; })
    );
    const c = $('lang-filter');
    c.innerHTML = '';
    state.allLangs.forEach((lang, idx) => {
      const lbl = document.createElement('label');
      lbl.className = 'lcd-fi';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.selLangs.has(lang);
      cb.addEventListener('change', () => {
        cb.checked ? state.selLangs.add(lang) : state.selLangs.delete(lang);
        renderAllCharts();
      });
      const dot = document.createElement('span');
      dot.className = 'lcd-dot';
      dot.style.background = langColor(lang, idx);
      const nm = document.createElement('span');
      nm.className = 'lcd-fi-name';
      nm.textContent = lang;
      const cnt = document.createElement('span');
      cnt.className = 'lcd-fi-cnt';
      cnt.textContent = fmtK(totals[lang] || 0);
      lbl.appendChild(cb); lbl.appendChild(dot); lbl.appendChild(nm); lbl.appendChild(cnt);
      c.appendChild(lbl);
    });
  }

  // ─── Data ──────────────────────────────────────────────────────────────────
  function getSnapshot(projSet) {
    const from = state.dateFrom, to = state.dateTo, result = {};
    (projSet || state.selProjects).forEach(key => {
      const hist = state.metricsData[key] || [];
      const inRange = hist.filter(p => (!from || p.date >= from) && (!to || p.date <= to));
      const last = inRange.length ? inRange[inRange.length - 1] : hist[hist.length - 1];
      if (last) result[key] = last.langs;
    });
    return result;
  }

  // O(P × (H + T)) two-pointer approach — each project's history is walked once per render
  function getTimeSeries() {
    const from = state.dateFrom, to = state.dateTo;
    const tsSet = new Set();
    for (const key of state.selProjects) {
      for (const pt of state.metricsData[key] || []) {
        if ((!from || pt.date >= from) && (!to || pt.date <= to)) tsSet.add(pt.date.getTime());
      }
    }
    const timestamps = [...tsSet].sort((a, b) => a - b);
    if (!timestamps.length) return [];

    const points = timestamps.map(t => ({ date: new Date(t), langs: {} }));

    for (const key of state.selProjects) {
      const hist = state.metricsData[key] || [];
      if (!hist.length) continue;
      let hi = 0;
      for (const pt of points) {
        const t = pt.date.getTime();
        while (hi + 1 < hist.length && hist[hi + 1].date.getTime() <= t) hi++;
        if (hist[hi].date.getTime() <= t) {
          for (const [l, n] of Object.entries(hist[hi].langs)) {
            pt.langs[l] = (pt.langs[l] || 0) + n;
          }
        }
      }
    }
    return points;
  }

  function activeLangs() { return state.allLangs.filter(l => state.selLangs.has(l)); }

  // ─── Stats ─────────────────────────────────────────────────────────────────
  function updateStats() {
    const snap = getSnapshot();
    const totals = {};
    Object.values(snap).forEach(langs =>
      Object.entries(langs).forEach(([l, n]) => { totals[l] = (totals[l] || 0) + n; })
    );
    const total = Object.values(totals).reduce((s, n) => s + n, 0);
    const pn = Object.keys(snap).length, ln = Object.keys(totals).length;
    $('s-loc').textContent = fmtN(total);
    $('s-loc-sub').textContent = `across ${pn} project${pn !== 1 ? 's' : ''}`;
    $('s-proj').textContent = pn;
    $('s-proj-sub').textContent = `of ${state.projects.length} total`;
    $('s-lang').textContent = ln;
    $('s-lang-sub').textContent = 'in latest snapshot';
    const dates = Object.values(state.metricsData).flatMap(h => h.map(p => p.date));
    if (dates.length) {
      const min = dates.reduce((a, d) => d < a ? d : a);
      const max = dates.reduce((a, d) => d > a ? d : a);
      $('s-date').textContent = `${fmtDate(min)} \u2013 ${fmtDate(max)}`;
      $('s-date-sub').textContent = `${Math.round((max - min) / 864e5)} days of history`;
    }
  }

  // ─── Chart helpers ─────────────────────────────────────────────────────────
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function accentColor() {
    return cssVar('--echoes-color-text-accent') ||
           cssVar('--echoes-color-background-accent-default') ||
           '#4a90e2';
  }

  function makeAxis() {
    return {
      grid:  { color: cssVar('--echoes-color-border-weak') || '#e1e6f3' },
      ticks: { color: cssVar('--echoes-color-text-subtle') || '#737a8c' },
    };
  }

  function makeLegend() {
    return {
      position: 'top',
      labels: {
        color: cssVar('--echoes-color-text-default') || '#3e4357',
        usePointStyle: true, pointStyleWidth: 10, padding: 14,
        font: { size: 12, family: cssVar('--echoes-font-family-sans') || 'Inter' },
      },
    };
  }

  function mkChart(key, canvasId, config) {
    if (charts[key]) { charts[key].destroy(); charts[key] = null; }
    const canvas = document.getElementById(canvasId);
    const emptyEl = document.getElementById(canvasId.replace('chart', 'empty'));
    canvas.classList.remove('lcd-hidden');
    if (emptyEl) emptyEl.classList.add('lcd-hidden');
    charts[key] = new window.Chart(canvas.getContext('2d'), config);
  }

  function showEmpty(key, canvasId) {
    if (charts[key]) { charts[key].destroy(); charts[key] = null; }
    const canvas = document.getElementById(canvasId);
    const emptyEl = document.getElementById(canvasId.replace('chart', 'empty'));
    canvas.classList.add('lcd-hidden');
    if (emptyEl) emptyEl.classList.remove('lcd-hidden');
  }

  function guessUnit(series) {
    if (series.length < 2) return 'month';
    const days = (series[series.length - 1].date - series[0].date) / 864e5;
    return days < 45 ? 'day' : days < 600 ? 'month' : 'year';
  }

  // ─── Top Movers ────────────────────────────────────────────────────────────
  function renderMovers() {
    const el = $('movers');
    const from = state.dateFrom, to = state.dateTo;
    const firstTotals = {}, lastTotals = {};

    state.selProjects.forEach(key => {
      const hist = state.metricsData[key] || [];
      const inRange = hist.filter(p => (!from || p.date >= from) && (!to || p.date <= to));
      if (inRange.length < 2) return;
      const first = inRange[0], last = inRange[inRange.length - 1];
      Object.entries(first.langs).forEach(([l, n]) => { firstTotals[l] = (firstTotals[l] || 0) + n; });
      Object.entries(last.langs).forEach(([l, n]) => { lastTotals[l] = (lastTotals[l] || 0) + n; });
    });

    const allLangs = [...new Set([...Object.keys(firstTotals), ...Object.keys(lastTotals)])];
    const deltas = allLangs
      .filter(lang => state.selLangs.has(lang))
      .map(lang => {
        const before = firstTotals[lang] || 0;
        const after  = lastTotals[lang]  || 0;
        return { lang, before, after, delta: after - before, isNew: before === 0 };
      })
      .filter(item => Math.abs(item.delta) >= 100)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    if (!deltas.length) { el.classList.add('lcd-hidden'); return; }

    el.classList.remove('lcd-hidden');
    $('movers-sub').textContent = `${deltas.length} changed`;

    const list = $('movers-list');
    list.innerHTML = '';
    deltas.slice(0, 8).forEach(item => {
      const div = document.createElement('div');
      div.className = 'lcd-mover';

      const dot = document.createElement('span');
      dot.className = 'lcd-dot';
      dot.style.background = langColor(item.lang, state.allLangs.indexOf(item.lang));

      const name = document.createElement('span');
      name.className = 'lcd-mover-lang';
      name.textContent = item.lang;

      div.appendChild(dot);
      div.appendChild(name);

      if (item.isNew) {
        const badge = document.createElement('span');
        badge.className = 'lcd-mover-badge-new';
        badge.textContent = 'NEW';
        div.appendChild(badge);
      }

      const right = document.createElement('span');
      right.className = 'lcd-mover-right';

      const deltaEl = document.createElement('span');
      deltaEl.className = item.delta > 0 ? 'lcd-mover-pos' : 'lcd-mover-neg';
      deltaEl.textContent = `${item.delta > 0 ? '+' : ''}${fmtN(item.delta)}`;
      right.appendChild(deltaEl);

      if (!item.isNew && item.before >= 100) {
        const rawPct = (item.delta / item.before) * 100;
        const pct = document.createElement('span');
        pct.className = 'lcd-mover-pct';
        pct.textContent = Math.abs(rawPct) > 999
          ? `(${item.delta > 0 ? '>' : '<'}-999%)`
          : `(${item.delta > 0 ? '+' : ''}${rawPct.toFixed(0)}%)`;
        right.appendChild(pct);
      }

      div.appendChild(right);
      list.appendChild(div);
    });
  }

  // ─── Render all charts ─────────────────────────────────────────────────────
  function renderAllCharts() {
    const langs = activeLangs();
    if (state.drillProject && !state.selProjects.has(state.drillProject)) closeProjDetail();
    if (state.drillLang    && !langs.includes(state.drillLang))           closeLangDetail();
    if (state.timelineLang && !langs.includes(state.timelineLang))        state.timelineLang = null;
    renderMovers();
    renderTimeline(langs);
    renderDistribution(langs);
    renderComparison(langs);
    if (state.drillProject) renderProjDetailChart(state.drillProject);
    if (state.drillLang)    renderLangDetailChart(state.drillLang);
  }

  // ─── Project drill-down ────────────────────────────────────────────────────
  function openProjDetail(key) {
    state.drillProject = key;
    const p = state.projects.find(x => x.key === key);
    $('proj-detail-title').textContent = (p && p.name) || key;
    $('proj-detail').classList.remove('lcd-hidden');
    renderProjDetailChart(key);
  }

  function closeProjDetail() {
    state.drillProject = null;
    $('proj-detail').classList.add('lcd-hidden');
    if (charts.projDetail) { charts.projDetail.destroy(); charts.projDetail = null; }
    const sel = document.getElementById('lcd-drill-proj-sel');
    if (sel) sel.value = '';
  }

  function renderProjDetailChart(key) {
    const hist = state.metricsData[key] || [];
    const from = state.dateFrom, to = state.dateTo;
    const filtered = hist.filter(p => (!from || p.date >= from) && (!to || p.date <= to));

    if (!filtered.length) {
      document.getElementById('lcd-chart-proj-detail').classList.add('lcd-hidden');
      $('empty-proj-detail').classList.remove('lcd-hidden');
      return;
    }

    const first = filtered[0], last = filtered[filtered.length - 1];
    const firstTotal = Object.values(first.langs).reduce((s, n) => s + n, 0);
    const lastTotal  = Object.values(last.langs).reduce((s, n) => s + n, 0);
    const delta = lastTotal - firstTotal;
    const pct   = firstTotal > 0 ? ((delta / firstTotal) * 100).toFixed(1) : null;
    const growthClass = delta >= 0 ? 'lcd-growth-pos' : 'lcd-growth-neg';
    const sign  = delta >= 0 ? '+' : '';

    $('proj-growth').innerHTML =
      `<span class="lcd-growth-item">First scan: <strong>${fmtN(firstTotal)} LOC</strong></span>` +
      `<span class="lcd-growth-item">Latest: <strong>${fmtN(lastTotal)} LOC</strong></span>` +
      `<span class="${growthClass}">${sign}${fmtN(delta)} LOC${pct !== null ? ` (${sign}${pct}%)` : ''}</span>`;

    const langs = activeLangs().filter(l => filtered.some(pt => pt.langs[l]));
    const AXIS = makeAxis(), LEGEND = makeLegend();

    const datasets = langs.map((lang, idx) => {
      const color = langColor(lang, idx);
      return {
        label: lang,
        data: filtered.map(pt => ({ x: pt.date, y: pt.langs[lang] || 0 })),
        backgroundColor: `${color}a0`, borderColor: color, borderWidth: 1.5,
        fill: true, tension: 0.35,
        pointRadius: filtered.length > 80 ? 0 : 3, pointHoverRadius: 5,
      };
    });

    if (charts.projDetail) { charts.projDetail.destroy(); charts.projDetail = null; }
    const canvas = document.getElementById('lcd-chart-proj-detail');
    canvas.classList.remove('lcd-hidden');
    $('empty-proj-detail').classList.add('lcd-hidden');
    charts.projDetail = new window.Chart(canvas.getContext('2d'), {
      type: 'line', data: { datasets }, options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { type: 'time', time: { unit: guessUnit(filtered) }, grid: AXIS.grid, ticks: { maxTicksLimit: 8, ...AXIS.ticks } },
          y: { stacked: true, grid: AXIS.grid, ticks: { callback: fmtK, ...AXIS.ticks }, title: { display: true, text: 'Lines of Code', color: AXIS.ticks.color, font: { size: 11 } } },
        },
        plugins: { legend: LEGEND, tooltip: { callbacks: {
          label: ctx => `  ${ctx.dataset.label}: ${fmtN(ctx.raw.y)}`,
          footer: items => `  Total: ${fmtN(items.reduce((s, i) => s + i.raw.y, 0))}`,
        }}},
      },
    });
  }

  // ─── Language drill-down ───────────────────────────────────────────────────
  function openLangDetail(lang) {
    state.drillLang = lang;
    $('lang-detail-title').textContent = `${lang} \u2014 by project`;
    $('lang-detail').classList.remove('lcd-hidden');
    renderLangDetailChart(lang);
  }

  function closeLangDetail() {
    state.drillLang = null;
    $('lang-detail').classList.add('lcd-hidden');
    if (charts.langDetail) { charts.langDetail.destroy(); charts.langDetail = null; }
    const sel = document.getElementById('lcd-drill-lang-sel');
    if (sel) sel.value = '';
  }

  function renderLangDetailChart(lang) {
    const snap = getSnapshot();
    let entries = [];
    state.selProjects.forEach(key => {
      const langs = snap[key];
      if (langs && langs[lang]) {
        const p = state.projects.find(x => x.key === key);
        entries.push({ name: (p && p.name) || key, loc: langs[lang] });
      }
    });
    entries.sort((a, b) => b.loc - a.loc);

    const q = (state.langDetailSearch || '').toLowerCase();
    if (q) entries = entries.filter(e => e.name.toLowerCase().includes(q));

    const totalEntries = entries.length;
    let othersLoc = 0;
    const topN = state.langDetailTopN;
    if (topN > 0 && entries.length > topN) {
      const rest = entries.slice(topN);
      othersLoc = rest.reduce((s, e) => s + e.loc, 0);
      entries = entries.slice(0, topN);
    }
    if (othersLoc > 0) {
      entries.push({ name: `Others (${totalEntries - topN} more)`, loc: othersLoc, isOthers: true });
    }

    if (!entries.length) {
      document.getElementById('lcd-chart-lang-detail').classList.add('lcd-hidden');
      $('empty-lang-detail').classList.remove('lcd-hidden');
      return;
    }

    const cardEl = $('lang-detail-card');
    cardEl.style.height = `${Math.max(180, Math.min(520, entries.length * 26 + 50))}px`;

    const color  = langColor(lang, state.allLangs.indexOf(lang));
    const total  = entries.reduce((s, e) => s + e.loc, 0);
    const AXIS   = makeAxis();
    const bgColors = entries.map(e => e.isOthers ? (cssVar('--echoes-color-border-weak') || '#ccc') : `${color}bb`);
    const bdColors = entries.map(e => e.isOthers ? (cssVar('--echoes-color-text-subtle') || '#888') : color);

    if (charts.langDetail) { charts.langDetail.destroy(); charts.langDetail = null; }
    const canvas = document.getElementById('lcd-chart-lang-detail');
    canvas.classList.remove('lcd-hidden');
    $('empty-lang-detail').classList.add('lcd-hidden');
    charts.langDetail = new window.Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: entries.map(e => e.name.length > 32 ? `${e.name.slice(0, 30)}\u2026` : e.name),
        datasets: [{ label: lang, data: entries.map(e => e.loc), backgroundColor: bgColors, borderColor: bdColors, borderWidth: 1.5, borderRadius: 4 }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: ctx => `  ${fmtN(ctx.raw)} LOC (${((ctx.raw / total) * 100).toFixed(1)}%)`,
        }}},
        scales: {
          x: { grid: AXIS.grid, ticks: { callback: fmtK, ...AXIS.ticks } },
          y: { grid: AXIS.grid, ticks: AXIS.ticks },
        },
      },
    });
  }

  function renderTimeline(langs) {
    if (!langs.length || !state.selProjects.size) { showEmpty('timeline', 'lcd-chart-timeline'); return; }
    const series = getTimeSeries();
    if (!series.length) { showEmpty('timeline', 'lcd-chart-timeline'); return; }

    const timelineSel = document.getElementById('lcd-timeline-lang-sel');
    if (timelineSel) {
      timelineSel.innerHTML = '<option value="">All languages</option>';
      langs.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l; opt.textContent = l;
        if (l === state.timelineLang) opt.selected = true;
        timelineSel.appendChild(opt);
      });
    }
    const displayLangs = state.timelineLang ? langs.filter(l => l === state.timelineLang) : langs;

    const stacked = state.timelineMode === 'stacked';
    const AXIS = makeAxis(), LEGEND = makeLegend();
    const datasets = displayLangs.map((lang, idx) => {
      const color = langColor(lang, idx);
      return {
        label: lang,
        data: series.map(pt => ({ x: pt.date, y: pt.langs[lang] || 0 })),
        backgroundColor: stacked ? `${color}a0` : `${color}30`,
        borderColor: color, borderWidth: stacked ? 1.5 : 2,
        fill: stacked, tension: 0.35,
        pointRadius: series.length > 80 ? 0 : 3, pointHoverRadius: 5,
      };
    });
    const last = series[series.length - 1];
    const lastTotal = displayLangs.reduce((s, l) => s + (last.langs[l] || 0), 0);
    $('title-timeline').textContent = `Latest: ${fmtN(lastTotal)} LOC`;
    mkChart('timeline', 'lcd-chart-timeline', {
      type: 'line', data: { datasets }, options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { type: 'time', time: { unit: guessUnit(series) }, grid: AXIS.grid, ticks: { maxTicksLimit: 8, ...AXIS.ticks } },
          y: { stacked, grid: AXIS.grid, ticks: { callback: fmtK, ...AXIS.ticks }, title: { display: true, text: 'Lines of Code', color: AXIS.ticks.color, font: { size: 11 } } },
        },
        plugins: { legend: LEGEND, tooltip: { callbacks: {
          label: ctx => `  ${ctx.dataset.label}: ${fmtN(ctx.raw.y)}`,
          ...(stacked && { footer: items => `  Total: ${fmtN(items.reduce((s, i) => s + i.raw.y, 0))}` }),
        }}},
      },
    });
  }

  function renderDistribution(langs) {
    if (!langs.length || !state.selProjects.size) { showEmpty('dist', 'lcd-chart-dist'); return; }
    const snap = getSnapshot();
    const totals = {};
    Object.values(snap).forEach(pl =>
      Object.entries(pl).forEach(([l, n]) => { if (langs.includes(l)) totals[l] = (totals[l] || 0) + n; })
    );
    const sorted = langs.filter(l => totals[l]).sort((a, b) => totals[b] - totals[a]);
    if (!sorted.length) { showEmpty('dist', 'lcd-chart-dist'); return; }
    const AXIS = makeAxis();
    const total = sorted.reduce((s, l) => s + totals[l], 0);
    $('title-dist').textContent = `${fmtN(total)} LOC total`;

    const langDrillSel = document.getElementById('lcd-drill-lang-sel');
    if (langDrillSel) {
      langDrillSel.innerHTML = '<option value="">Drill down\u2026</option>';
      sorted.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l; opt.textContent = l;
        if (l === state.drillLang) opt.selected = true;
        langDrillSel.appendChild(opt);
      });
    }

    mkChart('dist', 'lcd-chart-dist', {
      type: 'bar',
      data: {
        labels: sorted,
        datasets: [{ label: 'Lines of Code', data: sorted.map(l => totals[l]), backgroundColor: sorted.map((l, i) => `${langColor(l, i)}bb`), borderColor: sorted.map((l, i) => langColor(l, i)), borderWidth: 1.5, borderRadius: 4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: ctx => `  ${fmtN(ctx.raw)} LOC`,
          afterLabel: ctx => `  ${((ctx.raw / total) * 100).toFixed(1)}% of total`,
        }}},
        scales: {
          x: { grid: AXIS.grid, ticks: { color: accentColor(), font: { size: 12 } } },
          y: { grid: AXIS.grid, ticks: { callback: fmtK, ...AXIS.ticks }, title: { display: true, text: 'Lines of Code', color: AXIS.ticks.color, font: { size: 11 } } },
        },
        onClick: (evt, elements) => {
          if (!elements.length) return;
          const lang = sorted[elements[0].index];
          if (!lang) return;
          state.drillLang === lang ? closeLangDetail() : openLangDetail(lang);
          const sel = document.getElementById('lcd-drill-lang-sel');
          if (sel) sel.value = state.drillLang || '';
        },
        onHover: (evt, elements) => { evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'; },
      },
    });
  }

  function renderComparison(langs) {
    if (!langs.length || !state.compSelProjects.size) { showEmpty('comp', 'lcd-chart-comp'); return; }
    const snap = getSnapshot(state.compSelProjects);
    let keys = [...state.compSelProjects].filter(k => snap[k]);
    if (!keys.length) { showEmpty('comp', 'lcd-chart-comp'); return; }

    const keyLocs = {};
    keys.forEach(k => { keyLocs[k] = langs.reduce((s, l) => s + ((snap[k] && snap[k][l]) || 0), 0); });
    keys.sort((a, b) => keyLocs[b] - keyLocs[a]);

    // No "Others" bar — it skews the scale when hundreds of projects collapse into one
    const totalKeys = keys.length;
    const topN = state.compTopN;
    if (topN > 0 && keys.length > topN) keys = keys.slice(0, topN);
    state.compKeys = keys;

    const AXIS = makeAxis(), LEGEND = makeLegend();
    const names = keys.map(k => {
      const p = state.projects.find(x => x.key === k);
      const n = (p && p.name) || k;
      return n.length > 22 ? `${n.slice(0, 20)}\u2026` : n;
    });
    const datasets = langs.map((lang, idx) => ({
      label: lang,
      data: keys.map(k => (snap[k] && snap[k][lang]) || 0),
      backgroundColor: `${langColor(lang, idx)}bb`,
      borderColor: langColor(lang, idx),
      borderWidth: 1.5, borderRadius: 3,
    }));

    const hidden = totalKeys - keys.length;
    $('title-comp').textContent = `${keys.length} project${keys.length !== 1 ? 's' : ''}${hidden > 0 ? ` (+ ${hidden} hidden)` : ''}`;

    const projDrillSel = document.getElementById('lcd-drill-proj-sel');
    if (projDrillSel) {
      projDrillSel.innerHTML = '<option value="">Drill down\u2026</option>';
      keys.forEach(k => {
        const p = state.projects.find(x => x.key === k);
        const opt = document.createElement('option');
        opt.value = k; opt.textContent = (p && p.name) || k;
        if (k === state.drillProject) opt.selected = true;
        projDrillSel.appendChild(opt);
      });
    }

    mkChart('comp', 'lcd-chart-comp', {
      type: 'bar', data: { labels: names, datasets }, options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { stacked: true, grid: AXIS.grid, ticks: { maxRotation: 40, ...AXIS.ticks } },
          y: { stacked: true, grid: AXIS.grid, ticks: { callback: fmtK, ...AXIS.ticks }, title: { display: true, text: 'Lines of Code', color: AXIS.ticks.color, font: { size: 11 } } },
        },
        plugins: { legend: LEGEND, tooltip: { callbacks: {
          label: ctx => `  ${ctx.dataset.label}: ${fmtN(ctx.raw)}`,
          footer: items => `  Total: ${fmtN(items.reduce((s, i) => s + i.raw, 0))}`,
        }}},
        onClick: (evt, elements) => {
          if (!elements.length) return;
          const key = state.compKeys[elements[0].index];
          if (!key) return;
          state.drillProject === key ? closeProjDetail() : openProjDetail(key);
          const sel = document.getElementById('lcd-drill-proj-sel');
          if (sel) sel.value = state.drillProject || '';
        },
        onHover: (evt, elements) => { evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'; },
      },
    });
  }

  // ─── Date controls ─────────────────────────────────────────────────────────
  function applyDates() {
    const f = $('date-from').value, t = $('date-to').value;
    state.dateFrom = f ? new Date(`${f}T00:00:00`) : null;
    state.dateTo   = t ? new Date(`${t}T23:59:59`) : null;
    updateStats(); renderLangFilter(); renderAllCharts();
  }

  function resetDatesFromData() {
    const dates = Object.values(state.metricsData).flatMap(h => h.map(p => p.date));
    if (!dates.length) return;
    const min = dates.reduce((a, d) => d < a ? d : a);
    const max = dates.reduce((a, d) => d > a ? d : a);
    state.dateFrom = min; state.dateTo = max;
    $('date-from').value = toInput(min); $('date-to').value = toInput(max);
  }

  function initControls() {
    const debouncedApplyDates = debounce(applyDates, 300);
    $('date-from').addEventListener('change', debouncedApplyDates);
    $('date-to').addEventListener('change', debouncedApplyDates);

    document.getElementById('lcd-btn-all-proj').addEventListener('click', () => {
      state.selProjects = new Set(state.projects.map(p => p.key));
      renderProjFilter(); renderLangFilter(); updateStats(); renderAllCharts();
    });
    document.getElementById('lcd-btn-none-proj').addEventListener('click', () => {
      state.selProjects = new Set();
      renderProjFilter(); renderLangFilter(); updateStats(); renderAllCharts();
    });
    document.getElementById('lcd-btn-all-lang').addEventListener('click', () => {
      state.selLangs = new Set(state.allLangs);
      renderLangFilter(); renderAllCharts();
    });
    document.getElementById('lcd-btn-none-lang').addEventListener('click', () => {
      state.selLangs = new Set();
      renderLangFilter(); renderAllCharts();
    });

    const trigger = $('comp-trigger');
    const panel   = $('comp-panel');
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const open = !panel.classList.contains('lcd-hidden');
      panel.classList.toggle('lcd-hidden', open);
      trigger.classList.toggle('open', !open);
    });
    document.addEventListener('click', () => {
      panel.classList.add('lcd-hidden');
      trigger.classList.remove('open');
    });
    panel.addEventListener('click', e => e.stopPropagation());

    document.getElementById('lcd-proj-detail-close').addEventListener('click', closeProjDetail);
    document.getElementById('lcd-lang-detail-close').addEventListener('click', closeLangDetail);

    $('comp-all').addEventListener('click', () => {
      state.compSelProjects = new Set(state.projects.map(p => p.key));
      renderCompDropdown(); renderAllCharts();
    });
    $('comp-none').addEventListener('click', () => {
      state.compSelProjects = new Set();
      renderCompDropdown(); renderAllCharts();
    });

    document.getElementById('lcd-timeline-lang-sel').addEventListener('change', function () {
      state.timelineLang = this.value || null;
      renderTimeline(activeLangs());
    });
    document.getElementById('lcd-timeline-mode').addEventListener('change', function () {
      state.timelineMode = this.value;
      renderTimeline(activeLangs());
    });

    document.getElementById('lcd-drill-lang-sel').addEventListener('change', function () {
      if (!this.value) { closeLangDetail(); return; }
      openLangDetail(this.value);
    });
    document.getElementById('lcd-drill-proj-sel').addEventListener('change', function () {
      if (!this.value) { closeProjDetail(); return; }
      openProjDetail(this.value);
    });

    document.getElementById('lcd-comp-search').addEventListener('input', function () {
      state.compSearch = this.value;
      renderCompDropdown();
    });

    document.getElementById('lcd-topn-comp').addEventListener('change', function () {
      state.compTopN = parseInt(this.value, 10);
      renderAllCharts();
    });

    document.getElementById('lcd-lang-detail-search').addEventListener('input', function () {
      state.langDetailSearch = this.value;
      if (state.drillLang) renderLangDetailChart(state.drillLang);
    });

    document.getElementById('lcd-topn-lang').addEventListener('change', function () {
      state.langDetailTopN = parseInt(this.value, 10);
      if (state.drillLang) renderLangDetailChart(state.drillLang);
    });
  }

  function renderCompDropdown() {
    const list = $('comp-list');
    list.innerHTML = '';
    const q = (state.compSearch || '').toLowerCase();
    const visible = q
      ? state.projects.filter(p => (p.name || p.key).toLowerCase().includes(q))
      : state.projects;
    visible.forEach(p => {
      const lbl = document.createElement('label');
      lbl.className = 'lcd-fi';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.compSelProjects.has(p.key);
      cb.addEventListener('change', () => {
        cb.checked ? state.compSelProjects.add(p.key) : state.compSelProjects.delete(p.key);
        updateCompLabel(); renderAllCharts();
      });
      const nm = document.createElement('span');
      nm.className = 'lcd-fi-name';
      nm.textContent = p.name || p.key;
      nm.title = nm.textContent;
      nm.addEventListener('click', e => {
        e.preventDefault();
        state.compSelProjects = new Set([p.key]);
        renderCompDropdown(); renderAllCharts();
      });
      lbl.appendChild(cb); lbl.appendChild(nm);
      list.appendChild(lbl);
    });
    updateCompLabel();
  }

  function updateCompLabel() {
    const total = state.projects.length, sel = state.compSelProjects.size;
    const el = $('comp-label');
    if (sel === 0)          el.textContent = 'No projects';
    else if (sel === total) el.textContent = 'All projects';
    else if (sel === 1) {
      const key = [...state.compSelProjects][0];
      const p   = state.projects.find(x => x.key === key);
      const name = (p && p.name) || key;
      el.textContent = name.length > 20 ? `${name.slice(0, 18)}\u2026` : name;
    } else {
      el.textContent = `${sel} of ${total} projects`;
    }
  }

  // ─── Global callbacks referenced from inline onclick attrs ─────────────────
  window.__lcdReload     = () => load();
  window.__lcdSelProj    = all => { state.selProjects = all ? new Set(state.projects.map(p => p.key)) : new Set(); renderProjFilter(); renderLangFilter(); updateStats(); renderAllCharts(); };
  window.__lcdSelLang    = all => { state.selLangs = all ? new Set(state.allLangs) : new Set(); renderLangFilter(); renderAllCharts(); };
  window.__lcdResetDates = () => { resetDatesFromData(); updateStats(); renderLangFilter(); renderAllCharts(); };

  // ─── Extension entry point ─────────────────────────────────────────────────
  window.registerExtension('locdashboard/index', options => {
    root = options.el;

    // Unblock any overflow:hidden ancestors SonarQube sets on the page container
    let el = root.parentElement;
    while (el && el !== document.body) {
      const cs = window.getComputedStyle(el);
      if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') el.style.overflowY = 'auto';
      el = el.parentElement;
    }

    injectStyles();
    renderTemplate(root);
    initControls();

    loadScript('/static/locdashboard/chart.umd.min.js', 'Chart')
      .then(() => loadScript('/static/locdashboard/chartjs-adapter-date-fns.bundle.min.js'))
      .then(() => load())
      .catch(err => {
        root.innerHTML = `<p style="color:var(--echoes-color-text-danger);padding:20px">Failed to load Chart.js: ${err.message}</p>`;
      });

    return () => {
      Object.keys(charts).forEach(k => { if (charts[k]) { charts[k].destroy(); charts[k] = null; } });
      root.innerHTML = '';
    };
  });

}());
