// ===== DOM ELEMENTS =====
const header = document.getElementById('header');
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');
const navLinks = document.querySelectorAll('.nav__link');
const contactForm = document.getElementById('contactForm');

// ===== NAV OVERLAY =====
const overlay = document.createElement('div');
overlay.classList.add('nav-overlay');
document.body.appendChild(overlay);

// ===== MOBILE MENU TOGGLE =====
function toggleMenu() {
    const isOpen = nav.classList.toggle('open');
    hamburger.classList.toggle('active');
    overlay.classList.toggle('visible');
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
}

hamburger.addEventListener('click', toggleMenu);
overlay.addEventListener('click', toggleMenu);

// Close mobile menu on nav link click
navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
        if (nav.classList.contains('open')) {
            toggleMenu();
        }
    });
});

// ===== STICKY HEADER SHADOW =====
window.addEventListener('scroll', function () {
    if (window.scrollY > 10) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// ===== HERO SLIDER =====
var slides = document.querySelectorAll('.hero-slide');
var dots = document.querySelectorAll('.hero-slider__dot');
var prevBtn = document.querySelector('.hero-slider__arrow--prev');
var nextBtn = document.querySelector('.hero-slider__arrow--next');
var currentSlide = 0;
var totalSlides = slides.length;
var slideInterval = null;
var slideDuration = 5000;

function goToSlide(index) {
    // Remove active from current
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');

    // Update index
    currentSlide = (index + totalSlides) % totalSlides;

    // Add active to new
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
}

function nextSlide() {
    goToSlide(currentSlide + 1);
}

function prevSlide() {
    goToSlide(currentSlide - 1);
}

function startAutoSlide() {
    stopAutoSlide();
    slideInterval = setInterval(nextSlide, slideDuration);
}

function stopAutoSlide() {
    if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
    }
}

if (prevBtn && nextBtn) {
    nextBtn.addEventListener('click', function () {
        nextSlide();
        startAutoSlide();
    });

    prevBtn.addEventListener('click', function () {
        prevSlide();
        startAutoSlide();
    });
}

dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
        var index = parseInt(this.getAttribute('data-slide'), 10);
        goToSlide(index);
        startAutoSlide();
    });
});

// Start auto-slide
if (totalSlides > 1) {
    startAutoSlide();
}

// Keep auto-sliding always running

// ===== ACTIVE NAV LINK ON SCROLL =====
const sections = document.querySelectorAll('section[id]');

function highlightNav() {
    var scrollPos = window.scrollY + 120;

    sections.forEach(function (section) {
        var top = section.offsetTop;
        var height = section.offsetHeight;
        var id = section.getAttribute('id');

        if (scrollPos >= top && scrollPos < top + height) {
            navLinks.forEach(function (link) {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + id) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', highlightNav);

// ===== SCROLL REVEAL ANIMATION =====
var revealElements = document.querySelectorAll('.reveal');

var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach(function (el) {
    revealObserver.observe(el);
});

// ===== ANIMATED STAT COUNTERS =====
var statNumbers = document.querySelectorAll('.stat-card__number');
var statsAnimated = false;

function animateCounters() {
    statNumbers.forEach(function (num) {
        var target = parseInt(num.getAttribute('data-target'), 10);
        var duration = 2000;
        var startTime = null;

        function updateCount(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease out cubic
            var eased = 1 - Math.pow(1 - progress, 3);
            num.textContent = Math.floor(eased * target);
            if (progress < 1) {
                requestAnimationFrame(updateCount);
            } else {
                num.textContent = target;
            }
        }

        requestAnimationFrame(updateCount);
    });
}

var statsSection = document.querySelector('.about__stats');
if (statsSection) {
    var statsObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting && !statsAnimated) {
                statsAnimated = true;
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    statsObserver.observe(statsSection);
}

// ===== CONTACT FORM HANDLING =====
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var name = document.getElementById('name').value.trim();
        var email = document.getElementById('email').value.trim();
        var phone = document.getElementById('phone').value.trim();
        var subject = document.getElementById('subject').value.trim();
        var message = document.getElementById('message').value.trim();

        // Basic validation
        if (!name || !email || !subject || !message) {
            return;
        }

        // Build mailto link
        var mailtoSubject = encodeURIComponent(subject);
        var mailtoBody = encodeURIComponent(
            'Name: ' + name + '\n' +
            'Email: ' + email + '\n' +
            'Phone: ' + phone + '\n\n' +
            'Message:\n' + message
        );

        var mailtoLink = 'mailto:contact@prconsulting.co.in?subject=' + mailtoSubject + '&body=' + mailtoBody;

        // Open mail client
        window.location.href = mailtoLink;

        // Show success state
        var wrapper = document.querySelector('.contact__form-wrapper');
        wrapper.innerHTML =
            '<div class="form-success">' +
                '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
                '<h3>Thank You!</h3>' +
                '<p>Your email client should open now. If it doesn\'t, please email us directly at contact@prconsulting.co.in</p>' +
            '</div>';
    });
}

// ===== CLOSE MENU ON ESCAPE =====
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
        toggleMenu();
    }
});
