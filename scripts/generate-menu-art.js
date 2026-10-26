/**
 * Draws the menu art: the STICKMAN RUNNER logo and the backdrop behind every menu screen.
 *
 *   node scripts/generate-menu-art.js
 *
 * Uses CanvasKit (the same drawing engine the game runs on) and the Audiowide font, so the
 * chrome gradients, neon glow and lettering come out as crisp images the game can show on
 * any platform. Change the colours or layout here and re-run to redraw them.
 *
 * Writes:
 *   assets/images/logo.png          transparent, 1500x470 (shown at about a third of that)
 *   assets/images/menu-backdrop.jpg 1920x1080
 */
const fs = require('fs');
const path = require('path');
const init = require('canvaskit-wasm/bin/full/canvaskit.js');

const ROOT = path.join(__dirname, '..');
const FONT = path.join(ROOT, 'node_modules/@expo-google-fonts/audiowide/400Regular/Audiowide_400Regular.ttf');
const WASM = path.join(ROOT, 'node_modules/canvaskit-wasm/bin/full/canvaskit.wasm');

/** Italic lean for the lettering, as a horizontal skew. */
const LEAN = -0.22;

function textWidth(CK, font, text) {
    const ids = font.getGlyphIDs(text);
    return font.getGlyphWidths(ids).reduce((a, b) => a + b, 0);
}

/** Draws `text` with its left end at x and baseline at y, leaning forward like italic. */
function leaning(canvas, x, y, draw) {
    canvas.save();
    canvas.translate(x, y);
    canvas.skew(LEAN, 0);
    draw();
    canvas.restore();
}

function drawLogo(CK, typeface) {
    const W = 1500;
    const H = 470;
    const surface = CK.MakeSurface(W, H);
    const canvas = surface.getCanvas();
    canvas.clear(CK.TRANSPARENT);

    // --- STICKMAN in chrome ---
    const big = new CK.Font(typeface, 100);
    const bigSize = 100 * (1380 / textWidth(CK, big, 'STICKMAN'));
    big.setSize(bigSize);
    const capHeight = bigSize * 0.72;
    const top = 70;
    const baseline = top + capHeight;
    const left = (W - textWidth(CK, big, 'STICKMAN')) / 2 + 30;
    const word = CK.TextBlob.MakeFromText('STICKMAN', big);

    const paint = (setup) => {
        const p = new CK.Paint();
        p.setAntiAlias(true);
        setup(p);
        return p;
    };

    // Hard pink drop shadow
    leaning(canvas, left + 12, baseline + 12, () => {
        canvas.drawTextBlob(word, 0, 0, paint((p) => p.setColor(CK.parseColorString('#ff00cc'))));
    });
    // Dark outline so the chrome has an edge against anything behind it
    leaning(canvas, left, baseline, () => {
        canvas.drawTextBlob(word, 0, 0, paint((p) => {
            p.setStyle(CK.PaintStyle.Stroke);
            p.setStrokeWidth(12);
            p.setStrokeJoin(CK.StrokeJoin.Round);
            p.setColor(CK.parseColorString('#0b0820'));
        }));
    });
    // Chrome: sky above the horizon, a dark band, then a sunset reflection below
    leaning(canvas, left, baseline, () => {
        const chrome = CK.Shader.MakeLinearGradient(
            [0, -capHeight], [0, 0],
            ['#ffffff', '#d8eeff', '#7fb2ff', '#22205e', '#4a2a8a', '#ff4fb8', '#ffd27a'].map((c) => CK.parseColorString(c)),
            [0, 0.3, 0.5, 0.52, 0.62, 0.84, 1],
            CK.TileMode.Clamp
        );
        canvas.drawTextBlob(word, 0, 0, paint((p) => p.setShader(chrome)));
        // Thin bright rim
        canvas.drawTextBlob(word, 0, 0, paint((p) => {
            p.setStyle(CK.PaintStyle.Stroke);
            p.setStrokeWidth(2.5);
            p.setColor(CK.Color(255, 255, 255, 0.55));
        }));
    });
    // A star glint on the top of the S
    const glint = (gx, gy, r) => {
        const g = paint((p) => p.setColor(CK.WHITE));
        const glow = paint((p) => {
            p.setColor(CK.Color(255, 255, 255, 0.8));
            p.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, r * 0.35, true));
        });
        canvas.drawCircle(gx, gy, r * 0.35, glow);
        const star = new CK.Path();
        star.moveTo(gx, gy - r);
        star.lineTo(gx + r * 0.12, gy - r * 0.12);
        star.lineTo(gx + r, gy);
        star.lineTo(gx + r * 0.12, gy + r * 0.12);
        star.lineTo(gx, gy + r);
        star.lineTo(gx - r * 0.12, gy + r * 0.12);
        star.lineTo(gx - r, gy);
        star.lineTo(gx - r * 0.12, gy - r * 0.12);
        star.close();
        canvas.drawPath(star, g);
    };
    glint(left + bigSize * 0.38, top + 18, 34);

    // --- Horizon line between the words, glowing cyan, fading out at the ends ---
    const horizonY = baseline + 46;
    const fade = (alpha) => CK.Shader.MakeLinearGradient(
        [60, 0], [W - 60, 0],
        [CK.Color(0, 255, 255, 0), CK.Color(0, 255, 255, alpha), CK.Color(0, 255, 255, alpha), CK.Color(0, 255, 255, 0)],
        [0, 0.2, 0.8, 1],
        CK.TileMode.Clamp
    );
    canvas.drawRect(CK.XYWHRect(60, horizonY - 6, W - 120, 12), paint((p) => {
        p.setShader(fade(0.6));
        p.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, 8, true));
    }));
    canvas.drawRect(CK.XYWHRect(60, horizonY - 1.5, W - 120, 3), paint((p) => p.setShader(fade(1))));

    // --- RUNNER as a neon tube ---
    const small = new CK.Font(typeface, bigSize * 0.62);
    const runner = CK.TextBlob.MakeFromText('RUNNER', small);
    const runnerBaseline = horizonY + bigSize * 0.62 * 0.72 + 40;
    const runnerLeft = W - 90 - textWidth(CK, small, 'RUNNER');
    leaning(canvas, runnerLeft, runnerBaseline, () => {
        const tube = (width, color, blur) => paint((p) => {
            p.setStyle(CK.PaintStyle.Stroke);
            p.setStrokeWidth(width);
            p.setStrokeJoin(CK.StrokeJoin.Round);
            p.setStrokeCap(CK.StrokeCap.Round);
            p.setColor(CK.parseColorString(color));
            if (blur) p.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, blur, true));
        });
        canvas.drawTextBlob(runner, 0, 0, tube(18, '#ff00cc', 14)); // outer glow
        canvas.drawTextBlob(runner, 0, 0, tube(9, '#ff4fd8', 0));   // the tube
        canvas.drawTextBlob(runner, 0, 0, tube(3, '#ffffff', 0));   // white-hot core
    });

    const png = surface.makeImageSnapshot().encodeToBytes(CK.ImageFormat.PNG, 100);
    surface.delete();
    return png;
}

