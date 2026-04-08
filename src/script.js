import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import Lenis from 'lenis';
import { inject } from '@vercel/analytics';
import galaxyVertexShader from './shaders/galaxy/vertex.glsl';
import galaxyFragmentShader from './shaders/galaxy/fragment.glsl';

// Start Vercel Web Analytics immediately
inject();

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, TextPlugin);

// --- Lenis Smooth Scroll ---
const lenis = new Lenis({
    autoRaf: false,
    lerp: 0.1,           // lower values = smoother but more "lag", 0.1 is a good responsive default
    wheelMultiplier: 1,
    touchMultiplier: 2,
    infinite: false,
});

// Sync Lenis → GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);

// Start paused — will activate after WebGL Phase 1 transition
lenis.stop();

/**
 * -------------------------------------------------------------------
 * INITIALIZATION
 * -------------------------------------------------------------------
 */

// Global state for Scene 1
let geometry = null;
let material = null;
let points = null;

// Scene 1 Base
const gui = new GUI();
gui.hide();
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040016);

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

// Camera (Scene 1)
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(13, 1, -0.2);
scene.add(camera);

// Controls (Scene 1)
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enabled = false;

// Renderer (Scene 1)
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Scene 2 Elements
const canvas2 = document.getElementById('webgl-section-three');
let scene2, camera2, renderer2, secondaryMaterial, clock2;


/**
 * -------------------------------------------------------------------
 * WEBSITE LOADER
 * -------------------------------------------------------------------
 */
