// P R Consulting Engineers LLP — small, dependency-free behaviour.

(function () {
    // Mobile menu
    var btn = document.querySelector('.menu-btn');
    var nav = document.getElementById('site-nav');
    if (btn && nav) {
        btn.addEventListener('click', function () {
            var open = nav.classList.toggle('is-open');
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.textContent = open ? 'Close' : 'Menu';
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('is-open')) {
                nav.classList.remove('is-open');
                btn.setAttribute('aria-expanded', 'false');
                btn.textContent = 'Menu';
                btn.focus();
            }
        });
    }

    // Introduction slider: arrows, dots, swipe and arrow keys. Photo slides move on after 6.5 s.
    // The first slide holds the "How we work" drawing (js/showcase.js) and moves on when that has
    // played through. Nothing moves by itself while the pointer or the keyboard focus is inside,
    // or where the visitor's device has animations switched off.
    var hero = document.querySelector('.hero');
    var track = document.querySelector('.hero__track');
    var slides = document.querySelectorAll('.slide');
    if (hero && track && slides.length > 1) {
        var dots = hero.querySelectorAll('.hero__dots button');
        var live = hero.querySelector('[data-showcase]');
        var cur = 0, timer = null, held = false;
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var load = function (sl) {
            [].forEach.call(sl.querySelectorAll('img[data-src]'), function (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); });
        };
        var onLive = function () { return !!live && slides[cur].contains(live); };
        var stop = function () { clearTimeout(timer); timer = null; };
        // the drawing reports its own end; the long timer is only a fallback if it cannot run
        var start = function () { stop(); if (!reduce && !held && !document.hidden) timer = setTimeout(function () { go(cur + 1); }, onLive() ? 70000 : 6500); };
        var go = function (i) {
            var was = cur;
            cur = (i + slides.length) % slides.length;
            load(slides[cur]); load(slides[(cur + 1) % slides.length]);
            track.style.transform = 'translateX(' + (-cur * 100) + '%)';
            slides.forEach(function (sl, k) {
                var on = k === cur;
                sl.classList.toggle('is-active', on);
                sl.setAttribute('aria-hidden', on ? 'false' : 'true');
                if ('inert' in sl) sl.inert = !on;
            });
            dots.forEach(function (d, k) { d.setAttribute('aria-current', k === cur ? 'true' : 'false'); });
            if (was !== cur && onLive() && live.showcase) live.showcase.restart();   // back on the drawing: play it from the top
            start();
        };
        if (live) live.addEventListener('showcase:end', function () { if (onLive() && !held && !reduce) go(cur + 1); });
        dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); });
        var prev = hero.querySelector('.hero__arrow--prev'), next = hero.querySelector('.hero__arrow--next');
        if (prev) prev.addEventListener('click', function () { go(cur - 1); });
        if (next) next.addEventListener('click', function () { go(cur + 1); });
        // hold while a mouse pointer is over the slider, a finger is on it, or keyboard focus is inside it
        var why = { hover: false, focus: false, touch: false };
        var hold = function (k, on) { why[k] = on; held = why.hover || why.focus || why.touch; if (held) stop(); else start(); };
        var keyFocus = function (el) { try { return el.matches(':focus-visible'); } catch (err) { return true; } };
        hero.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hold('hover', true); });
        hero.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hold('hover', false); });
        hero.addEventListener('focusin', function (e) { hold('focus', keyFocus(e.target)); });
        hero.addEventListener('focusout', function () { hold('focus', false); });
        hero.addEventListener('keydown', function (e) {
            if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
            if (e.key === 'ArrowLeft') { go(cur - 1); } else if (e.key === 'ArrowRight') { go(cur + 1); }
        });
        var x0 = null, y0 = null;
        hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; hold('touch', true); }, { passive: true });
        hero.addEventListener('touchend', function (e) {
            var dx = x0 === null ? 0 : e.changedTouches[0].clientX - x0, dy = x0 === null ? 0 : e.changedTouches[0].clientY - y0; x0 = null;
            hold('touch', false);
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(cur + (dx < 0 ? 1 : -1));
        });
        hero.addEventListener('touchcancel', function () { x0 = null; hold('touch', false); });
        document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
        window.addEventListener('load', function () { slides.forEach(load); });
        go(0);
    }

    // Stats: count up once, when the card first comes into view
    var stats = document.querySelectorAll('.stat strong');
    if (stats.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        var parts = [].map.call(stats, function (el) {
            var m = /^(\D*)(\d+)(.*)$/.exec(el.textContent);
            return m ? { el: el, pre: m[1], n: parseInt(m[2], 10), post: m[3], full: el.textContent } : null;
        }).filter(Boolean);
        var run = function () {
            var t0 = null, dur = 1300;
            var step = function (ts) {
                if (t0 === null) t0 = ts;
                var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
                parts.forEach(function (s) { s.el.textContent = p < 1 ? s.pre + Math.round(s.n * e) + s.post : s.full; });
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };
        var io = new IntersectionObserver(function (es) {
            if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); run(); }
        }, { threshold: 0.6 });
        io.observe(stats[0].parentNode.parentNode);
    }

    // Project filters: sector and status
    var sectorBtns = document.querySelectorAll('.filters button[data-filter]');
    var statusBtns = document.querySelectorAll('.filters button[data-status]');
    var rows = document.querySelectorAll('.pcard[data-cat]');
    var count = document.querySelector('.register__count');
    var state = { sector: 'all', status: 'all' };
    function apply() {
        var shown = 0;
        rows.forEach(function (row) {
            var okSector = state.sector === 'all' || row.getAttribute('data-cat').split(' ').indexOf(state.sector) !== -1;
            var okStatus = state.status === 'all' || row.getAttribute('data-status') === state.status;
            row.hidden = !(okSector && okStatus);
            if (!row.hidden) shown++;
        });
        sectorBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filter') === state.sector ? 'true' : 'false'); });
        statusBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-status') === state.status ? 'true' : 'false'); });
        if (count) count.textContent = 'Showing ' + shown + ' of ' + rows.length + ' assignments';
    }
    sectorBtns.forEach(function (b) {
        b.addEventListener('click', function () { state.sector = b.getAttribute('data-filter'); apply(); });
    });
    statusBtns.forEach(function (b) {
        b.addEventListener('click', function () { state.status = b.getAttribute('data-status'); apply(); });
    });
    if (sectorBtns.length) {
        var fromHash = location.hash.replace('#', '');
        if (document.querySelector('.filters button[data-filter="' + fromHash + '"]')) state.sector = fromHash;
        apply();
    }

    // Photo viewer: a project card opens that project's photos, a gallery photo opens the whole gallery.
    // Arrows, arrow keys and swipes move between photos; Esc, the Close button or a click outside the
    // photo closes it, and so does the Back button (handy on a phone). Browsers without <dialog> just
    // follow the link to the photo.
    var shots = document.querySelectorAll('a[data-photos], a[data-set]');
    if (shots.length && window.HTMLDialogElement) {
        var box = null, boxImg, boxCap, boxTitle, boxCount, boxPrev, boxNext, boxStage, boxFig;
        var photos = [], at = 0, opener = null;
        var inHistory = false;   // true while a history entry stands for the open viewer, so that Back closes it
        var arrow = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; };
        var showPhoto = function (i) {
            at = (i + photos.length) % photos.length;
            var ph = photos[at];
            boxImg.classList.remove('is-ready');
            boxImg.alt = ph.caption;
            boxImg.src = ph.src;
            if (boxImg.complete && boxImg.naturalWidth) boxImg.classList.add('is-ready');
            boxCap.textContent = ph.caption;
            boxCount.textContent = photos.length > 1 ? 'Photo ' + (at + 1) + ' of ' + photos.length : '';
            if (photos.length > 1) { new Image().src = photos[(at + 1) % photos.length].src; }   // have the next one ready
        };
        var build = function () {
            box = document.createElement('dialog');
            box.className = 'lightbox';
            box.setAttribute('aria-label', 'Photo viewer');
            box.innerHTML =
                '<div class="lightbox__bar"><p class="lightbox__title"></p><p class="lightbox__count"></p>' +
                '<button type="button" class="lightbox__close"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg>Close</button></div>' +
                '<div class="lightbox__stage">' +
                '<button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="Previous photo">' + arrow('M15 5l-7 7 7 7') + '</button>' +
                '<figure class="lightbox__fig"><img class="lightbox__img" alt="" decoding="async"><figcaption class="lightbox__caption" aria-live="polite"></figcaption></figure>' +
                '<button type="button" class="lightbox__nav lightbox__nav--next" aria-label="Next photo">' + arrow('M9 5l7 7-7 7') + '</button></div>';
            document.body.appendChild(box);
            boxImg = box.querySelector('.lightbox__img'); boxCap = box.querySelector('.lightbox__caption');
            boxTitle = box.querySelector('.lightbox__title'); boxCount = box.querySelector('.lightbox__count');
            boxPrev = box.querySelector('.lightbox__nav--prev'); boxNext = box.querySelector('.lightbox__nav--next');
            boxStage = box.querySelector('.lightbox__stage'); boxFig = box.querySelector('.lightbox__fig');
            boxImg.addEventListener('load', function () { boxImg.classList.add('is-ready'); });
            box.querySelector('.lightbox__close').addEventListener('click', function () { box.close(); });
            boxPrev.addEventListener('click', function () { showPhoto(at - 1); });
            boxNext.addEventListener('click', function () { showPhoto(at + 1); });
            // a click on the dark area around the photo closes the viewer
            box.addEventListener('click', function (e) { if (e.target === box || e.target === boxStage || e.target === boxFig) box.close(); });
            box.addEventListener('keydown', function (e) {
                if (photos.length < 2) return;
                if (e.key === 'ArrowLeft') { showPhoto(at - 1); e.preventDefault(); }
                else if (e.key === 'ArrowRight') { showPhoto(at + 1); e.preventDefault(); }
            });
            var sx = null, sy = null;
            // one finger swipes between photos; two fingers are a pinch, and a zoomed-in photo is being panned
            boxStage.addEventListener('touchstart', function (e) {
                if (e.touches.length > 1) { sx = null; return; }
                sx = e.touches[0].clientX; sy = e.touches[0].clientY;
            }, { passive: true });
            boxStage.addEventListener('touchend', function (e) {
                var zoomed = window.visualViewport && window.visualViewport.scale > 1.05;
                if (sx === null || photos.length < 2 || zoomed) { sx = null; return; }
                var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) showPhoto(at + (dx < 0 ? 1 : -1));
            });
            boxStage.addEventListener('touchcancel', function () { sx = null; });
            box.addEventListener('close', function () {
                document.documentElement.classList.remove('is-viewing');
                boxImg.removeAttribute('src');
                if (opener) opener.focus();
                if (inHistory) { inHistory = false; history.back(); }   // closed from the page: drop the viewer's history entry
            });
            window.addEventListener('popstate', function () {
                if (history.state && history.state.viewer) return;                 // landed on a viewer entry, not out of one
                if (inHistory) { inHistory = false; if (box.open) box.close(); }   // Back pressed while viewing
            });
        };
        var openViewer = function (list, i, heading, from) {
            if (!box) build();
            photos = list; opener = from;
            boxTitle.textContent = heading;
            boxPrev.hidden = boxNext.hidden = list.length < 2;
            document.documentElement.classList.add('is-viewing');
            box.showModal();
            if (!inHistory && history.pushState) { history.pushState({ viewer: true }, ''); inHistory = true; }
            showPhoto(i);
        };
        [].forEach.call(shots, function (a) {
            a.addEventListener('click', function (e) {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;   // new tab or window: leave it to the browser
                e.preventDefault();
                if (a.hasAttribute('data-photos')) {
                    openViewer(JSON.parse(a.getAttribute('data-photos')).map(function (ph) { return { src: 'img/' + ph[0], caption: ph[1] }; }),
                        0, a.getAttribute('data-title'), a);
                } else {
                    var set = [].slice.call(document.querySelectorAll('a[data-set="' + a.getAttribute('data-set') + '"]'));
                    openViewer(set.map(function (x) { return { src: x.getAttribute('href'), caption: x.getAttribute('data-caption') }; }),
                        set.indexOf(a), 'From the field', a);
                }
            });
        });
    }

    // Enquiry form: opens the visitor's email app with the details filled in.
    var form = document.getElementById('enquiry');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!form.reportValidity()) return;
            var v = function (id) { return (document.getElementById(id).value || '').trim(); };
            var subject = 'Enquiry: ' + v('f-service') + (v('f-org') ? ' — ' + v('f-org') : '');
            var body =
                'Name: ' + v('f-name') + '\n' +
                'Organisation: ' + v('f-org') + '\n' +
                'Phone: ' + v('f-phone') + '\n' +
                'Email: ' + v('f-email') + '\n' +
                'Service: ' + v('f-service') + '\n\n' +
                v('f-message');
            window.location.href = 'mailto:contact@prconsulting.co.in?subject=' +
                encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
            form.innerHTML =
                '<div class="form-done" role="status">' +
                '<h2>Your email app should now be open</h2>' +
                '<p>Send the drafted email to reach us. If nothing opened, write to ' +
                '<a class="text-link" href="mailto:contact@prconsulting.co.in">contact@prconsulting.co.in</a> ' +
                'or call <a class="text-link" href="tel:+918408991414">+91 84089 91414</a>.</p></div>';
        });
    }
})();
