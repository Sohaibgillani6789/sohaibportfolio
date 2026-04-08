import gsap from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin';
import Lenis from 'lenis';
import { inject } from '@vercel/analytics';

// Start Vercel Web Analytics immediately
inject();

gsap.registerPlugin(TextPlugin);

// --- Lenis Smooth Scroll (starts immediately, no WebGL phase) ---
const lenis = new Lenis({
    autoRaf: false,
    lerp: 0.1,           // lower values = smoother but more "lag", 0.1 is a good responsive default
    wheelMultiplier: 1,
    touchMultiplier: 2,
    infinite: false,
});

// Use GSAP ticker instead of requestAnimationFrame for Lenis to ensure synchronized updates
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Prevent browser from restoring scroll position automatically which causes jumps/reloads
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// Run animations after the browser has fully loaded assets
window.addEventListener('load', () => {
    const loaderWrapper = document.getElementById('loader-wrapper');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // First slide up the loader
    if (loaderWrapper) {
        tl.to(loaderWrapper, {
            y: '-100%',
            duration: 0.8,
            ease: 'power3.inOut',
            onComplete: () => {
                loaderWrapper.style.display = 'none';
            }
        });
    }

    const section = document.getElementById('work-section');
    if (!section) return;

    const label = section.querySelector('.work-label');
    const title = section.querySelector('.work-title');
    const subtitle = section.querySelector('.work-subtitle');
    const line = section.querySelector('.work-header-line');
    const cards = section.querySelectorAll('.work-card');

    // 1. Label fades in
    if (label) {
        tl.from(label, { opacity: 0, y: -16, duration: 0.5 }, loaderWrapper ? '-=0.3' : 0);
    }

    // 2. Title scramble
    if (title) {
        const finalText = title.getAttribute('data-scramble') || title.textContent;
        const scramble = '!@#$%^&*ABCXYZ01789';
        title.textContent = '';

        tl.from(title, { opacity: 0, duration: 0.1 }, '-=0.1')
            .to(title, {
                duration: 0.3,
                text: { value: scramble.slice(0, Math.min(finalText.length, scramble.length)), speed: 2 },
                ease: 'none'
            }, '+=0.05')
            .to(title, {
                duration: 0.6,
                text: { value: finalText, speed: 0.5 },
                ease: 'none'
            });
    }

    // 3. Subtitle slides up
    if (subtitle) {
        tl.from(subtitle, { opacity: 0, y: 20, duration: 0.6 }, '-=0.3');
    }

    // 4. Decorative line scales in
    if (line) {
        tl.from(line, { opacity: 0, scaleX: 0, duration: 0.6, transformOrigin: 'left center' }, '-=0.4');
    }

    // 5. Cards stagger in — NO ScrollTrigger, pure time-based
    if (cards.length) {
        tl.from(cards, {
            opacity: 0,
            y: 50,
            duration: 0.7,
            stagger: 0.1,
            ease: 'power3.out'
        }, '-=0.2');
    }

    // --- Hover micro-interactions (no scroll dependency) ---
    cards.forEach((card) => {
        const glass = card.querySelector('.card-glass');
        if (!glass) return;

        card.addEventListener('mouseenter', () => {
            gsap.to(glass, { scale: 1.02, y: -10, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(glass, { scale: 1, y: 0, duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
        });
    });
});