const initLoader = () => {
    const loaderWrapper = document.getElementById('loader-wrapper');
    const letters = document.querySelectorAll('.loader-title span span');
    const desktopMsg = document.querySelector('.loader-desktop-msg');

    if (!loaderWrapper) return;

    let progress = 0;
    const totalLetters = letters.length;

    const updateLoader = () => {
        // Simulated progress increment
        const increment = (100 - progress) * 0.03 + 0.15;
        progress += increment;

        if (progress > 100) progress = 100;

        // Fill letters based on progress threshold
        letters.forEach((letter, index) => {
            const threshold = (index / totalLetters) * 100;
            if (progress > threshold) {
                letter.classList.add('filled');
            }
        });

        // Show "Open in desktop" message
        if (progress > 40 && desktopMsg) {
            gsap.to(desktopMsg, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' });
        }

        if (progress < 100) {
            requestAnimationFrame(updateLoader);
        } else {
            // Finish: Slide up reveal
            setTimeout(() => {
                const tl = gsap.timeline({
                    onComplete: () => {
                        loaderWrapper.style.display = 'none';
                    }
                });

                tl.to(loaderWrapper, {
                    y: '-100%',
                    duration: 1.4,
                    ease: 'power4.inOut'
                });

                // Subtle parallax on text as it slides
                tl.to('.loader-content', {
                    opacity: 0,
                    y: -100,
                    duration: 1.0,
                    ease: 'power2.in'
                }, 0);
            }, 800);
        }
    };

    // Wait for window to ensure smooth start
    window.addEventListener('load', updateLoader);
};

/**
 * -------------------------------------------------------------------
 * SCENE 1: GALAXY TUBE
 * -------------------------------------------------------------------
 */

const parameters = {
    count: 100000,
    size: 0.001,
    radius: 18,
    tubeRadius: 3,
    tubeThickness: 0.1,
    randomness: 0.156,
    randomnessPower: 80,
    insideColor: '#a089fb',
    outsideColor: '#1b3984'
};

const generateGalaxy = () => {
    if (points !== null) {
        geometry.dispose();
        material.dispose();
        scene.remove(points);
    }

    geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(parameters.count * 3);
    const randomness = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const scales = new Float32Array(parameters.count * 1);

    const insideColor = new THREE.Color(parameters.insideColor);
    const outsideColor = new THREE.Color(parameters.outsideColor);

    const minRadius = parameters.tubeRadius - parameters.tubeThickness;
    const radiusRange = parameters.tubeRadius - minRadius;
    const mixedColor = new THREE.Color();

    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;

        const length = (Math.random() - 0.5) * parameters.radius * 2;
        const radius = minRadius + Math.random() * radiusRange;
        const angle = Math.random() * Math.PI * 2;

        positions[i3] = length;
        positions[i3 + 1] = Math.cos(angle) * radius;
        positions[i3 + 2] = Math.sin(angle) * radius;

        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * length;
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

        randomness[i3] = randomX;
        randomness[i3 + 1] = randomY;
        randomness[i3 + 2] = randomZ;

        mixedColor.copy(insideColor);
        mixedColor.lerp(outsideColor, Math.abs(length) / parameters.radius);

        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;

        scales[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    material = new THREE.ShaderMaterial({
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        uniforms: {
            uTime: { value: 0 },
            uSize: { value: 20 * renderer.getPixelRatio() }
        },
        vertexShader: galaxyVertexShader,
        fragmentShader: galaxyFragmentShader
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
};

// --- GUI Controls ---
gui.add(parameters, 'count').min(100).max(1000000).step(100).onFinishChange(generateGalaxy);
gui.add(parameters, 'radius').min(0.01).max(20).step(0.01).name('Tube Length (X)').onFinishChange(generateGalaxy);
gui.add(parameters, 'tubeRadius').min(0.01).max(5).step(0.01).name('Outer Pipe Radius').onFinishChange(generateGalaxy);
gui.add(parameters, 'tubeThickness').min(0.01).max(2).step(0.01).name('Pipe Wall Thickness').onFinishChange(generateGalaxy);
gui.add(parameters, 'randomness').min(0).max(2).step(0.001).name('Fuzziness').onFinishChange(generateGalaxy);
gui.add(parameters, 'randomnessPower').min(1).max(50).step(0.001).onFinishChange(generateGalaxy);
gui.addColor(parameters, 'insideColor').onFinishChange(generateGalaxy);
gui.addColor(parameters, 'outsideColor').onFinishChange(generateGalaxy);

// Prevent main thread blocking on initial render to preserve INP / SEO score
if (window.requestIdleCallback) {
    window.requestIdleCallback(generateGalaxy, { timeout: 2000 });
} else {
    setTimeout(generateGalaxy, 50);
}


/**
 * -------------------------------------------------------------------
 * SCENE 2: SHADER PLANE
 * -------------------------------------------------------------------
 */

const initScene2 = () => {
    if (!canvas2) {
        console.error("Canvas with ID 'webgl-section-three' not found.");
        return;
    }

    let { width, height } = { width: canvas2.clientWidth, height: canvas2.clientHeight };

    scene2 = new THREE.Scene();
    camera2 = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera2.position.z = 5;
    scene2.add(camera2);

    renderer2 = new THREE.WebGLRenderer({ canvas: canvas2, alpha: true });
    renderer2.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer2.setSize(width, height);
    renderer2.setClearColor(0x000000, 0);

    const vertexShader2 = `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    const fragmentShader2 = `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uTime;

        float fluidNoise(vec2 uv, float t) {
            float n = 0.0;
            n += sin(uv.x * 2.8 + uv.y * 2.1 + t * 0.1) * 0.1;
            n += sin(uv.x * 4.5 - uv.y * 3.2 - t * 0.5) * 0.3;
            n += sin(length(uv - 0.5) * 5.5 - t * 0.9) * 0.8;
            n += sin((uv.x + uv.y) * 6.0 + t * 0.7) * 0.2;
            return (n + 1.0) * 0.5;
        }

        void main() {
            vec2 uv = vUv * 1.7 - 1.0;
            float t = uTime * 0.8;

            float layer1 = fluidNoise(uv * 1.6 + 0.2 * vec2(sin(t * 0.9), cos(t * 1.4)), t);
            float layer2 = fluidNoise(uv * 2.2 - 0.3 * vec2(cos(t * 0.3), sin(t * 0.6)), t * 0.1);
            float layer3 = fluidNoise(uv * 1.8 + vec2(0.4 * sin(t * 0.25), 0.3 * cos(t * 0.35)), t * 1.1);
            float combined = (layer1 + layer2 + layer3) / 2.8;

            float curve = pow(length(uv), 9.9);
            float lightFalloff = smoothstep(9.9, 8.9, curve);

            vec3 colorDeep = vec3(0.07, 0.05, 0.10);
            vec3 colorPurple = vec3(0.35, 0.15, 0.7);
            vec3 colorGlow = vec3(0.6, 0.45, 0.9);
            vec3 colorHighlight = vec3(0.75, 0.75, 0.85);

            vec3 color = mix(colorDeep, colorPurple, smoothstep(0.1, 0.55, combined));
            color = mix(color, colorGlow, smoothstep(0.55, 0.8, combined));
            color = mix(color, colorHighlight, smoothstep(0.8, 0.95, combined));

            float pulse = 0.5 + 0.5 * sin(t * 0.8);
            color *= mix(0.9, 1.2, pulse * lightFalloff);

            float spec = pow(1.0 - abs(uv.x * 0.7 + uv.y * 0.6), 5.0);
            color += spec * 0.08;

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    secondaryMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader2,
        fragmentShader: fragmentShader2,
        uniforms: { uTime: { value: 0 } },
    });

    const aspectRatio = width / height;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(aspectRatio * 5, 5, 32, 32), secondaryMaterial);
    scene2.add(plane);
    scene2.background = null;

    clock2 = new THREE.Clock();

    const animate2 = () => {
        if (secondaryMaterial) {
            secondaryMaterial.uniforms.uTime.value = clock2.getElapsedTime();
        }
        if (renderer2) {
            renderer2.render(scene2, camera2);
        }
        requestAnimationFrame(animate2);
    };

    animate2();
};


// Lazy load scene 2 to improve INP and initial layout shift
const observeScene2 = () => {
    if (!canvas2) return;
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            initScene2();
            observer.disconnect();
        }
    });
    observer.observe(canvas2);
};

