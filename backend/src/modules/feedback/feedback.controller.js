// src/modules/feedback/feedback.controller.js

const service = require("./feedback.service");

exports.handleFeedback = async (req, res) => {
    try {
        const { mobile, type } = req.query;

        if (!mobile || !type) {
            return res.status(400).send("Invalid request");
        }

        if (!["yes", "no"].includes(type)) {
            return res.status(400).send("Invalid response");
        }

        const result = await service.saveFeedback(mobile, type);

        if (!result.status) {
            return res.status(404).send("<h2>User not found</h2>");
        }

        console.log(`✅ Feedback: ${mobile} → ${type}`);

        const getResponseHtml = (variant) => {
            const isYes = variant === "yes";

            const config = {
                yes: {
                    title: "Thank You!",
                    icon: "🙏",
                    subtitle: "Our team will contact you within",
                    accentText: "24 hours",
                    accentEnd: ".",
                    badge: "Support team notified",
                    accentColor: "#00c2ff",
                    accentColorRgb: "0,194,255",
                    orbColor1: "rgba(0,194,255,0.14)",
                    orbColor2: "rgba(232,48,58,0.10)",
                    gridColor: "rgba(0,194,255,0.03)",
                    cardBorder: "rgba(0,194,255,0.12)",
                    cardShimmer: "rgba(0,194,255,0.05)",
                    topLine: "rgba(0,194,255,0.5)",
                    divider: "linear-gradient(90deg, #00c2ff, #e8303a)",
                    titleGradient: "linear-gradient(135deg, #fff 0%, #e2ecf7 40%, #00c2ff 100%)",
                    extraBlock: `
                        <div class="badge">
                            <div class="badge-dot"></div>
                            Support team notified
                        </div>`,
                    extraCSS: `
                        .badge {
                            display: inline-flex; align-items: center; gap: 8px;
                            background: rgba(0,194,255,0.08);
                            border: 1px solid rgba(0,194,255,0.2);
                            border-radius: 100px;
                            padding: 0.45rem 1.1rem;
                            font-size: 0.82rem; letter-spacing: 0.04em;
                            color: rgba(226,236,247,0.65);
                            margin-top: 1.6rem;
                            opacity: 0;
                            animation: fadeIn 0.5s ease 1.8s forwards;
                        }
                        .badge-dot {
                            width: 7px; height: 7px; border-radius: 50%;
                            background: #00c2ff;
                            animation: dotBlink 1.5s ease-in-out infinite;
                            box-shadow: 0 0 7px #00c2ff;
                        }
                        @keyframes dotBlink { 0%,100% { opacity:1; } 50% { opacity:0.25; } }
                        /* Radar sweep */
                        .radar {
                            position: fixed; width: 750px; height: 750px;
                            border-radius: 50%;
                            border: 1px solid rgba(0,194,255,0.05);
                            top: 50%; left: 50%;
                            transform: translate(-50%,-50%);
                            z-index: 0; pointer-events: none;
                        }
                        .radar::before, .radar::after {
                            content:''; position:absolute; border-radius:50%;
                            border: 1px solid rgba(0,194,255,0.04);
                        }
                        .radar::before { inset:110px; }
                        .radar::after { inset:230px; }
                        .radar-sweep {
                            position:absolute; inset:0; border-radius:50%; overflow:hidden;
                        }
                        .radar-sweep::after {
                            content:''; position:absolute; top:50%; left:50%;
                            width:50%; height:50%;
                            transform-origin: 0% 100%;
                            background: conic-gradient(from 0deg, rgba(0,194,255,0.13), transparent 60deg);
                            animation: radarSpin 4s linear 1.2s infinite;
                        }
                        @keyframes radarSpin { to { transform: rotate(360deg); } }
                        /* Timer arc */
                        .timer-ring { position:absolute; inset:-4px; }
                        .timer-ring svg { width:100%; height:100%; transform:rotate(-90deg); }
                        .timer-ring circle {
                            fill:none; stroke:rgba(0,194,255,0.35); stroke-width:1.5;
                            stroke-linecap:round;
                            stroke-dasharray:330; stroke-dashoffset:330;
                            animation: timerFill 2s ease 1.5s forwards;
                        }
                        @keyframes timerFill { to { stroke-dashoffset:0; } }
                    `,
                    extraHTML: `<div class="radar"><div class="radar-sweep"></div></div>`,
                    iconInner: `
                        <div class="icon-bg"></div>
                        <div class="pulse-ring"></div>
                        <div class="pulse-ring p2"></div>
                        <div class="timer-ring">
                            <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/></svg>
                        </div>
                        <div class="emoji">🙏</div>`,
                    iconCSS: `
                        .icon-bg {
                            position:absolute; inset:0; border-radius:50%;
                            background: radial-gradient(circle at 40% 40%, rgba(0,194,255,0.12), transparent 70%);
                            border: 1px solid rgba(0,194,255,0.15);
                        }
                        .pulse-ring {
                            position:absolute; inset:-8px; border-radius:50%;
                            border:1.5px solid rgba(0,194,255,0.22);
                            animation: pulseRing 2.5s ease-in-out 1.7s infinite;
                        }
                        .pulse-ring.p2 {
                            inset:-20px;
                            border:1px solid rgba(0,194,255,0.1);
                            animation-delay: 2s;
                        }
                        @keyframes pulseRing { 0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.1);opacity:0.3;} }
                        .emoji {
                            position:absolute; inset:0;
                            display:flex; align-items:center; justify-content:center;
                            font-size:3.2rem;
                            animation: emojiFloat 3.5s ease-in-out 1.5s infinite;
                            filter: drop-shadow(0 4px 20px rgba(0,194,255,0.35));
                        }
                        @keyframes emojiFloat { 0%,100%{transform:translateY(0) scale(1);} 50%{transform:translateY(-8px) scale(1.06);} }
                    `,
                    particleColors: `['#00c2ff','#e8303a','#e2ecf7']`,
                    confettiColors: `['#00c2ff','#e8303a','#f5a623','#e2ecf7','#5e7a94']`,
                    confettiFunc: `launchRipples`,
                    extraJS: `
                        function launchRipples() {
                            const cx = window.innerWidth/2, cy = window.innerHeight/2;
                            for (let i=0;i<4;i++) {
                                setTimeout(()=>{
                                    const el = document.createElement('div');
                                    el.style.cssText = \`
                                        position:fixed; left:\${cx}px; top:\${cy}px;
                                        width:0; height:0;
                                        border:1px solid rgba(0,194,255,0.4);
                                        border-radius:50%;
                                        transform:translate(-50%,-50%);
                                        pointer-events:none; z-index:5;
                                    \`;
                                    document.body.appendChild(el);
                                    el.animate([
                                        {width:'0px',height:'0px',opacity:0.8},
                                        {width:'600px',height:'600px',opacity:0}
                                    ],{duration:1800,easing:'ease-out',fill:'forwards'})
                                    .onfinish = ()=>el.remove();
                                }, i*300+800);
                            }
                        }
                        launchRipples();
                    `
                },
                no: {
                    title: "Awesome!",
                    icon: "⚡",
                    subtitle: "We're glad you had a",
                    accentText: "great experience",
                    accentEnd: " today.",
                    accentColor: "#00d97e",
                    accentColorRgb: "0,217,126",
                    orbColor1: "rgba(232,48,58,0.18)",
                    orbColor2: "rgba(0,217,126,0.12)",
                    gridColor: "rgba(232,48,58,0.04)",
                    cardBorder: "rgba(232,48,58,0.15)",
                    cardShimmer: "rgba(232,48,58,0.06)",
                    topLine: "rgba(232,48,58,0.6)",
                    divider: "linear-gradient(90deg, #e8303a, #f5a623)",
                    titleGradient: "linear-gradient(135deg, #fff 0%, #e2ecf7 40%, #e8303a 100%)",
                    extraBlock: ``,
                    extraCSS: ``,
                    extraHTML: ``,
                    iconInner: `
                        <div class="icon-bg"></div>
                        <div class="ring r1"></div>
                        <div class="ring r2"></div>
                        <div class="emoji">⚡</div>`,
                    iconCSS: `
                        .icon-bg {
                            position:absolute; inset:0; border-radius:50%;
                            background: radial-gradient(circle at 40% 40%, rgba(232,48,58,0.15), transparent 70%);
                            border: 1px solid rgba(232,48,58,0.2);
                        }
                        .ring {
                            position:absolute; border-radius:50%;
                            border:2px solid rgba(232,48,58,0.25);
                        }
                        .r1 { inset:0; animation: ringPulse 2s ease-in-out 1.7s infinite; }
                        .r2 { inset:-14px; border-color:rgba(232,48,58,0.13); animation: ringPulse 2s ease-in-out 2s infinite; }
                        @keyframes ringPulse { 0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.15);opacity:0.35;} }
                        .emoji {
                            position:absolute; inset:0;
                            display:flex; align-items:center; justify-content:center;
                            font-size:3rem;
                            animation: boltFloat 3s ease-in-out 1.5s infinite, boltGlow 3s ease-in-out 1.5s infinite;
                        }
                        @keyframes boltFloat { 0%,100%{transform:translateY(0) rotate(-5deg);} 50%{transform:translateY(-7px) rotate(5deg);} }
                        @keyframes boltGlow {
                            0%,100%{ filter: drop-shadow(0 0 8px rgba(245,166,35,0.5)); }
                            50%{ filter: drop-shadow(0 0 22px rgba(245,166,35,0.95)) drop-shadow(0 0 40px rgba(232,48,58,0.45)); }
                        }
                    `,
                    particleColors: `['#e8303a','#00d97e','#f5a623']`,
                    confettiColors: `['#e8303a','#f5a623','#00d97e','#e2ecf7','#5e7a94']`,
                    confettiFunc: `launchConfetti`,
                    extraJS: `
                        function launchConfetti() {
                            const colors = ['#e8303a','#f5a623','#00d97e','#e2ecf7','#5e7a94'];
                            const cx = window.innerWidth/2, cy = window.innerHeight/2;
                            for (let i=0;i<70;i++) {
                                setTimeout(()=>{
                                    const el = document.createElement('div');
                                    const size = Math.random()*8+4;
                                    el.style.cssText = \`
                                        position:fixed; left:\${cx}px; top:\${cy}px;
                                        width:\${size}px; height:\${size}px;
                                        background:\${colors[Math.floor(Math.random()*colors.length)]};
                                        border-radius:\${Math.random()>0.5?'50%':'3px'};
                                        pointer-events:none; z-index:20;
                                    \`;
                                    document.body.appendChild(el);
                                    const angle = Math.random()*Math.PI*2;
                                    const speed = Math.random()*320+80;
                                    const tx = Math.cos(angle)*speed;
                                    const ty = Math.sin(angle)*speed - 160;
                                    el.animate([
                                        {transform:\`translate(0,0) rotate(0deg) scale(1)\`,opacity:1},
                                        {transform:\`translate(\${tx}px,\${ty}px) rotate(\${Math.random()*720}deg) scale(0)\`,opacity:0}
                                    ],{duration:Math.random()*900+500,easing:'cubic-bezier(0,0,0.2,1)',fill:'forwards'})
                                    .onfinish = ()=>el.remove();
                                }, i*18+900);
                            }
                        }
                        launchConfetti();
                    `
                }
            };

            const c = config[variant];

            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChargeZone</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #080f1a;
            --surface: #0c1525;
            --card: #101e30;
            --accent: #e8303a;
            --text: #e2ecf7;
            --muted: #5e7a94;
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:100%; height:100%; background:var(--bg); font-family:'DM Sans',sans-serif; color:var(--text); overflow:hidden; }

        /* Canvas */
        #particles { position:fixed; inset:0; z-index:0; pointer-events:none; }

        /* Orbs */
        .orb { position:fixed; border-radius:50%; filter:blur(85px); opacity:0; animation:orbFade 1.2s ease forwards; pointer-events:none; z-index:0; }
        .orb-1 { width:520px; height:520px; background:radial-gradient(circle,${c.orbColor1},transparent 70%); top:-160px; right:-110px; animation-delay:0.3s; }
        .orb-2 { width:420px; height:420px; background:radial-gradient(circle,${c.orbColor2},transparent 70%); bottom:-100px; left:-90px; animation-delay:0.6s; }
        @keyframes orbFade { to { opacity:1; } }

        /* Grid */
        .grid-overlay {
            position:fixed; inset:0; z-index:0; pointer-events:none;
            background-image: linear-gradient(${c.gridColor} 1px,transparent 1px), linear-gradient(90deg,${c.gridColor} 1px,transparent 1px);
            background-size:60px 60px;
            animation:gridDrift 22s linear infinite;
        }
        @keyframes gridDrift { to { background-position:60px 60px; } }

        /* Scanline */
        .scanline {
            position:fixed; inset:0; z-index:1; pointer-events:none;
            background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
            animation: scanMove 8s linear infinite;
        }
        @keyframes scanMove { 0%{background-position:0 0;} 100%{background-position:0 100px;} }

        ${c.extraCSS}

        /* Scene */
        .scene { position:relative; z-index:10; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem; }

        /* Logo */
        .logo-wrap { opacity:0; transform:translateY(-20px); animation:slideDown 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s forwards; margin-bottom:2.5rem; }
        .logo-wrap img { height:40px; width:auto; filter:drop-shadow(0 0 12px rgba(232,48,58,0.45)); }
        .logo-fallback { display:none; align-items:center; gap:8px; }
        .logo-fallback span { font-family:'Syne',sans-serif; font-size:1.25rem; font-weight:800; color:#e2ecf7; letter-spacing:0.06em; }
        .logo-fallback span b { color:#e8303a; }
        @keyframes slideDown { to { opacity:1; transform:translateY(0); } }

        /* Card */
        .card {
            background: linear-gradient(135deg,rgba(16,30,48,0.97),rgba(12,21,37,0.92));
            border: 1px solid ${c.cardBorder};
            border-radius:28px; padding:3.5rem 2.5rem 3rem;
            text-align:center; max-width:400px; width:100%;
            position:relative; overflow:hidden;
            box-shadow: 0 40px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03) inset, 0 1px 0 rgba(255,255,255,0.07) inset;
            opacity:0; transform:translateY(44px) scale(0.95);
            animation:cardRise 0.9s cubic-bezier(0.16,1,0.3,1) 0.45s forwards;
        }
        @keyframes cardRise { to { opacity:1; transform:translateY(0) scale(1); } }

        /* Shimmer sweep */
        .card::before {
            content:''; position:absolute; inset:0;
            background: linear-gradient(105deg,transparent 40%,${c.cardShimmer} 50%,transparent 60%);
            animation: shimmer 4.5s ease-in-out 1.8s infinite;
        }
        @keyframes shimmer { 0%{transform:translateX(-100%);} 100%{transform:translateX(200%);} }

        /* Top accent line */
        .card::after {
            content:''; position:absolute; top:0; left:10%; right:10%; height:1px;
            background: linear-gradient(90deg,transparent,${c.topLine},transparent);
            animation: lineGlow 2.5s ease-in-out 1.3s infinite alternate;
        }
        @keyframes lineGlow { from{opacity:0.35;} to{opacity:1; box-shadow:0 0 12px ${c.accentColor};} }

        /* Corner glow */
        .corner-glow {
            position:absolute; width:200px; height:200px; border-radius:50%;
            background: radial-gradient(circle, ${c.cardShimmer.replace('0.0', '0.1')}, transparent 70%);
            pointer-events:none;
        }
        .corner-glow.tl { top:-80px; left:-80px; }
        .corner-glow.br { bottom:-80px; right:-80px; }

        /* Icon ring */
        .icon-wrap {
            position:relative; width:108px; height:108px; margin:0 auto 2rem;
            opacity:0; transform:scale(0.4) translateY(20px);
            animation:iconPop 0.85s cubic-bezier(0.34,1.56,0.64,1) 0.95s forwards;
        }
        @keyframes iconPop { to { opacity:1; transform:scale(1) translateY(0); } }

        ${c.iconCSS}

        /* Text */
        .title {
            font-family:'Syne',sans-serif; font-size:2.7rem; font-weight:800; line-height:1; margin-bottom:1rem;
            opacity:0; transform:translateY(15px); animation:textUp 0.6s ease 1.25s forwards;
            background:${c.titleGradient};
            -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        @keyframes textUp { to { opacity:1; transform:translateY(0); } }

        .divider {
            width:42px; height:2px; background:${c.divider};
            border-radius:2px; margin:1.2rem auto;
            opacity:0; animation:fadeIn 0.5s ease 1.6s forwards;
            box-shadow: 0 0 10px ${c.accentColor}55;
        }
        @keyframes fadeIn { to { opacity:1; } }

        .subtitle {
            font-size:1.05rem; line-height:1.75; color:var(--muted); font-weight:300;
            opacity:0; transform:translateY(10px); animation:textUp 0.6s ease 1.45s forwards;
        }
        .accent-word { color:${c.accentColor}; font-weight:600; }

        ${c.extraBlock.length > 0 ? '' : ''}

        /* Footer */
        .powered {
            margin-top:2rem; font-size:0.7rem; letter-spacing:0.12em; text-transform:uppercase;
            color:rgba(94,122,148,0.42);
            opacity:0; animation:fadeIn 0.5s ease 2.2s forwards;
        }
        .powered span { color:rgba(232,48,58,0.55); }
    </style>
</head>
<body>

<canvas id="particles"></canvas>
<div class="grid-overlay"></div>
<div class="scanline"></div>
<div class="orb orb-1"></div>
<div class="orb orb-2"></div>
${c.extraHTML}

<div class="scene">

    <div class="logo-wrap">
        <img src="/assets/Logo.png" alt="ChargeZone"
             onerror="this.style.display='none'; this.parentElement.querySelector('.logo-fallback').style.display='flex'">
        <div class="logo-fallback">
            <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                <path d="M18 3 L31 18 L22 18 L18 33 L5 18 L14 18 Z" fill="#e8303a"/>
                <path d="M18 9 L27 18 L21 18 L18 27 L9 18 L15 18 Z" fill="rgba(232,48,58,0.3)"/>
            </svg>
            <span>CHARGE<b>ZONE</b></span>
        </div>
    </div>

    <div class="card">
        <div class="corner-glow tl"></div>
        <div class="corner-glow br"></div>

        <div class="icon-wrap">
            ${c.iconInner}
        </div>

        <h1 class="title">${c.title}</h1>
        <div class="divider"></div>
        <p class="subtitle">${c.subtitle} <span class="accent-word">${c.accentText}</span>${c.accentEnd}</p>

        ${c.extraBlock}
    </div>

    <p class="powered">Powered by <span>ChargeZone</span> &middot; Powering the Future</p>
</div>

<script>
    // ── Particle System ──
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    let W, H;
    const particles = [];

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);

    const pColors = ${c.particleColors};

    class Particle {
        constructor() { this.reset(); this.life = Math.random() * this.maxLife; }
        reset() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.r = Math.random() * 1.4 + 0.3;
            this.vx = (Math.random() - 0.5) * 0.28;
            this.vy = -(Math.random() * 0.38 + 0.08);
            this.life = 0;
            this.maxLife = Math.random() * 220 + 100;
            this.color = pColors[Math.floor(Math.random() * pColors.length)];
        }
        update() {
            this.x += this.vx; this.y += this.vy; this.life++;
            if (this.life >= this.maxLife) this.reset();
        }
        draw() {
            const p = this.life / this.maxLife;
            const a = p < 0.2 ? (p / 0.2) : (1 - (p - 0.2) / 0.8);
            ctx.globalAlpha = a * 0.48;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < 65; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => { p.update(); p.draw(); });
        ctx.globalAlpha = 1;
        requestAnimationFrame(animate);
    }
    animate();

    // ── Burst effect ──
    ${c.extraJS}
<\/script>
</body>
</html>`;
        };

        if (type === "yes") {
            return res.send(getResponseHtml("yes"));
        }

        return res.send(getResponseHtml("no"));

    } catch (err) {
        console.error("❌ Feedback Error:", err.message);
        res.status(500).send("Server error");
    }
};