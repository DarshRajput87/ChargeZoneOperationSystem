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

        const getResponseHtml = ({ title, subtitle, accentWord, variant }) => {
            const isPositive = variant === "positive"; // "yes" → Thank You
            // ── ChargeZone brand palette ──────────────────────────────────────
            const ring = isPositive ? "#00c9a7" : "#ffaa00"; // teal : amber
            const ring2 = isPositive ? "#0af5c8" : "#ff7700";

            // Particle configs (28 pieces)
            const particleCount = 28;
            const particles = Array.from({ length: particleCount }, (_, i) => {
                const angle = (i / particleCount) * 360;
                const delay = +(i * 0.07).toFixed(2);
                const size = 2 + (i % 3) * 1.5;
                const dist = 85 + (i % 5) * 22;
                const dur = 1.6 + (i % 4) * 0.3;
                const colorSet = isPositive
                    ? ["#00c9a7", "#0af5c8", "#00d4ff", "#92ffe0"]
                    : ["#ffaa00", "#ff7700", "#e8303a", "#ffdd55"];
                const color = colorSet[i % colorSet.length];
                return { angle, delay, size, dist, dur, color };
            });

            const particleCSS = particles.map((p, i) => `
.p${i}{width:${p.size}px;height:${p.size}px;background:${p.color};
  box-shadow:0 0 6px 2px ${p.color}88;
  top:50%;left:50%;transform:translate(-50%,-50%);
  animation:pb${i} ${p.dur}s ease-out ${p.delay}s forwards,pf ${p.dur}s ease-out ${p.delay}s forwards;}
@keyframes pb${i}{
  0%{transform:translate(-50%,-50%) rotate(${p.angle}deg) translateX(0);}
  100%{transform:translate(-50%,-50%) rotate(${p.angle}deg) translateX(${p.dist}px);}}`
            ).join("\n");
            const particleHTML = particles.map((_, i) => `<div class="particle p${i}"></div>`).join("");

            // ── Main icon SVGs ────────────────────────────────────────────────
            const thankYouIcon = `
<svg class="main-icon-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="starG" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${ring2}"/>
      <stop offset="100%" stop-color="${ring}"/>
    </radialGradient>
    <filter id="sGlow"><feGaussianBlur stdDeviation="3.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <!-- 5-pointed star -->
  <polygon points="50,8 61,36 90,36 68,55 76,82 50,65 24,82 32,55 10,36 39,36"
           fill="url(#starG)" filter="url(#sGlow)"/>
  <circle cx="50" cy="44" r="9" fill="white" opacity="0.22"/>
</svg>`;

            const awesomeIcon = `
<svg class="main-icon-svg" viewBox="0 0 80 110" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="boltG" x1="0%" y1="0%" x2="60%" y2="100%">
      <stop offset="0%" stop-color="#ffe040"/>
      <stop offset="55%" stop-color="#ffaa00"/>
      <stop offset="100%" stop-color="#ff7700"/>
    </linearGradient>
    <filter id="bGlow"><feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <polygon points="48,4 22,58 44,58 32,106 58,52 36,52"
           fill="url(#boltG)" filter="url(#bGlow)"/>
  <polygon points="48,4 22,58 44,58 32,106 58,52 36,52"
           fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
</svg>`;

            return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ChargeZone – ${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#080f1a; --surface:#0c1525; --card:#101e30;
  --accent:#e8303a; --text:#e2ecf7; --muted:#5e7a94;
  --ring:${ring}; --ring2:${ring2};
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:var(--bg);
  font-family:'DM Sans',sans-serif;color:var(--text);}

/* ── Grid mesh background ── */
body::before{
  content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px);
  background-size:52px 52px;
  animation:gridMove 18s linear infinite;
}
@keyframes gridMove{from{background-position:0 0}to{background-position:52px 52px}}

/* ── Ambient blobs ── */
.blob{position:fixed;border-radius:50%;filter:blur(90px);opacity:0.15;pointer-events:none;z-index:0;}
.b1{width:480px;height:480px;background:var(--ring);top:-130px;right:-130px;
    animation:bf1 9s ease-in-out infinite alternate;}
.b2{width:380px;height:380px;background:var(--accent);bottom:-100px;left:-100px;
    animation:bf2 11s ease-in-out infinite alternate;}
.b3{width:260px;height:260px;background:var(--ring2);top:40%;left:40%;
    animation:bf1 7s ease-in-out infinite alternate; opacity:0.08;}
@keyframes bf1{from{transform:scale(1) translate(0,0)}to{transform:scale(1.12) translate(25px,18px)}}
@keyframes bf2{from{transform:scale(1) translate(0,0)}to{transform:scale(1.1) translate(-18px,28px)}}