if (document.readyState === 'complete') {
    observeScene2();
} else {
    window.addEventListener('load', observeScene2);
}


/**
 * -------------------------------------------------------------------
 * SCROLL & TOUCH HANDLING
 * -------------------------------------------------------------------
 *
 * KEY INSIGHT: We must call event.preventDefault() on wheel events
 * while we are in the WebGL camera-state phase. Otherwise the browser
 * scrolls natively ON TOP of our custom camera transitions, causing
 * the page to drift/jump.
 *
 * Once hasScrolledToNextSection is true, we STOP preventing default
 * so normal page scrolling resumes for the rest of the site.
 */

/**
 * -------------------------------------------------------------------
 * REVEAL ANIMATIONS (SPLIT TEXT)
 * -------------------------------------------------------------------
 */
const splitTextIntoChars = (selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
        const text = el.textContent.trim();
        const classes = el.className; // Capture 'gradient-text-web', etc.
        const originalStyles = window.getComputedStyle(el);
        const bgImage = originalStyles.backgroundImage;

        el.textContent = '';
        el.style.background = 'none'; // Clear from parent to avoid weird clipping
        el.style.webkitBackgroundClip = 'initial';
        el.style.backgroundClip = 'initial';

        [...text].forEach(char => {
            const wrapper = document.createElement('span');
            wrapper.className = 'char-wrapper';
            const inner = document.createElement('span');

            // If it's a space, handle it differently
            if (char === ' ') {
                inner.className = 'char-inner is-space';
                inner.textContent = '\u00A0';
            } else {
                inner.className = `char-inner ${classes}`;
                inner.textContent = char;
                // Only apply background if it's not the ampersand (which needs solid white)
                if (!classes.includes('ampersand') && bgImage !== 'none') {
                    inner.style.backgroundImage = bgImage;
                    inner.style.backgroundSize = '100% 100%';
                } else {
                    inner.style.backgroundImage = 'none';
                    inner.style.webkitTextFillColor = 'white';
                    inner.style.color = 'white';
                }
            }

            wrapper.appendChild(inner);
            el.appendChild(wrapper);
        });
    });

    // IMMEDIATELY set initial hidden state
    const inners = document.querySelectorAll('.char-inner');
    if (inners.length) {
        gsap.set(inners, { y: '110%' });
    }
};

// --- FALLBACK REVEAL ---
const initHeroFallbackReveal = () => {
    const charInners = document.querySelectorAll('.char-inner');
    const tagline = document.querySelector('.tagline-text');

    if (!charInners.length) return;

    ScrollTrigger.create({
        trigger: '.main-title',
        start: 'top 95%', // Trigger even if just entering the screen
        onEnter: () => {
            console.log("Hero reveal triggered via ScrollTrigger");
            gsap.to(charInners, {
                y: '0%',
                duration: 1.0,
                stagger: 0.02,
                ease: 'power4.out',
                overwrite: 'auto'
            });
            if (tagline) {
                gsap.to(tagline, {
                    opacity: 1,
                    y: 0,
                    duration: 1.0,
                    ease: 'power3.out',
                    delay: 0.3,
                    overwrite: 'auto'
                });
            }
        },
        // Re-run if we scroll back up and down
        onEnterBack: () => {
            gsap.to(charInners, { y: '0%', duration: 1.0, stagger: 0.01 });
        }
    });
};

/**
 * -------------------------------------------------------------------
 * SCROLL & TOUCH HANDLING
 * -------------------------------------------------------------------
 */

const states = [
    { cameraPosition: new THREE.Vector3(10, 1, -0.2), tubeRotation: new THREE.Euler(0, 0, 0) },
    { cameraPosition: new THREE.Vector3(0, 1, 10), tubeRotation: new THREE.Euler(0, 0, -Math.PI / 2) },
    { cameraPosition: new THREE.Vector3(0, 10, 0), tubeRotation: new THREE.Euler(0, 0, 0) }
];

const MAX_SCROLL_STATE = states.length - 1;
let scrollState = 0;
let lastScrollTime = 0;
let touchStartY = 0;
let isTouching = false;

/**
 * PHASE 1: WebGL camera scroll interceptor.
 * This handler BLOCKS native scroll with preventDefault() so the
 * page stays at scroll=0 while we cycle camera states.
 *
 * On the 4th scroll-down, it triggers a GSAP scrollTo tween
 * and then REMOVES ITSELF so native scroll + ScrollTrigger
 * take over cleanly with zero interference.
 */
