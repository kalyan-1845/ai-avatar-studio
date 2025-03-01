
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') { ctx.roundRect(x, y, w, h, r); }
  else {
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }
}

const stableRand = (seed) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const getStableSeed = (value = 'avatar') => {
  let hash = 0;
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
};

function drawMicrophone(ctx, hx, hy, breathe, sway, yaw) {
  const micSide = yaw >= 0 ? 1 : -1;
  const micX = hx + (60 * micSide) + sway * 0.5;
  const micY = hy + 85 + breathe * 0.5;

  ctx.save();
  const armX = micX + (100 * micSide);

  ctx.lineWidth = 10; ctx.strokeStyle = '#222'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(armX, micY + 180); ctx.lineTo(micX, micY); ctx.stroke();

  ctx.translate(micX, micY);
  ctx.rotate(-0.4 * micSide);

  const micGrad = ctx.createLinearGradient(-25, -35, 25, 35);
  micGrad.addColorStop(0, '#333'); micGrad.addColorStop(1, '#000');
  ctx.fillStyle = micGrad;
  rr(ctx, -25, -35, 50, 75, 18); ctx.fill();

  ctx.fillStyle = '#1a1a1a'; rr(ctx, -23, -33, 46, 50, 16); ctx.fill(); // Grill
  ctx.fillStyle = '#d4af37'; ctx.fillRect(-25, 20, 50, 4); // Gold Ring

  ctx.restore();
}

// === CLOTH TEXTURE HELPER ===
const addNoise = (ctx, x, y, w, h, opacity = 0.05, seed = 0) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  const base = (w * 0.07) + (h * 0.11) + (seed * 0.19);

  // Deterministic static texture to avoid frame-to-frame shimmer
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 40; i++) {
    const rx = stableRand(base + i * 1.73) * w;
    const ry = stableRand(base + i * 2.11 + 7.0) * h;
    ctx.fillRect(x + rx, y + ry, 1, 1);
  }
  ctx.fillStyle = '#000';
  for (let i = 0; i < 40; i++) {
    const rx = stableRand(base + i * 2.37 + 13.0) * w;
    const ry = stableRand(base + i * 1.41 + 19.0) * h;
    ctx.fillRect(x + rx, y + ry, 1, 1);
  }
  ctx.restore();
};