/* ── Scene ── */
.scene{
  position:relative;z-index:1;
  width:100%;height:100vh;
  display:flex;flex-direction:column;
  justify-content:center;align-items:center;
}

/* ── Logo ── */
.logo-wrap{
  display:flex;align-items:center;gap:12px;
  opacity:0;transform:translateY(-18px);
  animation:slideIn 0.65s cubic-bezier(0.16,1,0.3,1) 0.05s forwards;
  margin-bottom:2.4rem;
}
.logo-img{height:40px;width:auto;filter:drop-shadow(0 0 12px var(--accent)66);}
@keyframes slideIn{to{opacity:1;transform:translateY(0)}}

/* Fallback text logo */
.logo-text{font-family:'Syne',sans-serif;font-weight:800;font-size:1.15rem;
  letter-spacing:0.12em;color:var(--text);}
.logo-text em{color:var(--accent);font-style:normal;}
.logo-sub{font-size:0.5rem;letter-spacing:0.22em;color:var(--muted);
  text-transform:uppercase;margin-top:1px;}

/* ── Card ── */
.card{
  position:relative;
  background:linear-gradient(148deg, var(--card) 0%, var(--surface) 100%);
  border:1px solid rgba(255,255,255,0.065);
  border-radius:30px;
  padding:3rem 2.6rem 2.4rem;
  width:min(90vw,400px);
  text-align:center;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.035),
    0 40px 90px -15px rgba(0,0,0,0.75),
    inset 0 1px 0 rgba(255,255,255,0.05);
  opacity:0;transform:translateY(44px) scale(0.93);
  animation:cardIn 0.9s cubic-bezier(0.16,1,0.3,1) 0.25s forwards;
  overflow:hidden;
}
@keyframes cardIn{to{opacity:1;transform:translateY(0) scale(1)}}

/* Shimmer */
.card::after{
  content:'';position:absolute;inset:0;border-radius:inherit;
  background:linear-gradient(108deg,transparent 38%,rgba(255,255,255,0.04) 50%,transparent 62%);
  background-size:250% 250%;
  animation:shimmer 3.5s ease-in-out 1.4s infinite;
  pointer-events:none;
}
@keyframes shimmer{0%{background-position:220% 0}100%{background-position:-220% 0}}

/* Top glow bar */
.card-bar{
  position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:55%;height:2.5px;
  background:linear-gradient(90deg,transparent,var(--ring),var(--ring2),transparent);
  border-radius:0 0 3px 3px;
  animation:barPulse 2.5s ease-in-out infinite alternate;
}
@keyframes barPulse{from{opacity:0.5}to{opacity:1;filter:blur(1.5px)}}

/* Corner glow accents */
.card-corner{
  position:absolute;width:80px;height:80px;
  background:radial-gradient(circle at corner, var(--ring)18, transparent 70%);
  pointer-events:none;
}
.card-corner.tl{top:0;left:0;background:radial-gradient(circle at top left,var(--ring)22,transparent 70%);}
.card-corner.br{bottom:0;right:0;background:radial-gradient(circle at bottom right,var(--ring2)15,transparent 70%);}

/* ── Card inner layout (portrait: column, landscape: row) ── */
.card-inner{
  display:flex;flex-direction:column;align-items:center;
  text-align:center;
}
.card-text{width:100%;}

/* ── Icon ring ── */
.icon-ring{
  position:relative;width:114px;height:114px;
  margin:0 auto 1.9rem;
}
.ring-svg{position:absolute;inset:0;width:100%;height:100%;}
.r-spin{stroke:var(--ring);stroke-width:1.2;fill:none;opacity:0.28;
  stroke-dasharray:7 17;
  animation:rSpin 7s linear infinite;transform-origin:center;}
.r-outer{stroke:var(--ring);stroke-width:1.5;fill:none;
  stroke-dasharray:224;stroke-dashoffset:224;
  animation:drawR 1s cubic-bezier(0.16,1,0.3,1) 0.6s forwards;}
.r-inner{stroke:var(--ring2);stroke-width:0.8;fill:none;opacity:0.5;
  stroke-dasharray:175;stroke-dashoffset:175;
  animation:drawR 1s cubic-bezier(0.16,1,0.3,1) 0.85s forwards;}
@keyframes drawR{to{stroke-dashoffset:0}}
@keyframes rSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