const onWheelDuringWebGL = (event) => {
    event.preventDefault(); // Block native scroll during WebGL phase

    const now = Date.now();
    if (now - lastScrollTime < 800) return;
    lastScrollTime = now;

    if (event.deltaY > 0) {
        // Scroll DOWN
        if (scrollState < MAX_SCROLL_STATE) {
            scrollState++;
        } else {
            // 4th scroll â€” transition to homepage, then detach
            transitionToHomepage();
        }
    } else {
        // Scroll UP
        if (scrollState > 0) {
            scrollState--;
        }
    }
};

/**
 * Smoothly scroll from WebGL to homepage, animate text in,
 * then REMOVE the wheel interceptor so the rest of the site
 * scrolls normally (including the circle reveal ScrollTrigger).
 */
const transitionToHomepage = () => {
    const nextSection = document.getElementById('next-section');
    const taglineText = document.querySelector('.tagline-text');
    const charInners = document.querySelectorAll('.char-inner');
    const webglCanvas = document.querySelector('canvas.webgl');

    if (!nextSection) return;

    // Remove the interceptor IMMEDIATELY
    window.removeEventListener('wheel', onWheelDuringWebGL);

    // Pre-hide tagline
    if (taglineText) gsap.set(taglineText, { opacity: 0, y: 30 });
    // Note: .char-inner is already hidden by CSS (translateY(115%))

    // Smooth scroll to homepage
    gsap.to(window, {
        scrollTo: { y: nextSection, autoKill: false },
        duration: 1.4,
        ease: 'power3.inOut',
        onComplete: () => {
            // Fix flicker: hide canvas and disable pointer events
            if (webglCanvas) {
                webglCanvas.style.pointerEvents = 'none';
            }

            // Start Lenis smooth scroll now that we're past WebGL phase
            lenis.start();

            // Animate hero text in (Character Reveal)
            const tl = gsap.timeline();

            if (charInners.length) {
                tl.to(charInners, {
                    y: '0%',
                    duration: 1.0,
                    stagger: 0.02, // Fast granular stagger
                    ease: 'power4.out'
                });
            }

            if (taglineText) {
                tl.to(taglineText, {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: 'power3.out'
                }, '-=0.6');
            }
        }
    });
};

// Attach the interceptor (it will self-remove after transition)
window.addEventListener('wheel', onWheelDuringWebGL, { passive: false });

// --- Touch Events (same self-removing pattern) ---
const onTouchStartDuringWebGL = (event) => {
    if (event.touches.length === 1) {
        touchStartY = event.touches[0].clientY;
        isTouching = true;
    }
};

const onTouchMoveDuringWebGL = (event) => {
    // Prevent default to stop mobile browser pull-to-refresh & native scroll
    if (event.cancelable) {
        event.preventDefault();
    }

    if (!isTouching || event.touches.length !== 1) return;

    const touchEndY = event.touches[0].clientY;
    const deltaY = touchStartY - touchEndY;

    if (Math.abs(deltaY) > 40) {
        const now = Date.now();
        // Debounce touch state changes to prevent skipping all states in one swipe
        if (now - lastScrollTime > 800) {
            lastScrollTime = now;

            if (deltaY > 0) {
                if (scrollState < MAX_SCROLL_STATE) {
                    scrollState++;
                } else {
                    removeTouchListeners();
                    transitionToHomepage();
                }
            } else {
                if (scrollState > 0) {
                    scrollState--;
                }
            }
        }
        // Update anchor so we only trigger again after another solid 40px movement
        touchStartY = touchEndY;
    }
};

const onTouchEndDuringWebGL = () => { isTouching = false; };

const removeTouchListeners = () => {
    window.removeEventListener('touchstart', onTouchStartDuringWebGL);
    window.removeEventListener('touchmove', onTouchMoveDuringWebGL);
    window.removeEventListener('touchend', onTouchEndDuringWebGL);
};

window.addEventListener('touchstart', onTouchStartDuringWebGL, { passive: true });
// MUST be passive: false so we can event.preventDefault()!
window.addEventListener('touchmove', onTouchMoveDuringWebGL, { passive: false });
window.addEventListener('touchend', onTouchEndDuringWebGL, { passive: true });


/**
 * -------------------------------------------------------------------
 * GLOBAL RESIZE HANDLER
 * -------------------------------------------------------------------
 */

const onResize = () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (canvas2 && renderer2) {
        const newWidth = canvas2.clientWidth;
        const newHeight = canvas2.clientHeight;

        if (newWidth > 0 && newHeight > 0) {
            camera2.aspect = newWidth / newHeight;
            camera2.updateProjectionMatrix();

            const newAspectRatio = newWidth / newHeight;
            const plane = scene2.getObjectByProperty('type', 'Mesh');
            if (plane) {
                plane.geometry.dispose();
                plane.geometry = new THREE.PlaneGeometry(newAspectRatio * 5, 5, 32, 32);
            }

            renderer2.setSize(newWidth, newHeight);
            renderer2.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }
    }
};

