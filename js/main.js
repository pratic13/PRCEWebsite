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

    // Project register filters: sector and status
    var sectorBtns = document.querySelectorAll('.filters button[data-filter]');
    var statusBtns = document.querySelectorAll('.filters button[data-status]');
    var rows = document.querySelectorAll('.register__row[data-cat]');
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