/* Pulse rings */
.pulse-ring{
  position:absolute;inset:-10px;border-radius:50%;
  border:1.5px solid var(--ring);opacity:0;
  animation:pulseR 2.4s ease-out 1.5s infinite;
}
.pulse-ring:nth-child(2){animation-delay:2.1s;}
@keyframes pulseR{
  0%{transform:scale(0.88);opacity:0.6}
  100%{transform:scale(1.35);opacity:0}
}

/* Main icon */
.main-icon-svg{
  position:absolute;top:50%;left:50%;
  width:52px;height:52px;
  opacity:0;transform:translate(-50%,-50%) scale(0.3) rotate(-15deg);
  animation:iconPop 0.75s cubic-bezier(0.34,1.56,0.64,1) 1s forwards, iconBob 3.2s ease-in-out 2s infinite;
}
@keyframes iconPop{to{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(0deg)}}
@keyframes iconBob{
  0%,100%{margin-top:0px}
  50%{margin-top:-8px}
}

/* Particles */
.particle{position:absolute;border-radius:50%;opacity:0;}
@keyframes pf{0%{opacity:1}65%{opacity:0.5}100%{opacity:0}}
${particleCSS}

/* ── Text ── */
h1{
  font-family:'Syne',sans-serif;
  font-size:clamp(1.9rem,7vw,2.5rem);
  font-weight:800;letter-spacing:-0.025em;line-height:1;
  margin-bottom:0.85rem;
  background:linear-gradient(135deg,var(--text) 0%,var(--ring) 55%,var(--ring2) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  opacity:0;transform:translateY(14px);
  animation:txtIn 0.6s ease-out 1.15s forwards;
}
p{
  font-size:1.02rem;font-weight:300;color:var(--muted);line-height:1.7;
  opacity:0;transform:translateY(14px);
  animation:txtIn 0.6s ease-out 1.3s forwards;
}
.aw{font-weight:500;color:var(--ring);-webkit-text-fill-color:var(--ring);}
@keyframes txtIn{to{opacity:1;transform:translateY(0)}}

/* Divider */
hr{
  border:none;width:44px;height:2px;margin:1.2rem auto;
  background:linear-gradient(90deg,transparent,var(--ring),transparent);
  border-radius:2px;
  opacity:0;animation:txtIn 0.6s ease-out 1.42s forwards;
}

/* Brand tagline */
.tagline{
  margin-top:2rem;
  font-family:'Syne',sans-serif;font-size:0.6rem;
  font-weight:700;letter-spacing:0.28em;text-transform:uppercase;
  color:var(--muted);
  opacity:0;animation:txtIn 0.6s ease-out 1.55s forwards;
}
.tagline span{color:var(--accent);}

/* ── Scanline overlay (subtle CRT feel) ── */
body::after{
  content:'';position:fixed;inset:0;z-index:999;pointer-events:none;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);
}

/* ════════════════════════════════════════
   RESPONSIVE BREAKPOINTS
   ════════════════════════════════════════ */

/* ── Tall / large desktop (>= 1024px) ── */
@media (min-width:1024px){
  .card{
    padding:3.5rem 3.2rem 3rem;
    width:min(55vw,460px);
    border-radius:36px;
  }
  .logo-img{height:46px;}
  .logo-wrap{margin-bottom:2.8rem;}
  .icon-ring{width:130px;height:130px;margin-bottom:2.2rem;}
  h1{font-size:2.8rem;}
  p{font-size:1.1rem;}
  .tagline{font-size:0.65rem;margin-top:2.4rem;}
}

/* ── Tablet landscape (768px – 1023px) ── */
@media (min-width:768px) and (max-width:1023px){
  .card{
    padding:3rem 2.8rem 2.6rem;
    width:min(70vw,420px);
    border-radius:32px;
  }
  .logo-img{height:42px;}
  .icon-ring{width:120px;height:120px;}
  h1{font-size:2.4rem;}
  p{font-size:1.05rem;}
}

/* ── Tablet portrait / large phone (480px – 767px) ── */
@media (min-width:480px) and (max-width:767px){
  .card{
    padding:2.6rem 2.2rem 2.2rem;
    width:min(82vw,400px);
    border-radius:28px;
  }
  .logo-img{height:38px;}
  .logo-wrap{margin-bottom:2rem;}
  .icon-ring{width:108px;height:108px;margin-bottom:1.6rem;}
  h1{font-size:2.1rem;}
  p{font-size:1rem;}
}

