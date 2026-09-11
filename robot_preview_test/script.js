/* ==========================================================================
   BOLT ROBOT PREVIEW — JAVASCRIPT
   Visual testing interactions and view modes
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const heroCard = document.getElementById('robotHeroCard');
  const robotContainer = document.getElementById('robotFrameContainer');
  const robotImg = document.getElementById('robotImg');
  const proportionGrid = document.getElementById('proportionGrid');
  const scaleSlider = document.getElementById('scaleSlider');
  const scaleValue = document.getElementById('scaleValue');
  const toggleGridBtn = document.getElementById('toggleGridBtn');
  const toggleFloatBtn = document.getElementById('toggleFloatBtn');
  const testGreetingBtn = document.getElementById('testGreetingBtn');
  const speechBubble = document.getElementById('speechBubble');
  const segButtons = document.querySelectorAll('.seg-btn');
  const floatingWidget = document.getElementById('floatingWidget');

  // Default view mode: spotlight
  document.body.classList.add('view-spotlight');
  robotContainer.classList.add('floating');

  // View Mode Switcher
  segButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      segButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const view = btn.getAttribute('data-view');
      document.body.classList.remove('view-spotlight', 'view-cinematic', 'view-framed');
      document.body.classList.add(`view-${view}`);
    });
  });

  // Scale Slider
  scaleSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    scaleValue.textContent = `${val}%`;
    const scaleFactor = val / 100;
    robotContainer.style.setProperty('--robot-scale', scaleFactor);
    robotContainer.style.transform = `scale(${scaleFactor})`;
  });

  // Toggle Proportion Grid
  toggleGridBtn.addEventListener('click', () => {
    const isActive = proportionGrid.classList.toggle('active');
    toggleGridBtn.classList.toggle('active', isActive);
  });

  // Toggle Float Animation
  toggleFloatBtn.addEventListener('click', () => {
    const isFloating = robotContainer.classList.toggle('floating');
    toggleFloatBtn.classList.toggle('active', isFloating);
  });

  // Simulate Speech / Voice Response
  const voicePhrases = [
    "\"Hello! I am Bolt, your Academic Conference Assistant. Ready to organize papers, assign reviewers, and coordinate sessions!\"",
    "\"Checking paper submissions... 142 manuscripts received. Plagiarism checks passing at 98.4%!\"",
    "\"Reviewer assignment matrix generated. Conflict of interest filters successfully applied!\"",
    "\"Keynote session timings confirmed for Hall A and Hall B. Presenters notified.\""
  ];
  let phraseIndex = 0;

  function triggerBoltSpeech() {
    speechBubble.style.display = 'block';
    speechBubble.textContent = voicePhrases[phraseIndex % voicePhrases.length];
    phraseIndex++;

    // Highlight eye glow effect during speech
    const eyeGlow = document.querySelector('.eye-glow-enhancement');
    if (eyeGlow) {
      eyeGlow.style.filter = 'blur(20px)';
      eyeGlow.style.opacity = '1';
      setTimeout(() => {
        eyeGlow.style.filter = 'blur(14px)';
        eyeGlow.style.opacity = '';
      }, 3500);
    }
  }

  testGreetingBtn.addEventListener('click', triggerBoltSpeech);

  // Click floating assistant to trigger speech
  floatingWidget.addEventListener('click', triggerBoltSpeech);

  // Subtle 3D Tilt Effect on mouse movement
  heroCard.addEventListener('mousemove', (e) => {
    const rect = heroCard.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotX = -(y / rect.height) * 6;
    const rotY = (x / rect.width) * 6;

    heroCard.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
  });

  heroCard.addEventListener('mouseleave', () => {
    heroCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
  });

  // --------------------------------------------------------------------------
  // Tech Network Canvas Particles Animation
  // --------------------------------------------------------------------------
  const canvas = document.getElementById('techNetworkCanvas');
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const nodeCount = 38;
  const nodes = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 2 + 1.5,
      alpha: Math.random() * 0.4 + 0.2
    });
  }

  function drawNetwork() {
    ctx.clearRect(0, 0, width, height);

    // Draw connecting lines
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          const lineAlpha = (1 - dist / 150) * 0.22;
          ctx.strokeStyle = `rgba(2, 132, 199, ${lineAlpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0) node.x = width;
      if (node.x > width) node.x = 0;
      if (node.y < 0) node.y = height;
      if (node.y > height) node.y = 0;

      ctx.fillStyle = `rgba(56, 189, 248, ${node.alpha})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(drawNetwork);
  }

  drawNetwork();
});