window.addEventListener('resize', onResize);


/**
 * -------------------------------------------------------------------
 * MAIN ANIMATION LOOP (TICK)
 * -------------------------------------------------------------------
 */

const clock = new THREE.Clock();

const tick = () => {
    const elapsedTime = clock.getElapsedTime();

    if (material) {
        material.uniforms.uTime.value = elapsedTime;
    }

    const targetState = states[scrollState];

    camera.position.lerp(targetState.cameraPosition, 0.05);

    const targetQuaternion = new THREE.Quaternion().setFromEuler(targetState.tubeRotation);
    if (points) {
        const angle = points.quaternion.angleTo(targetQuaternion);
        if (angle > 0.001) {
            points.quaternion.slerp(targetQuaternion, 0.05);
        } else {
            points.quaternion.copy(targetQuaternion);
        }
    }

    controls.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    controls.update();

    renderer.render(scene, camera);

    window.requestAnimationFrame(tick);
};


/**
 * -------------------------------------------------------------------
 * CIRCLE REVEAL: HOMEPAGE â†’ SHADER SECTION
 * -------------------------------------------------------------------
 *
 * HOW IT WORKS:
 * 1. .page-three starts with clip-path: circle(0%) â€” fully clipped
 * 2. When .page-three's top hits the viewport top, ScrollTrigger
 *    PINS it (position: fixed at top: 0, covering the viewport)
 * 3. The clip-path scrubs from circle(0%) â†’ circle(150%) over 100vh
 *    of scroll distance â€” the circle grows from the center
 * 4. Behind the circle (the clipped area) = dark background #040016,
 *    which matches the homepage â€” so it looks like a portal opening
 * 5. After the reveal, the shader text fades in and the pin releases
 *
 * WHY 150%: A circle must exceed sqrt(wÂ² + hÂ²) / min(w,h) to fully
 * cover a rectangle. For a 16:9 viewport, that's ~118%. Using 150%
 * for safety on all aspect ratios.
 */

const initCircleReveal = () => {
    const pageThree = document.querySelector('.page-three');
    if (!pageThree) return;

    const shaderOverlay = document.querySelector('.shader-text-overlay');
    const words = document.querySelectorAll('.shader-word');
    const desc = document.querySelector('.shader-desc');
    const cursor = document.querySelector('.shader-cursor');

    let textPlayed = false;

    // Reset initial states
    if (shaderOverlay) gsap.set(shaderOverlay, { opacity: 0, xPercent: -50, yPercent: -50 });
    if (words.length) gsap.set(words, { opacity: 0, y: 12 });
    if (desc) desc.style.opacity = '0';
    if (cursor) gsap.set(cursor, { opacity: 0 });

    const playTextAnimation = () => {
        if (shaderOverlay) gsap.set(shaderOverlay, { opacity: 1, xPercent: -50, yPercent: -50 });

        const revealTl = gsap.timeline();

        if (words.length) {
            revealTl.to(words, { opacity: 1, y: 0, duration: 0.5, stagger: 0.2, ease: 'power3.out' });
        }
        if (cursor) {
            revealTl.to(cursor, { opacity: 1, duration: 0.1 }, '-=0.2');
        }
        if (desc) {
            const fullText = desc.getAttribute('data-typewriter') || desc.textContent;
            desc.textContent = '';
            desc.style.opacity = '1';
            revealTl.to(desc, { duration: 2.0, text: { value: fullText, speed: 0.8 }, ease: 'none' }, '-=0.1');
        }
        if (cursor) {
            revealTl.to(cursor, { opacity: 0, duration: 0.4 }, '+=0.5');
        }
    };

    const resetTextAnimation = () => {
        if (shaderOverlay) gsap.set(shaderOverlay, { opacity: 0, xPercent: -50, yPercent: -50 });
        if (words.length) gsap.set(words, { opacity: 0, y: 12 });
        if (desc) { desc.textContent = ''; desc.style.opacity = '0'; }
        if (cursor) gsap.set(cursor, { opacity: 0 });
    };

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: pageThree,
            start: 'top top',
            end: '+=100%',          // Reduced from 250% to prevent excessive pinning
            pin: true,
            scrub: true,
            onUpdate: (self) => {
                // Trigger typing automatically when the circle completes
                if (self.progress >= 0.8 && !textPlayed) {
                    textPlayed = true;
                    playTextAnimation();
                } else if (self.progress < 0.75 && textPlayed) {
                    textPlayed = false;
                    resetTextAnimation();
                }
            }
        }
    });

    // 1. Circle grows directly over the timeline without excessive wait
    tl.fromTo(pageThree,
        { clipPath: 'circle(0% at 50% 50%)' },
        { clipPath: 'circle(100% at 50% 50%)', ease: 'none', duration: 1 }
    );
};


