(function () {
	'use strict';

	var DEFAULT_CENTER = [28.5, -81.38];
	var DEFAULT_ZOOM = 11;

	var PRESERVE_PARAMS = [
		'gclid','gbraid','wbraid','fbclid','msclkid','ttclid','li_fat_id',
		'utm_source','utm_medium','utm_campaign','utm_term','utm_content'
	];

	var PILL_GROUPS = {
		price: { params: ['priceMin','priceMax'], label: function(v) {
			var min = v.priceMin, max = v.priceMax;
			if (min && max) return fmtDollar(min) + ' – ' + fmtDollar(max);
			if (min) return fmtDollar(min) + '+';
			if (max) return 'Up to ' + fmtDollar(max);
			return '';
		}},
		size: { params: ['size_min','size_max'], label: function(v) {
			var min = v.size_min, max = v.size_max;
			if (min && max) return fmtComma(min) + ' – ' + fmtComma(max) + ' sqft';
			if (min) return fmtComma(min) + '+ sqft';
			if (max) return 'Up to ' + fmtComma(max) + ' sqft';
			return '';
		}},
		lot: { params: ['lotsize_acres_min','lotsize_acres_max'], label: function(v) {
			var min = v.lotsize_acres_min, max = v.lotsize_acres_max;
			if (min && max) return min + ' – ' + max + ' acres';
			if (min) return min + '+ acres';
			if (max) return 'Up to ' + max + ' acres';
			return '';
		}},
		year: { params: ['yearBuilt_min','yearBuilt_max'], label: function(v) {
			var min = v.yearBuilt_min, max = v.yearBuilt_max;
			if (min && max) return 'Built ' + min + ' – ' + max;
			if (min) return 'Built after ' + min;
			if (max) return 'Built before ' + max;
			return '';
		}}
	};

	var SINGLE_PILLS = {
		beds:    function(v) { return v + '+ Beds'; },
		baths:   function(v) { return v + '+ Baths'; },
		floors:  function(v) { return v; },
		style:   function(v) { return v; },
		keyword: function(v) { return 'Keyword: ' + v; },
		subdivision: function(v) { return 'Subdivision: ' + v; },
		county:  function(v) { return 'County: ' + v; },
		school:  function(v) { return 'School: ' + v; },
		schoolElementary: function(v) { return 'Elementary: ' + v; },
		schoolMiddle: function(v) { return 'Middle School: ' + v; },
		schoolHigh: function(v) { return 'High School: ' + v; },
		schoolDistrict: function(v) { return 'School District: ' + v; },
		distressed: function(v) { return 'Distressed: ' + v; }
	};

	var FEATURE_FLAGS = {
		poolYN: 'Pool', waterfrontYN: 'Waterfront', fireplaceYN: 'Fireplace',
		garageYN: 'Garage', basementYN: 'Basement', associationYN: 'HOA',
		newConstruction: 'New Construction'
	};

	var DETAIL_PILLS = {
		view:'View', constructionMaterials:'Construction', roof:'Roof',
		cooling:'Cooling', heating:'Heating', fencing:'Fencing',
		poolFeatures:'Pool features', parkingFeatures:'Parking',
		communityFeatures:'Community', interiorFeatures:'Interior',
		exteriorFeatures:'Exterior'
	};

	function fmtDollar(n) {
		n = parseInt(n, 10);
		if (n >= 1000000) return '$' + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
		if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
		return '$' + n;
	}
	function fmtComma(n) { return parseInt(n, 10).toLocaleString('en-US'); }

	function getUrlParams() {
		var params = {};
		var qs = window.location.search.substring(1);
		if (!qs) return params;
		qs.split('&').forEach(function(pair) {
			var idx = pair.indexOf('=');
			if (idx < 0) return;
			var key = decodeURIComponent(pair.substring(0, idx));
			var val = decodeURIComponent(pair.substring(idx + 1));
			params[key] = val;
		});
		return params;
	}

	function buildUrl(params) {
		var parts = [];
		for (var k in params) {
			if (params.hasOwnProperty(k) && params[k] !== '' && params[k] != null) {
				parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
			}
		}
		return 'search.cfm?' + parts.join('&');
	}

	/* ── Filter pills on main search view ─────────────────────────── */

	function initFilterPills() {
		var container = document.getElementById('filter-pills');
		if (!container) return;
		var params = getUrlParams();
		var pills = [];

		for (var gk in PILL_GROUPS) {
			var grp = PILL_GROUPS[gk];
			var vals = {};
			var hasAny = false;
			grp.params.forEach(function(p) { if (params[p]) { vals[p] = params[p]; hasAny = true; } });
			if (hasAny) {
				var lbl = grp.label(vals);
				if (lbl) pills.push({ keys: grp.params, label: lbl });
			}
		}

		if (params.propertyType) {
			var types = params.propertyType.split('|');
			var lbl2 = types.length <= 3 ? types.join(' + ') : types.length + ' types';
			pills.push({ keys: ['propertyType'], label: lbl2 });
		}

		for (var sk in SINGLE_PILLS) {
			if (params[sk]) pills.push({ keys: [sk], label: SINGLE_PILLS[sk](params[sk]) });
		}

		for (var fk in FEATURE_FLAGS) {
			if (params[fk] === 'true') pills.push({ keys: [fk], label: FEATURE_FLAGS[fk] });
			else if (params[fk] === 'false') pills.push({ keys: [fk], label: 'No ' + FEATURE_FLAGS[fk] });
		}

		for (var dk in DETAIL_PILLS) {
			if (params[dk]) {
				var dvals = params[dk].split('|');
				var dlbl = DETAIL_PILLS[dk] + ': ' + (dvals.length <= 2 ? dvals.join(' + ') : dvals.length + ' values');
				pills.push({ keys: [dk], label: dlbl });
			}
		}

		if (params.location) {
			pills.unshift({ keys: ['location'], label: params.location });
		} else if (params.city) {
			pills.unshift({ keys: ['city'], label: params.city });
		}

		if (!pills.length) { container.hidden = true; return; }
		container.hidden = false;
		var html = '';
		pills.forEach(function(p) {
			html += '<span class="filter-pill" data-keys="' + p.keys.join(',') + '">'
				+ escHtml(p.label)
				+ '<button type="button" class="filter-pill__dismiss" aria-label="Remove filter: ' + escHtml(p.label) + '">&times;</button>'
				+ '</span>';
		});
		if (pills.length >= 2) {
			html += '<a href="#" class="filter-pills__clear">Clear all filters</a>';
		}
		container.innerHTML = html;

		container.addEventListener('click', function(e) {
			var dismiss = e.target.closest('.filter-pill__dismiss');
			if (dismiss) {
				if (!isLoggedIn()) { openLeadModal(); return; }
				var pill = dismiss.closest('.filter-pill');
				var keys = pill.getAttribute('data-keys').split(',');
				dismissPill(keys);
				return;
			}
			if (e.target.classList.contains('filter-pills__clear')) {
				e.preventDefault();
				if (!isLoggedIn()) { openLeadModal(); return; }
				clearAllFilters();
			}
		});
	}

	function dismissPill(keys) {
		var params = getUrlParams();
		keys.forEach(function(k) { delete params[k]; });
		params.pageNumber = '1';
		trackFilterRemoval(keys, params);
		window.location.href = buildUrl(params);
	}

	function clearAllFilters() {
		var params = getUrlParams();
		var keep = { market: params.market || 'mfrmls', pageNumber: '1' };
		PRESERVE_PARAMS.forEach(function(p) { if (params[p]) keep[p] = params[p]; });
		window.location.href = buildUrl(keep);
	}

	function trackFilterRemoval(keys, params) {
		if (!navigator.sendBeacon) return;
		var landingUrl = window.location.href;
		var isPPC = PRESERVE_PARAMS.some(function(p) { return !!params[p]; });
		keys.forEach(function(k) {
			var fd = new FormData();
			fd.append('type', 'filter_removed');
			fd.append('filter', k);
			fd.append('value', getUrlParams()[k] || '');
			fd.append('source', isPPC ? 'ppc' : 'user');
			fd.append('landing', landingUrl);
			navigator.sendBeacon('track.cfm', fd);
		});
	}

	function escHtml(s) {
		var d = document.createElement('div');
		d.textContent = s;
		return d.innerHTML;
	}

	/* ── Sort control ────────────────────────────────────────────── */

	function initSortControl() {
		var btn = document.getElementById('sort-btn');
		var menu = document.getElementById('sort-menu');
		if (!btn || !menu) return;

		function toggle(open) {
			var show = typeof open === 'boolean' ? open : menu.hidden;
			menu.hidden = !show;
			btn.setAttribute('aria-expanded', String(show));
		}

		btn.addEventListener('click', function (e) {
			e.stopPropagation();
			if (!isLoggedIn()) { openLeadModal(); return; }
			toggle();
		});

		menu.addEventListener('click', function (e) {
			var item = e.target.closest('li[role="option"]');
			if (!item) return;
			var val = item.getAttribute('data-val');
			if (!val) return;
			toggle(false);
			var parts = val.split('|');
			var params = getUrlParams();
			params.sortField = parts[0];
			params.sortOrder = parts[1];
			params.pageNumber = '1';
			window.location.href = buildUrl(params);
		});

		document.addEventListener('click', function () { toggle(false); });
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && !menu.hidden) toggle(false);
		});
	}

	/* ── Map & mobile toggle (unchanged) ──────────────────────────── */

	function readMapData() {
		var el = document.getElementById('search-map-data');
		if (!el || !el.textContent) return [];
		try {
			var raw = JSON.parse(el.textContent.trim());
			if (!Array.isArray(raw)) return [];
			return raw.map(function (p) {
				if (!p || typeof p !== 'object') return null;
				var lat = Number(p.lat != null ? p.lat : p.LAT);
				var lng = Number(p.lng != null ? p.lng : p.LNG);
				var id = String(p.id != null ? p.id : p.ID || '');
				var market = String(p.market != null ? p.market : p.MARKET || '');
				if (!id || !isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return null;
				return { id: id, market: market, lat: lat, lng: lng };
			}).filter(Boolean);
		} catch (e) {
			return [];
		}
	}

	function escAttr(s) {
		s = String(s);
		if (window.CSS && window.CSS.escape) return CSS.escape(s);
		return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	}

	function ensureMap() {
		if (mapApi) return;
		var panel = document.getElementById('search-panel-map');
		if (!panel) return;
		if (!document.getElementById('search-map')) {
			var div = document.createElement('div');
			div.id = 'search-map';
			div.className = 'search-map';
			div.setAttribute('aria-label', 'Listings map');
			panel.appendChild(div);
		}
		var points = readMapData();
		loadLeaflet(function () {
			mapApi = initMap(points);
		});
	}

	function initMobileToggle(hybrid) {
		var toggle = document.querySelector('.search-view-toggle');
		if (!toggle || !hybrid) return;
		var btns = toggle.querySelectorAll('.search-view-toggle__btn');
		function setMode(mode) {
			hybrid.classList.remove('search-mode-list', 'search-mode-map');
			hybrid.classList.add(mode === 'map' ? 'search-mode-map' : 'search-mode-list');
			btns.forEach(function (b) {
				var v = b.getAttribute('data-view');
				var active = v === mode;
				b.classList.toggle('is-active', active);
				b.setAttribute('aria-selected', active ? 'true' : 'false');
			});
			if (mode === 'map') {
				ensureMap();
			}
			if (mapApi && mapApi.map) {
				setTimeout(function () { mapApi.map.invalidateSize(); }, 50);
				setTimeout(function () { mapApi.map.invalidateSize(); }, 300);
			}
		}
		btns.forEach(function (b) {
			b.addEventListener('click', function () {
				var view = b.getAttribute('data-view') || 'list';
				if (view === 'map' && !isLoggedIn()) {
					openLeadModal();
					return;
				}
				setMode(view);
			});
		});
	}

	function loadLeaflet(cb) {
		if (typeof L !== 'undefined') { cb(); return; }
		var css = document.createElement('link');
		css.rel = 'stylesheet';
		css.href = 'lib/leaflet.css';
		document.head.appendChild(css);
		var js = document.createElement('script');
		js.src = 'lib/leaflet.js';
		js.async = true;
		js.onload = cb;
		document.head.appendChild(js);
	}

	function initMap(points) {
		var mapEl = document.getElementById('search-map');
		if (!mapEl || typeof L === 'undefined') return null;
		var map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: true });
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors',
			maxZoom: 19
		}).addTo(map);
		var markers = {};
		points.forEach(function (p) {
			var m = L.marker([p.lat, p.lng]).addTo(map);
			m.bindPopup(
				'<a href="listingdetail.cfm?id=' +
					encodeURIComponent(p.id) + '&market=' +
					encodeURIComponent(p.market) + '">View listing</a>'
			);
			m.on('click', function () {
				highlightCard(p.id);
				var row = document.querySelector(
					'.search-card-wrap[data-listing-id="' + escAttr(p.id) + '"]'
				);
				var h = document.getElementById('search-hybrid');
				if (row && h && h.classList.contains('search-mode-list')) {
					row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				}
			});
			markers[p.id] = m;
		});
		if (!points.length) {
			map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
		} else if (points.length === 1) {
			map.setView([points[0].lat, points[0].lng], 14);
		} else {
			var bounds = L.latLngBounds(points.map(function (p) { return [p.lat, p.lng]; }));
			map.fitBounds(bounds.pad(0.05), { maxZoom: 15 });
		}
		return { map: map, markers: markers, points: points };
	}

	function highlightCard(id) {
		document.querySelectorAll('.search-card-wrap.is-highlight').forEach(function (el) {
			el.classList.remove('is-highlight');
		});
		var row = document.querySelector(
			'.search-card-wrap[data-listing-id="' + escAttr(String(id)) + '"]'
		);
		if (row) row.classList.add('is-highlight');
	}

	var mapApi = null;

	/* ── Auth state ───────────────────────────────────────────────── */

	var authState = { loggedIn: false, phoneVerified: false, email: '', loaded: false };

	function fetchAuthState(cb) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'auth-status.cfm?_=' + Date.now(), true);
		xhr.onload = function () {
			if (xhr.status === 200) {
				try {
					var raw = JSON.parse(xhr.responseText);
					var data = {};
					for (var k in raw) { data[k.toLowerCase()] = raw[k]; }
					authState.loggedIn = data.loggedin === true;
					authState.phoneVerified = data.phoneverified === true;
					authState.email = data.email || '';
					applyAuthUI(data);
				} catch (e) {}
			}
			authState.loaded = true;
			if (cb) cb();
		};
		xhr.onerror = function () {
			authState.loaded = true;
			if (cb) cb();
		};
		xhr.send();
	}

	function applyAuthUI(data) {
		var csrf = document.getElementById('lead-csrf');
		if (csrf && data.csrf) csrf.value = data.csrf;
		var slot = document.getElementById('ha-auth-slot');
		if (slot) {
			if (data.loggedin && data.email) {
				slot.innerHTML = '<span class="ha-nav-user">'
					+ '<svg viewBox="0 0 24 24" width="20" height="20" fill="#1a73e8" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 3v1h16v-1s-2-3-8-3z"/></svg>'
					+ '<strong>' + data.email.replace(/</g, '&lt;') + '</strong>'
					+ '</span> <a href="logout.cfm" class="ha-nav-logout">Log out</a>';
			}
		}
		var errSlot = document.getElementById('auth-error-slot');
		if (errSlot) {
			var html = '';
			if (data.loginerror) html += '<p class="error" style="margin-top:0.5rem;">' + data.loginerror.replace(/</g, '&lt;') + '</p>';
			if (data.leaderror) html += '<p class="error" style="margin-top:0.5rem;">' + data.leaderror.replace(/</g, '&lt;') + '</p>';
			errSlot.innerHTML = html;
		}
	}

	function isLoggedIn() { return authState.loggedIn; }
	function isPhoneVerified() { return authState.phoneVerified; }

	function openLeadModal() {
		if (typeof window.idxOpenLeadModal === 'function') {
			window.idxOpenLeadModal();
			return;
		}
		var m = document.getElementById('lead-modal');
		if (m) {
			m.hidden = false;
			m.classList.add('is-open');
			document.body.classList.add('lead-modal-open');
			var f = m.querySelector('input:not([type="hidden"])');
			if (f) setTimeout(function() { f.focus(); }, 100);
		}
	}

	function gateSearchForm() {
		var form = document.querySelector('.search-filters');
		if (!form) return;
		form.addEventListener('submit', function (e) {
			if (isLoggedIn()) return;
			e.preventDefault();
			openLeadModal();
		});
	}

	function gatePagingLinks() {
		document.querySelectorAll('.search-paging__link').forEach(function (link) {
			link.addEventListener('click', function (e) {
				if (isLoggedIn()) return;
				e.preventDefault();
				openLeadModal();
			});
		});
	}

	/* ── Advanced Search Modal ────────────────────────────────────── */

	function initAdvancedSearch() {
		var btn = document.getElementById('adv-search-btn');
		var modal = document.getElementById('adv-modal');
		var closeBtn = document.getElementById('adv-close-btn');
		var backdrop = document.getElementById('adv-backdrop');
		var resetBtn = document.getElementById('adv-reset-btn');
		var advForm = document.getElementById('adv-form');
		if (!btn || !modal) return;

		function openAdv() {
			if (!isLoggedIn()) { openLeadModal(); return; }
			syncModalFromUrl();
			modal.hidden = false;
			document.body.classList.add('adv-modal-open');
			var first = modal.querySelector('.adv-section:first-of-type input:not([type="hidden"])');
			if (first) setTimeout(function() { first.focus(); }, 100);
		}
		function closeAdv() {
			modal.hidden = true;
			document.body.classList.remove('adv-modal-open');
		}

		btn.addEventListener('click', openAdv);
		if (closeBtn) closeBtn.addEventListener('click', closeAdv);
		if (backdrop) backdrop.addEventListener('click', closeAdv);
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && !modal.hidden) closeAdv();
		});

		if (advForm) {
			advForm.addEventListener('submit', function (e) {
				if (!isLoggedIn()) { e.preventDefault(); openLeadModal(); return; }
				e.preventDefault();
				var url = serializeAdvForm();
				if (window.formUtils) {
					window.formUtils.setSubmitState(document.getElementById('adv-submit-btn'), 'submitting');
				}
				window.location.href = url;
			});
		}

		if (resetBtn) {
			resetBtn.addEventListener('click', function (e) {
				e.preventDefault();
				resetAdvForm();
			});
		}

		initCollapsibleSections(modal);
		initTapButtons(modal);
		initMultiSelectPills(modal);
		initThreeWayToggles(modal);
		initMoreToggles(modal);
		bindAdvFormatters(modal);
	}

	/* ── Collapsible sections ─────────────────────────────────────── */

	function initCollapsibleSections(modal) {
		var saved = [];
		try { saved = JSON.parse(sessionStorage.getItem('adv-sections-expanded') || '[]'); } catch(e) {}

		modal.querySelectorAll('.adv-section--collapsible').forEach(function(section) {
			var header = section.querySelector('.adv-section__header');
			var body = section.querySelector('.adv-section__body');
			if (!header || !body) return;

			var sectionId = section.getAttribute('data-section');
			if (saved.indexOf(sectionId) !== -1) {
				body.hidden = false;
				header.setAttribute('aria-expanded', 'true');
			}

			header.addEventListener('click', function() {
				var isOpen = !body.hidden;
				body.hidden = isOpen;
				header.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
				saveSectionState(modal);
			});
		});
	}

	function saveSectionState(modal) {
		var expanded = [];
		modal.querySelectorAll('.adv-section--collapsible').forEach(function(s) {
			var body = s.querySelector('.adv-section__body');
			if (body && !body.hidden) expanded.push(s.getAttribute('data-section'));
		});
		try { sessionStorage.setItem('adv-sections-expanded', JSON.stringify(expanded)); } catch(e) {}
	}

	/* ── Tap buttons (beds/baths) ─────────────────────────────────── */

	function initTapButtons(modal) {
		modal.querySelectorAll('.adv-tap-group').forEach(function(group) {
			var targetId = group.getAttribute('data-target');
			var hidden = document.getElementById(targetId);
			group.addEventListener('click', function(e) {
				var tap = e.target.closest('.adv-tap');
				if (!tap) return;
				var val = tap.getAttribute('data-val');
				var wasActive = tap.classList.contains('is-active');
				group.querySelectorAll('.adv-tap').forEach(function(t) { t.classList.remove('is-active'); });
				if (wasActive && val !== '') {
					if (hidden) hidden.value = '';
					group.querySelector('.adv-tap[data-val=""]').classList.add('is-active');
				} else {
					tap.classList.add('is-active');
					if (hidden) hidden.value = val;
				}
			});
			var anyBtn = group.querySelector('.adv-tap[data-val=""]');
			if (anyBtn) anyBtn.classList.add('is-active');
		});
	}

	/* ── Multi-select pills (propertyType, status, distressed) ──── */

	function initMultiSelectPills(modal) {
		modal.querySelectorAll('.adv-pill-group').forEach(function(group) {
			group.addEventListener('click', function(e) {
				var pill = e.target.closest('.adv-pill');
				if (!pill) return;
				pill.classList.toggle('is-active');
				syncPillGroupValue(group);
			});
		});
	}

	function syncPillGroupValue(group) {
		var targetId = group.getAttribute('data-target');
		var hidden = document.getElementById(targetId);
		if (!hidden) return;
		var container = group.parentNode;
		var allGroups = container.querySelectorAll('.adv-pill-group[data-target="' + targetId + '"]');
		var vals = [];
		allGroups.forEach(function(g) {
			g.querySelectorAll('.adv-pill.is-active').forEach(function(p) {
				vals.push(p.getAttribute('data-val'));
			});
		});
		hidden.value = vals.join('|');
	}

	/* ── Three-way feature toggles ────────────────────────────────── */

	var TOGGLE_STATES = ['', 'true', 'false'];
	var TOGGLE_LABELS = { '': 'any', 'true': 'required', 'false': 'excluded' };

	function initThreeWayToggles(modal) {
		modal.querySelectorAll('.adv-toggle').forEach(function(toggle) {
			toggle._stateIdx = 0;
			toggle.addEventListener('click', function() {
				toggle._stateIdx = (toggle._stateIdx + 1) % 3;
				var val = TOGGLE_STATES[toggle._stateIdx];
				var targetId = toggle.getAttribute('data-target');
				var hidden = document.getElementById(targetId);
				if (hidden) hidden.value = val;
				var label = toggle.textContent.replace(/ ✓| ✗/g, '').trim();
				toggle.classList.remove('is-yes', 'is-no');
				if (val === 'true') {
					toggle.classList.add('is-yes');
					toggle.setAttribute('aria-label', label + ': required');
				} else if (val === 'false') {
					toggle.classList.add('is-no');
					toggle.setAttribute('aria-label', label + ': excluded');
				} else {
					toggle.setAttribute('aria-label', label + ': any');
				}
			});
		});
	}

	/* ── "+more types" expansion ──────────────────────────────────── */

	function initMoreToggles(modal) {
		modal.querySelectorAll('.adv-more-toggle').forEach(function(btn) {
			btn.addEventListener('click', function() {
				var targetId = btn.getAttribute('data-expand');
				var moreGroup = btn.parentNode.querySelector('.adv-pill-group--more');
				if (moreGroup) {
					var show = moreGroup.hidden;
					moreGroup.hidden = !show;
					btn.textContent = show ? '−fewer types' : '+more types';
				}
			});
		});
	}

	/* ── Bind formatters from form-utils.js ───────────────────────── */

	function bindAdvFormatters(modal) {
		if (!window.formUtils) return;
		var priceInputs = modal.querySelectorAll('input[data-format="price"]');
		for (var i = 0; i < priceInputs.length; i++) {
			priceInputs[i].addEventListener('input', function() { window.formUtils.formatPrice(this); });
		}
		var numInputs = modal.querySelectorAll('input[data-format="number"]');
		for (var j = 0; j < numInputs.length; j++) {
			numInputs[j].addEventListener('input', function() { window.formUtils.formatNumber(this); });
		}
	}

	/* ── Sync modal from URL params ───────────────────────────────── */

	function syncModalFromUrl() {
		var params = getUrlParams();
		var form = document.getElementById('adv-form');
		if (!form) return;

		form.querySelectorAll('input:not([type="hidden"]), select').forEach(function(el) {
			var name = el.getAttribute('name');
			if (!name) return;
			if (el.tagName === 'SELECT') {
				if (params[name]) el.value = params[name];
			} else {
				el.value = params[name] || '';
			}
		});

		syncTapGroup(form, 'adv-beds-val', params.beds || '');
		syncTapGroup(form, 'adv-baths-val', params.baths || '');

		syncPillSelection(form, 'adv-proptype-val', params.propertyType || '');
		syncPillSelection(form, 'adv-status-val', params.status || '');
		syncPillSelection(form, 'adv-distressed-val', params.distressed || '');

		syncToggle(form, 'adv-poolYN-val', params.poolYN || '');
		syncToggle(form, 'adv-waterfrontYN-val', params.waterfrontYN || '');
		syncToggle(form, 'adv-fireplaceYN-val', params.fireplaceYN || '');
		syncToggle(form, 'adv-garageYN-val', params.garageYN || '');
		syncToggle(form, 'adv-basementYN-val', params.basementYN || '');
		syncToggle(form, 'adv-associationYN-val', params.associationYN || '');
		syncToggle(form, 'adv-newConstruction-val', params.newConstruction || '');

		if (params.priceMin && window.formUtils) {
			var pMin = form.querySelector('input[name="priceMin"]');
			if (pMin) { pMin.value = params.priceMin; window.formUtils.formatPrice(pMin); }
		}
		if (params.priceMax && window.formUtils) {
			var pMax = form.querySelector('input[name="priceMax"]');
			if (pMax) { pMax.value = params.priceMax; window.formUtils.formatPrice(pMax); }
		}

		expandSectionsWithValues(form, params);
	}

	function syncTapGroup(form, targetId, value) {
		var hidden = document.getElementById(targetId);
		if (hidden) hidden.value = value;
		var group = form.querySelector('.adv-tap-group[data-target="' + targetId + '"]');
		if (!group) return;
		group.querySelectorAll('.adv-tap').forEach(function(t) {
			t.classList.toggle('is-active', t.getAttribute('data-val') === value);
		});
	}

	function syncPillSelection(form, targetId, value) {
		var hidden = document.getElementById(targetId);
		if (hidden) hidden.value = value;
		var vals = value ? value.split('|') : [];
		var groups = form.querySelectorAll('.adv-pill-group[data-target="' + targetId + '"]');
		groups.forEach(function(g) {
			g.querySelectorAll('.adv-pill').forEach(function(p) {
				p.classList.toggle('is-active', vals.indexOf(p.getAttribute('data-val')) !== -1);
			});
			if (g.classList.contains('adv-pill-group--more')) {
				var hasActive = g.querySelector('.adv-pill.is-active');
				if (hasActive) g.hidden = false;
			}
		});
	}

	function syncToggle(form, targetId, value) {
		var hidden = document.getElementById(targetId);
		if (hidden) hidden.value = value;
		var toggle = form.querySelector('.adv-toggle[data-target="' + targetId + '"]');
		if (!toggle) return;
		toggle.classList.remove('is-yes', 'is-no');
		if (value === 'true') { toggle.classList.add('is-yes'); toggle._stateIdx = 1; }
		else if (value === 'false') { toggle.classList.add('is-no'); toggle._stateIdx = 2; }
		else { toggle._stateIdx = 0; }
	}

	function expandSectionsWithValues(form, params) {
		var sectionFields = {
			size: ['size_min','size_max','lotsize_acres_min','lotsize_acres_max','yearBuilt_min','yearBuilt_max','baths_full','baths_half','floors','style'],
			features: ['poolYN','waterfrontYN','fireplaceYN','garageYN','basementYN','associationYN','newConstruction','distressed'],
			schools: ['schoolElementary','schoolMiddle','schoolHigh','schoolDistrict'],
			location: ['subdivision','county','keyword'],
			construction: ['view','constructionMaterials','roof','cooling','heating','fencing','poolFeatures','parkingFeatures','communityFeatures','interiorFeatures','exteriorFeatures']
		};
		for (var sec in sectionFields) {
			var hasVal = sectionFields[sec].some(function(f) { return !!params[f]; });
			if (hasVal) {
				var section = form.querySelector('.adv-section[data-section="' + sec + '"]');
				if (section) {
					var body = section.querySelector('.adv-section__body');
					var header = section.querySelector('.adv-section__header');
					if (body) body.hidden = false;
					if (header) header.setAttribute('aria-expanded', 'true');
				}
			}
		}
	}

	/* ── Serialize advanced form for GET ──────────────────────────── */

	function serializeAdvForm() {
		var form = document.getElementById('adv-form');
		if (!form) return 'search.cfm';
		var params = {};
		var currentParams = getUrlParams();

		PRESERVE_PARAMS.forEach(function(p) {
			if (currentParams[p]) params[p] = currentParams[p];
		});

		form.querySelectorAll('input, select').forEach(function(el) {
			var name = el.getAttribute('name');
			if (!name) return;
			var val = el.value;
			if (el.type === 'hidden' || el.tagName === 'SELECT') {
				if (val) params[name] = val;
			} else {
				if (el.hasAttribute('data-format')) {
					val = window.formUtils ? window.formUtils.stripNonDigits(val) : val.replace(/\D/g, '');
				}
				if (val) params[name] = val;
			}
		});

		params.pageNumber = '1';
		return buildUrl(params);
	}

	/* ── Reset form ───────────────────────────────────────────────── */

	function resetAdvForm() {
		var form = document.getElementById('adv-form');
		if (!form) return;
		form.querySelectorAll('input:not([type="hidden"]), select').forEach(function(el) {
			if (el.tagName === 'SELECT') {
				el.selectedIndex = 0;
			} else {
				el.value = '';
			}
		});
		form.querySelectorAll('input[type="hidden"]').forEach(function(el) {
			if (el.name !== 'market' && el.name !== 'pageNumber') el.value = '';
		});
		form.querySelectorAll('.adv-tap.is-active').forEach(function(t) { t.classList.remove('is-active'); });
		form.querySelectorAll('.adv-tap[data-val=""]').forEach(function(t) { t.classList.add('is-active'); });
		form.querySelectorAll('.adv-pill.is-active').forEach(function(p) { p.classList.remove('is-active'); });
		form.querySelectorAll('.adv-toggle').forEach(function(t) {
			t.classList.remove('is-yes', 'is-no');
			t._stateIdx = 0;
		});
	}

	/* ── Bind phone formatters for reg/login forms ────────────────── */

	function bindSearchFormUtils() {
		if (!window.formUtils) return;
		window.formUtils.bindPhoneFields();
		window.formUtils.bindPriceFields();
		window.formUtils.bindNumberFields();
		window.formUtils.bindProperCaseFields();
		window.formUtils.bindClearOnInput();
	}

	/* ── Init ─────────────────────────────────────────────────────── */

	function onReady() {
		document.documentElement.classList.add('js');

		initFilterPills();
		bindSearchFormUtils();

		fetchAuthState(function () {
			var hybrid = document.getElementById('search-hybrid');
			initMobileToggle(hybrid);
			gateSearchForm();
			gatePagingLinks();
			initAdvancedSearch();
			initSortControl();
		});

		var desktop = window.matchMedia('(min-width: 900px)');
		if (desktop.matches) {
			ensureMap();
		}
		document.querySelectorAll('.search-card-wrap').forEach(function (wrap) {
			wrap.addEventListener('mouseenter', function () {
				if (!desktop.matches) return;
				var id = wrap.getAttribute('data-listing-id');
				if (id && mapApi && mapApi.markers && mapApi.markers[id]) {
					mapApi.markers[id].openPopup();
				}
			});
		});

		window.addEventListener('resize', function () {
			if (mapApi && mapApi.map) {
				setTimeout(function () { mapApi.map.invalidateSize(); }, 200);
			}
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', onReady);
	} else {
		onReady();
	}
})();