/* ── Small phone (360px – 479px) ── */
@media (max-width:479px){
  html,body{overflow-y:auto;}          /* allow scroll on tiny screens */
  .scene{
    height:auto;min-height:100vh;
    padding:2rem 0 2.5rem;
  }
  .card{
    padding:2.2rem 1.6rem 2rem;
    width:min(92vw,360px);
    border-radius:24px;
  }
  .logo-img{height:32px;}
  .logo-wrap{margin-bottom:1.6rem;}
  .logo-text{font-size:1rem;}
  .icon-ring{
    width:96px;height:96px;
    margin-bottom:1.4rem;
  }
  .main-icon-svg{width:44px;height:44px;}
  h1{font-size:1.8rem;margin-bottom:0.7rem;}
  p{font-size:0.95rem;line-height:1.6;}
  hr{margin:1rem auto;}
  .tagline{font-size:0.56rem;margin-top:1.5rem;letter-spacing:0.2em;}
  /* Shrink blobs so they don't dominate small screens */
  .b1{width:260px;height:260px;top:-80px;right:-80px;}
  .b2{width:220px;height:220px;bottom:-70px;left:-70px;}
  .b3{width:160px;height:160px;}
}

/* ── Very small / legacy phones (< 360px) ── */
@media (max-width:359px){
  .card{
    padding:1.8rem 1.2rem 1.6rem;
    width:94vw;
    border-radius:20px;
  }
  .icon-ring{width:84px;height:84px;margin-bottom:1.2rem;}
  .main-icon-svg{width:38px;height:38px;}
  h1{font-size:1.55rem;}
  p{font-size:0.88rem;}
  .logo-img{height:28px;}
  .logo-text{font-size:0.9rem;}
}

/* ── Landscape mode on mobile (short viewport) ── */
@media (max-height:500px) and (orientation:landscape){
  html,body{overflow-y:auto;}
  .scene{height:auto;min-height:100vh;padding:1.2rem 0 1.5rem;flex-direction:row;flex-wrap:wrap;gap:0;justify-content:center;}
  .logo-wrap{width:100%;margin-bottom:1rem;}
  .card{
    padding:1.6rem 2rem 1.5rem;
    width:min(85vw,500px);
    border-radius:20px;
  }
  /* Side-by-side icon + text layout on landscape */
  .card-inner{display:flex;align-items:center;gap:1.8rem;text-align:left;}
  .icon-ring{width:88px;height:88px;flex-shrink:0;margin:0;}
  h1{font-size:1.7rem;margin-bottom:0.5rem;}
  p{font-size:0.9rem;}
  hr{margin:0.8rem 0;}
  .tagline{margin-top:1rem;}
  /* Reduce blob sizes */
  .b1,.b2,.b3{display:none;}
}
</style>
</head>
<body>

<div class="blob b1"></div>
<div class="blob b2"></div>
<div class="blob b3"></div>

<div class="scene">

  <!-- Logo -->
  <div class="logo-wrap">
    <img src="frontend/src/assets/Logo.png" alt="ChargeZone" class="logo-img"
         onerror="this.style.display='none'; document.getElementById('fl').style.display='block';">
    <div id="fl" style="display:none;">
      <div class="logo-text">CHARGE<em>ZONE</em>&reg;</div>
      <div class="logo-sub">Powering the Future</div>
    </div>
  </div>

  <!-- Card -->
  <div class="card">
    <div class="card-bar"></div>
    <div class="card-corner tl"></div>
    <div class="card-corner br"></div>

    <div class="card-inner">
      <!-- Icon -->
      <div class="icon-ring">
        ${particleHTML}
        <div class="pulse-ring"></div>
        <div class="pulse-ring"></div>
        <svg class="ring-svg" viewBox="0 0 114 114">
          <circle class="r-spin"  cx="57" cy="57" r="52"/>
          <circle class="r-outer" cx="57" cy="57" r="52"/>
          <circle class="r-inner" cx="57" cy="57" r="41"/>
        </svg>
        ${isPositive ? thankYouIcon : awesomeIcon}
      </div>
      <div class="card-text">
        <h1>${title}</h1>
        <hr>
        <p>${subtitle.replace(accentWord, `<span class="aw">${accentWord}</span>`)}</p>
        <div class="tagline"><span>ChargeZone</span> &mdash; Powering the Future</div>
      </div>
    </div>
  </div>

</div>
</body>
</html>`;
        };

        if (type === "yes") {
            return res.send(getResponseHtml({
                title: "Thank You!",
                subtitle: "Our team will contact you within 24 hours.",
                accentWord: "24 hours",
                variant: "positive",
            }));
        }

        return res.send(getResponseHtml({
            title: "Awesome!",
            subtitle: "We're glad you had a great experience today.",
            accentWord: "great experience",
            variant: "awesome",
        }));

    } catch (err) {
        console.error("❌ Feedback Error:", err.message);
        res.status(500).send("Server error");
    }
};