/**
 * -------------------------------------------------------------------
 * SECTION FOUR â€” AWARD-WINNING ANIMATIONS
 * -------------------------------------------------------------------
 * 1. Image curtain wipe (purple overlay slides right-to-left reveal)
 * 2. Text scramble (title characters resolve from random glyphs)
 * 3. Description slide-up with stagger
 * 4. Skill bars fill + percentage counter
 */

const initSectionFour = () => {
    const section = document.querySelector('.page-four');
    if (!section) return;

    const imageWrap = section.querySelector('.about-image-wrap');
    const imageReveal = section.querySelector('.about-image-reveal');
    const photo = section.querySelector('.about-photo');
    const accent = section.querySelector('.about-image-accent');
    const label = section.querySelector('.about-label');
    const title = section.querySelector('.about-title');
    const descPs = section.querySelectorAll('.about-desc p');
    const skillsHeading = section.querySelector('.skills-heading');
    const skillBars = section.querySelectorAll('.skill-bar');

    // ---- 1. IMAGE CURTAIN WIPE ----
    if (imageReveal && photo) {
        const imgTl = gsap.timeline({
            scrollTrigger: {
                trigger: imageWrap,
                start: 'top 80%',
                end: 'bottom 60%',
                toggleActions: 'play none none none'
            }
        });

        // Wipe the purple overlay away (scaleX 1 â†’ 0 from right)
        imgTl.to(imageReveal, {
            scaleX: 0,
            transformOrigin: 'right center',
            duration: 1.2,
            ease: 'power4.inOut'
        });

        // Ken Burns zoom on photo (1.3 â†’ 1.0)
        imgTl.to(photo, {
            scale: 1,
            duration: 1.8,
            ease: 'power2.out'
        }, '-=0.8');

        // Accent line fades in
        if (accent) {
            imgTl.to(accent, {
                opacity: 1,
                duration: 0.6,
                ease: 'power2.out'
            }, '-=0.6');
        }
    }

    // ---- 2. LABEL + TEXT SCRAMBLE ----
    const textTl = gsap.timeline({
        scrollTrigger: {
            trigger: section.querySelector('.about-text-wrap'),
            start: 'top 75%',
            toggleActions: 'play none none none'
        }
    });

    // Label slides in
    if (label) {
        textTl.to(label, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out'
        });
    }

    // Title scramble effect using TextPlugin
    if (title) {
        const finalText = title.getAttribute('data-scramble') || 'Hi! I\'m Sohaib';
        title.textContent = ''; // start empty

        // Custom scramble: type random chars first, then resolve
        const scrambleChars = '!@#$%^&*()_+{}|:<>?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        // Phase 1: fill with random characters
        textTl.to(title, {
            duration: 0.4,
            text: {
                value: scrambleChars.slice(0, finalText.length),
                speed: 2
            },
            ease: 'none'
        }, '+=0.1');

        // Phase 2: resolve to final text
        textTl.to(title, {
            duration: 0.8,
            text: {
                value: finalText,
                speed: 0.5
            },
            ease: 'none'
        });
    }

    // ---- 3. DESCRIPTION PARAGRAPHS ----
    if (descPs.length) {
        textTl.to(descPs, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.2,
            ease: 'power3.out'
        }, '-=0.3');
    }

    // ---- 4. SKILL BARS ----
    if (skillsHeading) {
        textTl.to(skillsHeading, {
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out'
        }, '-=0.2');
    }

    skillBars.forEach((bar, i) => {
        const percent = parseInt(bar.getAttribute('data-percent') || '0');
        const fill = bar.querySelector('.skill-fill');
        const percentLabel = bar.querySelector('.skill-percent');
        const dot = fill ? fill.querySelector('::after') : null; // pseudo-element, handled via CSS

        const barTl = gsap.timeline({
            scrollTrigger: {
                trigger: bar,
                start: 'top 90%',
                toggleActions: 'play none none none'
            }
        });

        // Bar slides in
        barTl.to(bar, {
            opacity: 1,
            x: 0,
            duration: 0.5,
            delay: i * 0.1,
            ease: 'power3.out'
        });

        // Fill animates to target width
        if (fill) {
            barTl.to(fill, {
                width: percent + '%',
                duration: 1.2,
                ease: 'power2.out'
            }, '-=0.3');
        }

        // Counter increments
        if (percentLabel) {
            const counter = { val: 0 };
            barTl.to(counter, {
                val: percent,
                duration: 1.2,
                ease: 'power2.out',
                onUpdate: () => {
                    percentLabel.textContent = Math.round(counter.val) + '%';
                }
            }, '<'); // sync with fill
        }
    });
};


