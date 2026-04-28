document.addEventListener('DOMContentLoaded', () => {
    const header      = document.getElementById('main-header');
    const video       = document.getElementById('heroVideo');
    const muteBtn     = document.getElementById('muteToggle');
    const muteIcon    = document.getElementById('muteIcon');
    const buildBtn    = document.getElementById('buildSquadBtn');
    const startJourneyBtn = document.querySelector('.get-started');
    const cancelBtn   = document.getElementById('cancelAuth');
    const authScreen  = document.getElementById('authScreen');
    const authCard    = document.getElementById('authCard');

    let isAuthOpen = false;
    const phpApiBase = `${window.location.protocol}//${window.location.hostname}:5000/backend/php/controllers`;
    const headerShrinkThreshold = 56;

    let targetScroll = window.scrollY;
    let currentScroll = window.scrollY;
    const lerpAmount = 0.075; 


    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    // Cache metrics to avoid layout thrashing in the ticker
    let winH = window.innerHeight;
    let sections = {
        parallax:     { el: document.getElementById('parallax-showcase'), top: 0, height: 0 },
        bounce:       { el: document.getElementById('bounceScene'),        top: 0, height: 0 },
        legends:      { el: document.getElementById('legends-gallery'),    top: 0, height: 0 },
        about:        { el: document.getElementById('about'),              top: 0, height: 0 },
        features:     { el: document.getElementById('features'),           top: 0, height: 0 },
        arena:        { el: document.getElementById('arena'),              top: 0, height: 0 },
        testimonials: { el: document.getElementById('testimonials'),       top: 0, height: 0 }
    };

    // Cache nested elements for performance
    const bentoItemsCache = document.querySelectorAll('.features-section .bento-item');
    const lgOptionsCache = document.querySelectorAll('.legends-gallery .option');
    const testimonialCardsCache = document.querySelectorAll('.testimonials-section .comment-card');

    // Lightweight hover tracking to avoid expensive matches(':hover') checks
    function trackHover(elements) {
        elements.forEach(el => {
            el._isH = false;
            el.addEventListener('mouseenter', () => el._isH = true);
            el.addEventListener('mouseleave', () => el._isH = false);
        });
    }
    trackHover(bentoItemsCache);
    trackHover(lgOptionsCache);
    trackHover(testimonialCardsCache);
    
    // Squad cards hover tracking
    const yourSquad = document.querySelector('.your-squad');
    const rivalSquad = document.querySelector('.rival-squad');
    if (yourSquad) trackHover([yourSquad]);
    if (rivalSquad) trackHover([rivalSquad]);

    function cachePositions() {
        winH = window.innerHeight;
        for (let key in sections) {
            const s = sections[key];
            if (s.el) {
                const rect = s.el.getBoundingClientRect();
                s.top = rect.top + window.scrollY;
                s.height = rect.height;
            }
        }
    }

    function syncHeaderState() {
        if (!header || isAuthOpen) return;
        header.classList.toggle('shrunk', window.scrollY > headerShrinkThreshold);
    }
    
    cachePositions();
    syncHeaderState();
    window.addEventListener('resize', cachePositions, { passive: true });
    window.addEventListener('scroll', () => { 
        targetScroll = window.scrollY; 
        syncHeaderState();
    }, { passive: true });

    function ticker() {
        if (!isAuthOpen) {
            currentScroll += (targetScroll - currentScroll) * lerpAmount;

            // PERFORMANCE CULLING: Only animate what's near view
            const viewBuffer = 400;

            // 2. Main Parallax (Goal United)
            const p = sections.parallax;
            if (p.el && currentScroll + winH + viewBuffer > p.top && currentScroll < p.top + p.height + viewBuffer) {
                const totalTravel = winH + p.height;
                const scrolled = (currentScroll + winH) - p.top;
                const progress = Math.max(0, Math.min(1, scrolled / totalTravel));
                const offset = progress - 0.5;

                const textLeftY = offset * -160;
                const textRightY = offset * 160; 
                const playerY = offset * 60; 
                const playerScale = 1 + (progress * 0.15);

                paraTextLeft.style.transform = `translate3d(0, ${textLeftY}vh, 0)`;
                paraTextRight.style.transform = `translate3d(0, ${textRightY}vh, 0)`;
                paraPlayerImg.style.transform = `translate3d(0, ${playerY}vh, 0) scale(${playerScale})`;

                if (paraShotBall) {
                    paraShotBall.style.opacity = '1';
                    if (progress < 0.5) {
                        // REVERSED: Arriving from left to the foot
                        const arriveProgress = progress * 2; // 0 to 1
                        const shotX = -3000 + (arriveProgress * 2920); // -3000 to -80
                        const shotY = playerY - 80 + (arriveProgress * 115); // Landing on foot
                        const shotRot = (1 - arriveProgress) * 1200;
                        paraShotBall.style.transform = `translate3d(${shotX}px, ${shotY}vh, 0) rotate(${shotRot}deg)`;
                    } else {
                        // Perfect Control: Stay on foot
                        const footX = -80; 
                        const footY = playerY + 35; 
                        paraShotBall.style.transform = `translate3d(${footX}px, ${footY}vh, 0) rotate(0deg)`;
                    }
                }
            }

            // 3. Bounce Ball (About Section Cards)
            const b = sections.bounce;
            if (b.el && currentScroll + winH + viewBuffer > b.top && currentScroll < b.top + b.height + viewBuffer) {
                const totalTravel = winH + b.height;
                const scrolled = (currentScroll + winH) - b.top;
                const progress = Math.max(0, Math.min(1, scrolled / totalTravel));
                
                const mainPlayerImg = b.el.querySelector('.main-player-img');

                if (bounceBall && mainPlayerImg) {
                    if (progress < 0.5) {
                        const app = progress * 2; // 0 to 1
                        
                        // Ball coming from left
                        const ballX = -500 * (1 - app);
                        const ballY = -200 * (1 - app);
                        const ballRot = -720 * (1 - app);
                        const ballScale = 0.5 + (0.5 * app);
                        
                        bounceBall.style.transform = `translate3d(${ballX}px, ${ballY}px, 0) rotate(${ballRot}deg) scale(${ballScale})`;
                        bounceBall.style.opacity = app;

                        // Player reaching
                        const playerX = 150 * (1 - app);
                        const playerY = 150 * (1 - app);
                        mainPlayerImg.style.transform = `translate3d(${playerX}px, ${playerY}px, 0)`;
                        mainPlayerImg.style.opacity = app;
                    } else {
                        const app = (progress - 0.5) * 2; // 0 to 1
                        
                        // Ball bounding away
                        const ballX = app * 300;
                        const ballY = app * -400;
                        const ballRot = app * 720;
                        const ballScale = 1 - (0.2 * app);
                        
                        bounceBall.style.transform = `translate3d(${ballX}px, ${ballY}px, 0) rotate(${ballRot}deg) scale(${ballScale})`;
                        bounceBall.style.opacity = 1 - app;

                        // Player recoiling and landing / falling out
                        const playerX = app * 100;
                        const playerY = app * 200;
                        mainPlayerImg.style.transform = `translate3d(${playerX}px, ${playerY}px, 0)`;
                        mainPlayerImg.style.opacity = 1 - app;
                    }
                }

                // Animate the 4 cards to appear and go when scrolling
                const grids = b.el.parentElement;
                if (grids) {
                    const step1 = grids.querySelector('.step-1');
                    const step2 = grids.querySelector('.step-2');
                    const step3 = grids.querySelector('.step-3');
                    const step4 = grids.querySelector('.step-4');

                    let cardOpacity = 0;
                    let xL = 0, yTop = 0, xR = 0, yBot = 0;
                    let cardScale = 1;

                    if (progress >= 0.1 && progress <= 0.9) {
                        if (progress < 0.4) {
                            cardOpacity = (progress - 0.1) / 0.3;         // 0 → 1
                            cardScale   = 0.75 + (0.25 * cardOpacity);
                            xL          = -180 * (1 - cardOpacity);      // from left
                            xR          =  180 * (1 - cardOpacity);      // from right
                            yTop        = -220 * (1 - cardOpacity);      // from top
                            yBot        =  220 * (1 - cardOpacity);      // from bottom
                        } else if (progress > 0.6) {
                            cardOpacity = 1 - ((progress - 0.6) / 0.3);   // 1 → 0
                            cardScale   = 0.75 + (0.25 * cardOpacity);
                            xL          = -180 * (1 - cardOpacity);
                            xR          =  180 * (1 - cardOpacity);
                            yTop        = -220 * (1 - cardOpacity);
                            yBot        =  220 * (1 - cardOpacity);
                        } else {
                            cardOpacity = 1;
                            cardScale   = 1;
                            xL = xR = yTop = yBot = 0;
                        }
                    }

                    // Step 1 → top-left corner
                    if (step1) { step1.style.opacity = cardOpacity; step1.style.transform = `translate3d(${xL}px, ${yTop}px, 0) scale(${cardScale})`; }
                    // Step 2 → bottom-left corner
                    if (step2) { step2.style.opacity = cardOpacity; step2.style.transform = `translate3d(${xL}px, ${yBot}px, 0) scale(${cardScale})`; }
                    // Step 3 → top-right corner
                    if (step3) { step3.style.opacity = cardOpacity; step3.style.transform = `translate3d(${xR}px, ${yTop}px, 0) scale(${cardScale})`; }
                    // Step 4 → bottom-right corner
                    if (step4) { step4.style.opacity = cardOpacity; step4.style.transform = `translate3d(${xR}px, ${yBot}px, 0) scale(${cardScale})`; }

                }
            }
            // 4. Legends header + card animation
            const lg = sections.legends;
            if (lg.el && currentScroll + winH + viewBuffer > lg.top && currentScroll < lg.top + lg.height + viewBuffer) {
                const lgLeft  = document.getElementById('lgTextLeft');
                const lgRight = document.getElementById('lgTextRight');
                const totalTravel = winH + lg.height;
                const scrolled    = (currentScroll + winH) - lg.top;
                const progress    = Math.max(0, Math.min(1, scrolled / totalTravel));

                // ── Header text: MEET THE ← | → SUPREME LEGENDS ──
                if (lgLeft && lgRight) {
                    const entry = easeOutCubic(Math.max(0, Math.min(1, (progress - 0.15) / 0.35))); // slower window
                    const xTravel = 260 * (1 - entry);
                    lgLeft.style.transform  = `translate3d(${-xTravel}px, 0, 0)`;
                    lgLeft.style.opacity    = entry;
                    lgRight.style.transform = `translate3d(${xTravel}px, 0, 0)`;
                    lgRight.style.opacity   = entry;
                }

                // ── Player cards: fan in from below, each from its own angle ──
                const cardDirs = [
                    { x: -280, y: 350 },
                    { x: -120, y: 380 },
                    { x:    0, y: 400 },
                    { x:  120, y: 380 },
                    { x:  280, y: 350 },
                ];
                // Final resting stagger (original design)
                const finalY = [0, 20, -20, 20, 0];
                lgOptionsCache.forEach((opt, i) => {
                    const stagger  = i * 0.025;                           // tighter stagger
                    const rawEntry = Math.max(0, Math.min(1, (progress - 0.18 - stagger) / 0.30));
                    const cEntry   = easeOutCubic(rawEntry); // slower window
                    const cx       = cardDirs[i].x * (1 - cEntry);
                    // blend: starts at cardDirs[i].y below, lands at finalY[i] offset
                    const cy       = cardDirs[i].y * (1 - cEntry) + finalY[i] * cEntry;
                    const cScale   = 0.78 + 0.22 * cEntry;
                    opt.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${cScale})`;
                    opt.style.opacity   = cEntry;
                });
            }

            // 5. Generic Section Titles (About, Features, Arena, Testimonials)
            const titleSections = [
                { key: 'about',        l: 'aboutTextLeft',        r: 'aboutTextRight', sub: 'aboutSubtext' },
                { key: 'features',     l: 'featuresTextLeft',     r: 'featuresTextRight' },
                { key: 'arena',        l: 'arenaTextLeft',        r: 'arenaTextRight', sub: 'arenaSubtext' },
                { key: 'testimonials', l: 'testimonialsTextLeft', r: 'testimonialsTextRight' }
            ];

            titleSections.forEach(ts => {
                const s = sections[ts.key];
                if (!s.el || currentScroll + winH + viewBuffer < s.top || currentScroll > s.top + s.height + viewBuffer) return;

                const left = document.getElementById(ts.l);
                const right = document.getElementById(ts.r);
                const subText = ts.sub ? document.getElementById(ts.sub) : null;

                const totalTravel = winH + s.height;
                const scrolled = (currentScroll + winH) - s.top;
                const progress = Math.max(0, Math.min(1, scrolled / totalTravel));

                // Main Title: Using a similar entry window as Legends (faster)
                let rawEntry = 0;
                if (progress < 0.5) {
                    rawEntry = Math.max(0, Math.min(1, (progress - 0.10) / 0.35));
                } else {
                    rawEntry = Math.max(0, Math.min(1, (0.92 - progress) / 0.30));
                }
                const entry = easeOutCubic(rawEntry);

                const xTravel = 260 * (1 - entry);
                if (left) { left.style.transform  = `translate3d(${-xTravel}px, 0, 0)`; left.style.opacity = entry; }
                if (right) { right.style.transform = `translate3d(${xTravel}px, 0, 0)`; right.style.opacity = entry; }

                // Subtext: Faster entry and less delay
                if (subText) {
                    let rawSub = 0;
                    if (progress < 0.5) {
                        rawSub = Math.max(0, Math.min(1, (progress - 0.12) / 0.30));
                    } else {
                        rawSub = Math.max(0, Math.min(1, (0.90 - progress) / 0.25));
                    }
                    const subEntry = easeOutCubic(rawSub);
                    const yTravel = 20 * (1 - subEntry);
                    subText.style.transform = `translate3d(0, ${yTravel}px, 0)`;
                    subText.style.opacity = subEntry;
                }

                // Special logic for Features Bento items (Fan-in like Legends)
                if (ts.key === 'features') {
                    const bentoDirs = [
                        { x: -250, y: 300 }, // scouting (left)
                        { x:  250, y: 350 }, // real-time (right)
                        { x: -150, y: 400 }, // prediction (bottom-left)
                        { x:    0, y: 450 }, // tactical (bottom-center)
                        { x:  150, y: 400 }  // market (bottom-right)
                    ];
                    bentoItemsCache.forEach((item, i) => {
                        if (bentoDirs[i]) {
                            const stagger = i * 0.035;
                            // Added exit window (0.8 -> 0.95)
                            let rawB = 0;
                            if (progress < 0.5) {
                                rawB = Math.max(0, Math.min(1, (progress - 0.12 - stagger) / 0.35));
                            } else {
                                rawB = Math.max(0, Math.min(1, (0.95 - progress) / 0.30));
                            }
                            const bEntry = easeOutCubic(rawB);
                            
                            const bx = bentoDirs[i].x * (1 - bEntry);
                            const by = bentoDirs[i].y * (1 - bEntry);
                            const bScale = 0.85 + (0.15 * bEntry);
                            item.style.transform = `translate3d(${bx}px, ${by}px, 0) scale(${bScale})`;
                            item.style.opacity = bEntry;
                        }
                    });
                }

                // Special logic for Arena (Squads sliding in)
                if (ts.key === 'arena') {
                    if (yourSquad && rivalSquad) {
                        const vsDiv = s.el.querySelector('.vs-divider');
                        
                        let rawA = 0;
                        if (progress < 0.5) {
                            rawA = Math.max(0, Math.min(1, (progress - 0.15) / 0.40));
                        } else {
                            rawA = Math.max(0, Math.min(1, (0.95 - progress) / 0.35));
                        }
                        const aEntry = easeOutCubic(rawA);
                        const xTravelSq = 400 * (1 - aEntry);

                        // Smoothly blend to hover state in JS
                        yourSquad._hL = yourSquad._hL || 0;
                        yourSquad._hL += ((yourSquad._isH ? 1 : 0) - yourSquad._hL) * 0.12;

                        const yRot = 12 * (1 - yourSquad._hL);
                        const xRot = 2 * (1 - yourSquad._hL);
                        const hScale = 1 + (0.05 * yourSquad._hL);
                        const hY = -10 * yourSquad._hL;

                        yourSquad.style.transform = `translate3d(${-xTravelSq}px, ${hY}px, 0) rotateY(${yRot}deg) rotateX(${xRot}deg) scale(${hScale})`;
                        yourSquad.style.opacity = aEntry;

                        rivalSquad._hL = rivalSquad._hL || 0;
                        rivalSquad._hL += ((rivalSquad._isH ? 1 : 0) - rivalSquad._hL) * 0.12;

                        const ryRot = -12 * (1 - rivalSquad._hL);
                        const rxRot = 2 * (1 - rivalSquad._hL);
                        const rhScale = 1 + (0.05 * rivalSquad._hL);
                        const rhY = -10 * rivalSquad._hL;

                        rivalSquad.style.transform = `translate3d(${xTravelSq}px, ${rhY}px, 0) rotateY(${ryRot}deg) rotateX(${rxRot}deg) scale(${rhScale})`;
                        rivalSquad.style.opacity = aEntry;
                        
                        if (vsDiv) {
                            const vsScale = 0.5 + (0.5 * aEntry);
                            vsDiv.style.transform = `scale(${vsScale})`;
                            vsDiv.style.opacity = aEntry;
                        }
                    }
                }

                // Special logic for Testimonials (Comment cards fan-in)
                if (ts.key === 'testimonials') {
                    const cardDirs = [
                        { x: -300, y: -200 }, // top-left
                        { x:    0, y:  300 }, // bottom
                        { x:  300, y: -200 }  // top-right
                    ];
                    // Masonry-style offsets from original design
                    const finalYOffsets = [-20, 20, -20];
                    
                    testimonialCardsCache.forEach((card, i) => {
                        if (cardDirs[i]) {
                            const stagger = i * 0.05;
                            let rawT = 0;
                            if (progress < 0.5) {
                                rawT = Math.max(0, Math.min(1, (progress - 0.15 - stagger) / 0.35));
                            } else {
                                rawT = Math.max(0, Math.min(1, (0.95 - progress) / 0.30));
                            }
                            const tEntry = easeOutCubic(rawT);
                            
                            // Smooth hover blend
                            card._hL = card._hL || 0;
                            card._hL += ((card._isH ? 1 : 0) - card._hL) * 0.12;

                            const tx = cardDirs[i].x * (1 - tEntry);
                            
                            // Blend between dir.y, masonry offset, and hover lift
                            const masonryY = (finalYOffsets[i] || 0);
                            const hoverY = -15 * card._hL; // slight lift on hover
                            const ty = cardDirs[i].y * (1 - tEntry) + (masonryY + hoverY) * tEntry;
                            
                            // Scale: entry scale (0.8->1) + hover scale (+3%)
                            const tScale = (0.8 + (0.2 * tEntry)) + (0.03 * card._hL);
                            
                            card.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${tScale})`;
                            card.style.opacity = tEntry;
                        }
                    });
                }
            });
        }
        requestAnimationFrame(ticker);
    }
    ticker();


    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            muteIcon.innerText = video.muted ? '🔇' : '🔊';
        });
    }

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.querySelectorAll('.stat-number').forEach(s => {
                        const target = parseInt(s.getAttribute('data-target'));
                        let start = 0;
                        const inc = target / 125;
                        const t = setInterval(() => {
                            start += inc;
                            if (start >= target) { s.textContent = target; clearInterval(t); }
                            else s.textContent = Math.floor(start);
                        }, 16);
                    });
                }
            });
        }, { threshold: 0.5 }).observe(statsSection);
    }


    document.querySelectorAll('.feature-card, .testimonial-card, .reveal-text').forEach(el => {
        el.style.cssText = 'opacity:0;transform:translateY(30px);transition:opacity 0.8s ease,transform 0.8s ease';
        el._animated = false;
        new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !entry.target._animated) {
                    entry.target._animated = true;
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 }).observe(el);
    });


    const aboutP = document.querySelector('.about-intro p');
    if (aboutP) {
        aboutP.style.cssText = 'opacity:0;transform:translateY(20px);transition:opacity 0.6s ease 0.15s,transform 0.6s ease 0.15s';
        new IntersectionObserver((entries, obs) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.style.opacity = '1';
                    e.target.style.transform = 'translateY(0)';
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.2 }).observe(aboutP);
    }


    const navLinks = document.querySelectorAll('.nav-links a, .side-pagination .dot');
    const sideDots = document.querySelectorAll('.side-pagination .dot');
    const sectionsToTrack = ['home', 'about', 'legends-gallery', 'features', 'parallax-showcase', 'arena', 'testimonials'];
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href') || `#${link.getAttribute('data-target')}`;
            if (!targetId || targetId === '#') return;
            
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                const landingNudge = (targetId === '#home') ? 0 : 
                                     (targetId === '#features') ? 180 : 70;
                const elementPosition = targetEl.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({
                    top: elementPosition + landingNudge,
                    behavior: 'smooth'
                });
            }
        });
    });

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                sideDots.forEach(dot => {
                    dot.classList.toggle('active', dot.getAttribute('data-target') === entry.target.id);
                });
            }
        });
    }, { threshold: 0.5 });

    sectionsToTrack.forEach(id => {
        const el = document.getElementById(id);
        if (el) sectionObserver.observe(el);
    });

    function openAuth(defaultTab = 'signin') {
        if (!isAuthOpen) {
            isAuthOpen = true;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.body.classList.add('auth-active');
            document.body.style.overflow = 'hidden';
        }
        window.switchTab(defaultTab);
    }

    if (buildBtn) {
        buildBtn.addEventListener('click', () => {
            openAuth('signin');
        });
    }

    if (startJourneyBtn) {
        startJourneyBtn.addEventListener('click', () => {
            openAuth('signup');
        });
    }

    cancelBtn.addEventListener('click', closeAuth);

    function closeAuth() {
        if (!isAuthOpen) return;
        authCard.classList.add('closing');
        setTimeout(() => {
            document.body.classList.remove('auth-active');
            document.body.style.overflow = '';
            authCard.classList.remove('closing');
            authScreen.style.opacity = '';
            authScreen.style.pointerEvents = '';
            isAuthOpen = false;
            syncHeaderState();
            
        }, 600);
    }

    window.switchTab = function(tab) {
        const isSignIn = tab === 'signin';
        const incoming = isSignIn ? document.getElementById('panelSignIn') : document.getElementById('panelSignUp');
        const outgoing = isSignIn ? document.getElementById('panelSignUp') : document.getElementById('panelSignIn');

        document.getElementById('tabSignIn').classList.toggle('active', isSignIn);
        document.getElementById('tabSignUp').classList.toggle('active', !isSignIn);

        if (incoming.classList.contains('active')) return;
        if (!outgoing.classList.contains('active')) return;
        const direction = isSignIn ? 'wave-from-right' : 'wave-from-left';
        outgoing.classList.add('wave-out', direction);
        setTimeout(() => {
            outgoing.classList.remove('active', 'wave-out', 'wave-from-left', 'wave-from-right');
            incoming.classList.add('active', 'wave-in', direction);
            setTimeout(() => {
                incoming.classList.remove('wave-in', 'wave-from-left', 'wave-from-right');
            }, 500);
        }, 400);
    };

    window.togglePw = function(inputId) {
        const input = document.getElementById(inputId);
        input.type = input.type === 'password' ? 'text' : 'password';
    };

    function setDashboardHomeRedirectFlag(role) {
        if (role === 'admin' || role === 'support') return;
        try {
            localStorage.setItem('footycraft_force_home_once', 'true');
        } catch (error) {
            console.warn('Unable to persist dashboard home redirect flag.', error);
        }
    }

    function clearCachedSession() {
        try {
            localStorage.removeItem('fc_user');
        } catch (error) {
            console.warn('Unable to clear cached session.', error);
        }
        document.cookie = 'fc_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }


    const signinPanel = document.getElementById('panelSignIn');
    if (signinPanel) {
        const signinBtn = signinPanel.querySelector('.auth-submit-btn');
        signinBtn && signinBtn.addEventListener('click', () => {
            const email = signinPanel.querySelector('input[type="email"]').value.trim();
            const password = signinPanel.querySelector('input[type="password"]').value.trim();
            if (!email || !password) return showAuthError(signinPanel, 'Please fill in all fields');

            signinBtn.disabled = true;
            signinBtn.textContent = 'Signing in...';
            const formData = new FormData();
            formData.append('email', email);
            formData.append('password', password);

            fetch(`${phpApiBase}/auth/login`, { method: 'POST', credentials: 'include', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.error && (data.error === 'MAINTENANCE_MODE' || data.error.includes('maintenance'))) {
                    clearCachedSession();
                    showMaintenanceOverlay();
                    signinBtn.disabled = false;
                    signinBtn.textContent = 'Enter the Pitch';
                    return;
                }
                if (data.success) {
                    const userData = data.data.user;
                    userData.session_token = data.data.token;
                    localStorage.setItem('fc_user', JSON.stringify(userData));
                    setDashboardHomeRedirectFlag(userData.role);
                    window.location.href = userData.role === 'admin' ? '/frontend/views/admin-page/index.html' : 
                                         userData.role === 'support' ? '/frontend/views/support-page/index.html' : 
                                         '/frontend/views/dashboard/index.html';
                    return;
                }
                showAuthError(signinPanel, data.error || 'Login failed');
                signinBtn.disabled = false;
                signinBtn.textContent = 'Enter the Pitch';
            })
            .catch(() => {
                showAuthError(signinPanel, 'Connection error. Please try again.');
                signinBtn.disabled = false;
                signinBtn.textContent = 'Enter the Pitch';
            });
        });
    }


    const signupPanel = document.getElementById('panelSignUp');
    if (signupPanel) {
        const signupBtn = signupPanel.querySelector('.auth-submit-btn');
        signupBtn && signupBtn.addEventListener('click', () => {
            const inputs = signupPanel.querySelectorAll('input');
            const firstName = inputs[0].value.trim();
            const email = inputs[2].value.trim();
            const password = inputs[3].value.trim();
            if (!firstName || !email || !password) return showAuthError(signupPanel, 'Please fill in all required fields');
            const username = (firstName).toLowerCase().replace(/\s/g, '') + Math.floor(Math.random() * 999);
            signupBtn.disabled = true;
            signupBtn.textContent = 'Creating account...';
            const formData = new FormData();
            formData.append('username', username);
            formData.append('email', email);
            formData.append('password', password);
            fetch(`${phpApiBase}/auth/register`, { method: 'POST', credentials: 'include', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.error && (data.error === 'MAINTENANCE_MODE' || data.error.includes('maintenance'))) {
                    clearCachedSession();
                    showMaintenanceOverlay();
                    signupBtn.disabled = false;
                    signupBtn.textContent = 'Create My FootyCraft ID';
                    return;
                }
                if (data.success) {
                    const userData = data.data.user;
                    userData.session_token = data.data.token;
                    localStorage.setItem('fc_user', JSON.stringify(userData));
                    setDashboardHomeRedirectFlag(userData.role);
                    window.location.href = userData.role === 'admin' ? '/frontend/views/admin-page/index.html' : 
                                         userData.role === 'support' ? '/frontend/views/support-page/index.html' : 
                                         '/frontend/views/dashboard/index.html';
                    return;
                }
                showAuthError(signupPanel, data.error || 'Registration failed');
                signupBtn.disabled = false;
                signupBtn.textContent = 'Create My FootyCraft ID';
            })
            .catch(() => {
                showAuthError(signupPanel, 'Connection error. Please try again.');
                signupBtn.disabled = false;
                signupBtn.textContent = 'Create My FootyCraft ID';
            });
        });
    }

    function showAuthError(panel, msg) {
        let el = panel.querySelector('.auth-error');
        if (!el) {
            el = document.createElement('p');
            el.className = 'auth-error';
            el.style.cssText = 'color:#ff6b6b;font-size:13px;margin:8px 0 0;text-align:center';
            panel.querySelector('.auth-fields').after(el);
        }
        el.textContent = msg;
        setTimeout(() => { if (el) el.textContent = ''; }, 5000);
    }
});

const words = ['FOOTBALL', 'SCOUTING', 'TACTICS', 'VICTORY'];
let wordIndex = 0;
const dynamicSpan = document.querySelector('.dynamic-txt');
if (dynamicSpan) {
    setInterval(() => {
        dynamicSpan.style.opacity = 0;
        setTimeout(() => {
            wordIndex = (wordIndex + 1) % words.length;
            dynamicSpan.textContent = words[wordIndex];
            dynamicSpan.style.opacity = 1;
        }, 400);
    }, 3000);
}



function showMaintenanceOverlay() {
    const overlay = document.getElementById("maintenanceOverlay");
    if (overlay) overlay.style.display = "flex";
}

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('maintenance')) {
        showMaintenanceOverlay();
        window.history.replaceState({}, document.title, "/frontend/views/home/index.html");
    }
});
