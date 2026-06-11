(function () {
  'use strict';

  var LANG_COLORS = {
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
    var c = LANG_COLORS[(lang || '').toLowerCase()];
    if (c) return c;
    return 'hsl(' + ((idx * 137.508) % 360) + ',62%,55%)';
  }

  var state = {
    projects: [],
    metricsData: {},
    allLangs: [],
    selProjects: new Set(),
    selLangs: new Set(),
    compSelProjects: new Set(),
    compKeys: [],
    drillProject: null,
    drillLang: null,
    dateFrom: null,
    dateTo: null,
    compTopN: 20,
    langDetailTopN: 15,
    langDetailSearch: '',
    compSearch: '',
  };

  var charts = { timeline: null, dist: null, comp: null, projDetail: null, langDetail: null };
  var root = null;

  function $(id) { return document.getElementById('lcd-' + id); }

  // ─── Styles ────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('lcd-styles')) return;
    var s = document.createElement('style');
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
          '<div class="lcd-card lcd-stat"><div class="lbl">History Span</div><div class="val" style="font-size:15px;line-height:1.4" id="lcd-s-date">\u2014</div><div class="sub" id="lcd-s-date-sub"></div></div>',
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
                '<span class="lcd-section-sub" id="lcd-title-timeline"></span>',
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
                  '<span class="lcd-section-sub" id="lcd-title-dist"></span>',
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
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }

  // ─── API ───────────────────────────────────────────────────────────────────
  function apiFetch(path) {
    return fetch(path, { credentials: 'same-origin' }).then(function (res) {
      if (res.status === 401) throw new Error('Session expired \u2014 please log in and reload.');
      if (res.status === 403) throw new Error('403 Forbidden \u2014 check Browse permissions.');
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      return res.json();
    });
  }

  function fetchAllProjects() {
    var all = [];
    function page(n) {
      return apiFetch('/api/projects/search?ps=500&p=' + n).then(function (data) {
        all = all.concat(data.components);
        if (all.length < data.paging.total) return page(n + 1);
        return all;
      });
    }
    return page(1);
  }

  function fetchMetrics(key) {
    return apiFetch('/api/measures/search_history?component=' + encodeURIComponent(key) + '&metrics=ncloc_language_distribution&ps=1000')
      .then(function (data) {
        var history = (data.measures && data.measures[0] && data.measures[0].history) || [];
        return history
          .filter(function (h) { return h.value; })
          .map(function (h) { return { date: new Date(h.date), langs: parseLangDist(h.value) }; })
          .sort(function (a, b) { return a.date - b.date; });
      })
      .catch(function () { return []; });
  }

  function parseLangDist(value) {
    var out = {};
    value.split(';').forEach(function (seg) {
      var eq = seg.indexOf('=');
      if (eq === -1) return;
      var lang = seg.slice(0, eq).toLowerCase().trim();
      var n = parseInt(seg.slice(eq + 1), 10);
      if (lang && !isNaN(n)) out[lang] = n;
    });
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
      .then(function (projects) {
        if (!projects.length) throw new Error('No projects found. Check Browse permissions.');
        state.projects = projects;
        state.selProjects = new Set(projects.map(function (p) { return p.key; }));
        state.compSelProjects = new Set(projects.map(function (p) { return p.key; }));
        setProgress(5, 'Found ' + projects.length + ' project' + (projects.length !== 1 ? 's' : '') + '. Fetching metrics\u2026');
        return fetchMetricsBatch(projects);
      })
      .then(function () {
        var langSet = new Set();
        Object.values(state.metricsData).forEach(function (h) {
          h.forEach(function (pt) { Object.keys(pt.langs).forEach(function (l) { langSet.add(l); }); });
        });
        state.allLangs = Array.from(langSet).sort();
        state.selLangs = new Set(state.allLangs);
        resetDatesFromData();
        setProgress(100, 'Done');
        $('loading').classList.add('lcd-hidden');
        setStatus(state.projects.length + ' projects', true);
        $('dash').classList.remove('lcd-hidden');
        renderProjFilter();
        renderLangFilter();
        renderCompDropdown();
        updateStats();
        renderAllCharts();
      })
      .catch(function (err) {
        $('loading').classList.add('lcd-hidden');
        var el = $('err');
        el.textContent = err.message;
        el.classList.remove('lcd-hidden');
        setStatus('Error', false);
      });
  }

  function fetchMetricsBatch(projects) {
    var BATCH = 6, i = 0;
    function next() {
      if (i >= projects.length) return Promise.resolve();
      var batch = projects.slice(i, i + BATCH);
      i += BATCH;
      return Promise.all(batch.map(function (p) { return fetchMetrics(p.key); }))
        .then(function (results) {
          batch.forEach(function (p, j) { state.metricsData[p.key] = results[j]; });
          var done = Math.min(i, projects.length);
          setProgress(5 + (done / projects.length) * 90, 'Fetched ' + done + ' / ' + projects.length + '\u2026');
          $('load-count').textContent = done + ' / ' + projects.length;
          return next();
        });
    }
    return next();
  }

  // ─── UI helpers ────────────────────────────────────────────────────────────
  function setProgress(pct, txt) {
    $('prog-fill').style.width = pct + '%';
    if (txt) $('load-text').textContent = txt;
  }

  function setStatus(txt, ok) {
    var el = $('badge');
    el.textContent = txt;
    el.className = 'lcd-badge' + (txt ? (' ' + (ok ? 'lcd-ok' : 'lcd-err')) : '');
  }

  function fmtN(n) { return n == null ? '\u2014' : Number(n).toLocaleString(); }
  function fmtK(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return Math.round(n / 1e3) + 'K';
    return n;
  }
  function fmtDate(d) { return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  function toInput(d) { return d.toISOString().slice(0, 10); }

  // ─── Filters ───────────────────────────────────────────────────────────────
  function renderProjFilter() {
    var c = $('proj-filter');
    c.innerHTML = '';
    state.projects.forEach(function (p) {
      var lbl = document.createElement('label');
      lbl.className = 'lcd-fi';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.selProjects.has(p.key);
      cb.addEventListener('change', function () {
        cb.checked ? state.selProjects.add(p.key) : state.selProjects.delete(p.key);
        renderLangFilter(); updateStats(); renderAllCharts();
      });
      var nm = document.createElement('span');
      nm.className = 'lcd-fi-name';
      nm.textContent = p.name || p.key;
      nm.title = nm.textContent;
      lbl.appendChild(cb); lbl.appendChild(nm);
      c.appendChild(lbl);
    });
  }

  function renderLangFilter() {
    var snap = getSnapshot(), totals = {};
    Object.values(snap).forEach(function (langs) {
      Object.entries(langs).forEach(function (kv) { totals[kv[0]] = (totals[kv[0]] || 0) + kv[1]; });
    });
    var c = $('lang-filter');
    c.innerHTML = '';
    state.allLangs.forEach(function (lang, idx) {
      var lbl = document.createElement('label');
      lbl.className = 'lcd-fi';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.selLangs.has(lang);
      cb.addEventListener('change', function () {
        cb.checked ? state.selLangs.add(lang) : state.selLangs.delete(lang);
        renderAllCharts();
      });
      var dot = document.createElement('span');
      dot.className = 'lcd-dot';
      dot.style.background = langColor(lang, idx);
      var nm = document.createElement('span');
      nm.className = 'lcd-fi-name';
      nm.textContent = lang;
      var cnt = document.createElement('span');
      cnt.className = 'lcd-fi-cnt';
      cnt.textContent = fmtK(totals[lang] || 0);
      lbl.appendChild(cb); lbl.appendChild(dot); lbl.appendChild(nm); lbl.appendChild(cnt);
      c.appendChild(lbl);
    });
  }

  // ─── Data ──────────────────────────────────────────────────────────────────
  function getSnapshot(projSet) {
    var from = state.dateFrom, to = state.dateTo, result = {};
    (projSet || state.selProjects).forEach(function (key) {
      var hist = state.metricsData[key] || [];
      var inRange = hist.filter(function (p) { return (!from || p.date >= from) && (!to || p.date <= to); });
      var last = inRange.length ? inRange[inRange.length - 1] : hist[hist.length - 1];
      if (last) result[key] = last.langs;
    });
    return result;
  }

  function getTimeSeries() {
    var from = state.dateFrom, to = state.dateTo, tsSet = new Set();
    state.selProjects.forEach(function (key) {
      (state.metricsData[key] || []).forEach(function (pt) {
        if ((!from || pt.date >= from) && (!to || pt.date <= to)) tsSet.add(pt.date.getTime());
      });
    });
    return Array.from(tsSet).sort(function (a, b) { return a - b; }).map(function (t) {
      var langs = {};
      state.selProjects.forEach(function (key) {
        var hist = state.metricsData[key] || [], entry = null;
        for (var i = hist.length - 1; i >= 0; i--) { if (hist[i].date.getTime() <= t) { entry = hist[i]; break; } }
        if (entry) Object.entries(entry.langs).forEach(function (kv) { langs[kv[0]] = (langs[kv[0]] || 0) + kv[1]; });
      });
      return { date: new Date(t), langs: langs };
    });
  }

  function activeLangs() { return state.allLangs.filter(function (l) { return state.selLangs.has(l); }); }

  // ─── Stats ─────────────────────────────────────────────────────────────────
  function updateStats() {
    var snap = getSnapshot(), totals = {};
    Object.values(snap).forEach(function (langs) {
      Object.entries(langs).forEach(function (kv) { totals[kv[0]] = (totals[kv[0]] || 0) + kv[1]; });
    });
    var total = Object.values(totals).reduce(function (s, n) { return s + n; }, 0);
    var pn = Object.keys(snap).length, ln = Object.keys(totals).length;
    $('s-loc').textContent = fmtN(total);
    $('s-loc-sub').textContent = 'across ' + pn + ' project' + (pn !== 1 ? 's' : '');
    $('s-proj').textContent = pn;
    $('s-proj-sub').textContent = 'of ' + state.projects.length + ' total';
    $('s-lang').textContent = ln;
    $('s-lang-sub').textContent = 'in latest snapshot';
    var dates = Object.values(state.metricsData).reduce(function (a, h) { return a.concat(h.map(function (p) { return p.date; })); }, []);
    if (dates.length) {
      var min = new Date(Math.min.apply(null, dates)), max = new Date(Math.max.apply(null, dates));
      $('s-date').textContent = fmtDate(min) + ' \u2013 ' + fmtDate(max);
      $('s-date-sub').textContent = Math.round((max - min) / 864e5) + ' days of history';
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
      grid: { color: cssVar('--echoes-color-border-weak') || '#e1e6f3' },
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
    var canvas = document.getElementById(canvasId);
    var emptyEl = document.getElementById(canvasId.replace('chart', 'empty'));
    canvas.classList.remove('lcd-hidden');
    if (emptyEl) emptyEl.classList.add('lcd-hidden');
    charts[key] = new window.Chart(canvas.getContext('2d'), config);
  }

  function showEmpty(key, canvasId) {
    if (charts[key]) { charts[key].destroy(); charts[key] = null; }
    var canvas = document.getElementById(canvasId);
    var emptyEl = document.getElementById(canvasId.replace('chart', 'empty'));
    canvas.classList.add('lcd-hidden');
    if (emptyEl) emptyEl.classList.remove('lcd-hidden');
  }

  function guessUnit(series) {
    if (series.length < 2) return 'month';
    var days = (series[series.length - 1].date - series[0].date) / 864e5;
    return days < 45 ? 'day' : days < 600 ? 'month' : 'year';
  }

  // ─── Render all charts ─────────────────────────────────────────────────────
  function renderAllCharts() {
    var langs = activeLangs();
    if (state.drillProject && !state.selProjects.has(state.drillProject)) closeProjDetail();
    if (state.drillLang    && langs.indexOf(state.drillLang) === -1)       closeLangDetail();
    renderTimeline(langs);
    renderDistribution(langs);
    renderComparison(langs);
    if (state.drillProject) renderProjDetailChart(state.drillProject);
    if (state.drillLang)    renderLangDetailChart(state.drillLang);
  }

  // ─── Project drill-down ────────────────────────────────────────────────────
  function openProjDetail(key) {
    state.drillProject = key;
    var p = state.projects.filter(function (x) { return x.key === key; })[0];
    $('proj-detail-title').textContent = (p && p.name) || key;
    $('proj-detail').classList.remove('lcd-hidden');
    renderProjDetailChart(key);
  }

  function closeProjDetail() {
    state.drillProject = null;
    $('proj-detail').classList.add('lcd-hidden');
    if (charts.projDetail) { charts.projDetail.destroy(); charts.projDetail = null; }
  }

  function renderProjDetailChart(key) {
    var hist = state.metricsData[key] || [];
    var from = state.dateFrom, to = state.dateTo;
    var filtered = hist.filter(function (p) { return (!from || p.date >= from) && (!to || p.date <= to); });

    if (!filtered.length) {
      document.getElementById('lcd-chart-proj-detail').classList.add('lcd-hidden');
      $('empty-proj-detail').classList.remove('lcd-hidden');
      return;
    }

    var first = filtered[0], last = filtered[filtered.length - 1];
    var firstTotal = Object.values(first.langs).reduce(function (s, n) { return s + n; }, 0);
    var lastTotal  = Object.values(last.langs).reduce(function (s, n) { return s + n; }, 0);
    var delta = lastTotal - firstTotal;
    var pct   = firstTotal > 0 ? ((delta / firstTotal) * 100).toFixed(1) : null;
    var growthClass = delta >= 0 ? 'lcd-growth-pos' : 'lcd-growth-neg';
    var sign  = delta >= 0 ? '+' : '';

    $('proj-growth').innerHTML =
      '<span class="lcd-growth-item">First scan: <strong>' + fmtN(firstTotal) + ' LOC</strong></span>' +
      '<span class="lcd-growth-item">Latest: <strong>' + fmtN(lastTotal) + ' LOC</strong></span>' +
      '<span class="' + growthClass + '">' + sign + fmtN(delta) + ' LOC' +
        (pct !== null ? ' (' + sign + pct + '%)' : '') + '</span>';

    var langs = activeLangs().filter(function (l) {
      return filtered.some(function (pt) { return pt.langs[l]; });
    });

    var AXIS = makeAxis(), LEGEND = makeLegend();
    var datasets = langs.map(function (lang, idx) {
      var color = langColor(lang, idx);
      return {
        label: lang,
        data: filtered.map(function (pt) { return { x: pt.date, y: pt.langs[lang] || 0 }; }),
        backgroundColor: color + 'a0', borderColor: color, borderWidth: 1.5,
        fill: true, tension: 0.35,
        pointRadius: filtered.length > 80 ? 0 : 3, pointHoverRadius: 5,
      };
    });

    if (charts.projDetail) { charts.projDetail.destroy(); charts.projDetail = null; }
    var canvas = document.getElementById('lcd-chart-proj-detail');
    canvas.classList.remove('lcd-hidden');
    $('empty-proj-detail').classList.add('lcd-hidden');
    charts.projDetail = new window.Chart(canvas.getContext('2d'), {
      type: 'line', data: { datasets: datasets }, options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: Object.assign({ type: 'time', time: { unit: guessUnit(filtered) }, ticks: Object.assign({ maxTicksLimit: 8 }, AXIS.ticks) }, { grid: AXIS.grid }),
          y: Object.assign({ stacked: true, ticks: Object.assign({ callback: fmtK }, AXIS.ticks), title: { display: true, text: 'Lines of Code', color: AXIS.ticks.color, font: { size: 11 } } }, { grid: AXIS.grid }),
        },
        plugins: { legend: LEGEND, tooltip: { callbacks: {
          label: function (ctx) { return '  ' + ctx.dataset.label + ': ' + fmtN(ctx.raw.y); },
          footer: function (items) { return '  Total: ' + fmtN(items.reduce(function (s, i) { return s + i.raw.y; }, 0)); },
        }}},
      },
    });
  }

  // ─── Language drill-down ───────────────────────────────────────────────────
  function openLangDetail(lang) {
    state.drillLang = lang;
    $('lang-detail-title').textContent = lang + ' \u2014 by project';
    $('lang-detail').classList.remove('lcd-hidden');
    renderLangDetailChart(lang);
  }

  function closeLangDetail() {
    state.drillLang = null;
    $('lang-detail').classList.add('lcd-hidden');
    if (charts.langDetail) { charts.langDetail.destroy(); charts.langDetail = null; }
  }

  function renderLangDetailChart(lang) {
    var snap = getSnapshot();
    var entries = [];
    state.selProjects.forEach(function (key) {
      var langs = snap[key];
      if (langs && langs[lang]) {
        var p = state.projects.filter(function (x) { return x.key === key; })[0];
        entries.push({ name: (p && p.name) || key, loc: langs[lang] });
      }
    });
    entries.sort(function (a, b) { return b.loc - a.loc; });

    // Apply search filter
    var q = (state.langDetailSearch || '').toLowerCase();
    if (q) {
      entries = entries.filter(function (e) { return e.name.toLowerCase().indexOf(q) !== -1; });
    }

    // Apply Top-N with "Others" aggregation
    var totalEntries = entries.length;
    var othersLoc = 0;
    var topN = state.langDetailTopN;
    if (topN > 0 && entries.length > topN) {
      var rest = entries.slice(topN);
      othersLoc = rest.reduce(function (s, e) { return s + e.loc; }, 0);
      entries = entries.slice(0, topN);
    }
    if (othersLoc > 0) {
      entries.push({ name: 'Others (' + (totalEntries - topN) + ' more)', loc: othersLoc, isOthers: true });
    }

    if (!entries.length) {
      document.getElementById('lcd-chart-lang-detail').classList.add('lcd-hidden');
      $('empty-lang-detail').classList.remove('lcd-hidden');
      return;
    }

    // Dynamically size chart height based on row count
    var cardEl = $('lang-detail-card');
    var rowHeight = 26;
    var chartHeight = Math.max(180, Math.min(520, entries.length * rowHeight + 50));
    cardEl.style.height = chartHeight + 'px';

    var color  = langColor(lang, state.allLangs.indexOf(lang));
    var total  = entries.reduce(function (s, e) { return s + e.loc; }, 0);
    var AXIS   = makeAxis();

    var bgColors = entries.map(function (e) { return e.isOthers ? (cssVar('--echoes-color-border-weak') || '#ccc') : color + 'bb'; });
    var bdColors = entries.map(function (e) { return e.isOthers ? (cssVar('--echoes-color-text-subtle') || '#888') : color; });

    if (charts.langDetail) { charts.langDetail.destroy(); charts.langDetail = null; }
    var canvas = document.getElementById('lcd-chart-lang-detail');
    canvas.classList.remove('lcd-hidden');
    $('empty-lang-detail').classList.add('lcd-hidden');
    charts.langDetail = new window.Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: entries.map(function (e) { return e.name.length > 32 ? e.name.slice(0, 30) + '\u2026' : e.name; }),
        datasets: [{
          label: lang,
          data: entries.map(function (e) { return e.loc; }),
          backgroundColor: bgColors,
          borderColor: bdColors,
          borderWidth: 1.5, borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: function (ctx) { return '  ' + fmtN(ctx.raw) + ' LOC (' + ((ctx.raw / total) * 100).toFixed(1) + '%)'; },
        }}},
        scales: {
          x: Object.assign({ ticks: Object.assign({ callback: fmtK }, AXIS.ticks) }, { grid: AXIS.grid }),
          y: Object.assign({}, { grid: AXIS.grid, ticks: AXIS.ticks }),
        },
      },
    });
  }

  function renderTimeline(langs) {
    if (!langs.length || !state.selProjects.size) { showEmpty('timeline', 'lcd-chart-timeline'); return; }
    var series = getTimeSeries();
    if (!series.length) { showEmpty('timeline', 'lcd-chart-timeline'); return; }
    var AXIS = makeAxis(), LEGEND = makeLegend();
    var datasets = langs.map(function (lang, idx) {
      var color = langColor(lang, idx);
      return {
        label: lang,
        data: series.map(function (pt) { return { x: pt.date, y: pt.langs[lang] || 0 }; }),
        backgroundColor: color + 'a0', borderColor: color, borderWidth: 1.5,
        fill: true, tension: 0.35,
        pointRadius: series.length > 80 ? 0 : 3, pointHoverRadius: 5,
      };
    });
    var last = series[series.length - 1];
    var lastTotal = langs.reduce(function (s, l) { return s + (last.langs[l] || 0); }, 0);
    $('title-timeline').textContent = 'Latest: ' + fmtN(lastTotal) + ' LOC';
    mkChart('timeline', 'lcd-chart-timeline', {
      type: 'line', data: { datasets: datasets }, options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: Object.assign({ type: 'time', time: { unit: guessUnit(series) }, ticks: Object.assign({ maxTicksLimit: 8 }, AXIS.ticks) }, { grid: AXIS.grid }),
          y: Object.assign({ stacked: true, ticks: Object.assign({ callback: fmtK }, AXIS.ticks), title: { display: true, text: 'Lines of Code', color: AXIS.ticks.color, font: { size: 11 } } }, { grid: AXIS.grid }),
        },
        plugins: { legend: LEGEND, tooltip: { callbacks: {
          label: function (ctx) { return '  ' + ctx.dataset.label + ': ' + fmtN(ctx.raw.y); },
          footer: function (items) { return '  Total: ' + fmtN(items.reduce(function (s, i) { return s + i.raw.y; }, 0)); },
        }}},
      },
    });
  }

  function renderDistribution(langs) {
    if (!langs.length || !state.selProjects.size) { showEmpty('dist', 'lcd-chart-dist'); return; }
    var snap = getSnapshot(), totals = {};
    Object.values(snap).forEach(function (pl) {
      Object.entries(pl).forEach(function (kv) { if (langs.indexOf(kv[0]) !== -1) totals[kv[0]] = (totals[kv[0]] || 0) + kv[1]; });
    });
    var sorted = langs.filter(function (l) { return totals[l]; }).sort(function (a, b) { return totals[b] - totals[a]; });
    if (!sorted.length) { showEmpty('dist', 'lcd-chart-dist'); return; }
    var AXIS = makeAxis();
    var total = sorted.reduce(function (s, l) { return s + totals[l]; }, 0);
    var accent = accentColor();
    $('title-dist').textContent = fmtN(total) + ' LOC total';

    function findLabelIdx(evt, chart) {
      if (!chart || !chart.scales || !chart.scales.x) return -1;
      var xScale = chart.scales.x;
      if (evt.y <= chart.chartArea.bottom) return -1;
      var minDist = 40, idx = -1;
      for (var ii = 0; ii < sorted.length; ii++) {
        var dist = Math.abs(xScale.getPixelForTick(ii) - evt.x);
        if (dist < minDist) { minDist = dist; idx = ii; }
      }
      return idx;
    }

    mkChart('dist', 'lcd-chart-dist', {
      type: 'bar',
      data: {
        labels: sorted,
        datasets: [{
          label: 'Lines of Code',
          data: sorted.map(function (l) { return totals[l]; }),
          backgroundColor: sorted.map(function (l, i) { return langColor(l, i) + 'bb'; }),
          borderColor: sorted.map(function (l, i) { return langColor(l, i); }),
          borderWidth: 1.5, borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: function (ctx) { return '  ' + fmtN(ctx.raw) + ' LOC'; },
          afterLabel: function (ctx) { return '  ' + ((ctx.raw / total) * 100).toFixed(1) + '% of total'; },
        }}},
        scales: {
          x: {
            grid: AXIS.grid,
            ticks: {
              color: accent,
              font: { size: 12 },
            },
          },
          y: Object.assign({ ticks: Object.assign({ callback: fmtK }, AXIS.ticks), title: { display: true, text: 'Lines of Code', color: AXIS.ticks.color, font: { size: 11 } } }, { grid: AXIS.grid }),
        },
        onClick: function (evt, elements, chart) {
          var idx = -1;
          if (elements.length) {
            idx = elements[0].index;
          } else {
            idx = findLabelIdx(evt, chart);
          }
          if (idx < 0) return;
          var lang = sorted[idx];
          if (!lang) return;
          state.drillLang === lang ? closeLangDetail() : openLangDetail(lang);
        },
        onHover: function (evt, elements, chart) {
          var over = elements.length > 0 || findLabelIdx(evt, chart) >= 0;
          evt.native.target.style.cursor = over ? 'pointer' : 'default';
        },
      },
    });
  }

  function renderComparison(langs) {
    if (!langs.length || !state.compSelProjects.size) { showEmpty('comp', 'lcd-chart-comp'); return; }
    var snap = getSnapshot(state.compSelProjects);
    var keys = Array.from(state.compSelProjects).filter(function (k) { return snap[k]; });
    if (!keys.length) { showEmpty('comp', 'lcd-chart-comp'); return; }

    // Sort keys by total LOC descending
    var keyLocs = {};
    keys.forEach(function (k) {
      keyLocs[k] = langs.reduce(function (s, l) { return s + ((snap[k] && snap[k][l]) || 0); }, 0);
    });
    keys.sort(function (a, b) { return keyLocs[b] - keyLocs[a]; });

    // Apply Top-N with "Others" aggregation
    var othersKeys = [];
    var topN = state.compTopN;
    if (topN > 0 && keys.length > topN) {
      othersKeys = keys.slice(topN);
      keys = keys.slice(0, topN);
    }
    state.compKeys = keys;

    var AXIS = makeAxis(), LEGEND = makeLegend();
    var names = keys.map(function (k) {
      var p = state.projects.find(function (x) { return x.key === k; });
      var n = (p && p.name) || k;
      return n.length > 22 ? n.slice(0, 20) + '\u2026' : n;
    });
    if (othersKeys.length) {
      names.push('Others (' + othersKeys.length + ')');
    }

    var datasets = langs.map(function (lang, idx) {
      var data = keys.map(function (k) { return (snap[k] && snap[k][lang]) || 0; });
      if (othersKeys.length) {
        var othersTotal = othersKeys.reduce(function (s, k) { return s + ((snap[k] && snap[k][lang]) || 0); }, 0);
        data.push(othersTotal);
      }
      return {
        label: lang,
        data: data,
        backgroundColor: langColor(lang, idx) + 'bb',
        borderColor: langColor(lang, idx),
        borderWidth: 1.5, borderRadius: 3,
      };
    });

    var displayCount = keys.length + (othersKeys.length ? 1 : 0);
    $('title-comp').textContent = keys.length + (othersKeys.length ? '+' + othersKeys.length : '') + ' project' + (displayCount !== 1 ? 's' : '');

    mkChart('comp', 'lcd-chart-comp', {
      type: 'bar', data: { labels: names, datasets: datasets }, options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: Object.assign({ stacked: true, ticks: Object.assign({ maxRotation: 40 }, AXIS.ticks) }, { grid: AXIS.grid }),
          y: Object.assign({ stacked: true, ticks: Object.assign({ callback: fmtK }, AXIS.ticks), title: { display: true, text: 'Lines of Code', color: AXIS.ticks.color, font: { size: 11 } } }, { grid: AXIS.grid }),
        },
        plugins: { legend: LEGEND, tooltip: { callbacks: {
          label: function (ctx) { return '  ' + ctx.dataset.label + ': ' + fmtN(ctx.raw); },
          footer: function (items) { return '  Total: ' + fmtN(items.reduce(function (s, i) { return s + i.raw; }, 0)); },
        }}},
        onClick: function (evt, elements) {
          if (!elements.length) return;
          var clickedIdx = elements[0].index;
          // "Others" bar is the last entry when othersKeys exist — not drillable
          if (othersKeys.length && clickedIdx === keys.length) return;
          var key = state.compKeys[clickedIdx];
          if (!key) return;
          state.drillProject === key ? closeProjDetail() : openProjDetail(key);
        },
        onHover: function (evt, elements) {
          var isOthers = elements.length && othersKeys.length && elements[0].index === keys.length;
          evt.native.target.style.cursor = (elements.length && !isOthers) ? 'pointer' : 'default';
        },
      },
    });
  }

  // ─── Date controls ─────────────────────────────────────────────────────────
  function applyDates() {
    var f = $('date-from').value, t = $('date-to').value;
    state.dateFrom = f ? new Date(f + 'T00:00:00') : null;
    state.dateTo   = t ? new Date(t + 'T23:59:59') : null;
    updateStats(); renderLangFilter(); renderAllCharts();
  }

  function resetDatesFromData() {
    var dates = Object.values(state.metricsData).reduce(function (a, h) { return a.concat(h.map(function (p) { return p.date; })); }, []);
    if (!dates.length) return;
    var min = new Date(Math.min.apply(null, dates)), max = new Date(Math.max.apply(null, dates));
    state.dateFrom = min; state.dateTo = max;
    $('date-from').value = toInput(min); $('date-to').value = toInput(max);
  }

  function initControls() {
    $('date-from').addEventListener('change', applyDates);
    $('date-to').addEventListener('change', applyDates);

    document.getElementById('lcd-btn-all-proj').addEventListener('click', function () {
      state.selProjects = new Set(state.projects.map(function (p) { return p.key; }));
      renderProjFilter(); renderLangFilter(); updateStats(); renderAllCharts();
    });
    document.getElementById('lcd-btn-none-proj').addEventListener('click', function () {
      state.selProjects = new Set();
      renderProjFilter(); renderLangFilter(); updateStats(); renderAllCharts();
    });
    document.getElementById('lcd-btn-all-lang').addEventListener('click', function () {
      state.selLangs = new Set(state.allLangs);
      renderLangFilter(); renderAllCharts();
    });
    document.getElementById('lcd-btn-none-lang').addEventListener('click', function () {
      state.selLangs = new Set();
      renderLangFilter(); renderAllCharts();
    });

    var trigger = $('comp-trigger');
    var panel   = $('comp-panel');
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !panel.classList.contains('lcd-hidden');
      panel.classList.toggle('lcd-hidden', open);
      trigger.classList.toggle('open', !open);
    });
    document.addEventListener('click', function () {
      panel.classList.add('lcd-hidden');
      trigger.classList.remove('open');
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    document.getElementById('lcd-proj-detail-close').addEventListener('click', closeProjDetail);
    document.getElementById('lcd-lang-detail-close').addEventListener('click', closeLangDetail);

    $('comp-all').addEventListener('click', function () {
      state.compSelProjects = new Set(state.projects.map(function (p) { return p.key; }));
      renderCompDropdown(); renderAllCharts();
    });
    $('comp-none').addEventListener('click', function () {
      state.compSelProjects = new Set();
      renderCompDropdown(); renderAllCharts();
    });

    // Comparison dropdown search
    document.getElementById('lcd-comp-search').addEventListener('input', function () {
      state.compSearch = this.value;
      renderCompDropdown();
    });

    // Top-N for By Project chart
    document.getElementById('lcd-topn-comp').addEventListener('change', function () {
      state.compTopN = parseInt(this.value, 10);
      renderAllCharts();
    });

    // Language drill-down search
    document.getElementById('lcd-lang-detail-search').addEventListener('input', function () {
      state.langDetailSearch = this.value;
      if (state.drillLang) renderLangDetailChart(state.drillLang);
    });

    // Top-N for language drill-down
    document.getElementById('lcd-topn-lang').addEventListener('change', function () {
      state.langDetailTopN = parseInt(this.value, 10);
      if (state.drillLang) renderLangDetailChart(state.drillLang);
    });
  }

  function renderCompDropdown() {
    var list = $('comp-list');
    list.innerHTML = '';
    var q = (state.compSearch || '').toLowerCase();
    var visible = q
      ? state.projects.filter(function (p) { return (p.name || p.key).toLowerCase().indexOf(q) !== -1; })
      : state.projects;
    visible.forEach(function (p) {
      var lbl = document.createElement('label');
      lbl.className = 'lcd-fi';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.compSelProjects.has(p.key);
      cb.addEventListener('change', function () {
        cb.checked ? state.compSelProjects.add(p.key) : state.compSelProjects.delete(p.key);
        updateCompLabel(); renderAllCharts();
      });
      var nm = document.createElement('span');
      nm.className = 'lcd-fi-name';
      nm.textContent = p.name || p.key;
      nm.title = nm.textContent;
      nm.addEventListener('click', function (e) {
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
    var total = state.projects.length, sel = state.compSelProjects.size;
    var el = $('comp-label');
    if (sel === 0)          el.textContent = 'No projects';
    else if (sel === total) el.textContent = 'All projects';
    else if (sel === 1) {
      var key = Array.from(state.compSelProjects)[0];
      var p = state.projects.filter(function (x) { return x.key === key; })[0];
      var name = (p && p.name) || key;
      el.textContent = name.length > 20 ? name.slice(0, 18) + '\u2026' : name;
    } else {
      el.textContent = sel + ' of ' + total + ' projects';
    }
  }

  // ─── Global callbacks referenced from inline onclick attrs ─────────────────
  window.__lcdReload     = function () { load(); };
  window.__lcdSelProj    = function (all) { state.selProjects = all ? new Set(state.projects.map(function (p) { return p.key; })) : new Set(); renderProjFilter(); renderLangFilter(); updateStats(); renderAllCharts(); };
  window.__lcdSelLang    = function (all) { state.selLangs = all ? new Set(state.allLangs) : new Set(); renderLangFilter(); renderAllCharts(); };
  window.__lcdResetDates = function () { resetDatesFromData(); updateStats(); renderLangFilter(); renderAllCharts(); };

  // ─── Extension entry point ─────────────────────────────────────────────────
  window.registerExtension('locdashboard/index', function (options) {
    root = options.el;

    // Unblock any overflow:hidden ancestors SonarQube sets on the page container
    var el = root.parentElement;
    while (el && el !== document.body) {
      var cs = window.getComputedStyle(el);
      if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') {
        el.style.overflowY = 'auto';
      }
      el = el.parentElement;
    }

    injectStyles();
    renderTemplate(root);
    initControls();

    loadScript('/static/locdashboard/chart.umd.min.js', 'Chart')
      .then(function () { return loadScript('/static/locdashboard/chartjs-adapter-date-fns.bundle.min.js'); })
      .then(function () { load(); })
      .catch(function (err) {
        root.innerHTML = '<p style="color:var(--echoes-color-text-danger);padding:20px">Failed to load Chart.js: ' + err.message + '</p>';
      });

    return function () {
      Object.keys(charts).forEach(function (k) { if (charts[k]) { charts[k].destroy(); charts[k] = null; } });
      root.innerHTML = '';
    };
  });

}());