function drawBackdrop(CK) {
    const W = 1920;
    const H = 1080;
    const HORIZON = H * 0.6;
    const surface = CK.MakeSurface(W, H);
    const canvas = surface.getCanvas();
    const col = (c) => CK.parseColorString(c);
    const paint = (setup) => {
        const p = new CK.Paint();
        p.setAntiAlias(true);
        setup(p);
        return p;
    };

    // Sky: near-black at the top, deep purple at the horizon
    canvas.drawRect(CK.XYWHRect(0, 0, W, HORIZON), paint((p) => p.setShader(CK.Shader.MakeLinearGradient(
        [0, 0], [0, HORIZON], [col('#04020c'), col('#120a36'), col('#3c0f5e')], [0, 0.55, 1], CK.TileMode.Clamp
    ))));

    // Stars
    let seed = 7;
    const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let i = 0; i < 180; i++) {
        const y = rand() * HORIZON * 0.8;
        canvas.drawCircle(rand() * W, y, 0.8 + rand() * 1.6, paint((p) => p.setColor(CK.Color(255, 255, 255, 0.25 + rand() * 0.6 * (1 - y / HORIZON)))));
    }

    // Striped sun sitting on the horizon, with a glow behind it
    const sun = { x: W / 2, y: HORIZON - H * 0.13, r: H * 0.25 };
    canvas.drawCircle(sun.x, sun.y, sun.r * 1.15, paint((p) => {
        p.setColor(CK.Color(255, 60, 170, 0.35));
        p.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, 60, true));
    }));
    canvas.save();
    canvas.clipRect(CK.XYWHRect(0, 0, W, HORIZON), CK.ClipOp.Intersect, true);
    canvas.drawCircle(sun.x, sun.y, sun.r, paint((p) => p.setShader(CK.Shader.MakeLinearGradient(
        [0, sun.y - sun.r], [0, sun.y + sun.r * 0.6], [col('#ffe066'), col('#ff8a3d'), col('#ff2fb9')], [0, 0.45, 1], CK.TileMode.Clamp
    ))));
    // Stripes cut through the lower half, widening towards the horizon (kept inside the sun)
    const sunShape = new CK.Path();
    sunShape.addCircle(sun.x, sun.y, sun.r);
    canvas.clipPath(sunShape, CK.ClipOp.Intersect, true);
    for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const y = sun.y + sun.r * 0.08 + t * (HORIZON - sun.y - sun.r * 0.08);
        const h = 4 + t * 14;
        canvas.drawRect(CK.XYWHRect(sun.x - sun.r, y, sun.r * 2, h), paint((p) => p.setColor(col('#3c0f5e'))));
    }
    canvas.restore();

    // Ground
    canvas.drawRect(CK.XYWHRect(0, HORIZON, W, H - HORIZON), paint((p) => p.setShader(CK.Shader.MakeLinearGradient(
        [0, HORIZON], [0, H], [col('#1a0533'), col('#06020f')], [0, 1], CK.TileMode.Clamp
    ))));

    // Neon grid: lines fanning out from the vanishing point, and rungs bunched towards the horizon.
    // Enough fan lines to reach the far ends of the horizon (W / 2 / 12 = 80 each side), so the
    // grid has no empty wedges at the left and right. This is only the menu picture; the
    // in-game grid draws far fewer lines on purpose.
    const grid = new CK.Path();
    for (let i = -84; i <= 84; i++) {
        grid.moveTo(W / 2 + i * 12, HORIZON);
        grid.lineTo(W / 2 + i * 220, H);
    }
    for (let i = 1; i <= 12; i++) {
        const y = HORIZON + (H - HORIZON) * Math.pow(i / 12, 2.2);
        grid.moveTo(0, y);
        grid.lineTo(W, y);
    }
    canvas.drawPath(grid, paint((p) => {
        p.setStyle(CK.PaintStyle.Stroke);
        p.setStrokeWidth(5);
        p.setColor(CK.Color(255, 0, 204, 0.35));
        p.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, 5, true));
    }));
    canvas.drawPath(grid, paint((p) => {
        p.setStyle(CK.PaintStyle.Stroke);
        p.setStrokeWidth(2);
        p.setColor(CK.Color(255, 60, 220, 0.9));
    }));

    // Glowing horizon line
    canvas.drawRect(CK.XYWHRect(0, HORIZON - 5, W, 10), paint((p) => {
        p.setColor(col('#ff00cc'));
        p.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, 10, true));
    }));
    canvas.drawRect(CK.XYWHRect(0, HORIZON - 1.5, W, 3), paint((p) => p.setColor(col('#ffd6f5'))));

    // Darken the middle and the edges, so menu text over the grid stays easy to read
    canvas.drawRect(CK.XYWHRect(0, 0, W, H), paint((p) => p.setShader(CK.Shader.MakeRadialGradient(
        [W / 2, H * 0.86], W * 0.26, [CK.Color(4, 2, 12, 0.7), CK.Color(4, 2, 12, 0)], [0, 1], CK.TileMode.Clamp
    ))));
    canvas.drawRect(CK.XYWHRect(0, 0, W, H), paint((p) => p.setShader(CK.Shader.MakeRadialGradient(
        [W / 2, H / 2], W * 0.75, [CK.Color(0, 0, 0, 0), CK.Color(0, 0, 0, 0.55)], [0.55, 1], CK.TileMode.Clamp
    ))));

    const jpg = surface.makeImageSnapshot().encodeToBytes(CK.ImageFormat.JPEG, 88);
    surface.delete();
    return jpg;
}

// CanvasKit 0.41 (Expo SDK 56 on) is told where its .wasm file is; it can't be handed the file.
init({ locateFile: () => WASM }).then((CK) => {
    const typeface = CK.Typeface.MakeFreeTypeFaceFromData(fs.readFileSync(FONT).buffer);
    const out = (name, bytes) => {
        fs.writeFileSync(path.join(ROOT, 'assets/images', name), Buffer.from(bytes));
        console.log(`wrote assets/images/${name} (${Math.round(bytes.length / 1024)}KB)`);
    };
    out('logo.png', drawLogo(CK, typeface));
    out('menu-backdrop.jpg', drawBackdrop(CK));
});
