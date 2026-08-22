/* =============================================================================
   ACME MERIDIAN — interactions. No dependencies, no build step.
   Everything degrades to a static page if JS is off, and stands down entirely
   when the visitor asks for reduced motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------ current year */
  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------ nav + progress */
  var nav = $('#nav'), bar = $('#progress');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('stuck', y > 24);
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var toggle = $('#navtoggle'), links = $('#navlinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', links).forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ------------------------------------------------------------ reveal on scroll */
  var reveals = $$('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduced) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
    // Anything already on screen at first paint reveals straight away — the
    // observer's negative bottom margin would otherwise strand the hero.
    requestAnimationFrame(function () {
      reveals.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.96) {
          el.classList.add('in'); io.unobserve(el);
        }
      });
    });
  }

  /* ------------------------------------------------------------ copy address */
  var copy = $('#copy'), copytxt = $('#copytxt');
  if (copy) {
    copy.addEventListener('click', function () {
      var mail = copy.getAttribute('data-mail');
      var done = function () {
        copy.setAttribute('data-done', '1');
        copytxt.textContent = 'Copied';
        setTimeout(function () {
          copy.removeAttribute('data-done');
          copytxt.textContent = 'Copy address';
        }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mail).then(done, function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = mail; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:absolute;left:-9999px';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (err) {}
        document.body.removeChild(ta);
      }
    });
  }

  /* ------------------------------------------------------------ magnetic buttons */
  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.transform = 'translate(' + (dx * 9).toFixed(2) + 'px,' +
                            (dy * 7).toFixed(2) + 'px)';
      });
      b.addEventListener('pointerleave', function () {
        b.style.transition = 'transform .55s cubic-bezier(.22,1,.36,1)';
        b.style.transform = '';
        setTimeout(function () { b.style.transition = ''; }, 560);
      });
    });
  }

  /* ------------------------------------------------------------ business card */
  var card = $('#card3d'), tilt = $('#card3dTilt');
  if (card && tilt) {
    card.addEventListener('click', function () { card.classList.toggle('flipped'); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('flipped'); }
    });
    if (!reduced) {
      var raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
      var loop = function () {
        cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
        tilt.style.transform = 'rotateX(' + cy.toFixed(2) + 'deg) rotateY(' +
                               cx.toFixed(2) + 'deg)';
        raf = (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01)
          ? requestAnimationFrame(loop) : 0;
      };
      var kick = function () { if (!raf) raf = requestAnimationFrame(loop); };
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        tx = ((e.clientX - (r.left + r.width / 2)) / r.width) * 16;
        ty = -((e.clientY - (r.top + r.height / 2)) / r.height) * 12;
        kick();
      });
      card.addEventListener('pointerleave', function () { tx = 0; ty = 0; kick(); });
    }
  }

  /* ------------------------------------------------------- capabilities 3D
     Three.js is heavy, so it is fetched only once the section is within reach
     and never on a reduced-motion request — the plain list is the fallback. */
  var capx = $('#capx');
  if (capx && !reduced) {
    var loadCaps = function () {
      import('/assets/capabilities.js')
        .then(function (m) { m.initCapabilities(); })
        .catch(function (err) {          // the plain list stays; say why
          if (window.console) console.warn('[capabilities] 3D disabled:', err);
        });
    };
    if ('IntersectionObserver' in window) {
      var capIo = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { capIo.disconnect(); loadCaps(); }
      }, { rootMargin: '700px 0px' });
      capIo.observe(capx);
    } else { loadCaps(); }
  }

  /* ------------------------------------------------------------ meridian field
     Vertical arcs that bow like lines of longitude and part around the pointer.
     One canvas, no library; it parks itself the moment the hero scrolls away. */
  var cv = $('#meridians');
  if (cv && !reduced) {
    var ctx = cv.getContext('2d', { alpha: true });
    var W = 0, H = 0, dpr = 1, lines = [], t = 0, running = false, frame = 0;
    var mx = -9999, my = -9999, hasPointer = false;

    function build() {
      var n = Math.max(8, Math.min(26, Math.round(W / 76)));
      lines = [];
      for (var i = 0; i < n; i++) {
        var p = (i + 0.5) / n;                     // 0..1 across the width
        var bell = Math.sin(p * Math.PI);          // fattest in the middle, like a globe
        lines.push({
          x: p * W,
          amp: 10 + 30 * bell,
          phase: p * Math.PI * 2.2,
          speed: 0.16 + 0.08 * bell,
          alpha: 0.05 + 0.13 * bell
        });
      }
    }

    function resize() {
      var r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    var R = 250;                                   // pointer influence radius
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      var step = H > 900 ? 20 : 14;
      for (var i = 0; i < lines.length; i++) {
        var L = lines[i], near = 0;
        ctx.beginPath();
        for (var y = -step; y <= H + step; y += step) {
          var bow = Math.sin((y / H) * Math.PI) * L.amp * Math.sin(t * L.speed + L.phase);
          var x = L.x + bow;
          if (hasPointer) {
            var dx = x - mx, dy = y - my;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < R) {
              var f = 1 - d / R;
              f *= f;
              x += (dx >= 0 ? 1 : -1) * f * 54;
              if (f > near) near = f;
            }
          }
          if (y <= -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(255,255,255,' + (L.alpha + near * 0.5).toFixed(3) + ')';
        ctx.stroke();
      }
    }

    function tick() {
      if (!running) { frame = 0; return; }
      t += 0.016;
      draw();
      frame = requestAnimationFrame(tick);
    }
    function start() { if (!running) { running = true; if (!frame) frame = requestAnimationFrame(tick); } }
    function stop() { running = false; }

    window.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
      hasPointer = true;
    }, { passive: true });
    window.addEventListener('pointerleave', function () { hasPointer = false; });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(resize, 140);
    });
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    resize();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es[0].isIntersecting ? start() : stop();
      }, { threshold: 0 }).observe(cv);
    } else { start(); }
    start();
  }
})();
