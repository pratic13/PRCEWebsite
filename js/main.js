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

    // Hero slider: slides horizontally every 6.5 s; arrows, dots and swipe; pauses on hover/focus
    var hero = document.querySelector('.hero');
    var track = document.querySelector('.hero__track');
    var slides = document.querySelectorAll('.slide');
    if (hero && track && slides.length > 1) {
        var dots = hero.querySelectorAll('.hero__dots button');
        var cur = 0, timer = null;
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var load = function (sl) { var im = sl.querySelector('img[data-src]'); if (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); } };
        var go = function (i) {
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
        };
        var start = function () { if (!reduce && !timer) timer = setInterval(function () { go(cur + 1); }, 6500); };
        var stop = function () { clearInterval(timer); timer = null; };
        var restart = function () { stop(); start(); };
        dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); restart(); }); });
        var prev = hero.querySelector('.hero__arrow--prev'), next = hero.querySelector('.hero__arrow--next');
        if (prev) prev.addEventListener('click', function () { go(cur - 1); restart(); });
        if (next) next.addEventListener('click', function () { go(cur + 1); restart(); });
        hero.addEventListener('mouseenter', stop); hero.addEventListener('mouseleave', start);
        hero.addEventListener('focusin', stop); hero.addEventListener('focusout', start);
        hero.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') { go(cur - 1); } else if (e.key === 'ArrowRight') { go(cur + 1); }
        });
        var x0 = null;
        hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
        hero.addEventListener('touchend', function (e) {
            if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
            if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); start();
        });
        document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
        window.addEventListener('load', function () { slides.forEach(load); });
        go(0); start();
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
