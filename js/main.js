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

    // Project register filters
    var filters = document.querySelectorAll('.filters button');
    var rows = document.querySelectorAll('.register__row[data-cat]');
    var count = document.querySelector('.register__count');
    function applyFilter(cat) {
        var shown = 0;
        rows.forEach(function (row) {
            var match = cat === 'all' || row.getAttribute('data-cat').split(' ').indexOf(cat) !== -1;
            row.hidden = !match;
            if (match) shown++;
        });
        filters.forEach(function (b) {
            b.setAttribute('aria-pressed', b.getAttribute('data-filter') === cat ? 'true' : 'false');
        });
        if (count) count.textContent = 'Showing ' + shown + ' of ' + rows.length + ' assignments';
    }
    filters.forEach(function (b) {
        b.addEventListener('click', function () { applyFilter(b.getAttribute('data-filter')); });
    });
    if (filters.length) applyFilter('all');

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
