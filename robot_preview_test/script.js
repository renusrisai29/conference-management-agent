/* ==========================================================================
   BOLT ROBOT PREVIEW — JAVASCRIPT
   Interactive comparison and scale verification
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const btnUpdated = document.getElementById('btnUpdatedMode');
  const btnOriginal = document.getElementById('btnOriginalMode');
  const scaleSlider = document.getElementById('robotScaleAdjust');
  const scaleLabel = document.getElementById('scaleLabel');
  const robotImg = document.getElementById('robotCoreImg');

  // Reference Mode (Default): Clean background (no lines), prominent reference-matched robot & box
  btnUpdated.addEventListener('click', () => {
    btnUpdated.classList.add('active');
    btnOriginal.classList.remove('active');
    document.body.classList.remove('show-original-lines');
    
    // Set scale back to reference 118%
    scaleSlider.value = 118;
    scaleLabel.textContent = 'Reference (118%)';
    document.documentElement.style.setProperty('--custom-scale', '1.18');
  });

  // Before Mode: Shows previous small robot with connector lines
  btnOriginal.addEventListener('click', () => {
    btnOriginal.classList.add('active');
    btnUpdated.classList.remove('active');
    document.body.classList.add('show-original-lines');
    
    // Reset scale to 100%
    scaleSlider.value = 100;
    scaleLabel.textContent = 'Original (100%)';
    document.documentElement.style.setProperty('--custom-scale', '1.0');
  });

  // Slider for live inspection between 100% and 150%
  scaleSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    scaleLabel.textContent = val === 118 ? 'Reference (118%)' : `${val}%`;
    const scaleFactor = (val / 100).toFixed(2);
    document.documentElement.style.setProperty('--custom-scale', scaleFactor);
  });
});