/**
 * -------------------------------------------------------------------
 * EXPERIENCE SECTION â€” SVG DRAW + SCRAMBLE + TIMELINE REVEAL
 * -------------------------------------------------------------------
 * 1. Decorative SVGs draw themselves (stroke-dashoffset â†’ 0)
 * 2. Title scrambles via TextPlugin
 * 3. Horizontal SVG line draws leftâ†’right
 * 4. Timeline node circles draw + inner dots pop in
 * 5. Cards slide up with stagger
 */

const initExperienceSection = () => {
    const section = document.getElementById('experience-section');
    if (!section) return;

    // --- 1. DECORATIVE SVG DRAW (uses .deco-path â€” all <path> elements) ---
    const decoPaths = section.querySelectorAll('.deco-path');
    decoPaths.forEach((path, i) => {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });

        gsap.to(path, {
            strokeDashoffset: 0,
            duration: 2 + (i * 0.4),
            ease: 'power2.inOut',
            scrollTrigger: {
                trigger: section,
                start: 'top 75%',
                toggleActions: 'play none none none'
            }
        });
    });

    // --- 1b. SVG MORPH (deco-morph paths morph between shapes) ---
    // Both paths share identical command structure (M + 4Ã—C = 26 numbers)
    // so GSAP can interpolate the d attribute numerically
    const morphPaths = section.querySelectorAll('.deco-morph');
    morphPaths.forEach((path, i) => {
        const morphTo = path.getAttribute('data-morph');
        if (!morphTo) return;

        gsap.to(path, {
            attr: { d: morphTo },
            duration: 4,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: 3 + (i * 0.5), // wait for draw to finish
            scrollTrigger: {
                trigger: section,
                start: 'top 75%',
                toggleActions: 'play pause resume pause'
            }
        });

        // Slow rotation during morph for extra dynamism
        gsap.to(path.closest('svg'), {
            rotation: 360,
            duration: 25,
            ease: 'none',
            repeat: -1,
            transformOrigin: 'center center',
            scrollTrigger: {
                trigger: section,
                start: 'top 75%',
                toggleActions: 'play pause resume pause'
            }
        });
    });

    const label = section.querySelector('.exp-label');
    const title = section.querySelector('.exp-title');
    const subtitle = section.querySelector('.exp-subtitle');
    const headerLine = section.querySelector('.exp-header-line');

    const headerTl = gsap.timeline({
        scrollTrigger: {
            trigger: section.querySelector('.exp-header'),
            start: 'top 80%',
            toggleActions: 'play none none none'
        }
    });

    if (label) {
        headerTl.to(label, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    }

    if (title) {
        const finalText = title.getAttribute('data-scramble') || 'Experience';
        title.textContent = '';
        const scrambleChars = '#@$%&!?*ABCXYZ01789';

        headerTl.to(title, {
            duration: 0.3,
            text: { value: scrambleChars.slice(0, finalText.length), speed: 2 },
            ease: 'none'
        }, '+=0.1');

        headerTl.to(title, {
            duration: 0.7,
            text: { value: finalText, speed: 0.5 },
            ease: 'none'
        });
    }

    if (subtitle) {
        headerTl.to(subtitle, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3');
    }

    if (headerLine) {
        headerTl.to(headerLine, { opacity: 1, scaleX: 1, duration: 0.6, ease: 'power3.out' }, '-=0.3');
    }

    // --- 3. CENTRAL SVG LINE DRAW (uses .exp-main-path â€” a <path>) ---
    const mainPath = section.querySelector('.exp-main-path');
    if (mainPath) {
        const lineLen = mainPath.getTotalLength();
        gsap.set(mainPath, { strokeDasharray: lineLen, strokeDashoffset: lineLen });

        gsap.to(mainPath, {
            strokeDashoffset: 0,
            duration: 2.2,
            ease: 'power2.inOut',
            scrollTrigger: {
                trigger: section.querySelector('.exp-timeline-wrap'),
                start: 'top 75%',
                toggleActions: 'play none none none'
            }
        });
    }

    // --- 4. ZIGZAG NODES ---
    const nodes = section.querySelectorAll('.exp-node');
    nodes.forEach((node, i) => {
        const ring = node.querySelector('.dot-ring');
        const center = node.querySelector('.dot-center');
        const card = node.querySelector('.exp-card');
        const cardLine = node.querySelector('.exp-card-line');
        const cardTitle = node.querySelector('.exp-card-title');

        const nodeTl = gsap.timeline({
            scrollTrigger: {
                trigger: section.querySelector('.exp-timeline-wrap'),
                start: 'top 70%',
                toggleActions: 'play none none none'
            }
        });

        // Node slides in (staggered)
        nodeTl.to(node, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            delay: 0.6 + (i * 0.3),
            ease: 'power3.out'
        });

        // SVG ring draws (using <path> â€” getTotalLength is reliable)
        if (ring) {
            const ringLen = ring.getTotalLength();
            gsap.set(ring, { strokeDasharray: ringLen, strokeDashoffset: ringLen });

            nodeTl.to(ring, {
                strokeDashoffset: 0,
                duration: 0.6,
                ease: 'power2.out'
            }, '-=0.4');
        }

        // Inner dot pops in
        if (center) {
            nodeTl.to(center, {
                opacity: 1,
                duration: 0.3,
                ease: 'back.out(3)'
            }, '-=0.1');
        }

        // Card accent line sweeps in
        if (cardLine) {
            nodeTl.to(cardLine, {
                opacity: 1,
                scaleX: 1,
                transformOrigin: 'left center',
                duration: 0.5,
                ease: 'power3.out'
            }, '-=0.2');
        }

        // Card title scramble
        if (cardTitle) {
            const cardFinalText = cardTitle.getAttribute('data-scramble');
            if (cardFinalText) {
                cardTitle.textContent = '';
                nodeTl.to(cardTitle, {
                    duration: 0.5,
                    text: { value: cardFinalText, speed: 0.5 },
                    ease: 'none'
                }, '-=0.3');
            }
        }
    });
};