// =============== FULL BODY HUMAN ===============
export function drawFullHuman(ctx, c, f, time, faceImg, gesture = null) {
  if (!c || !f) return;

  ctx.save(); // Start Global Isolation

  const yaw = f.head.yaw;
  const pitch = f.head.pitch;
  const breathe = Math.sin(time * 2) * 2;
  const sway = Math.sin(time * 1.5) * 1.5;
  const outfit = c.outfitColor || c.accentColor || '#333';
  const isFemale = c.gender === 'female'; // Gender affects lip color and styling
  const characterSeed = getStableSeed(c.id || c.name || `${c.hairColor || ''}${c.skinColor || ''}`);

  // === CUSTOM PHOTO MODE (Full Photorealistic Twin) ===
  const talking = f.mouth.openness > 0.1;
  const headShake = talking ? Math.sin(time * 6) * 5 : 0; // Visible head movement when speaking
  const hx = yaw * 8 + sway + headShake;
  const nod = talking ? Math.sin(time * 10) * 3 : 0; // Visible nod when speaking
  const hy = -20 + pitch * 8 + breathe + nod;

  if (faceImg && faceImg.complete && faceImg.naturalWidth !== 0) {
    try {
      // === SEAMLESS PHOTO-COMP ENGINE ===
      const primaryColor = c.outfitColor || '#0a101f';
      const skinColor = c.skinColor || '#dcb890';
      const outfitStyle = c.outfitStyle || 'blazer';
      const gestureStyle = c.gestureStyle || 'standard';

      // --- GESTURE DYNAMICS ---
      let energy = 1.0;
      if (gestureStyle === 'energetic') energy = 1.8;
      if (gestureStyle === 'calm') energy = 0.4;

      const sway2 = sway * energy;
      const breathe2 = breathe * energy;
      const nod2 = (talking ? Math.sin(time * 12) * 2.5 : 0) * energy;
      const shoulderY = breathe2 * 1.5 + (nod2 * 0.3);

      // === IDLE ANIMATIONS (Hands/Arms) ===
      // Random-looking movement for "alive" feel
      const idleArmL = Math.sin(time * 1.2 + 0.5) * 4 * energy;
      const idleArmR = Math.sin(time * 1.4 + 2.0) * 4 * energy;

      const scale = 1.35;

      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(0, 15);

      // --- OUTFIT RENDERERS ---

      const drawBlazer = () => {
        const suitGrad = ctx.createLinearGradient(-100, 0, 100, 200);
        suitGrad.addColorStop(0, '#151b2e'); suitGrad.addColorStop(0.5, primaryColor); suitGrad.addColorStop(1, '#000');
        ctx.fillStyle = suitGrad;
        ctx.beginPath();
        // Shoulders & Arms using idle sway
        const shouldL = -90 + sway2 + idleArmL * 0.5;
        const shouldR = 90 + sway2 + idleArmR * 0.5;

        ctx.moveTo(shouldL, 65 + shoulderY);
        ctx.quadraticCurveTo(-45 + sway2, 55 + shoulderY, -40 + sway2, 60 + shoulderY);
        ctx.lineTo(40 + sway2, 60 + shoulderY);
        ctx.quadraticCurveTo(45 + sway2, 55 + shoulderY, shouldR, 65 + shoulderY);

        // Arms extending down with slight movement
        ctx.lineTo(85 + sway2 + idleArmR, 200);
        ctx.lineTo(-85 + sway2 + idleArmL, 200);
        ctx.fill();

        // Lapel
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.moveTo(-45 + sway2, 60 + shoulderY); ctx.lineTo(0 + sway2, 140 + shoulderY + breathe2); ctx.lineTo(45 + sway2, 60 + shoulderY); ctx.fill();
        // Tee
        const teeGrad = ctx.createLinearGradient(0, 60, 0, 120); teeGrad.addColorStop(0, '#fff'); teeGrad.addColorStop(1, '#ddd');
        ctx.fillStyle = teeGrad;
        ctx.beginPath(); ctx.moveTo(-45 + sway2, 60 + shoulderY); ctx.quadraticCurveTo(0 + sway2, 100 + shoulderY, 45 + sway2, 60 + shoulderY);
        ctx.lineTo(0 + sway2, 140 + shoulderY + breathe2); ctx.lineTo(-45 + sway2, 60 + shoulderY); ctx.fill();

        // Draw Hands (Resting on imaginary table/lap)
        if (!gesture) {
          ctx.fillStyle = skinColor;
          // Left Hand
          ctx.beginPath(); ctx.ellipse(-60 + sway2 + idleArmL, 190 + shoulderY + idleArmL * 0.3, 18, 14, 0.4, 0, Math.PI * 2); ctx.fill();
          // Right Hand
          ctx.beginPath(); ctx.ellipse(60 + sway2 + idleArmR, 190 + shoulderY + idleArmR * 0.3, 18, 14, -0.4, 0, Math.PI * 2); ctx.fill();
        }
      };

      const drawSuit = () => {
        const suitGrad = ctx.createLinearGradient(-100, 0, 100, 200);
        suitGrad.addColorStop(0, '#111'); suitGrad.addColorStop(0.5, primaryColor); suitGrad.addColorStop(1, '#000');
        ctx.fillStyle = suitGrad;
        ctx.beginPath();
        ctx.moveTo(-90 + sway2, 65 + shoulderY); ctx.lineTo(90 + sway2, 65 + shoulderY);
        ctx.lineTo(85 + sway2, 200); ctx.lineTo(-85 + sway2, 200);
        ctx.fill();
        // Shirt
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-25 + sway2, 65 + shoulderY); ctx.lineTo(0 + sway2, 130 + shoulderY); ctx.lineTo(25 + sway2, 65 + shoulderY); ctx.fill();
        // Tie
        ctx.fillStyle = c.accentColor || '#d00';
        ctx.beginPath(); ctx.moveTo(0 + sway2, 65 + shoulderY); ctx.lineTo(10 + sway2, 120 + shoulderY); ctx.lineTo(0 + sway2, 135 + shoulderY); ctx.lineTo(-10 + sway2, 120 + shoulderY); ctx.fill();
      };

      const drawTuxedo = () => {
        // Elegant Black Tux
        const suitGrad = ctx.createLinearGradient(-100, 0, 100, 200);
        suitGrad.addColorStop(0, '#111'); suitGrad.addColorStop(1, '#000');
        ctx.fillStyle = suitGrad;
        ctx.beginPath();
        ctx.moveTo(-90 + sway2, 65 + shoulderY); ctx.lineTo(90 + sway2, 65 + shoulderY);
        ctx.lineTo(85 + sway2, 200); ctx.lineTo(-85 + sway2, 200);
        ctx.fill();
        // Silk Lapel
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath(); ctx.moveTo(-45 + sway2, 60 + shoulderY); ctx.lineTo(0 + sway2, 145 + shoulderY); ctx.lineTo(45 + sway2, 60 + shoulderY); ctx.fill();
        // Shirt
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-20 + sway2, 65 + shoulderY); ctx.lineTo(0 + sway2, 130 + shoulderY); ctx.lineTo(20 + sway2, 65 + shoulderY); ctx.fill();
        // Bowtie
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(0 + sway2, 85 + shoulderY);
        ctx.lineTo(15 + sway2, 75 + shoulderY); ctx.lineTo(15 + sway2, 95 + shoulderY);
        ctx.lineTo(0 + sway2, 85 + shoulderY);
        ctx.lineTo(-15 + sway2, 75 + shoulderY); ctx.lineTo(-15 + sway2, 95 + shoulderY);
        ctx.fill();
      };

      const drawCasual = () => {
        ctx.fillStyle = primaryColor;
        ctx.beginPath(); ctx.ellipse(0 + sway2, 70 + shoulderY, 70, 40, 0, Math.PI, 0); ctx.fill();
        const bodyGrad = ctx.createLinearGradient(-50, 0, 50, 200);
        bodyGrad.addColorStop(0, primaryColor); bodyGrad.addColorStop(1, '#222');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-85 + sway2, 80 + shoulderY); ctx.lineTo(85 + sway2, 80 + shoulderY);
        ctx.lineTo(80 + sway2, 200); ctx.lineTo(-80 + sway2, 200);
        ctx.fill();
        // Strings
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-20 + sway2, 90 + shoulderY); ctx.lineTo(-20 + sway2, 140 + shoulderY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20 + sway2, 90 + shoulderY); ctx.lineTo(20 + sway2, 140 + shoulderY); ctx.stroke();
      };

      const drawHoodie = () => {
        // Rounded shoulders, bulky look
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        // Hood shape
        ctx.arc(0 + sway2, 70 + shoulderY, 55, Math.PI, 0);
        ctx.rect(-85 + sway2, 80 + shoulderY, 170, 120);
        ctx.fill();
        // Hood shadows
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.arc(0 + sway2, 70 + shoulderY, 45, Math.PI, 0); ctx.fill();
      };

      const drawGown = () => {
        // Elegant Evening Gown
        const gownGrad = ctx.createLinearGradient(-50, 0, 50, 200);
        gownGrad.addColorStop(0, primaryColor); gownGrad.addColorStop(0.5, '#fff'); gownGrad.addColorStop(1, primaryColor); // Satin sheen
        ctx.fillStyle = primaryColor;

        ctx.beginPath();
        // Strapless top
        ctx.moveTo(-60 + sway2, 90 + shoulderY);
        ctx.quadraticCurveTo(0 + sway2, 110 + shoulderY, 60 + sway2, 90 + shoulderY); // Sweetheart neckline
        ctx.lineTo(55 + sway2, 200);
        ctx.lineTo(-55 + sway2, 200);
        ctx.fill();

        // Skin (Shoulders/Neck)
        ctx.fillStyle = skinColor;
        ctx.beginPath(); ctx.rect(-50 + sway2, 50 + shoulderY, 100, 40); ctx.fill();

        // Necklace
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0 + sway2, 60 + shoulderY, 35, 0, Math.PI); ctx.stroke();
      };

      const drawLeather = () => {
        // Tough Leather Jacket
        const leatherGrad = ctx.createLinearGradient(-60, 0, 80, 200);
        leatherGrad.addColorStop(0, '#222'); leatherGrad.addColorStop(0.4, '#444'); leatherGrad.addColorStop(1, '#111');
        ctx.fillStyle = leatherGrad;

        ctx.beginPath();
        ctx.moveTo(-90 + sway2, 60 + shoulderY);
        ctx.lineTo(90 + sway2, 60 + shoulderY);
        ctx.lineTo(80 + sway2, 200);
        ctx.lineTo(-80 + sway2, 200);
        ctx.fill();

        // Collar
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.moveTo(-50 + sway2, 60 + shoulderY); ctx.lineTo(-20 + sway2, 110 + shoulderY); ctx.lineTo(-80 + sway2, 90 + shoulderY);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(50 + sway2, 60 + shoulderY); ctx.lineTo(20 + sway2, 110 + shoulderY); ctx.lineTo(80 + sway2, 90 + shoulderY);
        ctx.fill();

        // Zipper
        ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(5 + sway2, 100 + shoulderY); ctx.lineTo(5 + sway2, 200); ctx.stroke();

        // White Tee underneath
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-20 + sway2, 60 + shoulderY); ctx.lineTo(20 + sway2, 60 + shoulderY); ctx.lineTo(0 + sway2, 100 + shoulderY); ctx.fill();
      };

      const drawTurtleneck = () => {
        // Sleek Modern Look
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        // Torso
        ctx.moveTo(-85 + sway2, 70 + shoulderY); ctx.lineTo(85 + sway2, 70 + shoulderY);
        ctx.lineTo(80 + sway2, 200); ctx.lineTo(-80 + sway2, 200);
        ctx.fill();
        // Neck High Collar
        ctx.fillStyle = primaryColor; // Same color
        ctx.fillRect(-24 + sway2, 50 + shoulderY, 48, 30);
        // Ribbed texture
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath(); ctx.moveTo(-20 + sway2 + i * 10, 50 + shoulderY); ctx.lineTo(-20 + sway2 + i * 10, 80 + shoulderY); ctx.stroke();
        }
      };

      const drawFloral = () => {
        // Base Dress
        const gownGrad = ctx.createLinearGradient(-50, 0, 50, 200);
        gownGrad.addColorStop(0, primaryColor); gownGrad.addColorStop(1, '#fce7f3');
        ctx.fillStyle = gownGrad;

        ctx.beginPath();
        // Square neckline
        ctx.moveTo(-45 + sway2, 70 + shoulderY); ctx.lineTo(45 + sway2, 70 + shoulderY);
        ctx.lineTo(55 + sway2, 200); ctx.lineTo(-55 + sway2, 200);
        ctx.fill();

        // Floral Pattern (Dots)
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for (let i = 0; i < 15; i++) {
          const rx = stableRand(characterSeed + i * 1.83);
          const ry = stableRand(characterSeed + i * 2.17 + 9);
          const rr = stableRand(characterSeed + i * 1.29 + 17);
          ctx.beginPath();
          ctx.arc(-40 + rx * 80 + sway2, 80 + ry * 100 + shoulderY, 3 + rr * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Skin (Shoulders)
        ctx.fillStyle = skinColor;
        ctx.beginPath(); ctx.rect(-50 + sway2, 50 + shoulderY, 100, 20); ctx.fill();
      };

      const drawDenim = () => {
        // Denim Jacket
        const denimGrad = ctx.createLinearGradient(-60, 0, 80, 200);
        denimGrad.addColorStop(0, '#1e3a8a'); denimGrad.addColorStop(0.5, '#3b82f6'); denimGrad.addColorStop(1, '#172554');
        ctx.fillStyle = denimGrad;

        ctx.beginPath();
        ctx.moveTo(-90 + sway2, 60 + shoulderY);
        ctx.lineTo(90 + sway2, 60 + shoulderY);
        ctx.lineTo(80 + sway2, 200);
        ctx.lineTo(-80 + sway2, 200);
        ctx.fill();

        // Collar
        ctx.fillStyle = '#1e40af';
        ctx.beginPath();
        ctx.moveTo(-50 + sway2, 60 + shoulderY); ctx.lineTo(-20 + sway2, 110 + shoulderY); ctx.lineTo(-80 + sway2, 90 + shoulderY);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(50 + sway2, 60 + shoulderY); ctx.lineTo(20 + sway2, 110 + shoulderY); ctx.lineTo(80 + sway2, 90 + shoulderY);
        ctx.fill();

        // Buttons
        ctx.fillStyle = '#94a3b8'; // Silver buttons
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.arc(5 + sway2, 100 + shoulderY + i * 30, 4, 0, Math.PI * 2); ctx.fill();
        }

        // White Tee underneath
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-20 + sway2, 60 + shoulderY); ctx.lineTo(20 + sway2, 60 + shoulderY); ctx.lineTo(0 + sway2, 100 + shoulderY); ctx.fill();
      };

      const drawLegs = () => {
        const isDress = ['gown', 'floral', 'dress'].includes(outfitStyle);
        const pantColor = (outfitStyle === 'denim' || outfitStyle === 'casual') ? '#1e3a8a' :
          (outfitStyle === 'gown') ? primaryColor :
            '#0f172a'; // Dark pants for suits/tux

        ctx.fillStyle = pantColor;

        if (isDress) {
          // Skirt / Dress Bottom (Flowing)
          ctx.beginPath();
          ctx.moveTo(-85 + sway2, 180 + shoulderY);
          ctx.lineTo(85 + sway2, 180 + shoulderY);
          ctx.quadraticCurveTo(130 + sway2, 350, 140 + sway2, 500); // Flow
          ctx.lineTo(-140 + sway2, 500);
          ctx.quadraticCurveTo(-130 + sway2, 350, -85 + sway2, 180 + shoulderY);
          ctx.fill();

          // Fabric Folds / Texture
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.beginPath(); ctx.moveTo(0 + sway2, 180 + shoulderY); ctx.quadraticCurveTo(20 + sway2, 300, 60 + sway2, 500); ctx.lineTo(-60 + sway2, 500); ctx.quadraticCurveTo(-20 + sway2, 300, 0 + sway2, 180 + shoulderY); ctx.fill();

        } else {
          // Pants (Realistic Fit)
          // Left Leg
          ctx.beginPath();
          ctx.moveTo(-80 + sway2, 180 + shoulderY);
          ctx.lineTo(-5 + sway2, 180 + shoulderY); // Crotch
          ctx.lineTo(-20 + sway2, 440); // Ankle Taper
          ctx.lineTo(-90 + sway2, 440);
          ctx.fill();
          addNoise(ctx, -90 + sway2, 180, 80, 260, 0.03, characterSeed + 11); // Jeans texture

          // Right Leg
          ctx.beginPath();
          ctx.moveTo(5 + sway2, 180 + shoulderY);
          ctx.lineTo(80 + sway2, 180 + shoulderY);
          ctx.lineTo(90 + sway2, 440);
          ctx.lineTo(20 + sway2, 440);
          ctx.fill();
          addNoise(ctx, 20 + sway2, 180, 80, 260, 0.03, characterSeed + 17);

          // Shoes (Detailed Sneakers/Dress Shoes)
          const drawShoe = (sx, sy, isLeft) => {
            ctx.fillStyle = '#111'; // Base
            ctx.beginPath();
            // Modern Sneaker Shape
            ctx.moveTo(sx, sy);
            ctx.bezierCurveTo(sx - 30, sy + 10, sx - 30, sy + 50, sx, sy + 60); // Heel
            ctx.lineTo(sx + 50, sy + 60); // Sole
            ctx.bezierCurveTo(sx + 80, sy + 60, sx + 80, sy + 40, sx + 50, sy + 10); // Toe
            ctx.closePath();
            ctx.fill();

            // White Sole
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.moveTo(sx, sy + 45);
            ctx.lineTo(sx + 50, sy + 45); // Top of sole
            ctx.bezierCurveTo(sx + 80, sy + 45, sx + 80, sy + 58, sx + 50, sy + 60);
            ctx.lineTo(sx, sy + 60);
            ctx.bezierCurveTo(sx - 25, sy + 58, sx - 25, sy + 45, sx, sy + 45);
            ctx.fill();

            // Laces detail
            ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx + 20, sy + 15); ctx.lineTo(sx + 40, sy + 15); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 22, sy + 22); ctx.lineTo(sx + 38, sy + 22); ctx.stroke();
          };

          // Draw Shoes (at bottom of pants)
          drawShoe(-85 + sway2, 440, true);
          drawShoe(15 + sway2, 440, false);

          // Belt (Optional)
          ctx.fillStyle = '#111';
          ctx.fillRect(-82 + sway2, 180 + shoulderY, 164, 15);
          ctx.fillStyle = '#d4af37'; // Gold Buckle
          ctx.fillRect(-15 + sway2, 180 + shoulderY, 30, 15);
          // Shine
          ctx.fillStyle = '#fff'; ctx.fillRect(-10 + sway2, 182 + shoulderY, 5, 11);
        }
      };

      // Draw Legs FIRST (Behind torso)
      drawLegs();

      if (outfitStyle === 'suit') drawSuit();
      else if (outfitStyle === 'tuxedo') drawTuxedo();
      else if (outfitStyle === 'hoodie') drawHoodie();
      else if (outfitStyle === 'gown') drawGown();
      else if (outfitStyle === 'leather') drawLeather();
      else if (outfitStyle === 'denim') drawDenim();
      else if (outfitStyle === 'turtleneck') drawTurtleneck();
      else if (outfitStyle === 'floral') drawFloral();
      else if (outfitStyle === 'casual') drawCasual();
      else drawBlazer();

      // --- ARMS & HANDS (Photo Mode) ---
      const armColor = (outfitStyle === 'gown') ? skinColor : primaryColor;
      for (const side of [-1, 1]) {
        const isLeft = side === -1;
        const sx = (isLeft ? -85 : 85) + sway2;
        const sy = 75 + shoulderY;
        const cycle = talking ? Math.sin(time * 8 + side) : 0;
        const lift = talking ? 60 + cycle * 15 : 0;
        const hX = sx + (isLeft ? 25 : -25) + (talking ? (isLeft ? 5 : -5) * cycle : 0);
        const hY = 230 - lift;
        ctx.strokeStyle = armColor; ctx.lineWidth = 22; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + (isLeft ? -10 : 10), hY - 40, hX, hY); ctx.stroke();
        ctx.fillStyle = skinColor;
        ctx.beginPath(); ctx.ellipse(hX, hY + 10, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
      }

      // Neck (Improved)
      const isFemale = c.gender === 'female';
      const neckWidth = isFemale ? 34 : 44; // Slender for female, wider for male
      const neckHeight = 50;

      ctx.save();
      ctx.fillStyle = skinColor;

      // Neck Base
      ctx.beginPath();
      // Trapezoid shape for more natural connection
      ctx.moveTo((-neckWidth / 2) + sway, 80 + breathe);
      ctx.lineTo((neckWidth / 2) + sway, 80 + breathe);
      ctx.lineTo((neckWidth / 2 - 2) + sway, 45 + breathe);
      ctx.lineTo((-neckWidth / 2 + 2) + sway, 45 + breathe);
      ctx.fill();

      // Neck Shadow/Contour (Under Chin)
      const shadowGrad = ctx.createLinearGradient(0, 45 + breathe, 0, 70 + breathe);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
      shadowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect((-neckWidth / 2) + sway, 45 + breathe, neckWidth, 25);

      // Adam's Apple (Subtle for males)
      if (!isFemale) {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.beginPath();
        ctx.moveTo(-5 + sway, 65 + breathe);
        ctx.lineTo(0 + sway, 68 + breathe);
        ctx.lineTo(5 + sway, 65 + breathe);
        ctx.fill();
      }
      ctx.restore();

      // Head
      ctx.save();
      const nodOffset = talking ? Math.sin(time * 10) * 1.5 : 0;
      ctx.beginPath();
      // Improved Head Mask
      ctx.moveTo(-36 + sway, hy - 45 + nodOffset);
      ctx.quadraticCurveTo(0 + sway, hy - 65 + nodOffset, 36 + sway, hy - 45 + nodOffset);
      ctx.quadraticCurveTo(40 + sway, hy + nodOffset, 34 + sway, hy + 42 + nodOffset);
      ctx.quadraticCurveTo(28 + sway, hy + 66 + nodOffset, 0 + sway, hy + 68 + nodOffset);
      ctx.quadraticCurveTo(-28 + sway, hy + 66 + nodOffset, -34 + sway, hy + 42 + nodOffset);
      ctx.quadraticCurveTo(-40 + sway, hy + nodOffset, -36 + sway, hy - 45 + nodOffset);
      ctx.closePath();
      ctx.shadowColor = skinColor; ctx.shadowBlur = 20; ctx.fill();
      ctx.clip();
      const aspect = faceImg.width / faceImg.height;
      let dw, dh;
      if (aspect > 1) { dh = 160; dw = dh * aspect; } else { dw = 160; dh = dw / aspect; }
      ctx.drawImage(faceImg, hx - dw / 2, hy - dh / 2 + nodOffset, dw, dh);
      ctx.restore();

      // === CHAINS & HEADPHONES (Accessories) - Photo Mode ===
      if (c.accessories && c.accessories.includes('chain')) {
        const isGold = c.accessories === 'chain_gold';
        ctx.strokeStyle = isGold ? '#f59e0b' : '#94a3b8';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3;
        ctx.beginPath();
        // Adjust Y for photo mode neck
        ctx.ellipse(0 + sway, 78 + breathe, 34, 24, 0, 0, Math.PI);
        ctx.stroke();
        // Highlights
        ctx.strokeStyle = isGold ? '#fef3c7' : '#e2e8f0';
        ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (c.accessories === 'headphones') {
        // Headband
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(hx, hy - 12, 64, Math.PI, 0); ctx.stroke();
        // Shine on band
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(hx, hy - 14, 64, Math.PI * 0.8, Math.PI * 0.2, true); ctx.stroke();

        // Ear Cups
        const drawCup = (x) => {
          ctx.fillStyle = '#0f172a';
          rr(ctx, x, hy - 35, 22, 55, 6); ctx.fill();
          ctx.fillStyle = '#1e293b';
          rr(ctx, x + (x < hx ? 12 : 2), hy - 35, 8, 55, 2); ctx.fill();
          ctx.strokeStyle = c.accentColor || '#0ea5e9'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x + 11, hy - 8, 8, 0, Math.PI * 2); ctx.stroke();
        };
        drawCup(hx - 74);
        drawCup(hx + 52);
      }

      // === DRAW LISTENING MIC ===
      drawMicrophone(ctx, hx, hy, breathe, sway, yaw);

      // === EXIT IF PHOTO MODE SUCCESSFUL ===
      ctx.restore();
      return;

    } catch (e) {
      console.error("Error drawing clone:", e);
      // Fallthrough to vector, but we are inside ctx.save for scaling!
      // Wait, Photo Mode has its OWN ctx.save() at line 95 (Step 231 view shows line 95 ctx.save()).
      // So if it fails, we need to restore THAT save too?
      // Yes. And also the Global Isolation save we just added.

      // However, line 95 usage of ctx.save() is inside the try block.
      // If error occurs after line 95, context stack is +1 (local) +1 (global).
      // Catch happens.
      // We fallthrough to Vector.
      // Vector continues.
      // But Vector expects scale 1?
      // Step 231 line 96: ctx.scale(scale, scale).
      // If we fallthrough, vector will be drawn scaled + translated!
      // This is BAD.
      // We must restore context in catch.
      ctx.restore();
    }
  }

  // === VECTOR BODY (Customizable Avatar - ULTRA REALISTIC UPDATE) ===
  const skin = c.skinColor || '#f5d0b0';
  const hair = c.hairColor || '#333';
  const outfitStyle = c.outfitStyle || 'blazer';
  const primaryColor = c.outfitColor || '#0a101f';

  try {
    // Vector Render Logic

    const drawLegs = () => {
      const isDress = ['gown', 'floral', 'dress'].includes(outfitStyle);
      const pantColor = (outfitStyle === 'denim' || outfitStyle === 'casual') ? '#1e3a8a' :
        (outfitStyle === 'gown') ? primaryColor :
          '#0f172a'; // Dark pants for suits/tux

      ctx.fillStyle = pantColor;

      if (isDress) {
        // Skirt / Dress Bottom (Flowing)
        ctx.beginPath();
        ctx.moveTo(-85 + sway, 180 + breathe);
        ctx.lineTo(85 + sway, 180 + breathe);
        ctx.quadraticCurveTo(130 + sway, 350, 140 + sway, 500); // Flow
        ctx.lineTo(-140 + sway, 500);
        ctx.quadraticCurveTo(-130 + sway, 350, -85 + sway, 180 + breathe);
        ctx.fill();
      } else {
        // Pants (Realistic Fit)
        // Left Leg
        ctx.beginPath();
        ctx.moveTo(-80 + sway, 180 + breathe);
        ctx.lineTo(-5 + sway, 180 + breathe); // Crotch
        ctx.lineTo(-20 + sway, 440); // Ankle Taper
        ctx.lineTo(-90 + sway, 440);
        ctx.fill();
        addNoise(ctx, -90 + sway, 180, 80, 260, 0.03, characterSeed + 23);

        // Right Leg
        ctx.beginPath();
        ctx.moveTo(5 + sway, 180 + breathe);
        ctx.lineTo(80 + sway, 180 + breathe);
        ctx.lineTo(90 + sway, 440);
        ctx.lineTo(20 + sway, 440);
        ctx.fill();
        addNoise(ctx, 20 + sway, 180, 80, 260, 0.03, characterSeed + 29);

        // Shoes (Detailed Sneakers/Dress Shoes)
        const drawShoe = (sx, sy) => {
          ctx.fillStyle = '#111'; // Base
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.bezierCurveTo(sx - 30, sy + 10, sx - 30, sy + 50, sx, sy + 60); // Heel
          ctx.lineTo(sx + 50, sy + 60); // Sole
          ctx.bezierCurveTo(sx + 80, sy + 60, sx + 80, sy + 40, sx + 50, sy + 10); // Toe
          ctx.closePath();
          ctx.fill();

          // White Sole
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(sx, sy + 45);
          ctx.lineTo(sx + 50, sy + 45);
          ctx.bezierCurveTo(sx + 80, sy + 45, sx + 80, sy + 58, sx + 50, sy + 60);
          ctx.lineTo(sx, sy + 60);
          ctx.bezierCurveTo(sx - 25, sy + 58, sx - 25, sy + 45, sx, sy + 45);
          ctx.fill();
        };

        // Draw Shoes (at bottom of pants)
        drawShoe(-85 + sway, 440);
        drawShoe(15 + sway, 440);
      }
    };
    // Draw Legs BEHIND Torso
    drawLegs();

    // Ground Shadow (Softer, Larger)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.filter = 'blur(4px)';
    ctx.beginPath(); ctx.ellipse(sway, 260, 55, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.filter = 'none';

    // Outfit Logic with DEPTH & FOLDS
    const drawVectorOutfit = () => {
      // Shoulders/Torso Base
      ctx.fillStyle = outfit;
      rr(ctx, -44 + sway, 80 + breathe, 88, 95, 22);
      ctx.fill();

      // Fabric Shading (Cylindrical Volume)
      const torsoGrad = ctx.createLinearGradient(-40 + sway, 0, 40 + sway, 0);
      torsoGrad.addColorStop(0, 'rgba(0,0,0,0.2)'); // Darker edge
      torsoGrad.addColorStop(0.2, 'transparent');
      torsoGrad.addColorStop(0.8, 'transparent');
      torsoGrad.addColorStop(1, 'rgba(0,0,0,0.2)'); // Darker edge
      ctx.fillStyle = torsoGrad;
      rr(ctx, -44 + sway, 80 + breathe, 88, 95, 22);
      ctx.fill();
      addNoise(ctx, -44 + sway, 80 + breathe, 88, 95, 0.04, characterSeed + 31); // Torso Texture

      // Fabric Highlight (Center Chest)
      const chestHighlight = ctx.createRadialGradient(sway, 110 + breathe, 10, sway, 110 + breathe, 60);
      chestHighlight.addColorStop(0, 'rgba(255,255,255,0.05)');
      chestHighlight.addColorStop(1, 'transparent');
      ctx.fillStyle = chestHighlight;
      ctx.fill();

      // === NECK (Realistic Vector Mode) ===
      const isFemale = c.gender === 'female';
      const neckWidth = isFemale ? 28 : 38;
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.moveTo((-neckWidth / 2) + sway, 80 + breathe);
      ctx.lineTo((neckWidth / 2) + sway, 80 + breathe);
      ctx.lineTo((neckWidth / 2 - 2) + sway, 50 + breathe);
      ctx.lineTo((-neckWidth / 2 + 2) + sway, 50 + breathe);
      ctx.fill();

      // Neck Shadow (Chin Drop) - Crucial for depth
      const neckShadow = ctx.createLinearGradient(0, 50 + breathe, 0, 80 + breathe);
      neckShadow.addColorStop(0, 'rgba(0,0,0,0.25)'); // Dark under chin
      neckShadow.addColorStop(1, 'transparent');
      ctx.fillStyle = neckShadow;
      ctx.beginPath();
      ctx.moveTo((-neckWidth / 2) + sway, 80 + breathe);
      ctx.lineTo((neckWidth / 2) + sway, 80 + breathe);
      ctx.lineTo((neckWidth / 2 - 2) + sway, 50 + breathe);
      ctx.lineTo((-neckWidth / 2 + 2) + sway, 50 + breathe);
      ctx.fill();


      // === OUTFIT DETAILS (Enhanced) ===
      if (c.outfitStyle === 'suit') {
        // Shirt V
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-18 + sway, 80 + breathe); ctx.lineTo(0 + sway, 115 + breathe); ctx.lineTo(18 + sway, 80 + breathe); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath(); ctx.moveTo(-18 + sway, 80 + breathe); ctx.lineTo(-15 + sway, 85 + breathe); ctx.lineTo(0 + sway, 115 + breathe); ctx.fill();
        // Tie
        ctx.fillStyle = c.accentColor || '#d00';
        ctx.beginPath();
        ctx.moveTo(0 + sway, 85 + breathe); ctx.lineTo(6 + sway, 105 + breathe);
        ctx.lineTo(0 + sway, 120 + breathe); ctx.lineTo(-6 + sway, 105 + breathe); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-2 + sway, 90 + breathe); ctx.lineTo(2 + sway, 100 + breathe); ctx.stroke();
      } else if (c.outfitStyle === 'tuxedo') {
        // White shirt V
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-18 + sway, 80 + breathe); ctx.lineTo(0 + sway, 110 + breathe); ctx.lineTo(18 + sway, 80 + breathe); ctx.fill();
        // Satin lapels
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.moveTo(-44 + sway, 80 + breathe); ctx.lineTo(-20 + sway, 80 + breathe); ctx.lineTo(-15 + sway, 120 + breathe); ctx.lineTo(-44 + sway, 120 + breathe); ctx.fill();
        ctx.beginPath(); ctx.moveTo(44 + sway, 80 + breathe); ctx.lineTo(20 + sway, 80 + breathe); ctx.lineTo(15 + sway, 120 + breathe); ctx.lineTo(44 + sway, 120 + breathe); ctx.fill();
        // Bow tie
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.moveTo(-8 + sway, 80 + breathe); ctx.lineTo(0 + sway, 84 + breathe); ctx.lineTo(8 + sway, 80 + breathe);
        ctx.lineTo(0 + sway, 76 + breathe); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0 + sway, 80 + breathe, 3, 0, Math.PI * 2); ctx.fill();
        // Lapel buttons
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2 + sway, 130 + breathe, 2, 0, Math.PI * 2); ctx.fill();
      } else if (c.outfitStyle === 'blazer') {
        // Blazer lapel
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.moveTo(-22 + sway, 82 + breathe); ctx.lineTo(0 + sway, 98 + breathe); ctx.lineTo(22 + sway, 82 + breathe); ctx.fill();
        // Blouse/shirt under blazer
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.moveTo(-12 + sway, 80 + breathe); ctx.lineTo(0 + sway, 100 + breathe); ctx.lineTo(12 + sway, 80 + breathe); ctx.fill();
        // Button
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(0 + sway, 118 + breathe, 2.5, 0, Math.PI * 2); ctx.fill();
        // Pocket square
        ctx.fillStyle = c.accentColor || '#fff';
        ctx.beginPath(); ctx.moveTo(-32 + sway, 95 + breathe); ctx.lineTo(-28 + sway, 85 + breathe); ctx.lineTo(-24 + sway, 95 + breathe); ctx.fill();
      } else if (c.outfitStyle === 'turtleneck') {
        // High collar folds
        ctx.fillStyle = outfit;
        ctx.beginPath(); ctx.ellipse(sway, 68 + breathe, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
        // Neck lines
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sway, 62 + breathe, 18, 0.3, Math.PI - 0.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(sway, 66 + breathe, 18, 0.3, Math.PI - 0.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(sway, 70 + breathe, 18, 0.3, Math.PI - 0.3); ctx.stroke();
      } else if (c.outfitStyle === 'hoodie') {
        // Hood behind head
        ctx.fillStyle = outfit;
        ctx.beginPath(); ctx.ellipse(hx, hy - 20, 65, 55, 0, Math.PI * 0.8, Math.PI * 0.2, true); ctx.fill();
        // Inner hood shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(hx, hy - 15, 58, 45, 0, Math.PI * 0.85, Math.PI * 0.15, true); ctx.fill();
        // Strings
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8 + sway, 80 + breathe); ctx.lineTo(-10 + sway, 115 + breathe); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8 + sway, 80 + breathe); ctx.lineTo(10 + sway, 115 + breathe); ctx.stroke();
        // Kangaroo pocket
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-30 + sway, 140 + breathe); ctx.quadraticCurveTo(0 + sway, 155 + breathe, 30 + sway, 140 + breathe); ctx.stroke();
      } else if (c.outfitStyle === 'gown' || c.outfitStyle === 'floral') {
        // Neckline (sweetheart for gown, round for floral)
        if (c.outfitStyle === 'gown') {
          ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-30 + sway, 80 + breathe);
          ctx.quadraticCurveTo(-15 + sway, 95 + breathe, 0 + sway, 88 + breathe);
          ctx.quadraticCurveTo(15 + sway, 95 + breathe, 30 + sway, 80 + breathe); ctx.stroke();
          // Sparkle details
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          for (let i = 0; i < 5; i++) {
            const yJitter = stableRand(characterSeed + i * 3.11 + 71) * 10;
            ctx.beginPath(); ctx.arc(-20 + i * 10 + sway, 85 + breathe + yJitter, 1, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          // Floral pattern dots
          ctx.fillStyle = 'rgba(255,200,200,0.2)';
          for (let i = 0; i < 8; i++) {
            const fx = -30 + stableRand(characterSeed + i * 2.23 + 101) * 60 + sway;
            const fy = 90 + stableRand(characterSeed + i * 2.77 + 119) * 60 + breathe;
            const fr = 3 + stableRand(characterSeed + i * 1.47 + 137) * 3;
            ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
          }
          // Bow at neckline
          ctx.fillStyle = c.accentColor || '#ec4899';
          ctx.beginPath(); ctx.moveTo(-6 + sway, 80 + breathe); ctx.lineTo(0 + sway, 86 + breathe); ctx.lineTo(6 + sway, 80 + breathe); ctx.fill();
        }
      } else if (c.outfitStyle === 'casual' || c.outfitStyle === 'denim') {
        // Collar Bone Hint
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-15 + sway, 65 + breathe); ctx.lineTo(-5 + sway, 70 + breathe); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(15 + sway, 65 + breathe); ctx.lineTo(5 + sway, 70 + breathe); ctx.stroke();
        // Tee Collar
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sway, 80 + breathe, 18, 0, Math.PI, false); ctx.stroke();
        if (c.outfitStyle === 'denim') {
          // Denim stitching
          ctx.strokeStyle = 'rgba(255,200,100,0.2)'; ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(-35 + sway, 85 + breathe); ctx.lineTo(-35 + sway, 165 + breathe); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(35 + sway, 85 + breathe); ctx.lineTo(35 + sway, 165 + breathe); ctx.stroke();
          ctx.setLineDash([]);
          // Buttons
          ctx.fillStyle = 'rgba(200,200,200,0.3)';
          ctx.beginPath(); ctx.arc(0 + sway, 95 + breathe, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(0 + sway, 110 + breathe, 2, 0, Math.PI * 2); ctx.fill();
        }
      } else if (c.outfitStyle === 'leather') {
        // Texture
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.rect(-20 + sway, 80 + breathe, 40, 60); ctx.fill();
        // Zipper
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(0 + sway, 80 + breathe); ctx.lineTo(0 + sway, 130 + breathe); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Generic fallback lapel
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.moveTo(-22 + sway, 82 + breathe); ctx.lineTo(0 + sway, 98 + breathe); ctx.lineTo(22 + sway, 82 + breathe); ctx.fill();
      }

      // === CHAINS & HEADPHONES (Accessories) ===
      if (c.accessories && c.accessories.includes('chain')) {
        const isGold = c.accessories === 'chain_gold';
        // Draw realistic chain links
        ctx.strokeStyle = isGold ? '#f59e0b' : '#94a3b8';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.ellipse(0 + sway, 78 + breathe, 34, 24, 0, 0, Math.PI);
        ctx.stroke();
        // Highlights
        ctx.strokeStyle = isGold ? '#fef3c7' : '#e2e8f0';
        ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; // Reset shadow!
      }

      if (c.accessories === 'headphones') {
        // Headband
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(hx, hy - 12, 64, Math.PI, 0); ctx.stroke();
        // Shine on band
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(hx, hy - 14, 64, Math.PI * 0.8, Math.PI * 0.2, true); ctx.stroke();

        // Ear Cups
        const drawCup = (x) => {
          ctx.fillStyle = '#0f172a';
          rr(ctx, x, hy - 35, 22, 55, 6); ctx.fill();
          // Inner pad
          ctx.fillStyle = '#1e293b';
          rr(ctx, x + (x < hx ? 12 : 2), hy - 35, 8, 55, 2); ctx.fill();
          // LED Ring (Gamer aesthetic)
          ctx.strokeStyle = c.accentColor || '#0ea5e9'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x + 11, hy - 8, 8, 0, Math.PI * 2); ctx.stroke();
        };
        drawCup(hx - 74);
        drawCup(hx + 52);
      }

      // === EARRINGS ===
      if (c.accessories === 'earrings_gold' || c.accessories === 'earrings_silver') {
        const isGold = c.accessories === 'earrings_gold';
        const earColor = isGold ? '#f59e0b' : '#94a3b8';
        const earShine = isGold ? '#fef3c7' : '#e2e8f0';
        // Left earring (hoop)
        ctx.strokeStyle = earColor; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(hx - 56, hy + 5, 8, 0, Math.PI * 2); ctx.stroke();
        // Shine
        ctx.strokeStyle = earShine; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(hx - 56, hy + 3, 4, Math.PI * 0.8, Math.PI * 1.5); ctx.stroke();
        // Right earring
        ctx.strokeStyle = earColor; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(hx + 56, hy + 5, 8, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = earShine; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(hx + 56, hy + 3, 4, Math.PI * 0.8, Math.PI * 1.5); ctx.stroke();
      }

      // === RINGS ===
      if (c.accessories === 'rings_gold' || c.accessories === 'rings_silver') {
        const isGold = c.accessories === 'rings_gold';
        const ringCol = isGold ? '#f59e0b' : '#94a3b8';
        // Ring on left hand finger
        ctx.strokeStyle = ringCol; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(-30 + sway, 185 + breathe, 5, 3, 0, 0, Math.PI * 2); ctx.stroke();
        // Gem sparkle
        ctx.fillStyle = isGold ? '#ef4444' : '#3b82f6';
        ctx.beginPath(); ctx.arc(-30 + sway, 183 + breathe, 2.5, 0, Math.PI * 2); ctx.fill();
        // Ring on right hand
        ctx.strokeStyle = ringCol; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(30 + sway, 185 + breathe, 5, 3, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = isGold ? '#a855f7' : '#10b981';
        ctx.beginPath(); ctx.arc(30 + sway, 183 + breathe, 2.5, 0, Math.PI * 2); ctx.fill();
      }

      // === WATCH ===
      if (c.accessories === 'watch_gold' || c.accessories === 'watch_silver') {
        const isGold = c.accessories === 'watch_gold';
        const watchCol = isGold ? '#f59e0b' : '#94a3b8';
        const bandCol = isGold ? '#78350f' : '#1e293b';
        // Watch band (left wrist)
        ctx.fillStyle = bandCol;
        rr(ctx, -48 + sway, 170 + breathe, 16, 22, 4); ctx.fill();
        // Watch face
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(-40 + sway, 181 + breathe, 7, 0, Math.PI * 2); ctx.fill();
        // Watch bezel
        ctx.strokeStyle = watchCol; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(-40 + sway, 181 + breathe, 7, 0, Math.PI * 2); ctx.stroke();
        // Watch hands
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-40 + sway, 181 + breathe); ctx.lineTo(-40 + sway, 176 + breathe); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-40 + sway, 181 + breathe); ctx.lineTo(-36 + sway, 181 + breathe); ctx.stroke();
      }

      // === BANDANA ===
      if (c.accessories === 'bandana') {
        ctx.fillStyle = '#dc2626';
        // Headband wrap
        ctx.beginPath();
        ctx.moveTo(hx - 56, hy - 28);
        ctx.quadraticCurveTo(hx, hy - 45, hx + 56, hy - 28);
        ctx.quadraticCurveTo(hx, hy - 35, hx - 56, hy - 28);
        ctx.fill();
        // Knot (right side)
        ctx.beginPath();
        ctx.moveTo(hx + 52, hy - 30);
        ctx.quadraticCurveTo(hx + 68, hy - 22, hx + 60, hy - 10);
        ctx.lineTo(hx + 55, hy - 15);
        ctx.quadraticCurveTo(hx + 62, hy - 25, hx + 50, hy - 30);
        ctx.fill();
        // Fabric pattern (subtle dots)
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath(); ctx.arc(hx + i * 14, hy - 35 + Math.abs(i) * 1.5, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
    };
    drawVectorOutfit();

    // Arms with MUSCLE/FAT SHADING & GESTURES
    for (const side of [-1, 1]) {
      let armRot = side * 0.1 + yaw * side * 0.05;
      let armSwing = Math.sin(time * 2 + side * 1.5) * 4;
      let handShape = 'normal';

      // === GESTURE OVERRIDES ===
      if (gesture && gesture.active && side === 1) { // Right Arm Actions
        if (gesture.type === 'wave') {
          // Wave Logic: Arm up, forearm waves
          armRot = -2.5 + Math.sin(time * 10) * 0.2;
          armSwing = 0;
          handShape = 'open';
        } else if (gesture.type === 'thumbs_up') {
          // Thumbs Up: Arm out, hand up
          armRot = -1.5;
          armSwing = 0;
          handShape = 'thumb';
        } else if (gesture.type === 'point') {
          armRot = -1.2;
          handShape = 'point';
        }
      }

      ctx.fillStyle = outfit;
      ctx.save();
      ctx.translate(side * 48 + sway, 95 + breathe);
      ctx.rotate(armRot + armSwing * 0.02);

      // Arm Shape
      rr(ctx, -12, 0, 24, 70, 10);
      ctx.fill();
      addNoise(ctx, -12, 0, 24, 70, 0.05, characterSeed + (side === -1 ? 37 : 41)); // Arm Texture

      // Arm Cylinder Gradient
      const armGrad = ctx.createLinearGradient(-12, 0, 12, 0);
      armGrad.addColorStop(0, 'rgba(0,0,0,0.2)');
      armGrad.addColorStop(0.3, 'transparent');
      armGrad.addColorStop(0.7, 'transparent');
      armGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = armGrad;
      ctx.fill();

      // Cloth Fold at Elbow (Inner) - Hide if arm is raised high
      if (armRot > -1) {
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8, 30); ctx.quadraticCurveTo(0, 35, 8, 32); ctx.stroke();
      }

      // Hand with Skin Shading
      ctx.fillStyle = skin;

      if (handShape === 'normal') {
        ctx.beginPath(); ctx.ellipse(0, 72 + armSwing * 0.3, 12, 13, 0, 0, Math.PI * 2); ctx.fill();
      } else if (handShape === 'open') {
        // Waving Hand
        ctx.beginPath(); ctx.ellipse(0, 74, 14, 16, 0, 0, Math.PI * 2); ctx.fill();
        // Fingers
        ctx.beginPath(); ctx.moveTo(-10, 65); ctx.lineTo(-12, 55); ctx.lineWidth = 4; ctx.strokeStyle = skin; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-4, 60); ctx.lineTo(-5, 48); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, 60); ctx.lineTo(5, 48); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10, 65); ctx.lineTo(12, 55); ctx.stroke();
      } else if (handShape === 'thumb') {
        // Thumbs Up Fist
        ctx.beginPath(); ctx.arc(0, 72, 14, 0, Math.PI * 2); ctx.fill();
        // Thumb
        ctx.beginPath(); ctx.moveTo(5, 65); ctx.lineTo(8, 50); ctx.lineWidth = 6; ctx.strokeStyle = skin; ctx.lineCap = 'round'; ctx.stroke();
      }

      // Knuckles shading (only for normal)
      if (handShape === 'normal') {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath(); ctx.ellipse(-4, 74 + armSwing * 0.3, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, 74 + armSwing * 0.3, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();
    }

    // Head Base
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(hx, hy + 2, 52, 64, 0, 0, Math.PI * 2); ctx.fill();

    // FACE CONTOURING (The "Realism" Secret)
    // 1. Base Gradient (Simulate 3D Sphere)
    const faceGrad = ctx.createRadialGradient(hx - 15, hy - 20, 10, hx, hy, 65);
    faceGrad.addColorStop(0, 'rgba(255,255,255,0.25)'); // Highlight on forehead/nose
    faceGrad.addColorStop(0.5, 'transparent');
    faceGrad.addColorStop(1, 'rgba(0,0,0,0.15)'); // Shadow on edges (jawline)
    ctx.fillStyle = faceGrad;
    ctx.fill();

    // 2. Subsurface Scattering (Redness where skin is thin)
    // Ears
    ctx.fillStyle = 'rgba(255, 50, 50, 0.08)';
    ctx.beginPath(); ctx.ellipse(hx - 58, hy, 8, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 58, hy, 8, 15, 0, 0, Math.PI * 2); ctx.fill();

    // Nose Warmth
    ctx.fillStyle = 'rgba(255, 100, 50, 0.1)';
    ctx.beginPath(); ctx.arc(hx, hy + 20, 15, 0, Math.PI * 2); ctx.fill();

    // Blush / Subsurface Scattering
    ctx.fillStyle = 'rgba(255, 100, 100, 0.06)';
    ctx.beginPath(); ctx.ellipse(hx - 30, hy + 10, 15, 10, 0.2, 0, Math.PI * 2); ctx.fill(); // Left Cheek
    ctx.beginPath(); ctx.ellipse(hx + 30, hy + 10, 15, 10, -0.2, 0, Math.PI * 2); ctx.fill(); // Right Cheek
    ctx.beginPath(); ctx.ellipse(hx, hy + 15, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); // Nose Tip

    // Rim Lighting (Cinematic Backlight)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy - 40, 56, Math.PI, 0); // Hair rim
    ctx.stroke();
    ctx.restore();

    // === HAIR STYLES (Volumetric) ===
    const drawHairStrands = () => {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
      // Add some random strokes for detail
      ctx.beginPath(); ctx.moveTo(hx - 20, hy - 50); ctx.quadraticCurveTo(hx, hy - 60, hx + 20, hy - 50); ctx.stroke();
    };

    ctx.fillStyle = hair;
    if (c.hairStyle === 'short') {
      ctx.beginPath(); ctx.ellipse(hx, hy - 40, 58, 28, 0, 0, Math.PI * 2); ctx.fill();
      // Sideburns
      ctx.beginPath(); ctx.moveTo(hx - 54, hy - 30); ctx.lineTo(hx - 54, hy); ctx.lineTo(hx - 48, hy - 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + 54, hy - 30); ctx.lineTo(hx + 54, hy); ctx.lineTo(hx + 48, hy - 10); ctx.fill();
    } else if (c.hairStyle === 'long') {
      ctx.beginPath(); ctx.ellipse(hx, hy - 32, 62, 42, 0, 0, Math.PI * 2); ctx.fill();
      // Flowing locks behind
      ctx.beginPath(); ctx.moveTo(hx - 60, hy - 10); ctx.quadraticCurveTo(hx - 70, hy + 40, hx - 40, hy + 80); ctx.lineTo(hx - 30, hy + 80); ctx.lineTo(hx - 40, hy); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + 60, hy - 10); ctx.quadraticCurveTo(hx + 70, hy + 40, hx + 40, hy + 80); ctx.lineTo(hx + 30, hy + 80); ctx.lineTo(hx + 40, hy); ctx.fill();
    } else if (c.hairStyle === 'buzz') {
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(hx, hy - 30, 56, Math.PI, 0); ctx.fill();
      // Texture
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      for (let i = 0; i < 20; i++) {
        const tx = stableRand(characterSeed + i * 1.81 + 151) * 100;
        const ty = stableRand(characterSeed + i * 2.07 + 167) * 40;
        ctx.fillRect(hx - 50 + tx, hy - 80 + ty, 2, 2);
      }
    } else if (c.hairStyle === 'bob') {
      ctx.beginPath(); ctx.ellipse(hx, hy - 30, 60, 35, 0, 0, Math.PI * 2); ctx.fill(); // Top
      // Sharp Cuts
      ctx.fillRect(hx - 62, hy - 20, 24, 70);
      ctx.fillRect(hx + 38, hy - 20, 24, 70);
    } else if (c.hairStyle === 'ponytail') {
      // Top volume
      ctx.beginPath(); ctx.ellipse(hx, hy - 40, 58, 30, 0, 0, Math.PI * 2); ctx.fill();
      // Hair tie area (small cinch)
      ctx.beginPath(); ctx.ellipse(hx + 5, hy - 65, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
      // Ponytail flowing back
      ctx.beginPath();
      ctx.moveTo(hx + 5, hy - 70);
      ctx.quadraticCurveTo(hx + 50, hy - 90, hx + 45, hy - 30);
      ctx.quadraticCurveTo(hx + 40, hy + 10, hx + 20, hy + 30);
      ctx.lineTo(hx + 10, hy + 20);
      ctx.quadraticCurveTo(hx + 30, hy - 10, hx + 30, hy - 50);
      ctx.quadraticCurveTo(hx + 25, hy - 75, hx + 5, hy - 70);
      ctx.fill();
      // Hair tie band
      ctx.fillStyle = '#e11d48';
      ctx.beginPath(); ctx.ellipse(hx + 5, hy - 65, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else if (c.hairStyle === 'bun') {
      // Base hair cap
      ctx.beginPath(); ctx.ellipse(hx, hy - 38, 56, 26, 0, 0, Math.PI * 2); ctx.fill();
      // Bun on top
      ctx.beginPath(); ctx.arc(hx, hy - 72, 18, 0, Math.PI * 2); ctx.fill();
      // Bun highlight
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.arc(hx - 4, hy - 76, 8, 0, Math.PI * 2); ctx.fill();
      // Wrap detail
      ctx.fillStyle = hair;
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hx, hy - 72, 18, 0, Math.PI * 2); ctx.stroke();
    } else if (c.hairStyle === 'pompadour') {
      // Big swooped front
      ctx.beginPath();
      ctx.moveTo(hx - 55, hy - 20);
      ctx.quadraticCurveTo(hx - 60, hy - 60, hx - 20, hy - 78);
      ctx.quadraticCurveTo(hx, hy - 90, hx + 20, hy - 78);
      ctx.quadraticCurveTo(hx + 60, hy - 60, hx + 55, hy - 20);
      ctx.fill();
      // Volume highlight
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(hx - 30, hy - 50);
      ctx.quadraticCurveTo(hx, hy - 85, hx + 30, hy - 50);
      ctx.fill();
      // Sides (tapered)
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.moveTo(hx - 54, hy - 30); ctx.lineTo(hx - 52, hy + 5); ctx.lineTo(hx - 46, hy - 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + 54, hy - 30); ctx.lineTo(hx + 52, hy + 5); ctx.lineTo(hx + 46, hy - 5); ctx.fill();
    } else if (c.hairStyle === 'curly') {
      // Curly volume (multiple overlapping circles)
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2;
        const cx = hx + Math.cos(angle) * 42;
        const cy = hy - 35 + Math.sin(angle) * 25;
        const radius = 18 + stableRand(characterSeed + i * 1.57 + 181) * 6;
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
      }
      // Center volume
      ctx.beginPath(); ctx.ellipse(hx, hy - 42, 50, 35, 0, 0, Math.PI * 2); ctx.fill();
    } else if (c.hairStyle === 'afro') {
      // Large round afro
      ctx.beginPath(); ctx.arc(hx, hy - 30, 75, 0, Math.PI * 2); ctx.fill();
      // Texture (small circles for volume)
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i < 30; i++) {
        const angle = stableRand(characterSeed + i * 1.37 + 211) * Math.PI * 2;
        const r = stableRand(characterSeed + i * 1.89 + 227) * 60;
        const radius = 4 + stableRand(characterSeed + i * 1.21 + 239) * 4;
        ctx.beginPath();
        ctx.arc(hx + Math.cos(angle) * r, hy - 30 + Math.sin(angle) * r, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Default/Messy
      ctx.beginPath(); ctx.ellipse(hx, hy - 40, 58, 30, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx, hy - 50, 40, Math.PI, 0); ctx.fill();
      // Messy strands
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(hx + i * 12, hy - 55);
        ctx.quadraticCurveTo(hx + i * 15, hy - 70 - Math.abs(i) * 3, hx + i * 10, hy - 60);
        ctx.stroke();
      }
    }
    drawHairStrands();


    // === REALISTIC EYES ===
    const eyeSpacing = 21;
    const eyeY = hy - 5;
    for (const side of [-1, 1]) {
      const ex = hx + side * eyeSpacing;
      const op = side < 0 ? f.leftEye.openness : f.rightEye.openness;
      const eH = Math.max(1.2, 9 * op);
      const eyeWhiteColor = '#fdfdfd';

      // 1. Sclera (White) with Shadow
      const scleraGrad = ctx.createRadialGradient(ex, eyeY, 2, ex, eyeY, 12);
      scleraGrad.addColorStop(0, '#fff');
      scleraGrad.addColorStop(1, '#eee'); // Darker edges
      ctx.fillStyle = scleraGrad;
      ctx.beginPath(); ctx.ellipse(ex, eyeY, 11.5, eH, 0, 0, Math.PI * 2); ctx.fill();

      if (op > 0.15) {
        // 2. Iris (Detailed)
        const irisSize = 5.2;
        const lookX = yaw * 4.8;
        const lookY = pitch * 3.5;

        const irisGrad = ctx.createRadialGradient(ex + lookX, eyeY + lookY, 1, ex + lookX, eyeY + lookY, irisSize);
        irisGrad.addColorStop(0, c.eyeColor || '#6366f1'); // Inner color
        irisGrad.addColorStop(0.7, '#312e81'); // Outer rim
        irisGrad.addColorStop(1, '#1e1b4b'); // Edge
        ctx.fillStyle = irisGrad;

        ctx.beginPath();
        // Clip iris to eyelid
        ctx.save();
        ctx.beginPath(); ctx.ellipse(ex, eyeY, 11.5, eH, 0, 0, Math.PI * 2); ctx.clip();
        ctx.beginPath(); ctx.arc(ex + lookX, eyeY + lookY, irisSize, 0, Math.PI * 2); ctx.fill();

        // 3. Pupil
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(ex + lookX, eyeY + lookY, 2.4, 0, Math.PI * 2); ctx.fill();

        // 4. Catchlight (The "Soul")
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(ex + lookX - 2, eyeY + lookY - 2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // 5. Eyelid Crease
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(ex, eyeY - 4.5, 10, 3, 0, Math.PI, 0); ctx.stroke();

      // 6. Eyelashes (Subtle)
      if (op > 0.3) {
        ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ex - 8, eyeY - eH + 2);
        ctx.quadraticCurveTo(ex, eyeY - eH - 1.2, ex + 8, eyeY - eH + 2);
        ctx.stroke();
      }
    }

    // Glasses handling
    if (c.glasses && c.glasses !== 'none') {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      if (c.glasses === 'round') {
        ctx.beginPath(); ctx.arc(hx - 24, eyeY, 19, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 24, eyeY, 19, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx - 5, eyeY); ctx.lineTo(hx + 5, eyeY); ctx.stroke();
      } else if (c.glasses === 'square') {
        ctx.beginPath(); ctx.rect(hx - 42, eyeY - 14, 36, 28); ctx.stroke(); ctx.fill();
        ctx.beginPath(); ctx.rect(hx + 6, eyeY - 14, 36, 28); ctx.stroke(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx - 6, eyeY - 5); ctx.lineTo(hx + 6, eyeY - 5); ctx.stroke();
      } else if (c.glasses === 'aviator') {
        // Teardrop shape aviators
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#d4af37'; // Gold frames
        ctx.fillStyle = 'rgba(100,100,150,0.2)'; // Tinted lenses
        // Left lens
        ctx.beginPath();
        ctx.moveTo(hx - 8, eyeY - 12); ctx.quadraticCurveTo(hx - 42, eyeY - 14, hx - 42, eyeY + 4);
        ctx.quadraticCurveTo(hx - 40, eyeY + 18, hx - 24, eyeY + 16);
        ctx.quadraticCurveTo(hx - 8, eyeY + 14, hx - 8, eyeY - 12);
        ctx.fill(); ctx.stroke();
        // Right lens
        ctx.beginPath();
        ctx.moveTo(hx + 8, eyeY - 12); ctx.quadraticCurveTo(hx + 42, eyeY - 14, hx + 42, eyeY + 4);
        ctx.quadraticCurveTo(hx + 40, eyeY + 18, hx + 24, eyeY + 16);
        ctx.quadraticCurveTo(hx + 8, eyeY + 14, hx + 8, eyeY - 12);
        ctx.fill(); ctx.stroke();
        // Bridge
        ctx.beginPath(); ctx.moveTo(hx - 8, eyeY - 8); ctx.lineTo(hx + 8, eyeY - 8); ctx.stroke();
      } else if (c.glasses === 'catseye') {
        // Angular cat-eye frames
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#6d28d9'; // Purple frames
        ctx.fillStyle = 'rgba(200,180,255,0.12)';
        // Left lens
        ctx.beginPath();
        ctx.moveTo(hx - 6, eyeY - 10);
        ctx.lineTo(hx - 42, eyeY - 16); // Upswept corner
        ctx.lineTo(hx - 42, eyeY + 10);
        ctx.lineTo(hx - 6, eyeY + 10);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Right lens
        ctx.beginPath();
        ctx.moveTo(hx + 6, eyeY - 10);
        ctx.lineTo(hx + 42, eyeY - 16);
        ctx.lineTo(hx + 42, eyeY + 10);
        ctx.lineTo(hx + 6, eyeY + 10);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Bridge
        ctx.beginPath(); ctx.moveTo(hx - 6, eyeY - 5); ctx.lineTo(hx + 6, eyeY - 5); ctx.stroke();
      } else if (c.glasses === 'thick') {
        // Bold thick-rimmed glasses
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#1e1e1e';
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.arc(hx - 24, eyeY, 18, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 24, eyeY, 18, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(hx - 6, eyeY); ctx.lineTo(hx + 6, eyeY); ctx.stroke();
      }
    }

    // Eyebrows (Expressive)
    const drawBrow = (x, y, level) => {
      ctx.strokeStyle = hair;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Default Arch
      let yMod = (0.5 - level) * 15;
      let curve = (level - 0.5) * 10;

      ctx.moveTo(x - 10, y + yMod);
      ctx.quadraticCurveTo(x, y + yMod - 3 - curve, x + 10, y + yMod);
      ctx.stroke();
    };
    drawBrow(hx - 24, hy - 20, f.leftEyebrow);
    drawBrow(hx + 24, hy - 20, f.rightEyebrow);


    // Beard
    if (c.beard && c.beard !== 'none') {
      ctx.fillStyle = hair + '90';
      if (c.beard === 'stubble') {
        ctx.beginPath(); ctx.arc(hx, hy + 30, 42, 0, Math.PI, false); ctx.fill();
      } else if (c.beard === 'goatee') {
        ctx.beginPath(); ctx.ellipse(hx, hy + 48, 12, 12, 0, 0, Math.PI * 2); ctx.fill();
      } else if (c.beard === 'full') {
        ctx.beginPath(); ctx.ellipse(hx, hy + 32, 46, 38, 0, 0, Math.PI); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx - 46, hy + 32); ctx.lineTo(hx - 54, hy - 10); ctx.lineTo(hx - 40, hy); ctx.fill(); // Connections
        ctx.beginPath(); ctx.moveTo(hx + 46, hy + 32); ctx.lineTo(hx + 54, hy - 10); ctx.lineTo(hx + 40, hy); ctx.fill();
      }
    }

    // NOSE (Shaded)
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(hx - 2.5, hy + 5);
    ctx.quadraticCurveTo(hx - 1, hy + 18, hx - 0.5, hy + 23);
    ctx.quadraticCurveTo(hx, hy + 25, hx + 0.5, hy + 23);
    ctx.quadraticCurveTo(hx + 1, hy + 18, hx + 2.5, hy + 5);
    ctx.quadraticCurveTo(hx + 1, hy + 17, hx + 0.5, hy + 22);
    ctx.quadraticCurveTo(hx, hy + 24, hx - 0.5, hy + 22);
    ctx.quadraticCurveTo(hx - 1, hy + 17, hx - 2.5, hy + 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath(); ctx.ellipse(hx - 3.3, hy + 24, 1.6, 1.1, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 3.3, hy + 24, 1.6, 1.1, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.ellipse(hx - 1, hy + 13, 1.5, 5, -0.15, 0, Math.PI * 2); ctx.fill();


    // Mouth — Enhanced Lip Design with Better Visibility & Phoneme Support
    const mY = hy + 38;
    const mOpen = f.mouth.openness;
    const smileFactor = f.mouth.smile; // -1 to 1
    const roundness = f.mouth.roundness || 0;
    const mouthWidth = f.mouth.width || 0.5;

    // INCREASED RESPONSIVENESS — natural speaking mouth
    // Openness range: 0-1 → mouth height 2-12px (was 2-10px)
    const baseW = 10 + (mouthWidth * 8) + (smileFactor > 0.5 ? 2 : 0);
    const mW = baseW * (1 - roundness * 0.25); // Width affected by roundness (rounded = narrower)
    
    // Enhanced height calculation — more visible opening
    const mH = 1.2 + (mOpen * 8.5) * (1 + roundness * 0.2);

    const cornerY = mY - (smileFactor * 7); // Smile affects vertical position
    
    // Dynamic lip color based on mouth state
    const lipColor = isFemale ? '#c8597a' : '#9d7f65';
    const lipDark = isFemale ? '#8e3a57' : '#705947';
    const lipShade = isFemale ? 'rgba(142, 58, 87, 0.28)' : 'rgba(112, 89, 71, 0.24)';

    ctx.lineWidth = isFemale ? 2.0 : 1.5;

    if (mOpen > 0.05) {
      // === SPEAKING MOUTH — Enhanced with roundness support ===

      // Roundness affects mouth shape:
      // High roundness (O,U sounds): more rounded/pursed
      // Low roundness (E,I sounds): more spread/smiling
      
      const upperCurveAmount = 2 + (roundness * 2); // More curve = more rounded
      const lowerCurveAmount = 2 + (roundness * 3);

      // Upper lip - more defined
      ctx.beginPath();
      ctx.moveTo(hx - mW, cornerY);
      ctx.quadraticCurveTo(hx - mW * 0.3, cornerY - upperCurveAmount - 1, hx, cornerY - 2);
      ctx.quadraticCurveTo(hx + mW * 0.3, cornerY - upperCurveAmount - 1, hx + mW, cornerY);
      ctx.lineTo(hx + mW * 0.6, cornerY + mH + lowerCurveAmount);
      ctx.quadraticCurveTo(hx, cornerY + mH + 4, hx - mW * 0.6, cornerY + mH + lowerCurveAmount);
      ctx.closePath();

      // Fill with gradient for depth
      const mouthGrad = ctx.createLinearGradient(hx, cornerY, hx, cornerY + mH + 4);
      mouthGrad.addColorStop(0, lipColor);
      mouthGrad.addColorStop(0.5, lipDark);
      mouthGrad.addColorStop(1, lipDark);
      ctx.fillStyle = mouthGrad;
      ctx.fill();

      // Inner mouth cavity — darker and more pronounced
      if (mH > 2) {
        // Tooth area
        ctx.fillStyle = 'rgba(40, 15, 15, 0.85)';
        ctx.beginPath();
        ctx.ellipse(hx, cornerY + mH * 0.5, mW * 0.65, mH * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Teeth highlight — more visible
        if (mH > 3.5) {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.moveTo(hx - mW * 0.3, cornerY + 1.5);
          ctx.lineTo(hx + mW * 0.3, cornerY + 1.5);
          ctx.lineTo(hx + mW * 0.25, cornerY + 3);
          ctx.lineTo(hx - mW * 0.25, cornerY + 3);
          ctx.fill();

          // Tongue hint (on wide mouths)
          if (mW > 18) {
            ctx.fillStyle = 'rgba(200, 80, 80, 0.4)';
            ctx.beginPath();
            ctx.ellipse(hx, cornerY + mH * 0.7, mW * 0.5, mH * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Lip outline — more prominent for clarity
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = isFemale ? 2.0 : 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Upper lip outline
      ctx.beginPath();
      ctx.moveTo(hx - mW, cornerY);
      ctx.quadraticCurveTo(hx - mW * 0.3, cornerY - upperCurveAmount - 1, hx, cornerY - 2);
      ctx.quadraticCurveTo(hx + mW * 0.3, cornerY - upperCurveAmount - 1, hx + mW, cornerY);
      ctx.stroke();
      
      // Lower lip outline
      ctx.beginPath();
      ctx.moveTo(hx - mW, cornerY);
      ctx.quadraticCurveTo(hx - mW * 0.6, cornerY + mH + lowerCurveAmount, hx, cornerY + mH + 4);
      ctx.quadraticCurveTo(hx + mW * 0.6, cornerY + mH + lowerCurveAmount, hx + mW, cornerY);
      ctx.stroke();

      // Subtle shadow under lower lip for depth
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.ellipse(hx, cornerY + mH + 4.5, mW * 0.5, 1.5, 0, 0, Math.PI);
      ctx.fill();

    } else {
      // === CLOSED MOUTH — still dynamic based on smile ===
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = isFemale ? 1.8 : 1.4;
      ctx.lineCap = 'round';
      
      // Closed mouth line with smile curve
      const mouthCurve = -smileFactor * 4; // Negative smile pulls down
      ctx.beginPath();
      ctx.moveTo(hx - mW, cornerY);
      ctx.bezierCurveTo(hx - mW / 2, cornerY + mouthCurve + 1, hx + mW / 2, cornerY + mouthCurve + 1, hx + mW, cornerY);
      ctx.stroke();

      // Lip tint — visible even when closed
      ctx.fillStyle = lipShade;
      ctx.beginPath();
      ctx.moveTo(hx - mW, cornerY);
      ctx.bezierCurveTo(hx - mW / 2, cornerY - 2.5, hx + mW / 2, cornerY - 2.5, hx + mW, cornerY);
      ctx.quadraticCurveTo(hx + mW / 2, cornerY + 1.5, hx - mW / 2, cornerY + 1.5);
      ctx.closePath();
      ctx.fill();
    }

    // Dimples (On strong smile)
    if (smileFactor > 0.3) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.arc(hx - mW - 6, cornerY - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx + mW + 6, cornerY - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // === DRAW LISTENING MIC ===
    drawMicrophone(ctx, hx, hy, breathe, sway, yaw);
  } catch (err) {
    console.error("Vector Render Error:", err);
  }
  ctx.restore(); // End Global Isolation
}

// Keep explicit animal drawing logic

export function drawFullAnimal(ctx, c, f, time, faceImg) {
  const sway = Math.sin(time) * 1.5;
  const breathe = Math.sin(time * 2) * 2;
  const talking = f.mouth.openness > 0.1;
  const yaw = f.head.yaw;
  const pitch = f.head.pitch;

  // Normalized coordinates (Centered at 0,0 like humans)
  const hx = sway + yaw * 10;
  const hy = -20 + breathe + pitch * 10;

  // Sitting Body (Shoulders visible)
  ctx.fillStyle = c.skinColor || '#aaa';
  ctx.beginPath();
  // Torso shape
  ctx.ellipse(hx, hy + 140, 70, 90, 0, 0, Math.PI * 2);
  ctx.fill();

  // "Hands/Paws" on desk (hint)
  ctx.fillStyle = c.skinColor || '#aaa';
  ctx.beginPath(); ctx.ellipse(hx - 40, hy + 180, 20, 15, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + 40, hy + 180, 20, 15, -0.2, 0, Math.PI * 2); ctx.fill();


  // Head
  const headColor = c.skinColor;

  ctx.fillStyle = headColor;
  ctx.beginPath();
  if (c.animalType === 'cat') {
    ctx.ellipse(hx, hy, 70, 60, 0, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.beginPath(); ctx.moveTo(hx - 50, hy - 40); ctx.lineTo(hx - 70, hy - 100); ctx.lineTo(hx - 20, hy - 50); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 50, hy - 40); ctx.lineTo(hx + 70, hy - 100); ctx.lineTo(hx + 20, hy - 50); ctx.fill();
  } else if (c.animalType === 'fox') {
    ctx.ellipse(hx, hy, 70, 65, 0, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.moveTo(hx - 50, hy - 40); ctx.lineTo(hx - 80, hy - 110); ctx.lineTo(hx - 20, hy - 50); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(hx - 55, hy - 50); ctx.lineTo(hx - 75, hy - 100); ctx.lineTo(hx - 30, hy - 55); ctx.fill();

    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.moveTo(hx + 50, hy - 40); ctx.lineTo(hx + 80, hy - 110); ctx.lineTo(hx + 20, hy - 50); ctx.fill();
  } else {
    // Dog
    ctx.ellipse(hx, hy, 75, 75, 0, 0, Math.PI * 2); ctx.fill();
    // Floppy Ears
    ctx.fillStyle = '#b45309';
    // Reactive ears
    const earLift = f.leftEyebrow > 0.6 ? -10 : 0;
    ctx.beginPath(); ctx.ellipse(hx - 70, hy + earLift, 25, 50, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 70, hy + earLift, 25, 50, -0.2, 0, Math.PI * 2); ctx.fill();
  }

  // Eyes (Emotion Responsive & Realistic)
  const blink = f.leftEye.openness < 0.1;
  const squint = f.leftEye.openness < 0.5 && !blink;

  if (!blink) {
    // Sclera
    const eyeParams = squint ? [15, 10] : [16, 19];
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(hx - 30, hy - 10, eyeParams[0], eyeParams[1], 0, 0, Math.PI * 2); ctx.fill(); // Left
    ctx.beginPath(); ctx.ellipse(hx + 30, hy - 10, eyeParams[0], eyeParams[1], 0, 0, Math.PI * 2); ctx.fill(); // Right

    // Iris (Color)
    ctx.fillStyle = c.eyeColor || '#3b82f6';
    const py = hy - 10 + (squint ? 0 : (f.head.pitch * 5));
    ctx.beginPath(); ctx.arc(hx - 28 + f.head.yaw * 10, py, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 32 + f.head.yaw * 10, py, 9, 0, Math.PI * 2); ctx.fill();

    // Pupil
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(hx - 28 + f.head.yaw * 10, py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 32 + f.head.yaw * 10, py, 5, 0, Math.PI * 2); ctx.fill();

    // Catchlight (Sparkle)
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(hx - 30 + f.head.yaw * 10, py - 3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 30 + f.head.yaw * 10, py - 3, 2.5, 0, Math.PI * 2); ctx.fill();

    // Angry/Sad Eyebrows (Fur pattern)
    if (f.leftEyebrow < 0.3) {
      // Angry
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(hx - 45, hy - 25); ctx.lineTo(hx - 15, hy - 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + 45, hy - 25); ctx.lineTo(hx + 15, hy - 15); ctx.stroke();
    } else if (f.leftEyebrow > 0.8) {
      // Sad
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(hx - 45, hy - 15); ctx.lineTo(hx - 15, hy - 25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + 45, hy - 15); ctx.lineTo(hx + 15, hy - 25); ctx.stroke();
    }

  } else {
    // Blink
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx - 45, hy - 10); ctx.quadraticCurveTo(hx - 30, hy - 5, hx - 15, hy - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 45, hy - 10); ctx.quadraticCurveTo(hx + 30, hy - 5, hx + 15, hy - 10); ctx.stroke();
  }

  // Snout
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(hx, hy + 30, 25, 20, 0, 0, Math.PI * 2); ctx.fill();
  // Nose
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(hx, hy + 25, 8, 0, Math.PI * 2); ctx.fill();

  // Mouth
  if (talking) {
    ctx.fillStyle = '#5a1a1a';
    // Smile factor
    const smile = f.mouth.smile > 0.5 ? 5 : (f.mouth.smile < 0 ? -5 : 0);
    ctx.beginPath();
    ctx.ellipse(hx, hy + 45 + smile, 12 + f.mouth.openness * 12, 6 + f.mouth.openness * 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Closed line
    const smile = f.mouth.smile * 5;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx - 15, hy + 40 - smile);
    ctx.quadraticCurveTo(hx, hy + 50, hx + 15, hy + 40 - smile);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx, hy + 35); ctx.lineTo(hx, hy + 45); ctx.stroke();
  }

  // === PODCAST MIC ===
  drawMicrophone(ctx, hx, hy, breathe, sway, yaw);
}

export function drawFullRobot(ctx, c, f, time) {
  const sway = Math.sin(time) * 1;
  const breathe = Math.sin(time * 3) * 2;
  const yaw = f.head.yaw;
  const pitch = f.head.pitch;

  // Normalized 0,0 Center
  const hx = sway + yaw * 5;
  const hy = -30 + breathe + pitch * 5;
  const color = c.skinColor || '#cbd5e1';

  // Body (Shoulders)
  ctx.fillStyle = '#334155';
  rr(ctx, hx - 60, hy + 60, 120, 140, 20); ctx.fill();

  // Neck
  ctx.fillStyle = '#64748b';
  ctx.fillRect(hx - 20, hy + 30, 40, 40);

  // Head
  if (c.bodyType === 'alien') {
    // Alien Head
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(hx, hy + 70);
    ctx.bezierCurveTo(hx - 70, hy + 20, hx - 90, hy - 80, hx, hy - 90);
    ctx.bezierCurveTo(hx + 90, hy - 80, hx + 70, hy + 20, hx, hy + 70);
    ctx.fill();

    // Alien Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(hx - 30, hy - 10, 20, 35, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 30, hy - 10, 20, 35, -0.4, 0, Math.PI * 2); ctx.fill();

    // Pupil (Glow)
    if (f.leftEye.openness > 0.5) {
      ctx.fillStyle = '#fff';
      if (f.leftEyebrow < 0.3) ctx.fillStyle = '#ff0000'; // Angry Alien
      ctx.beginPath(); ctx.arc(hx - 25, hy - 15, 3 + f.leftEye.openness * 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + 35, hy - 15, 3 + f.leftEye.openness * 2, 0, Math.PI * 2); ctx.fill();
    }

  } else {
    // Robot Head
    ctx.fillStyle = color;
    rr(ctx, hx - 60, hy - 70, 120, 130, 25); ctx.fill();

    // Screen Face
    ctx.fillStyle = '#000';
    rr(ctx, hx - 50, hy - 50, 100, 90, 10); ctx.fill();

    // Digital Eyes
    let eyeColor = c.robotType === 'sleek' ? '#ec4899' : '#0ea5e9';
    if (f.mouth.smile < -0.2) eyeColor = '#nf4444'; // Angry robot
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor; ctx.shadowBlur = 15;

    const blink = f.leftEye.openness < 0.1;

    if (!blink) {
      if (c.robotType === 'sleek') {
        const h = 15 * f.leftEye.openness;
        ctx.beginPath(); ctx.ellipse(hx - 25, hy - 20, 15, h, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx + 25, hy - 20, 15, h, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        // Square tech eyes
        const h = 20 * f.leftEye.openness;
        ctx.fillRect(hx - 40, hy - 30, 30, h);
        ctx.fillRect(hx + 10, hy - 30, 30, h);
      }
    } else {
      ctx.fillRect(hx - 40, hy - 20, 30, 2);
      ctx.fillRect(hx + 10, hy - 20, 30, 2);
    }
    ctx.shadowBlur = 0;

    // Digital Mouth
    const mOpen = f.mouth.openness;
    const mW = 20 + f.mouth.width * 40;
    const mH = 2 + mOpen * 20;

    // Smile Curve for Robot
    const smile = f.mouth.smile * 10;

    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor; ctx.shadowBlur = 10;

    if (mOpen > 0.1) {
      // Speaking box
      rr(ctx, hx - mW / 2, hy + 20 - mH / 2, mW, mH, 2); ctx.fill();
    } else {
      // Line
      ctx.beginPath();
      ctx.strokeStyle = eyeColor; ctx.lineWidth = 3;
      ctx.moveTo(hx - 20, hy + 20 - smile / 2);
      ctx.quadraticCurveTo(hx, hy + 20 + smile, hx + 20, hy + 20 - smile / 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Antenna
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(hx, hy - 70); ctx.lineTo(hx, hy - 100); ctx.stroke();
    ctx.fillStyle = (mOpen > 0.1) ? '#ef4444' : '#64748b';
    ctx.beginPath(); ctx.arc(hx, hy - 100, 5, 0, Math.PI * 2); ctx.fill();
  }

  // === PODCAST MIC ===
  drawMicrophone(ctx, hx, hy, breathe, sway, yaw);
}
