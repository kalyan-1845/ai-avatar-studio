
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

// =============== FULL BODY HUMAN ===============
export function drawFullHuman(ctx, c, f, time, faceImg) {
  const yaw = f.head.yaw;
  const pitch = f.head.pitch;
  const isRobot = c.id === 'custom_001';
  const isGhost = c.id === 'custom_002';
  const alpha = isGhost ? '90' : '';
  const breathe = Math.sin(time * 2) * 2;
  const sway = Math.sin(time * 1.5) * 1.5;
  const outfit = c.outfitColor || c.accentColor;
  const shoe = c.shoeColor || '#333';

  // === CUSTOM PHOTO MODE (Full Photorealistic Twin) ===
  const hx = yaw * 8 + sway;
  // Dynamic Head Nod: Pitch increases when 'talking' (mouth open)
  const talking = f.mouth.openness > 0.1;
  const nod = talking ? Math.sin(time * 10) * 1.5 : 0;
  const hy = -20 + pitch * 8 + breathe + nod;

  if (faceImg) {
    try {
      // === SEAMLESS PHOTO-COMP ENGINE (Customizable) ===

      const primaryColor = c.outfitColor || '#0a101f';
      const secondaryColor = '#ffffff';
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

      // --- SHOULDER DYNAMICS ---
      const shoulderY = breathe2 * 1.5 + (nod2 * 0.3);

      const scale = 1.35;

      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(0, 15);

      // --- OUTFIT RENDERERS ---

      const drawBlazer = () => {
        // 1. ANATOMICAL BODY (Blazer) - Dynamic Shoulders
        const suitGrad = ctx.createLinearGradient(-100, 0, 100, 200);
        suitGrad.addColorStop(0, '#151b2e'); suitGrad.addColorStop(0.5, primaryColor); suitGrad.addColorStop(1, '#000');
        ctx.fillStyle = suitGrad;
        ctx.beginPath();
        // Shoulders rise/fall with breath
        ctx.moveTo(-90 + sway2, 65 + shoulderY);
        ctx.quadraticCurveTo(-45, 55 + shoulderY, -40, 60 + shoulderY);
        ctx.lineTo(40, 60 + shoulderY);
        ctx.quadraticCurveTo(45, 55 + shoulderY, 90 + sway2, 65 + shoulderY);
        ctx.lineTo(85 + sway2, 200); ctx.lineTo(-85 + sway2, 200);
        ctx.fill();

        // Lapel
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.moveTo(-45 + sway2, 60 + shoulderY); ctx.lineTo(0 + sway2, 140 + shoulderY); ctx.lineTo(45 + sway2, 60 + shoulderY); ctx.fill();

        // Tee
        const teeGrad = ctx.createLinearGradient(0, 60, 0, 120); teeGrad.addColorStop(0, '#fff'); teeGrad.addColorStop(1, '#ddd');
        ctx.fillStyle = teeGrad;
        ctx.beginPath(); ctx.moveTo(-45 + sway2, 60 + shoulderY); ctx.quadraticCurveTo(0 + sway2, 100 + shoulderY, 45 + sway2, 60 + shoulderY);
        ctx.lineTo(0 + sway2, 140 + shoulderY); ctx.lineTo(-45 + sway2, 60 + shoulderY); ctx.fill();
      };

      const drawSuit = () => {
        // Formal Suit + Tie - Dynamic Shoulders
        const suitGrad = ctx.createLinearGradient(-100, 0, 100, 200);
        suitGrad.addColorStop(0, '#111'); suitGrad.addColorStop(0.5, primaryColor); suitGrad.addColorStop(1, '#000');
        ctx.fillStyle = suitGrad;
        ctx.beginPath();
        ctx.moveTo(-90 + sway2, 65 + shoulderY); ctx.lineTo(90 + sway2, 65 + shoulderY);
        ctx.lineTo(85 + sway2, 200); ctx.lineTo(-85 + sway2, 200);
        ctx.fill();

        // White Shirt
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-25 + sway2, 65 + shoulderY); ctx.lineTo(0 + sway2, 130 + shoulderY); ctx.lineTo(25 + sway2, 65 + shoulderY); ctx.fill();

        // Tie
        ctx.fillStyle = c.accentColor || '#d00';
        ctx.beginPath(); ctx.moveTo(0 + sway2, 65 + shoulderY); ctx.lineTo(10 + sway2, 120 + shoulderY); ctx.lineTo(0 + sway2, 135 + shoulderY); ctx.lineTo(-10 + sway2, 120 + shoulderY); ctx.fill();
      };

      const drawCasual = () => {
        // Hoodie / Tech Style - Dynamic Shoulders
        ctx.fillStyle = primaryColor;
        // Hood Back
        ctx.beginPath(); ctx.ellipse(0 + sway2, 70 + shoulderY, 70, 40, 0, Math.PI, 0); ctx.fill();

        const bodyGrad = ctx.createLinearGradient(-50, 0, 50, 200);
        bodyGrad.addColorStop(0, primaryColor); bodyGrad.addColorStop(1, '#222');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-85 + sway2, 80 + shoulderY); ctx.lineTo(85 + sway2, 80 + shoulderY);
        ctx.lineTo(80 + sway2, 200); ctx.lineTo(-80 + sway2, 200);
        ctx.fill();

        // Draw strings
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-20 + sway2, 90 + shoulderY); ctx.lineTo(-20 + sway2, 140 + shoulderY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20 + sway2, 90 + shoulderY); ctx.lineTo(20 + sway2, 140 + shoulderY); ctx.stroke();
      };

      // EXECUTE SELECTED OUTFIT
      if (outfitStyle === 'suit') drawSuit();
      else if (outfitStyle === 'casual') drawCasual();
      else drawBlazer();

      // Neck
      ctx.fillStyle = skinColor;
      ctx.beginPath(); ctx.moveTo(-24 + sway, 80 + breathe); ctx.lineTo(24 + sway, 80 + breathe); ctx.lineTo(22 + sway, 50 + breathe); ctx.lineTo(-22 + sway, 50 + breathe); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0 + sway, 55 + breathe, 22, 8, 0, 0, Math.PI * 2); ctx.fill();

      // 2. HEAD & FACE
      const nodOffset = talking ? Math.sin(time * 10) * 1.5 : 0;

      ctx.save();
      // Improved Head Shape Mask (Refined Neck-to-Hair)
      ctx.beginPath();
      // Tighter jawline coordinates to avoid background
      ctx.moveTo(-36 + sway, hy - 45 + nodOffset); // Temple L
      ctx.quadraticCurveTo(0 + sway, hy - 65 + nodOffset, 36 + sway, hy - 45 + nodOffset); // Top/Hair
      ctx.quadraticCurveTo(40 + sway, hy + nodOffset, 34 + sway, hy + 42 + nodOffset); // Cheek R
      ctx.quadraticCurveTo(28 + sway, hy + 66 + nodOffset, 0 + sway, hy + 68 + nodOffset); // Chin (Tighter)
      ctx.quadraticCurveTo(-28 + sway, hy + 66 + nodOffset, -34 + sway, hy + 42 + nodOffset); // Cheek L
      ctx.quadraticCurveTo(-40 + sway, hy + nodOffset, -36 + sway, hy - 45 + nodOffset); // Temple L closure
      ctx.closePath();

      ctx.shadowColor = skinColor; ctx.shadowBlur = 20; ctx.fill();
      ctx.clip();

      const aspect = faceImg.width / faceImg.height;
      let dw, dh;
      if (aspect > 1) { dh = 160; dw = dh * aspect; } else { dw = 160; dh = dw / aspect; }
      ctx.drawImage(faceImg, hx - dw / 2, hy - dh / 2 + nodOffset, dw, dh);
      ctx.restore();

      // --- REALISM V2: CINEMATIC LIGHTING OVERLAY ---
      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(0, 15);
      ctx.globalCompositeOperation = 'overlay'; // Blend mode for lighting

      // 1. Rim Light (Left/Blue)
      const rimL = ctx.createLinearGradient(-100, 0, 0, 0);
      rimL.addColorStop(0, 'rgba(100, 150, 255, 0.4)');
      rimL.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rimL;
      // Mask to body shape approximately
      ctx.beginPath(); ctx.rect(-100, 0, 200, 250); ctx.fill();

      // 2. Key Light (Right/Warm)
      const keyL = ctx.createLinearGradient(100, 0, 0, 0);
      keyL.addColorStop(0, 'rgba(255, 200, 150, 0.2)');
      keyL.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = keyL;
      ctx.fill();

      // 3. Vignette (Focus on Face)
      ctx.globalCompositeOperation = 'multiply';
      const vig = ctx.createRadialGradient(0, 50, 50, 0, 50, 200);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vig;
      ctx.fillRect(-150, -50, 300, 300);

      ctx.restore();

      // 3. HEADPHONES (Fixed rr crash)
      const hpColor = '#1a1a1a';
      ctx.lineWidth = 14; ctx.strokeStyle = hpColor; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(hx, hy + nodOffset - 10, 70, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();

      for (const side of [-1, 1]) {
        const cupX = hx + side * 64; const cupY = hy + nodOffset + 10;
        ctx.save(); ctx.translate(cupX, cupY); ctx.rotate(side * -0.1);
        ctx.fillStyle = '#050505'; rr(ctx, -15, -25, 30, 50, 10); ctx.fill(); // Cushion
        ctx.fillStyle = '#222'; rr(ctx, -10, -20, 20, 40, 8); ctx.fill(); // Shell
        ctx.fillStyle = '#888'; ctx.fillRect(-4, -30, 8, 10);
        ctx.restore();
      }

      // 4. MICROPHONE
      const micX = hx + 40; const micY = hy + 80 + nodOffset;
      ctx.save();
      ctx.lineWidth = 8; ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.moveTo(micX + 60, 200); ctx.lineTo(micX, micY); ctx.stroke();
      ctx.translate(micX, micY); ctx.rotate(-0.4);
      const micGrad = ctx.createLinearGradient(0, -25, 30, 25); micGrad.addColorStop(0, '#222'); micGrad.addColorStop(1, '#000');
      ctx.fillStyle = micGrad; rr(ctx, -20, -30, 40, 60, 18); ctx.fill();
      ctx.fillStyle = '#333'; ctx.fillRect(-15, 30, 30, 15);
      ctx.restore();

      ctx.restore(); // Ends scale

      // 5. LIP SYNC (Re-scaled overlay)
      ctx.save(); ctx.scale(scale, scale); ctx.translate(0, 15);
      const mY = hy + nodOffset + 28;
      const mOpen = f.mouth.openness;
      const mW = (12 + f.mouth.width * 8) * 1.1; const mH = (2 + mOpen * 20) * 1.1;
      const sm = f.mouth.smile * 6; const mx = hx + yaw * 4;

      if (mOpen > 0.1 || isRobot) {
        ctx.fillStyle = '#2b0a0a'; ctx.beginPath();
        ctx.moveTo(mx - mW, mY + sm); ctx.quadraticCurveTo(mx - mW / 2, mY - mH / 2 + sm, mx, mY - mH / 3 + sm * 0.5);
        ctx.quadraticCurveTo(mx + mW / 2, mY - mH / 2 + sm, mx + mW, mY + sm);
        ctx.quadraticCurveTo(mx, mY + mH, mx - mW, mY + sm); ctx.fill();
        if (!isRobot) {
          if (mOpen > 0.3) { ctx.fillStyle = '#a65e5e'; ctx.beginPath(); ctx.ellipse(mx, mY + mH * 0.3, mW * 0.5, mH * 0.25, 0, 0, Math.PI * 2); ctx.fill(); }
          if (mOpen > 0.15) { ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.rect(mx - mW * 0.5, mY - 1, mW * 1.0, 4); ctx.fill(); }
        }
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.strokeStyle = '#c58c85'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(mx - mW, mY + sm); ctx.quadraticCurveTo(mx, mY + sm + 2, mx + mW, mY + sm); ctx.stroke();
      }
      ctx.restore();
      return;
    } catch (e) {
      console.error("Error drawing clone:", e);
      return; // CRITICAL: Prevent fallback to cartoon
    }
  }

  // === VECTOR BODY (Original Logic) ===

  // === SHADOW ===
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.ellipse(sway, 260, 45, 10, 0, 0, Math.PI * 2); ctx.fill();

  // === LEGS ===
  const legSpread = 18;
  for (const side of [-1, 1]) {
    // Leg
    ctx.fillStyle = isGhost ? c.skinColor + '50' : (isRobot ? '#1a1a2e' : outfit);
    rr(ctx, side * legSpread - 14, 165, 28, 75, 8);
    ctx.fill();
    // Shoe
    ctx.fillStyle = isGhost ? c.skinColor + '40' : shoe;
    rr(ctx, side * legSpread - 16 + side * 2, 230, 32, 18, 9);
    ctx.fill();
    // Shoe detail
    if (!isGhost) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      rr(ctx, side * legSpread - 10 + side * 2, 232, 20, 6, 3);
      ctx.fill();
    }
  }

  // === BODY / TORSO ===
  ctx.fillStyle = isGhost ? c.skinColor + alpha : outfit;
  rr(ctx, -42 + sway, 80 + breathe, 84, 90, 20);
  ctx.fill();

  // Outfit details
  if (!isGhost && !isRobot) {
    // Collar
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(-20 + sway, 82 + breathe);
    ctx.lineTo(0 + sway, 95 + breathe);
    ctx.lineTo(20 + sway, 82 + breathe);
    ctx.closePath();
    ctx.fill();
    // Belt
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    rr(ctx, -38 + sway, 150 + breathe, 76, 8, 4);
    ctx.fill();
    // Belt buckle
    ctx.fillStyle = '#ffd700' + '80';
    rr(ctx, -6 + sway, 149 + breathe, 12, 10, 3);
    ctx.fill();
  }
  if (isRobot) {
    // Robot chest panel
    ctx.strokeStyle = c.eyeColor + '60';
    ctx.lineWidth = 1;
    rr(ctx, -25 + sway, 95 + breathe, 50, 40, 5);
    ctx.stroke();
    ctx.fillStyle = c.eyeColor + '20';
    ctx.fill();
    // Robot light
    ctx.fillStyle = c.eyeColor;
    ctx.beginPath(); ctx.arc(sway, 110 + breathe, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.eyeColor + '40';
    ctx.beginPath(); ctx.arc(sway, 110 + breathe, 8, 0, Math.PI * 2); ctx.fill();
  }

  // === ARMS ===
  for (const side of [-1, 1]) {
    const armSwing = Math.sin(time * 2 + side * 1.5) * 4;
    ctx.fillStyle = isGhost ? c.skinColor + '70' : outfit;
    ctx.save();
    ctx.translate(side * 48 + sway, 95 + breathe);
    ctx.rotate(side * 0.1 + yaw * side * 0.05 + armSwing * 0.02);
    rr(ctx, -11, 0, 22, 65, 10);
    ctx.fill();
    // Hand
    ctx.fillStyle = isGhost ? c.skinColor + '60' : c.skinColor;
    ctx.beginPath(); ctx.ellipse(0, 68 + armSwing * 0.3, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
    // Fingers
    if (!isGhost) {
      for (let fi = -1; fi <= 1; fi++) {
        ctx.fillStyle = c.skinColor;
        ctx.beginPath(); ctx.ellipse(fi * 5, 78 + armSwing * 0.3, 3.5, 5, fi * 0.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // === NECK ===
  ctx.fillStyle = isGhost ? c.skinColor + alpha : c.skinColor;
  rr(ctx, -14 + sway + yaw * 2, 62 + breathe, 28, 25, 8);
  ctx.fill();

  // === HEAD ===
  // hx and hy already declared above


  ctx.fillStyle = isGhost ? c.skinColor + '80' : c.skinColor;
  ctx.beginPath(); ctx.ellipse(hx, hy, 56, 62, 0, 0, Math.PI * 2); ctx.fill();

  // Draw uploaded face image clipped to head shape
  if (faceImg) {
    ctx.save();
    ctx.clip();
    // Maintain aspect ratio, center fit
    const size = Math.max(112, 124); // roughly head bounding box
    const aspect = faceImg.width / faceImg.height;
    let dw = size, dh = size;
    if (aspect > 1) { dh = dw / aspect; } else { dw = dh * aspect; }
    // Draw centered on head
    ctx.globalAlpha = 0.9;
    ctx.drawImage(faceImg, hx - dw / 2, hy - dh / 2, dw, dh);
    ctx.restore();
  }

  // Head outline
  ctx.strokeStyle = c.accentColor + '20';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(hx, hy, 57, 63, 0, 0, Math.PI * 2); ctx.stroke();

  // === HAIR ===
  if (!isRobot) {
    ctx.fillStyle = isGhost ? c.hairColor + '50' : c.hairColor;
    // Top hair
    ctx.beginPath(); ctx.ellipse(hx, hy - 28, 60, 45, 0, 0, Math.PI * 2); ctx.fill();
    // Side hair
    ctx.beginPath(); ctx.ellipse(hx - 50, hy + 5, 16, 40, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 50, hy + 5, 16, 40, 0.1, 0, Math.PI * 2); ctx.fill();
    // Bangs
    ctx.beginPath(); ctx.ellipse(hx, hy - 52, 52, 24, 0, Math.PI, Math.PI * 2); ctx.fill();
    // Hair shine
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.ellipse(hx - 12, hy - 50, 22, 9, -0.3, 0, Math.PI * 2); ctx.fill();
  } else {
    // Robot antenna
    ctx.strokeStyle = c.eyeColor;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx, hy - 60); ctx.lineTo(hx, hy - 82); ctx.stroke();
    ctx.fillStyle = c.eyeColor;
    ctx.beginPath(); ctx.arc(hx, hy - 85, 6, 0, Math.PI * 2); ctx.fill();
    // Robot lines
    ctx.strokeStyle = c.eyeColor + '40';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx - 42, hy); ctx.lineTo(hx + 42, hy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx, hy - 55); ctx.lineTo(hx, hy + 40); ctx.stroke();
  }

  // === EYES ===
  const eyeSpacing = 23;
  const eyeY = hy - 5;
  const pX = f.leftEye.x * 0.7 + yaw * 0.3;
  const pY = f.leftEye.y * 0.4;

  for (const side of [-1, 1]) {
    const ex = hx + side * eyeSpacing;
    const op = side < 0 ? f.leftEye.openness : f.rightEye.openness;
    const eH = Math.max(1.5, 13 * op);

    if (isRobot) {
      ctx.fillStyle = c.eyeColor + '25';
      rr(ctx, ex - 15, eyeY - eH, 30, eH * 2, 3); ctx.fill();
      ctx.fillStyle = c.eyeColor;
      rr(ctx, ex - 12, eyeY - eH + 3, 24, (eH - 3) * 2, 2); ctx.fill();
      if (op > 0.15) {
        ctx.fillStyle = '#000';
        rr(ctx, ex + pX * 5 - 4, eyeY + pY * 3 - 4, 8, 8, 2); ctx.fill();
      }
    } else {
      // White
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(ex, eyeY, 15, eH, 0, 0, Math.PI * 2); ctx.fill();
      if (op > 0.15) {
        // Iris
        ctx.fillStyle = c.eyeColor;
        ctx.beginPath(); ctx.ellipse(ex + pX * 5, eyeY + pY * 3, 10, 10 * (eH / 13), 0, 0, Math.PI * 2); ctx.fill();
        // Pupil
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.ellipse(ex + pX * 5, eyeY + pY * 3, 5, 5 * (eH / 13), 0, 0, Math.PI * 2); ctx.fill();
        // Highlights
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(ex + pX * 5 + 3.5, eyeY + pY * 3 - 3.5, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ex + pX * 5 - 2, eyeY + pY * 3 + 2.5, 1.8, 1.4, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Lashes
      ctx.strokeStyle = isGhost ? c.hairColor : '#1a1a2e';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ex - 15, eyeY); ctx.lineTo(ex - 18, eyeY - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex + 15, eyeY); ctx.lineTo(ex + 18, eyeY - 5); ctx.stroke();
    }
  }

  // === EYEBROWS ===
  const lbY = eyeY - 20 - f.leftEyebrow * 6;
  const rbY = eyeY - 20 - f.rightEyebrow * 6;
  ctx.strokeStyle = isRobot ? c.eyeColor : c.hairColor;
  ctx.lineWidth = isRobot ? 2 : 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx - eyeSpacing - 12, lbY + 2); ctx.quadraticCurveTo(hx - eyeSpacing, lbY - 4, hx - eyeSpacing + 12, lbY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hx + eyeSpacing - 12, rbY); ctx.quadraticCurveTo(hx + eyeSpacing, rbY - 4, hx + eyeSpacing + 12, rbY + 2); ctx.stroke();

  // === NOSE ===
  if (!isRobot) {
    ctx.strokeStyle = isGhost ? '#ffffff15' : '#00000018';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx + yaw * 3 - 4, hy + 12); ctx.quadraticCurveTo(hx + yaw * 3, hy + 20, hx + yaw * 3 + 4, hy + 12); ctx.stroke();
  }

  // === BLUSH ===
  if (!isRobot && !isGhost) {
    ctx.fillStyle = '#ff999935';
    ctx.beginPath(); ctx.ellipse(hx - eyeSpacing - 2, eyeY + 16, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + eyeSpacing + 2, eyeY + 16, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  }

  // === MOUTH ===
  const mY = hy + 30;
  const mOpen = f.mouth.openness;
  const mW = 12 + f.mouth.width * 8;
  const mH = 3 + mOpen * 18;
  const sm = f.mouth.smile * 6;
  const mx = hx + yaw * 4;

  if (isRobot) {
    ctx.fillStyle = c.eyeColor + '30';
    rr(ctx, mx - mW, mY - mH / 2, mW * 2, mH, 3); ctx.fill();
    ctx.fillStyle = c.eyeColor;
    rr(ctx, mx - mW + 2, mY - mH / 2 + 2, (mW - 2) * 2, mH - 4, 2); ctx.fill();
  } else {
    ctx.fillStyle = mOpen > 0.2 ? '#c0392b' : c.accentColor;
    ctx.beginPath();
    ctx.moveTo(mx - mW, mY + sm);
    ctx.quadraticCurveTo(mx - mW / 2, mY - mH / 2 + sm, mx, mY - mH / 3 + sm * 0.5);
    ctx.quadraticCurveTo(mx + mW / 2, mY - mH / 2 + sm, mx + mW, mY + sm);
    ctx.quadraticCurveTo(mx, mY + mH, mx - mW, mY + sm);
    ctx.fill();
    if (mOpen > 0.3) {
      ctx.fillStyle = '#8b0000';
      ctx.beginPath(); ctx.ellipse(mx, mY + mH * 0.25, mW * 0.55, mH * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e57373';
      ctx.beginPath(); ctx.ellipse(mx, mY + mH * 0.35, mW * 0.3, mH * 0.2, 0, 0, Math.PI); ctx.fill();
    }
    if (mOpen > 0.1 && mOpen < 0.5) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.rect(mx - mW * 0.45, mY - 1, mW * 0.9, Math.min(4, mH * 0.3)); ctx.fill();
    }
  }
}

// =============== FULL BODY ANIMAL ===============
export function drawFullAnimal(ctx, c, f, time, faceImg) {
  const yaw = f.head.yaw;
  const pitch = f.head.pitch;
  const breathe = Math.sin(time * 2) * 2;
  const sway = Math.sin(time * 1.5) * 1;
  const tailWag = Math.sin(time * 4) * 15;

  // === SHADOW ===
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath(); ctx.ellipse(sway, 255, 50, 12, 0, 0, Math.PI * 2); ctx.fill();

  // === TAIL ===
  ctx.save();
  ctx.translate(sway, 170);
  ctx.rotate((-0.3 + tailWag * 0.02) * (c.earType === 'bunny' ? 0.3 : 1));
  if (c.earType === 'bunny') {
    ctx.fillStyle = c.skinColor;
    ctx.beginPath(); ctx.ellipse(38, -10, 12, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb6c1';
    ctx.beginPath(); ctx.ellipse(38, -10, 7, 7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (c.earType === 'fox') {
    ctx.fillStyle = c.hairColor;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(55, -30, 60, -55); ctx.quadraticCurveTo(50, -20, 0, 10); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(55, -45); ctx.quadraticCurveTo(55, -30, 45, -15); ctx.quadraticCurveTo(50, -25, 55, -45); ctx.fill();
  } else {
    ctx.fillStyle = c.hairColor || c.skinColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(45 + (c.earType === 'dog' ? 10 : 0), -20, 50, -40);
    ctx.quadraticCurveTo(40, -15, 0, 10);
    ctx.fill();
  }
  ctx.restore();

  // === FEET ===
  for (const side of [-1, 1]) {
    const step = Math.sin(time * 3 + side * Math.PI) * 3;
    ctx.fillStyle = c.skinColor;
    ctx.beginPath(); ctx.ellipse(side * 22 + sway, 248 + step, 18, 12, side * 0.1, 0, Math.PI * 2); ctx.fill();
    // Toe pads
    if (c.earType !== 'bunny') {
      ctx.fillStyle = '#00000020';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.ellipse(side * 22 + i * 7 + sway, 252 + step, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // === BODY ===
  ctx.fillStyle = c.skinColor;
  ctx.beginPath(); ctx.ellipse(sway, 175 + breathe, 50, 60, 0, 0, Math.PI * 2); ctx.fill();
  // Belly
  ctx.fillStyle = (c.earType === 'fox' || c.earType === 'cat') ? '#ffffff60' : '#ffffff40';
  ctx.beginPath(); ctx.ellipse(sway, 185 + breathe, 36, 45, 0, 0, Math.PI * 2); ctx.fill();

  // === ARMS / PAWS ===
  for (const side of [-1, 1]) {
    const armSwing = Math.sin(time * 2 + side) * 3;
    ctx.fillStyle = c.skinColor;
    ctx.save();
    ctx.translate(side * 48 + sway, 145 + breathe);
    ctx.rotate(side * 0.15 + armSwing * 0.03);
    ctx.beginPath(); ctx.ellipse(0, 20, 14, 28, 0, 0, Math.PI * 2); ctx.fill();
    // Paw
    ctx.fillStyle = c.earType === 'fox' ? '#1a1a1a' : c.skinColor;
    ctx.beginPath(); ctx.ellipse(0, 48, 13, 12, 0, 0, Math.PI * 2); ctx.fill();
    // Paw pads
    ctx.fillStyle = '#ffb6c1' + '80';
    ctx.beginPath(); ctx.ellipse(0, 48, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // === HEAD ===
  const hx = yaw * 6 + sway;
  const hy = 95 + pitch * 6 + breathe;

  ctx.fillStyle = c.skinColor;
  ctx.beginPath(); ctx.ellipse(hx, hy, 52, 50, 0, 0, Math.PI * 2); ctx.fill();

  // Draw uploaded face image clipped to head shape
  if (faceImg) {
    ctx.save();
    ctx.clip();
    // Maintain aspect ratio
    const size = 104;
    const aspect = faceImg.width / faceImg.height;
    let dw = size, dh = size;
    if (aspect > 1) { dh = dw / aspect; } else { dw = dh * aspect; }
    ctx.globalAlpha = 0.9;
    ctx.drawImage(faceImg, hx - dw / 2, hy - dh / 2, dw, dh);
    ctx.restore();
  }


  // === EARS ===
  if (c.earType === 'cat') {
    for (const side of [-1, 1]) {
      ctx.fillStyle = c.hairColor || c.skinColor;
      ctx.beginPath(); ctx.moveTo(hx + side * 28, hy - 20); ctx.lineTo(hx + side * 46, hy - 62); ctx.lineTo(hx + side * 14, hy - 48); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffb6c1';
      ctx.beginPath(); ctx.moveTo(hx + side * 30, hy - 24); ctx.lineTo(hx + side * 42, hy - 56); ctx.lineTo(hx + side * 20, hy - 44); ctx.closePath(); ctx.fill();
    }
  } else if (c.earType === 'dog') {
    ctx.fillStyle = c.hairColor;
    ctx.beginPath(); ctx.ellipse(hx - 42, hy - 12, 18, 34, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 42, hy - 12, 18, 34, 0.3, 0, Math.PI * 2); ctx.fill();
  } else if (c.earType === 'fox') {
    for (const side of [-1, 1]) {
      ctx.fillStyle = c.hairColor;
      ctx.beginPath(); ctx.moveTo(hx + side * 26, hy - 22); ctx.lineTo(hx + side * 44, hy - 72); ctx.lineTo(hx + side * 10, hy - 48); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(hx + side * 28, hy - 27); ctx.lineTo(hx + side * 40, hy - 60); ctx.lineTo(hx + side * 16, hy - 42); ctx.closePath(); ctx.fill();
    }
  } else if (c.earType === 'bunny') {
    for (const side of [-1, 1]) {
      const earFlop = Math.sin(time * 2 + side * 0.5) * 3;
      ctx.fillStyle = c.skinColor;
      ctx.beginPath(); ctx.ellipse(hx + side * 22, hy - 72 + earFlop, 14, 38, side * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb6c1';
      ctx.beginPath(); ctx.ellipse(hx + side * 22, hy - 72 + earFlop, 8, 28, side * 0.12, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Muzzle
  if (c.muzzle) {
    ctx.fillStyle = '#ffffff80';
    ctx.beginPath(); ctx.ellipse(hx + yaw * 3, hy + 10, 28, 26, 0, 0, Math.PI * 2); ctx.fill();
  }

  // === EYES ===
  const eyeSpacing = 20;
  const eyeY = hy - 5;
  for (const side of [-1, 1]) {
    const ex = hx + side * eyeSpacing;
    const op = side < 0 ? f.leftEye.openness : f.rightEye.openness;
    const eH = Math.max(1.5, 11 * op);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(ex, eyeY, 13, eH, 0, 0, Math.PI * 2); ctx.fill();
    if (op > 0.15) {
      ctx.fillStyle = c.eyeColor;
      ctx.beginPath(); ctx.ellipse(ex + f.leftEye.x * 4 + yaw * 1.5, eyeY + f.leftEye.y * 2.5, 8, 8 * (eH / 11), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.ellipse(ex + f.leftEye.x * 4 + yaw * 1.5, eyeY + f.leftEye.y * 2.5, 4, 4 * (eH / 11), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(ex + f.leftEye.x * 4 + yaw * 1.5 + 3, eyeY + f.leftEye.y * 2.5 - 3, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // === NOSE ===
  const noseColor = c.earType === 'dog' ? '#1a1a1a' : (c.id === 'panda_001' ? '#1a1a1a' : '#2a1a1a');
  ctx.fillStyle = noseColor;
  ctx.beginPath(); ctx.ellipse(hx + yaw * 3, hy + 8, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff35';
  ctx.beginPath(); ctx.ellipse(hx + yaw * 3 + 2, hy + 6, 3, 2, 0, 0, Math.PI * 2); ctx.fill();

  // Whiskers
  if (c.hasWhiskers) {
    ctx.strokeStyle = '#00000040';
    ctx.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(hx + yaw * 3 - 12, hy + 12 + i * 6); ctx.lineTo(hx + yaw * 3 - 42, hy + 10 + i * 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + yaw * 3 + 12, hy + 12 + i * 6); ctx.lineTo(hx + yaw * 3 + 42, hy + 10 + i * 9); ctx.stroke();
    }
  }

  // === MOUTH ===
  const mOpen = f.mouth.openness;
  const mY = hy + 22;
  const mx = hx + yaw * 3;
  if (mOpen > 0.15) {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.ellipse(mx, mY + mOpen * 5, 10 + f.mouth.width * 5, 3 + mOpen * 12, 0, 0, Math.PI * 2); ctx.fill();
    if (mOpen > 0.3) {
      ctx.fillStyle = '#e57373';
      ctx.beginPath(); ctx.ellipse(mx, mY + mOpen * 6, 6, mOpen * 5, 0, 0, Math.PI); ctx.fill();
    }
  } else {
    if (c.earType === 'cat' || c.id === 'panda_001') {
      ctx.strokeStyle = '#1a1a1a70';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(mx - 8, mY); ctx.quadraticCurveTo(mx - 3, mY + 4, mx, mY);
      ctx.quadraticCurveTo(mx + 3, mY + 4, mx + 8, mY);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#1a1a1a50';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(mx - 10, mY); ctx.quadraticCurveTo(mx, mY + f.mouth.smile * 8 + 2, mx + 10, mY); ctx.stroke();
    }
  }

  // Panda eye patches
  if (c.id === 'panda_001') {
    ctx.fillStyle = '#21212180';
    ctx.beginPath(); ctx.ellipse(hx - eyeSpacing, eyeY, 18, 16, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + eyeSpacing, eyeY, 18, 16, 0.15, 0, Math.PI * 2); ctx.fill();
  }
}