/**
 * -------------------------------------------------------------------
 * FOOTER SOCIAL ICON MORPH
 * -------------------------------------------------------------------
 */
const initFooterMorph = () => {
    const icons = document.querySelectorAll('.footer-social-morph .morph-icon');
    if (!icons || icons.length === 0) return;

    // Initially hide everything
    gsap.set(icons, { opacity: 0, rotationY: -90, scale: 0.8 });

    let currentIndex = 0;
    const durIn = 0.3;
    const durOut = 0.3;
    const stay = 3.0; // Play duration for each icon

    // A recursive function that perfectly builds a fresh timeline for every transition,
    // guaranteeing no GSAP 'repeat: -1' wrap-around start-state reset bugs.
    const playNext = () => {
        const currentIcon = icons[currentIndex];
        const nextIndex = (currentIndex + 1) % icons.length;
        const nextIcon = icons[nextIndex];

        const tl = gsap.timeline({
            onComplete: () => {
                currentIndex = nextIndex;
                playNext(); // Infinite loop
            }
        });

        // 1. Current icon flips OUT
        tl.to(currentIcon, {
            rotationY: 90,
            opacity: 0,
            scale: 0.8,
            duration: durOut,
            ease: "power2.in",
            onStart: () => { currentIcon.style.pointerEvents = 'none'; }
        });

        // 2. Next icon flips IN perfectly
        tl.fromTo(nextIcon,
            { rotationY: -90, opacity: 0, scale: 0.8 },
            { rotationY: 0, opacity: 1, scale: 1, duration: durIn, ease: "power2.out", onStart: () => { nextIcon.style.pointerEvents = 'auto'; } }
        );

        // 3. Wait 'stay' seconds before triggering next cycle
        tl.to(nextIcon, { rotationY: 0, duration: stay });
    };

    // Kickoff the loop sequence: flip the first icon in!
    gsap.timeline()
        .fromTo(icons[0],
            { rotationY: -90, opacity: 0, scale: 0.8 },
            { rotationY: 0, opacity: 1, scale: 1, duration: durIn, ease: "power2.out", onStart: () => { icons[0].style.pointerEvents = 'auto'; } }
        )
        .to(icons[0], { rotationY: 0, duration: stay, onComplete: playNext });
};

/**
 * -------------------------------------------------------------------
 * START EVERYTHING
 * -------------------------------------------------------------------
 */

initLoader();
generateGalaxy();
initScene2();
initCircleReveal();
initSectionFour();
initExperienceSection();
initFooterMorph();

// Initialize Hero Splits & Reveal
splitTextIntoChars('.gradient-text-web');
splitTextIntoChars('.ampersand');
splitTextIntoChars('.gradient-text-dev');
initHeroFallbackReveal();

tick();

// --- Prevent WebGL Context Loss in Development (Vite HMR) ---
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (renderer) renderer.dispose();
        if (renderer2) renderer2.dispose();
        if (gui) gui.destroy();
        if (lenis) lenis.destroy();
    });
}

// --- Page Transition to Work Page ---
const workLinks = document.querySelectorAll('a[href="/work.html"], a[href="work.html"]');
workLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');

        // Page goes up animation
        gsap.to(document.body, {
            y: '-100vh',
            opacity: 0,
            duration: 0.8,
            ease: 'power3.inOut',
            onComplete: () => {
                window.location.href = href;
            }
        });
    });
});
