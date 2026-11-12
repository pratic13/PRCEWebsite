// P R Consulting Engineers LLP — "How a site becomes a DPR".
// One bridge site drawn in three stages on a canvas: drone survey (3D), geotechnical
// investigation and design (section A–A′ through the same ground).
// Dependency-free. Every frame is a pure function of the timeline position, so the
// piece can be paused, jumped between stages and shown as a still for reduced motion.

(function () {
    'use strict';
    var root = document.querySelector('[data-showcase]');
    if (!root) return;
    var canvas = root.querySelector('canvas');
    var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return;
    var capEl = root.querySelector('[data-caption]');
    var toggle = root.querySelector('[data-toggle]');
    var steps = [].slice.call(root.querySelectorAll('[data-stage]'));
    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var reduce = !!(mq && mq.matches);

    var sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, floor = Math.floor, round = Math.round, PI = Math.PI;
    function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function ph(t, a, b) { return c01((t - a) / (b - a)); }
    function ease(p) { return p * p * (3 - 2 * p); }
    function eio(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
    function eout(p) { return 1 - Math.pow(1 - p, 3); }
    function pop(p) { var c = 1.70158, q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; }
    function lerp(a, b, p) { return a + (b - a) * p; }
    function ss(a, b, x) { return ease(c01((x - a) / (b - a))); }
    function g2(dx, dy, sx, sy) { return Math.exp(-(dx * dx / (2 * sx * sx) + dy * dy / (2 * sy * sy))); }
    function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

    var COL = { sky: '#23a0da', skyL: '#8fdcff', lime: '#b5d242', amber: '#f9b317', pink: '#ce5976', navy: '#1b1745' };
    var F_BODY = 'Archivo, "Segoe UI", Arial, sans-serif', F_HEAD = 'Poppins, "Segoe UI", Arial, sans-serif';

    // ------------------------------------------------------------------ timeline (seconds)
    var T1 = 10.6;          // survey ends, camera starts swinging into the section
    var T2S = 12.4;         // section view reached, drilling starts
    var T2 = 22.6;          // design starts
    var T3 = 34.4;          // design complete, fade
    var TEND = 35.2;
    var ST0 = [0, T1, T2], ST1 = [T1, T2, TEND], STILL = [T1 - 0.05, T2 - 0.05, T3 - 0.2];

    // ------------------------------------------------------------------ the site (metres, RL in metres)
    var LX = 320, LY = 220, Y0 = 110, XA = 80, XB = 240, OX = 160, OY = 110;
    var BASE = 548.6, SLAB = 545.2, SEC_BOT = 543.0, VE3 = 3.0;
    var LWL = 550.4, HFL = 553.4, FRL_B = 556.1, SOF = FRL_B - 1.05;

    function nalaX(y) { return 160 + 20 * sin((y - 110) / 64) + 7 * sin((y - 110) / 21); }
    function ground(x, y) {
        var u = x - nalaX(y), au = abs(u), bank = ss(10, 27, au);
        var z = 549.6 + 5.6 * bank + 0.022 * max(0, au - 27) + (u > 0 ? 0.45 : 0) * bank;
        z += 0.2 * cos(u / 3.4) * (1 - ss(6, 11, au));
        z += 1.5 * g2(x - 112, y - 104, 13, 16) - 1.25 * g2(x - 212, y - 114, 13, 15);
        z += 4.4 * g2(x - 46, y - 172, 40, 36) + 3.3 * g2(x - 270, y - 38, 38, 32) + 2.7 * g2(x - 286, y - 186, 34, 30) + 1.9 * g2(x - 58, y - 28, 30, 28);
        z += 0.45 * sin(x / 31 + y / 47) + 0.3 * sin(x / 17 - y / 29);
        return z;
    }

    // drone flight plan: six east–west lines
    var NL = 6, SP = LY / NL, T_TO = 1.0, T_L0 = 1.5, T_LINE = 0.62, T_TURN = 0.13, FLY_Z = 568.5, EX0 = 6, EX1 = LX - 6;
    var T_LEND = T_L0 + (NL - 1) * (T_LINE + T_TURN) + T_LINE, T_UP = T_LEND + 1.9;
    var HOME = { x: 303, y: 10 };
    function lineT(k) { return T_L0 + k * (T_LINE + T_TURN); }
    function tRev(x, y) {
        var k = min(NL - 1, max(0, floor(y / SP)));
        var p = (k % 2 === 0) ? (EX1 - x) / (EX1 - EX0) : (x - EX0) / (EX1 - EX0);
        return lineT(k) + c01(p) * T_LINE;
    }
    function drone(t) {
        var o = { x: HOME.x, y: HOME.y, air: 0, scan: false, dir: 0 }, p, q;
        if (t < T_TO) return o;
        if (t < T_L0) {
            p = (t - T_TO) / (T_L0 - T_TO); o.air = eout(c01(p / 0.7)); q = ease(c01((p - 0.25) / 0.75));
            o.x = lerp(HOME.x, EX1, q); o.y = lerp(HOME.y, SP * 0.5, q); return o;
        }
        if (t < T_LEND) {
            var tt = t - T_L0, per = T_LINE + T_TURN, k = floor(tt / per), f = tt - k * per, even = k % 2 === 0, yk = (k + 0.5) * SP;
            o.air = 1;
            if (f <= T_LINE) { q = f / T_LINE; o.x = even ? lerp(EX1, EX0, q) : lerp(EX0, EX1, q); o.y = yk; o.scan = true; o.dir = even ? -1 : 1; }
            else { q = ease((f - T_LINE) / T_TURN); o.x = even ? EX0 : EX1; o.y = lerp(yk, yk + SP, q); }
            return o;
        }
        var xe = EX1, ye = (NL - 0.5) * SP, t1 = T_LEND + 0.25, t2 = t1 + 0.95, t3 = t2 + 0.4;
        if (t < t1) { o.x = xe; o.y = ye; o.air = 1; return o; }
        if (t < t2) { q = eio((t - t1) / (t2 - t1)); o.x = lerp(xe, HOME.x, q); o.y = lerp(ye, HOME.y, q); o.air = 1; return o; }
        if (t < t3) { o.air = 1 - ease((t - t2) / (t3 - t2)); return o; }
        return o;
    }

    // ------------------------------------------------------------------ precomputed model
    var NX = 72, NY = 52, NX1 = NX + 1, DXc = LX / NX, DYc = LY / NY, NN = NX1 * (NY + 1), JCUT = NY / 2;
    var Hn = new Float32Array(NN), tNode = new Float32Array(NN), rise = new Float32Array(NN), zd = new Float32Array(NN), sxN = new Float32Array(NN), syN = new Float32Array(NN);
    var cellCol = new Array(NX * NY), cellCol2 = new Array(NX * NY / 4), conR = [], conI = [], zMin = 1e9, zMax = -1e9;
    var LV0 = 551, LVN = 13;
    var GP = new Float32Array(LX + 1), MP = new Float32Array(LX + 1), WP = new Float32Array(LX + 1), HP = new Float32Array(LX + 1), FR = new Float32Array(LX + 1);
    var RIDGE_Y = [146, 180, 214], RIDGE_COL = ['#2d2978', '#29256c', '#252162'], ridgeP = [];
    var NP = NX * NY * 2, ptX = new Float32Array(NP), ptY = new Float32Array(NP), ptZ = new Float32Array(NP), ptT = new Float32Array(NP), ptC = new Uint8Array(NP);
    var PCOL = ['#3ba4e8', '#5cc6ea', '#8ed8aa', '#c3dd58', '#f9b317'];
    var conLabels = [];

    (function build() {
        var i, j, n, x, k, li;
        for (j = 0; j <= NY; j++) for (i = 0; i <= NX; i++) {
            n = j * NX1 + i; var z = ground(i * DXc, j * DYc);
            Hn[n] = z; if (z < zMin) zMin = z; if (z > zMax) zMax = z;
            tNode[n] = tRev(i * DXc, j * DYc) + 0.9;
        }
        var stops = [[0, 26, 58, 124], [0.4, 36, 94, 162], [0.74, 56, 138, 166], [1, 126, 180, 124]];
        var brRaw = new Float32Array(NX * NY), brS = new Float32Array(NX * NY), dj, di, wsum, acc, wt;
        for (j = 0; j < NY; j++) for (i = 0; i < NX; i++) {
            var a0 = Hn[j * NX1 + i], b0 = Hn[j * NX1 + i + 1], d0 = Hn[(j + 1) * NX1 + i], c0 = Hn[(j + 1) * NX1 + i + 1];
            var gx = ((b0 + c0) - (a0 + d0)) / (2 * DXc) * 2.6, gy = ((d0 + c0) - (a0 + b0)) / (2 * DYc) * 2.6;
            brRaw[j * NX + i] = 0.5 + 0.8 * max(0, (0.55 * gx - 0.55 * gy + 0.63) / Math.sqrt(gx * gx + gy * gy + 1));
        }
        for (var pass = 0; pass < 2; pass++) {
            for (j = 0; j < NY; j++) for (i = 0; i < NX; i++) {
                acc = 0; wsum = 0;
                for (dj = -1; dj <= 1; dj++) for (di = -1; di <= 1; di++) {
                    if (j + dj < 0 || j + dj >= NY || i + di < 0 || i + di >= NX) continue;
                    wt = (dj === 0 ? 2 : 1) * (di === 0 ? 2 : 1); acc += wt * brRaw[(j + dj) * NX + i + di]; wsum += wt;
                }
                brS[j * NX + i] = acc / wsum;
            }
            if (pass === 0) brRaw.set(brS);
        }
        var cR = new Float32Array(NX * NY), cG = new Float32Array(NX * NY), cB = new Float32Array(NX * NY);
        var q4 = function (v) { return round(min(255, v) / 4) * 4; };
        for (j = 0; j < NY; j++) {
            conR[j] = []; conI[j] = [];
            for (i = 0; i < NX; i++) {
                var a = Hn[j * NX1 + i], b = Hn[j * NX1 + i + 1], d = Hn[(j + 1) * NX1 + i], c = Hn[(j + 1) * NX1 + i + 1];
                var zc = (a + b + c + d) / 4, t = (zc - zMin) / (zMax - zMin);
                var br = brS[j * NX + i], s0 = stops[0], s1 = stops[1];
                for (k = 1; k < stops.length; k++) { if (t <= stops[k][0] || k === stops.length - 1) { s0 = stops[k - 1]; s1 = stops[k]; break; } }
                var f = c01((t - s0[0]) / (s1[0] - s0[0]));
                var r = lerp(s0[1], s1[1], f), g = lerp(s0[2], s1[2], f), bl = lerp(s0[3], s1[3], f);
                var wet = 1 - ss(7.5, 10.5, abs((i + 0.5) * DXc - nalaX((j + 0.5) * DYc)));
                if (wet > 0) { r = lerp(r, 38, 0.8 * wet); g = lerp(g, 150, 0.8 * wet); bl = lerp(bl, 214, 0.8 * wet); br = lerp(br, 0.96, wet); }
                cR[j * NX + i] = r * br; cG[j * NX + i] = g * br; cB[j * NX + i] = bl * br;
                cellCol[j * NX + i] = 'rgb(' + q4(r * br) + ',' + q4(g * br) + ',' + q4(bl * br) + ')';
                // contours (marching squares)
                var lo = min(a, b, c, d), hi = max(a, b, c, d), x0 = i * DXc, y0 = j * DYc;
                for (li = 0; li < LVN; li++) {
                    var L = LV0 + li; if (L <= lo || L > hi) continue;
                    var kk = (a >= L ? 1 : 0) | (b >= L ? 2 : 0) | (c >= L ? 4 : 0) | (d >= L ? 8 : 0);
                    if (kk === 0 || kk === 15) continue;
                    var e0x = x0 + DXc * (L - a) / (b - a), e0y = y0, e1x = x0 + DXc, e1y = y0 + DYc * (L - b) / (c - b);
                    var e2x = x0 + DXc * (L - d) / (c - d), e2y = y0 + DYc, e3x = x0, e3y = y0 + DYc * (L - a) / (d - a);
                    var out = (L % 5 === 0) ? conI[j] : conR[j];
                    var P = function (ax, ay, bx, by) { out.push(ax, ay, bx, by, L, li); };
                    switch (kk) {
                        case 1: case 14: P(e3x, e3y, e0x, e0y); break;
                        case 2: case 13: P(e0x, e0y, e1x, e1y); break;
                        case 3: case 12: P(e3x, e3y, e1x, e1y); break;
                        case 4: case 11: P(e1x, e1y, e2x, e2y); break;
                        case 6: case 9: P(e0x, e0y, e2x, e2y); break;
                        case 7: case 8: P(e3x, e3y, e2x, e2y); break;
                        case 5: P(e3x, e3y, e0x, e0y); P(e1x, e1y, e2x, e2y); break;
                        case 10: P(e0x, e0y, e1x, e1y); P(e2x, e2y, e3x, e3y); break;
                    }
                }
            }
        }
        for (j = 0; j < NY; j += 2) for (i = 0; i < NX; i += 2) {
            var n0 = j * NX + i, n1 = n0 + 1, n2 = n0 + NX, n3 = n2 + 1;
            cellCol2[(j >> 1) * (NX >> 1) + (i >> 1)] = 'rgb(' + q4((cR[n0] + cR[n1] + cR[n2] + cR[n3]) / 4) + ',' + q4((cG[n0] + cG[n1] + cG[n2] + cG[n3]) / 4) + ',' + q4((cB[n0] + cB[n1] + cB[n2] + cB[n3]) / 4) + ')';
        }
        // section profiles along A–A′ (y = Y0)
        for (x = 0; x <= LX; x++) {
            var gz = ground(x, Y0), u = abs(x - 160), bk = ss(15, 30, u);
            GP[x] = gz;
            HP[x] = 547.3 + 0.45 * sin(x / 21 + 0.6) + 0.25 * sin(x / 9.5);
            WP[x] = min(gz - 0.7, 551.3 + 0.5 * sin(x / 26 + 2) + 0.2 * sin(x / 8));
            MP[x] = gz - (1.55 + 0.25 * sin(x / 13)) * bk;
            if (MP[x] < WP[x]) MP[x] = WP[x];
        }
        var bedMin = 1e9; for (x = 150; x <= 170; x++) bedMin = min(bedMin, GP[x]);
        LWL = bedMin + 0.42;
        for (x = 0; x <= LX; x++) {
            if (x <= 136) FR[x] = lerp(GP[XA], FRL_B, ss(XA + 2, 134, x));
            else if (x >= 184) FR[x] = lerp(FRL_B, GP[XB], ss(186, XB - 2, x));
            else FR[x] = FRL_B;
        }
        for (k = 0; k < RIDGE_Y.length; k++) { var rp = new Float32Array(LX / 2 + 1); for (x = 0; x <= LX; x += 2) rp[x >> 1] = ground(x, RIDGE_Y[k]); ridgeP.push(rp); }
        // point cloud
        var R = rng(7);
        for (k = 0; k < NP; k++) {
            var ci = floor(k / 2), px = ((ci % NX) + R()) * DXc, py = (floor(ci / NX) + R()) * DYc, pz = ground(px, py);
            ptX[k] = px; ptY[k] = py; ptZ[k] = pz; ptT[k] = tRev(px, py) + R() * 0.07;
            ptC[k] = min(4, floor(5 * (pz - zMin) / (zMax - zMin)));
        }
        // labels on the index contours: the segment nearest to a chosen spot
        [[555, 66, 62], [560, 78, 150]].forEach(function (q) {
            var best = null, bd = 1e9;
            for (j = 0; j < NY; j++) { var arr = conI[j]; for (k = 0; k < arr.length; k += 6) { if (arr[k + 4] !== q[0]) continue; var mx = (arr[k] + arr[k + 2]) / 2, my = (arr[k + 1] + arr[k + 3]) / 2, dd = (mx - q[1]) * (mx - q[1]) + (my - q[2]) * (my - q[2]); if (dd < bd) { bd = dd; best = [mx, my, q[0]]; } } }
            if (best) conLabels.push(best);
        });
    })();

    // boreholes, one per foundation
    var BH = [
        { x: 136, name: 'BH-1', at: 'Abutment A1', t0: 12.7, t1: 15.1 },
        { x: 152, name: 'BH-2', at: 'Pier P1', t0: 15.5, t1: 16.7 },
        { x: 168, name: 'BH-3', at: 'Pier P2', t0: 17.1, t1: 18.2 },
        { x: 184, name: 'BH-4', at: 'Abutment A2', t0: 18.6, t1: 19.7 }
    ];
    var MAT = [
        { name: 'Black cotton soil', short: 'BC soil', fill: '#54486f', core: '#9484c4' },
        { name: 'Murum', short: 'Murum', fill: '#9b6c38', core: '#e6a550' },
        { name: 'Weathered basalt', short: 'Weathered rock', fill: '#5c7088', core: '#adc0d2' },
        { name: 'Hard basalt', short: 'Hard rock', fill: '#2c4a7a', core: '#5c95db' }
    ];
    var totalDrilled = 0;
    BH.forEach(function (b, bi) {
        b.g = GP[b.x]; b.m = MP[b.x]; b.w = WP[b.x]; b.h = HP[b.x]; b.bot = b.h - 3; b.depth = b.g - b.bot; b.soil = b.g - b.w;
        b.tfs = min(0.42, max(0.1, 0.9 * b.soil / b.depth));
        totalDrilled += b.depth;
        var rows = [], d, z, R = rng(100 + bi * 17);
        for (d = 1.5; d < b.soil - 0.25; d += 1.5) {
            z = b.g - d;
            if (z > b.m) rows.push({ d: d, mat: 0, val: 'N ' + (6 + floor(d * 1.4) + floor(R() * 2)), n: true });
            else rows.push({ d: d, mat: 1, val: 'N ' + round(17 + 6.5 * (b.m - z) + R() * 3), n: true });
        }
        rows.push({ d: b.soil, mat: 2, val: 'Refusal', n: true });
        for (d = b.soil; d < b.depth - 0.05; d += 1.5) {
            var de = min(d + 1.5, b.depth), hard = (b.g - (d + de) / 2) < b.h;
            rows.push({ d: de, mat: hard ? 3 : 2, val: 'RQD ' + round(hard ? 80 + R() * 12 : 22 + R() * 30) + '%', n: false });
        }
        rows.forEach(function (rw) {
            var pr = rw.d < b.soil ? b.tfs * (rw.d / b.soil) : b.tfs + (1 - b.tfs) * ((rw.d - b.soil) / (b.depth - b.soil));
            rw.t = b.t0 + min(1, pr) * (b.t1 - b.t0);
        });
        b.rows = rows;
    });
    function depthAt(b, T) {
        var p = ph(T, b.t0, b.t1);
        return p < b.tfs ? b.soil * (p / b.tfs) : b.soil + (b.depth - b.soil) * ((p - b.tfs) / (1 - b.tfs));
    }
    function gAt(x) { var i = floor(x), f = x - i; return i >= LX ? GP[LX] : lerp(GP[i], GP[i + 1], f); }
    var FND = [
        { x: 136, z: WP[136] - 0.9, x0: 133.9, x1: 137.9, h: 0.8 },
        { x: 152, z: HP[152] - 0.7, x0: 150.3, x1: 153.7, h: 0.9 },
        { x: 168, z: HP[168] - 0.7, x0: 166.3, x1: 169.7, h: 0.9 },
        { x: 184, z: WP[184] - 0.9, x0: 182.1, x1: 186.1, h: 0.8 }
    ];
    // cut and fill runs on the approaches
    var RUNS = [];
    (function () {
        var x, cur = null;
        function sgn(x) { if (x > 136 && x < 184) return 0; var d = FR[x] - GP[x]; return d > 0.04 ? 1 : d < -0.04 ? -1 : 0; }
        for (x = XA; x <= XB; x++) {
            var s = sgn(x);
            if (cur && s !== cur.s) { cur.xb = x - 1; RUNS.push(cur); cur = null; }
            if (!cur && s !== 0) cur = { s: s, xa: x, xb: x, dmax: 0, xm: x };
            if (cur) { var dd = abs(FR[x] - GP[x]); if (dd > cur.dmax) { cur.dmax = dd; cur.xm = x; } }
        }
        if (cur) { cur.xb = XB; RUNS.push(cur); }
    })();
    var HFL_X0 = 160, HFL_X1 = 160;
    while (HFL_X0 > 0 && GP[HFL_X0] < HFL) HFL_X0--;
    while (HFL_X1 < LX && GP[HFL_X1] < HFL) HFL_X1++;
    // hatch marks, stored in ground coordinates so they stay attached to their layer
    var hBC = [], hMU = [], hWR = [], hHR = [];
    (function () {
        var R = rng(31), k;
        for (k = 0; k < 190; k++) hBC.push(20 + R() * 280, 0.2 + R() * 0.6, 1.2 + R() * 1.6);
        for (k = 0; k < 560; k++) hMU.push(20 + R() * 280, 0.1 + R() * 0.8, R());
        for (k = 0; k < 330; k++) hWR.push(20 + R() * 280, 0.08 + R() * 0.84, R() * PI, 0.6 + R() * 0.7);
        for (k = 0; k < 64; k++) hHR.push(20 + R() * 280, R() * 0.5, 0.1 + R() * 0.2, (R() - 0.5) * 1.8);
    })();

    // ------------------------------------------------------------------ canvas, camera
    var W = 0, H = 0, DPR = 1, compact = false, LOD = 1, quality = 0, fAcc = 0, fN = 0, V3, VS, bgGrad, XV0 = 0, XV1 = LX, insetBottom = 0, wideInset = false, labelZone = [84, 108];
    var cam = { cw: 1, sw: 0, ce: 1, se: 0, S: 1, Z: 1, x0: 0, y0: 0, oz: 553 };
    function PX(x, y) { return cam.x0 + ((x - OX) * cam.cw - (y - OY) * cam.sw) * cam.S; }
    function PY(x, y, z) { return cam.y0 - (((x - OX) * cam.sw + (y - OY) * cam.cw) * cam.se * cam.S + (z - cam.oz) * cam.ce * cam.Z); }
    function sX(x) { return cam.x0 + (x - OX) * cam.S; }           // section view only (yaw = 0)
    function sY(z) { return cam.y0 - (z - cam.oz) * cam.ce * cam.Z; }

    function layout() {
        compact = W < 640; LOD = compact || quality > 1 ? 2 : 1;
        var yaw = compact ? -0.6 : -0.52, el = compact ? 0.8 : 0.6, oz = 552.5;
        // fit the block (with the drone above it) into the stage at the extremes of the slow camera sway
        var bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9, a, b, c, o, offs = [-0.03, 0.07];
        for (o = 0; o < 2; o++) for (a = 0; a < 2; a++) for (b = 0; b < 2; b++) for (c = 0; c < 2; c++) {
            var yy = yaw + offs[o], dx = (a ? LX : 0) - OX, dy = (b ? LY : 0) - OY, zz = c ? (a && !b ? zMax + 2 : FLY_Z + 1.5) : SLAB;
            var px = dx * cos(yy) - dy * sin(yy), py = -((dx * sin(yy) + dy * cos(yy)) * sin(el) + (zz - oz) * cos(el) * VE3);
            bx0 = min(bx0, px); bx1 = max(bx1, px); by0 = min(by0, py); by1 = max(by1, py);
        }
        var top = compact ? 94 : 52, bot = compact ? 18 : 16, availH = H - top - bot;
        var S = min(W * (compact ? 0.95 : 0.8) / (bx1 - bx0), availH / (by1 - by0));
        V3 = { yaw: yaw, el: el, S: S, Z: S * VE3, x0: W * (compact ? 0.5 : 0.56) - (bx0 + bx1) / 2 * S, y0: top + availH / 2 - (by0 + by1) / 2 * S, oz: oz };
        VS = { yaw: 0, el: 0.07, S: W * (compact ? 0.78 : 0.815) / (XB - XA), Z: H * 0.47 / 15.6, x0: W / 2, y0: H * (compact ? 0.4 : 0.385), oz: 556 };
        bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.38, max(W, H) * 0.78);
        bgGrad.addColorStop(0, '#2c2772'); bgGrad.addColorStop(0.55, '#1d194c'); bgGrad.addColorStop(1, '#130f36');
        XV0 = max(0, floor(OX - (W / 2) / VS.S) - 1); XV1 = min(LX, Math.ceil(OX + (W / 2) / VS.S) + 1);
        insetBottom = VS.y0 - (GP[XB] - VS.oz) * cos(VS.el) * VS.Z - 49;
        wideInset = !compact && W >= 880 && insetBottom > 132;
        ctx.font = '500 ' + (compact ? 9.5 : 12) + 'px ' + F_BODY;
        var tw = 0; MAT.forEach(function (m) { tw = max(tw, ctx.measureText(compact ? m.short : m.name).width); });
        labelZone = [83, 86 + (tw + 10) / VS.S];
    }
    function setCam(T) {
        var q = ph(T, T1, T2S), e = eio(ph(q, 0.08, 1));
        var yaw = lerp(V3.yaw + 0.07 * sin(T * 0.33), 0, e), el = lerp(V3.el, VS.el, e);
        cam.cw = cos(yaw); cam.sw = sin(yaw); cam.ce = cos(el); cam.se = sin(el);
        cam.S = Math.exp(lerp(Math.log(V3.S), Math.log(VS.S), e)); cam.Z = Math.exp(lerp(Math.log(V3.Z), Math.log(VS.Z), e));
        cam.x0 = lerp(V3.x0, VS.x0, e); cam.y0 = lerp(V3.y0, VS.y0, e); cam.oz = lerp(V3.oz, VS.oz, e);
        return q;
    }

    // ------------------------------------------------------------------ drawing helpers
    function text(s, x, y, o) {
        ctx.font = (o.weight || 400) + ' ' + o.size + 'px ' + (o.head ? F_HEAD : F_BODY);
        ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
        ctx.fillStyle = o.color || '#fff'; ctx.fillText(s, x, y);
    }
    function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    function rr(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
    }
    function wrect(x0, zt, x1, zb) { ctx.rect(sX(x0), sY(zt), sX(x1) - sX(x0), sY(zb) - sY(zt)); }
    function bg(a) { ctx.globalAlpha = a; ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    function zAt(x, y) { return zd[min(NY, max(0, round(y / DYc))) * NX1 + min(NX, max(0, round(x / DXc)))]; }
    function panel(x, y, w, h, a) {
        ctx.globalAlpha = a; rr(x, y, w, h, 9); ctx.fillStyle = 'rgba(15,12,44,0.8)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // ------------------------------------------------------------------ stage 1: survey (3D)
    function ridges(a) {
        var k, x;
        for (k = RIDGE_Y.length - 1; k >= 0; k--) {
            var y = RIDGE_Y[k], P = ridgeP[k];
            ctx.beginPath(); ctx.moveTo(PX(0, y), PY(0, y, P[0]));
            for (x = 2; x <= LX; x += 2) ctx.lineTo(PX(x, y), PY(x, y, P[x >> 1]));
            ctx.lineTo(PX(LX, y), PY(LX, y, SEC_BOT)); ctx.lineTo(PX(0, y), PY(0, y, SEC_BOT)); ctx.closePath();
            ctx.globalAlpha = a; ctx.fillStyle = RIDGE_COL[k]; ctx.fill();
        }
    }
    function slabTop(a) {
        var v;
        ctx.globalAlpha = a; ctx.beginPath();
        ctx.moveTo(PX(0, 0), PY(0, 0, BASE)); ctx.lineTo(PX(LX, 0), PY(LX, 0, BASE)); ctx.lineTo(PX(LX, LY), PY(LX, LY, BASE)); ctx.lineTo(PX(0, LY), PY(0, LY, BASE)); ctx.closePath();
        ctx.fillStyle = '#1b1752'; ctx.fill();
        ctx.beginPath();
        for (v = 20; v < LX; v += 20) { ctx.moveTo(PX(v, 0), PY(v, 0, BASE)); ctx.lineTo(PX(v, LY), PY(v, LY, BASE)); }
        for (v = 20; v < LY; v += 20) { ctx.moveTo(PX(0, v), PY(0, v, BASE)); ctx.lineTo(PX(LX, v), PY(LX, v, BASE)); }
        ctx.strokeStyle = 'rgba(150,170,255,0.14)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    function strokeSegs(a, lvl, col, lw, alpha) {
        var k, any = false, zo = LOD === 2 ? 0.45 : 0.06; ctx.beginPath();
        for (k = 0; k < a.length; k += 6) {
            if (a[k + 5] >= lvl) continue; any = true;
            ctx.moveTo(PX(a[k], a[k + 1]), PY(a[k], a[k + 1], a[k + 4] + zo)); ctx.lineTo(PX(a[k + 2], a[k + 3]), PY(a[k + 2], a[k + 3], a[k + 4] + zo));
        }
        if (!any) return;
        ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
    }
    function row(j, aH, asc, conA, lvl) {
        var i, ii, n00, n10, n01, n11, r, c, al, open = false, lc = null, la = -1, any = false, st = LOD, nx = NX / st;
        for (ii = 0; ii < nx; ii++) {
            i = (asc ? ii : nx - 1 - ii) * st;
            n00 = j * NX1 + i; n10 = n00 + st; n01 = n00 + NX1 * st; n11 = n01 + st;
            r = (rise[n00] + rise[n10] + rise[n01] + rise[n11]) * 0.25;
            if (r < 0.01) continue;
            any = true;
            al = r >= 0.417 ? aH : r * 2.4 * aH; c = st === 1 ? cellCol[j * NX + i] : cellCol2[(j >> 1) * (NX >> 1) + (i >> 1)];
            if (c !== lc || al !== la) {
                if (open) ctx.fill();
                ctx.globalAlpha = al; ctx.fillStyle = c; ctx.beginPath(); open = true; lc = c; la = al;
            }
            // grow each quad by about half a pixel so neighbours overlap and no seams show
            var x0 = sxN[n00], y0 = syN[n00], x1 = sxN[n10], y1 = syN[n10], x2 = sxN[n11], y2 = syN[n11], x3 = sxN[n01], y3 = syN[n01];
            var mx = (x0 + x1 + x2 + x3) * 0.25, my = (y0 + y1 + y2 + y3) * 0.25, g = 1.09;
            ctx.moveTo(mx + (x0 - mx) * g, my + (y0 - my) * g - 0.3); ctx.lineTo(mx + (x1 - mx) * g, my + (y1 - my) * g - 0.3);
            ctx.lineTo(mx + (x2 - mx) * g, my + (y2 - my) * g - 0.3); ctx.lineTo(mx + (x3 - mx) * g, my + (y3 - my) * g - 0.3); ctx.closePath();
        }
        if (open) ctx.fill();
        if (!any) return;
        ctx.beginPath();
        for (i = 0; i < NX; i += st) {
            n00 = j * NX1 + i; n10 = n00 + st; n01 = n00 + NX1 * st; n11 = n01 + st;
            if (rise[n00] + rise[n11] < 1) continue;
            ctx.moveTo(sxN[n10], syN[n10]); ctx.lineTo(sxN[n00], syN[n00]); ctx.lineTo(sxN[n01], syN[n01]); ctx.moveTo(sxN[n00], syN[n00]); ctx.lineTo(sxN[n11], syN[n11]);
        }
        ctx.globalAlpha = aH; ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.6; ctx.stroke();
        if (conA > 0.01) {
            for (i = 0; i < st; i++) {
                strokeSegs(conR[j + i], lvl, 'rgb(196,230,255)', 0.9, conA * aH * 0.55);
                strokeSegs(conI[j + i], lvl, '#ffffff', 1.5, conA * aH * 0.95);
            }
        }
    }
    function skirts(a) {
        var i, j;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.moveTo(sxN[0], syN[0]);
        for (i = 1; i <= NX; i++) ctx.lineTo(sxN[i], syN[i]);
        ctx.lineTo(PX(LX, 0), PY(LX, 0, SLAB)); ctx.lineTo(PX(0, 0), PY(0, 0, SLAB)); ctx.closePath();
        ctx.fillStyle = '#16133e'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(sxN[NX], syN[NX]);
        for (j = 1; j <= NY; j++) ctx.lineTo(sxN[j * NX1 + NX], syN[j * NX1 + NX]);
        ctx.lineTo(PX(LX, LY), PY(LX, LY, SLAB)); ctx.lineTo(PX(LX, 0), PY(LX, 0, SLAB)); ctx.closePath();
        ctx.fillStyle = '#211d5a'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(sxN[0], syN[0]);
        for (i = 1; i <= NX; i++) ctx.lineTo(sxN[i], syN[i]);
        for (j = 1; j <= NY; j++) ctx.lineTo(sxN[j * NX1 + NX], syN[j * NX1 + NX]);
        ctx.strokeStyle = 'rgba(255,255,255,0.42)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(PX(0, 0), PY(0, 0, SLAB)); ctx.lineTo(PX(LX, 0), PY(LX, 0, SLAB)); ctx.lineTo(PX(LX, LY), PY(LX, LY, SLAB));
        ctx.moveTo(sxN[NX], syN[NX]); ctx.lineTo(PX(LX, 0), PY(LX, 0, SLAB));
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke();
    }
    function facePath(zb) {
        var x;
        ctx.beginPath(); ctx.moveTo(PX(0, Y0), PY(0, Y0, GP[0]));
        for (x = 2; x <= LX; x += 2) ctx.lineTo(PX(x, Y0), PY(x, Y0, GP[x]));
        if (zb != null) { ctx.lineTo(PX(LX, Y0), PY(LX, Y0, zb)); ctx.lineTo(PX(0, Y0), PY(0, Y0, zb)); ctx.closePath(); }
    }
    function face(a, q) {
        if (a <= 0) return;
        var zb = lerp(SLAB, SEC_BOT - 14, eio(ph(q, 0.1, 0.9)));
        var g = ctx.createLinearGradient(0, PY(OX, Y0, 557), 0, PY(OX, Y0, 542));
        g.addColorStop(0, '#221d5b'); g.addColorStop(1, '#131037');
        facePath(zb); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fill();
        facePath(null); ctx.globalAlpha = a * 0.92; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.7; ctx.stroke();
    }
    function flag(x, s, a) {
        if (a <= 0) return;
        var sx = PX(x, Y0), sy = PY(x, Y0, GP[x]), h = compact ? 22 : 30, r = compact ? 8.5 : 11;
        ctx.globalAlpha = a; ctx.strokeStyle = COL.amber; ctx.lineWidth = 1.5; line(sx, sy, sx, sy - h + r);
        ctx.fillStyle = COL.amber; ctx.beginPath(); ctx.arc(sx, sy - h, r, 0, 2 * PI); ctx.fill();
        text(s, sx, sy - h + 0.5, { size: compact ? 10 : 12, weight: 600, color: COL.navy, align: 'center', base: 'middle', head: true });
    }
    function sectionLine(p, a) {
        if (p <= 0 || a <= 0) return;
        var x, xe = lerp(XA, XB, p);
        ctx.beginPath(); ctx.moveTo(PX(XA, Y0), PY(XA, Y0, GP[XA] + 0.15));
        for (x = XA + 2; x <= xe; x += 2) ctx.lineTo(PX(x, Y0), PY(x, Y0, GP[x] + 0.15));
        ctx.globalAlpha = a; ctx.strokeStyle = COL.amber; ctx.lineWidth = 2.2; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
    }
    var GCP = [[26, 24], [292, 34], [294, 196], [28, 192], [112, 132]];
    function gcps(t, a) {
        var k;
        for (k = 0; k < GCP.length; k++) {
            var t0 = 0.25 + k * 0.14, p = ph(t, t0, t0 + 0.35); if (p <= 0) continue;
            var x = GCP[k][0], y = GCP[k][1], sx = PX(x, y), sy = PY(x, y, zAt(x, y) + 0.1), s = pop(p) * (compact ? 4.6 : 6.2), pr = ph(t, t0, t0 + 0.9);
            if (pr < 1) { ctx.globalAlpha = a * (1 - pr) * 0.75; ctx.strokeStyle = COL.amber; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(sx, sy, 6 + 22 * pr, (6 + 22 * pr) * 0.5, 0, 0, 2 * PI); ctx.stroke(); }
            ctx.globalAlpha = a; ctx.fillStyle = COL.navy; ctx.strokeStyle = COL.amber; ctx.lineWidth = 1.7;
            ctx.beginPath(); ctx.moveTo(sx, sy - s * 1.2); ctx.lineTo(sx + s, sy + s * 0.6); ctx.lineTo(sx - s, sy + s * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = COL.amber; ctx.beginPath(); ctx.arc(sx, sy - s * 0.05, 1.5, 0, 2 * PI); ctx.fill();
            if (!compact && p >= 1) { ctx.globalAlpha = a * 0.78; text('GCP ' + (k + 1), sx + s + 6, sy + 3, { size: 10.5, weight: 500 }); }
        }
    }
    var ROT = [[-12, -4], [12, -4], [-9, 5], [9, 5]];
    function droneDraw(t, a) {
        var ap = ph(t, 0.55, 0.9) * a; if (ap <= 0) return;
        var d = drone(t), zg = zAt(d.x, d.y), z = lerp(zg + 0.3, FLY_Z, d.air);
        var sx = PX(d.x, d.y), sy = PY(d.x, d.y, z), gy = PY(d.x, d.y, zg), k = compact ? 0.74 : 1, y, first, i;
        ctx.globalAlpha = ap * 0.4; ctx.fillStyle = '#0a0824'; ctx.beginPath(); ctx.ellipse(sx, gy, 9 * k, 3.6 * k, 0, 0, 2 * PI); ctx.fill();
        if (d.scan) {
            var ya = d.y - SP / 2, yb = d.y + SP / 2, st = SP / 8;
            ctx.beginPath(); ctx.moveTo(sx, sy);
            for (y = ya; y <= yb + 0.01; y += st) ctx.lineTo(PX(d.x, y), PY(d.x, y, ground(d.x, y)));
            ctx.closePath(); ctx.globalAlpha = ap * 0.17; ctx.fillStyle = COL.sky; ctx.fill();
            ctx.beginPath(); first = true;
            for (y = ya; y <= yb + 0.01; y += st) { if (first) { ctx.moveTo(PX(d.x, y), PY(d.x, y, ground(d.x, y))); first = false; } else ctx.lineTo(PX(d.x, y), PY(d.x, y, ground(d.x, y))); }
            ctx.lineCap = 'round'; ctx.globalAlpha = ap * 0.22; ctx.strokeStyle = COL.sky; ctx.lineWidth = 9; ctx.stroke(); ctx.globalAlpha = ap * 0.4; ctx.lineWidth = 5; ctx.stroke();
            ctx.globalAlpha = ap; ctx.strokeStyle = '#b4e8ff'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineCap = 'butt';
        }
        var spin = t > 0.85 && d.air > 0.02;
        ctx.save(); ctx.translate(sx, sy); ctx.scale(k, k); if (d.scan) ctx.rotate(d.dir * 0.09);
        ctx.globalAlpha = ap; ctx.lineCap = 'round'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.7;
        ctx.beginPath(); for (i = 0; i < 4; i++) { ctx.moveTo(0, 0); ctx.lineTo(ROT[i][0], ROT[i][1]); } ctx.stroke();
        for (i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.ellipse(ROT[i][0], ROT[i][1], 7, 2.6, 0, 0, 2 * PI);
            ctx.fillStyle = spin ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)'; ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8; ctx.stroke();
            var th = spin ? t * 47 + i * 1.3 : 0.5 + i;
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.1; line(ROT[i][0] - 7 * cos(th), ROT[i][1] - 2.6 * sin(th), ROT[i][0] + 7 * cos(th), ROT[i][1] + 2.6 * sin(th));
        }
        rr(-5.5, -3.6, 11, 7.2, 2.6); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.fillStyle = COL.amber; ctx.beginPath(); ctx.arc(0, 4.6, 2.3, 0, 2 * PI); ctx.fill();
        ctx.lineCap = 'butt'; ctx.restore();
    }
    function points(t, a) {
        if (t < T_L0 || t > T_UP + 0.2) return;
        var k, c, sz = compact ? 1.25 : 1.6;
        for (c = 0; c < 5; c++) {
            ctx.fillStyle = PCOL[c];
            for (k = 0; k < NP; k += LOD) {
                if (ptC[k] !== c) continue;
                var dt = t - ptT[k]; if (dt <= 0 || dt >= 1.95) continue;
                var al = round((dt < 0.12 ? dt / 0.12 : 1) * (dt > 1.15 ? 1 - (dt - 1.15) / 0.8 : 1) * 8) / 8; if (al <= 0) continue;
                ctx.globalAlpha = al * a;
                ctx.fillRect(PX(ptX[k], ptY[k]) - sz / 2, PY(ptX[k], ptY[k], ptZ[k]) - sz / 2, sz, sz);
            }
        }
    }
    function north(a) {
        if (compact || a <= 0) return;
        var x = 46, y = H - 48, dx = -cam.sw, dy = -cam.cw * cam.se, l = Math.sqrt(dx * dx + dy * dy); dx /= l; dy /= l;
        ctx.globalAlpha = a * 0.3; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 19, 0, 2 * PI); ctx.stroke();
        ctx.globalAlpha = a * 0.9; ctx.lineWidth = 1.6; line(x - dx * 12, y - dy * 12, x + dx * 9, y + dy * 9);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + dx * 16, y + dy * 16); ctx.lineTo(x + dx * 7 - dy * 4.5, y + dy * 7 + dx * 4.5); ctx.lineTo(x + dx * 7 + dy * 4.5, y + dy * 7 - dx * 4.5); ctx.closePath(); ctx.fill();
        text('N', x + dx * 30, y + dy * 30, { size: 11, weight: 600, align: 'center', base: 'middle', head: true });
    }
    function draw3D(T, q) {
        var n, j, allUp = T > T_UP;
        for (n = 0; n < NN; n++) {
            var r = allUp ? 1 : eout(ph(T, tNode[n], tNode[n] + 0.8)), z = BASE + (Hn[n] - BASE) * r, x = (n % NX1) * DXc, y = floor(n / NX1) * DYc;
            rise[n] = r; zd[n] = z; sxN[n] = PX(x, y); syN[n] = PY(x, y, z);
        }
        var aFront = 1 - ph(q, 0, 0.3), aBack = 1 - ph(q, 0.45, 0.95);
        var conP = ph(T, 7.7, 9.0), conA = conP > 0 ? 1 - ph(q, 0.2, 0.65) : 0, lvl = conP * LVN, asc = cam.sw <= 0;
        if (q > 0) ridges(ph(q, 0.5, 1));
        if (aFront > 0.01) {
            var gx0 = PX(OX, OY), gy0 = PY(OX, OY, SLAB - 1.5), gr = cam.S * 250, sg = ctx.createRadialGradient(gx0, gy0, gr * 0.2, gx0, gy0, gr);
            sg.addColorStop(0, 'rgba(8,6,30,0.6)'); sg.addColorStop(1, 'rgba(8,6,30,0)');
            ctx.save(); ctx.translate(0, gy0 * (1 - 0.42)); ctx.scale(1, 0.42); ctx.globalAlpha = aFront; ctx.fillStyle = sg; ctx.fillRect(gx0 - gr, gy0 - gr, gr * 2, gr * 2); ctx.restore();
        }
        if (!allUp) slabTop(aFront);
        for (j = NY - LOD; j >= 0; j -= LOD) {
            var aH = j >= JCUT ? aBack : aFront;
            if (j === JCUT - LOD && q > 0) face(ph(q, 0.04, 0.4), q);
            if (aH > 0.01) row(j, aH, asc, conA, lvl);
        }
        if (aFront > 0.01) skirts(aFront);
        points(T, aFront);
        if (conP >= 1 && conA > 0.01 && !compact) {
            conLabels.forEach(function (c) {
                var sx = PX(c[0], c[1]), sy = PY(c[0], c[1], c[2]);
                ctx.globalAlpha = conA * aFront * 0.85; rr(sx - 15, sy - 8, 30, 16, 4); ctx.fillStyle = '#1d194e'; ctx.fill();
                ctx.globalAlpha = conA * aFront; text(String(c[2]), sx, sy + 0.5, { size: 10.5, weight: 600, align: 'center', base: 'middle' });
            });
        }
        var sl = ph(T, 9.0, 9.9);
        sectionLine(ease(sl), 1 - ph(q, 0.45, 0.85));
        gcps(T, aFront);
        droneDraw(T, aFront);
        flag(XA, 'A', ph(sl, 0, 0.2)); flag(XB, 'A′', ph(sl, 0.85, 1));
        north(aFront * ph(T, 0, 0.4));
    }

    // ------------------------------------------------------------------ stage 2: geotechnical investigation (section)
    function nalaWater() {
        var x, a = 160, b = 160;
        while (a > 0 && GP[a] < LWL) a--; while (b < LX && GP[b] < LWL) b++;
        ctx.beginPath(); ctx.moveTo(sX(a), sY(LWL));
        for (x = a + 1; x < b; x++) ctx.lineTo(sX(x), sY(min(LWL, GP[x])));
        ctx.lineTo(sX(b), sY(LWL)); ctx.closePath();
        ctx.globalAlpha = 0.6; ctx.fillStyle = COL.sky; ctx.fill();
        ctx.globalAlpha = 0.9; ctx.strokeStyle = COL.skyL; ctx.lineWidth = 1.2; line(sX(a), sY(LWL), sX(b), sY(LWL));
    }
    function rlScale(a, bandTop) {
        if (a <= 0) return;
        var z, st = compact ? 4 : 2, x = compact ? 3 : 12;
        for (z = 544; z <= 558; z += st) {
            var y = sY(z); if (y > bandTop - 8) continue;
            ctx.globalAlpha = a * 0.45; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; line(x, y, x + 5, y);
            ctx.globalAlpha = a * 0.55; text(String(z), x + 9, y, { size: compact ? 8.5 : 10, base: 'middle' });
        }
        if (!compact) { ctx.globalAlpha = a * 0.5; text('RL, m', x, sY(559.2), { size: 10, base: 'middle' }); }
    }
    function layer(top, bot, col, am) {
        var x;
        ctx.beginPath(); ctx.moveTo(sX(XV0), sY(top[XV0]));
        for (x = XV0 + 1; x <= XV1; x++) ctx.lineTo(sX(x), sY(top[x]));
        if (bot) for (x = XV1; x >= XV0; x--) ctx.lineTo(sX(x), sY(bot[x]));
        else { ctx.lineTo(sX(XV1), H + 4); ctx.lineTo(sX(XV0), H + 4); }
        ctx.closePath(); ctx.globalAlpha = am; ctx.fillStyle = col; ctx.fill();
    }
    function boundary(P, top, am) {
        var x, pen = false;
        ctx.beginPath();
        for (x = XV0; x <= XV1; x++) {
            if (top && top[x] - P[x] < 0.12) { pen = false; continue; }
            if (pen) ctx.lineTo(sX(x), sY(P[x])); else { ctx.moveTo(sX(x), sY(P[x])); pen = true; }
        }
        ctx.globalAlpha = am * 0.6; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    }
    function inZone(x) { return x > labelZone[0] && x < labelZone[1]; }
    function hatch(am) {
        var k, x, xi, z, cx, cy;
        ctx.globalAlpha = am * 0.9; ctx.strokeStyle = 'rgba(255,255,255,0.24)'; ctx.lineWidth = 1; ctx.beginPath();
        for (k = 0; k < hBC.length; k += 3) {
            x = hBC[k]; xi = round(x); if (x < XV0 || x > XV1 || inZone(x) || GP[xi] - MP[xi] < 0.6) continue;
            cy = sY(lerp(MP[xi], GP[xi], hBC[k + 1])); ctx.moveTo(sX(x - hBC[k + 2] / 2), cy); ctx.lineTo(sX(x + hBC[k + 2] / 2), cy);
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,232,186,0.6)';
        for (k = 0; k < hMU.length; k += 3) {
            x = hMU[k]; xi = round(x); if (x < XV0 || x > XV1 || inZone(x) || MP[xi] - WP[xi] < 0.45 || (compact && k % 2)) continue;
            var s = 1.2 + hMU[k + 2] * 1.1; ctx.fillRect(sX(x) - s / 2, sY(lerp(WP[xi], MP[xi], hMU[k + 1])) - s / 2, s, s);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath();
        for (k = 0; k < hWR.length; k += 4) {
            x = hWR[k]; xi = round(x); if (x < XV0 || x > XV1 || inZone(x) || WP[xi] - HP[xi] < 0.5 || (compact && k % 8)) continue;
            cx = sX(x); cy = sY(lerp(HP[xi], WP[xi], hWR[k + 1]));
            var th = hWR[k + 2], l = 4.2 * hWR[k + 3], c1 = cos(th), s1 = sin(th);
            ctx.moveTo(cx - l * c1 + 2 * s1, cy - l * s1 - 2 * c1); ctx.lineTo(cx, cy); ctx.lineTo(cx + l * c1 + 2 * s1, cy + l * s1 - 2 * c1);
        }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.11)'; ctx.beginPath();
        for (k = 0; k < hHR.length; k += 4) {
            x = hHR[k]; xi = round(x); if (x < XV0 || x > XV1) continue;
            var th2 = HP[xi] - (SEC_BOT - 6), z0 = HP[xi] - 0.25 - hHR[k + 1] * th2;
            ctx.moveTo(sX(x), sY(z0)); ctx.lineTo(sX(x + hHR[k + 3]), sY(z0 - hHR[k + 2] * th2));
        }
        ctx.stroke();
    }
    function strata(sw, am) {
        var r = eio(sw) * 118, i;
        ctx.save();
        if (sw < 1) { ctx.beginPath(); for (i = 0; i < 4; i++) ctx.rect(sX(BH[i].x - r), 0, sX(BH[i].x + r) - sX(BH[i].x - r), H); ctx.clip(); }
        layer(GP, MP, MAT[0].fill, am); layer(MP, WP, MAT[1].fill, am); layer(WP, HP, MAT[2].fill, am); layer(HP, null, MAT[3].fill, am);
        var g = ctx.createLinearGradient(0, sY(546.5), 0, H); g.addColorStop(0, 'rgba(19,16,55,0)'); g.addColorStop(1, 'rgba(19,16,55,0.72)');
        ctx.globalAlpha = am; ctx.fillStyle = g; ctx.fillRect(0, sY(546.5), W, H);
        hatch(am);
        boundary(MP, GP, am); boundary(WP, null, am); boundary(HP, null, am);
        var la = ph(sw, 0.7, 1) * am;
        if (la > 0) {
            var xl = 86, xm = 96, zs = [(GP[xm] + MP[xm]) / 2, (MP[xm] + WP[xm]) / 2, (WP[xm] + HP[xm]) / 2, HP[xm] - 1.5];
            for (i = 0; i < 4; i++) { ctx.globalAlpha = la * 0.95; text(compact ? MAT[i].short : MAT[i].name, sX(xl), sY(zs[i]), { size: compact ? 9.5 : 12, weight: 500, base: 'middle' }); }
        }
        ctx.restore();
        if (sw < 1 && sw > 0) {
            ctx.globalAlpha = (1 - sw) * 0.9; ctx.strokeStyle = COL.skyL; ctx.lineWidth = 1.5;
            line(sX(BH[0].x - r), sY(GP[max(0, round(BH[0].x - r))] || 556), sX(BH[0].x - r), H); line(sX(BH[3].x + r), sY(GP[min(LX, round(BH[3].x + r))] || 556), sX(BH[3].x + r), H);
        }
    }
    function boreholes(T, am, nameA) {
        var i, w = max(6, min(11, cam.S * 1.7));
        for (i = 0; i < 4; i++) {
            var b = BH[i]; if (T < b.t0) continue;
            var d = T > b.t1 ? b.depth : depthAt(b, T), zb = b.g - d, x = sX(b.x) - w / 2, tops = [b.g, b.m, b.w, b.h, b.bot], k;
            ctx.globalAlpha = am;
            for (k = 0; k < 4; k++) {
                var zt = tops[k], zl = max(tops[k + 1], zb); if (zt <= zb || zt - zl <= 0) continue;
                ctx.fillStyle = MAT[k].core; ctx.fillRect(x, sY(zt), w, sY(zl) - sY(zt));
            }
            ctx.strokeStyle = 'rgba(16,13,48,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
            var dd; for (dd = b.soil + 1.5; dd < d - 0.05; dd += 1.5) { ctx.moveTo(x, sY(b.g - dd)); ctx.lineTo(x + w, sY(b.g - dd)); }
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, sY(b.g), w + 1, sY(zb) - sY(b.g));
            var done = ph(T, b.t1 + 0.1, b.t1 + 0.5);
            var outer = i === 0 || i === 3, tight = 16 * cam.S < 26;       // labels would collide on narrow screens
            if (done > 0) {
                if (!compact || outer) { ctx.globalAlpha = done * am * 0.8; text(b.depth.toFixed(1) + ' m', sX(b.x), sY(b.bot) + (compact ? 10 : 13), { size: compact ? 8.5 : 10.5, align: 'center' }); }
                if (!tight || outer) { ctx.globalAlpha = done * nameA; text(b.name, sX(b.x), sY(b.g) - (compact ? 6 : 8), { size: compact ? 9 : 11, weight: 600, align: 'center', head: true }); }
            }
        }
    }
    function founding(T, labelA) {
        var k;
        for (k = 0; k < 4; k++) {
            var f = FND[k], p = ph(T, 21.3 + 0.12 * k, 21.75 + 0.12 * k); if (p <= 0) continue;
            var xa = sX(f.x0 - 1.1), xb = sX(f.x1 + 1.1), y = sY(f.z), xm = (xa + xb) / 2, hw = (xb - xa) / 2 * eout(p);
            ctx.globalAlpha = p; ctx.strokeStyle = COL.amber; ctx.lineWidth = 1.8; ctx.setLineDash([5, 3]); line(xm - hw, y, xm + hw, y); ctx.setLineDash([]);
            if (!compact && cam.S >= 4.6 && labelA > 0) { ctx.globalAlpha = p * labelA; text('RL ' + f.z.toFixed(1), k === 0 ? xa - 5 : xb + 5, y + 3.5, { size: 10.5, weight: 500, color: COL.amber, align: k === 0 ? 'right' : 'left' }); }
        }
    }
    function rig(T) {
        var a = min(ph(T, T2S, T2S + 0.3), 1 - ph(T, 19.75, 20.05)); if (a <= 0) return;
        var i, x = BH[0].x, di = -1, b = BH[0];
        for (i = 0; i < 4; i++) {
            if (T >= BH[i].t0 && T <= BH[i].t1) { x = BH[i].x; di = i; b = BH[i]; break; }
            if (T > BH[i].t1) { x = BH[i].x; b = BH[i]; if (i < 3) x = lerp(BH[i].x, BH[i + 1].x, eio(ph(T, BH[i].t1 + 0.08, BH[i + 1].t0 - 0.06))); }
        }
        var sx = sX(x), sy = sY(gAt(x)), k = compact ? 0.7 : 1.14, ax = sx, ay = sy - 66 * k;
        var depth = di >= 0 ? depthAt(b, T) : 0, retract = di < 0 && T > b.t1 ? b.depth * (1 - ph(T, b.t1, b.t1 + 0.1)) : 0;
        var bitY = sY(gAt(x) - (di >= 0 ? depth : (abs(x - b.x) < 0.01 ? retract : 0)));
        ctx.globalAlpha = a; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.6 * k; line(ax, ay, sx + 9 * k, sy - 1);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * k; line(ax, ay, sx - 25 * k, sy); line(ax, ay, sx + 25 * k, sy);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1 * k; line(ax + 1.5 * k, ay + 2 * k, sx + 17 * k, sy - 13 * k);
        ctx.beginPath(); ctx.arc(sx + 17 * k, sy - 12 * k, 4.4 * k, 0, 2 * PI); ctx.fillStyle = COL.navy; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4 * k; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ax, ay, 3.8 * k, 0, 2 * PI); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2 * k; line(sx, sy - 46 * k, sx, bitY);
        ctx.lineCap = 'butt';
        if (di >= 0 && depth < b.soil - 0.02) {
            var cyc = (T * 4.2) % 1, hp = cyc < 0.72 ? cyc / 0.72 : 1 - (cyc - 0.72) / 0.28, hy = lerp(sy - 23 * k, sy - 42 * k, hp);
            ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1 * k; line(ax, ay, sx, hy - 4 * k);
            ctx.fillStyle = COL.amber; rr(sx - 6 * k, hy - 4.5 * k, 12 * k, 9 * k, 2 * k); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(sx - 4.5 * k, sy - 18 * k, 9 * k, 3 * k);
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1 * k; line(ax, ay, sx, sy - 40 * k);
            ctx.fillStyle = '#fff'; rr(sx - 6.5 * k, sy - 40 * k, 13 * k, 11 * k, 2 * k); ctx.fill();
            if (di >= 0) { ctx.fillStyle = COL.amber; ctx.fillRect(sx - 1.5 * k + 4.2 * k * sin(T * 34), sy - 38 * k, 3 * k, 7 * k); }
        }
        ctx.fillStyle = '#fff'; ctx.fillRect(sx - 5 * k, sy - 3 * k, 10 * k, 3 * k);
        if (di >= 0) {
            ctx.fillStyle = COL.amber; ctx.beginPath(); ctx.moveTo(sx - 4 * k, bitY - 5 * k); ctx.lineTo(sx + 4 * k, bitY - 5 * k); ctx.lineTo(sx, bitY + 2 * k); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = a * 0.5; ctx.beginPath(); ctx.arc(sx, bitY, (5 + 3 * sin(T * 26)) * k, 0, 2 * PI); ctx.fillStyle = 'rgba(249,179,23,0.35)'; ctx.fill();
        }
    }
    function logInset(T) {
        if (!wideInset) return;
        var a = min(ph(T, T2S + 0.2, T2S + 0.6), 1 - ph(T, T2 + 0.1, T2 + 0.5)); if (a <= 0) return;
        var bi = 0, i; for (i = 0; i < 4; i++) if (T >= BH[i].t0 - 0.15) bi = i;
        var b = BH[bi], d = T < b.t0 ? 0 : T > b.t1 ? b.depth : depthAt(b, T);
        var w = 276, x = W - w - 18, y = 16, rh = 15, maxRows = min(7, max(4, floor((insetBottom - y - 54) / rh))), vis = [];
        for (i = 0; i < b.rows.length; i++) if (T >= b.rows[i].t - 0.05) vis.push(b.rows[i]);
        var shown = vis.slice(-maxRows), h = 54 + maxRows * rh;
        panel(x, y, w, h, a);
        ctx.globalAlpha = a; text('Borehole log, ' + b.name, x + 14, y + 22, { size: 12.5, weight: 600, head: true });
        ctx.globalAlpha = a * 0.62; text(b.at, x + w - 14, y + 22, { size: 11, align: 'right' });
        ctx.globalAlpha = a * 0.5; text('Depth', x + 14, y + 40, { size: 10 }); text('Stratum', x + 82, y + 40, { size: 10 }); text('SPT / RQD', x + w - 14, y + 40, { size: 10, align: 'right' });
        ctx.globalAlpha = a * 0.16; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; line(x + 14, y + 46.5, x + w - 14, y + 46.5);
        for (i = 0; i < shown.length; i++) {
            var rw = shown[i], ry = y + 46 + (i + 1) * rh - 3, ra = a * ph(T, rw.t - 0.05, rw.t + 0.2);
            ctx.globalAlpha = ra * 0.8; text(rw.d.toFixed(1) + ' m', x + 14, ry, { size: 11 });
            ctx.globalAlpha = ra; ctx.fillStyle = MAT[rw.mat].core; ctx.fillRect(x + 68, ry - 8.5, 7, 9);
            ctx.globalAlpha = ra * 0.92; text(MAT[rw.mat].name, x + 82, ry, { size: 11 });
            ctx.globalAlpha = ra; text(rw.val, x + w - 14, ry, { size: 11, weight: 600, align: 'right', color: rw.n ? COL.amber : '#fff' });
        }
    }

    // ------------------------------------------------------------------ stage 3: design and DPR (same section)
    function cutfill(xp) {
        var k, x;
        for (k = 0; k < RUNS.length; k++) {
            var r = RUNS[k]; if (xp <= r.xa) continue;
            var xe = min(r.xb, floor(xp));
            ctx.beginPath(); ctx.moveTo(sX(r.xa), sY(GP[r.xa]));
            for (x = r.xa + 1; x <= xe; x++) ctx.lineTo(sX(x), sY(GP[x]));
            for (x = xe; x >= r.xa; x--) ctx.lineTo(sX(x), sY(FR[x]));
            ctx.closePath(); ctx.globalAlpha = 1; ctx.fillStyle = r.s > 0 ? 'rgba(181,210,66,0.36)' : 'rgba(214,92,124,0.5)'; ctx.fill();
            if (r.dmax > 0.55 && r.xb - r.xa > 10) {
                var la = ph(xp, r.xm, r.xm + 6); if (la <= 0) continue;
                var ym = sY((GP[r.xm] + FR[r.xm]) / 2), up = r.s > 0;
                ctx.globalAlpha = la; ctx.strokeStyle = up ? COL.lime : '#f08aa6'; ctx.lineWidth = 1;
                var ty = sY(max(GP[r.xm], FR[r.xm])) - (compact ? 16 : 22);
                line(sX(r.xm), ym, sX(r.xm), ty + 4);
                text((up ? 'Fill ' : 'Cut ') + r.dmax.toFixed(1) + ' m', sX(r.xm), ty, { size: compact ? 9.5 : 11.5, weight: 600, align: 'center', color: up ? COL.lime : '#f6a4ba', head: true });
            }
        }
    }
    function frlLine(xp, head) {
        var x, xe = floor(xp), yp = sY(lerp(FR[xe], FR[min(LX, xe + 1)], xp - xe));
        ctx.beginPath(); ctx.moveTo(sX(XA), sY(FR[XA]));
        for (x = XA + 1; x <= xe; x++) ctx.lineTo(sX(x), sY(FR[x]));
        ctx.lineTo(sX(xp), yp);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = COL.amber;
        ctx.globalAlpha = 0.14; ctx.lineWidth = 11; ctx.stroke(); ctx.globalAlpha = 0.22; ctx.lineWidth = 6.5; ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = compact ? 2.2 : 2.8; ctx.stroke(); ctx.lineCap = 'butt';
        if (head) {
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sX(xp), yp, 4.2, 0, 2 * PI); ctx.fill();
            ctx.globalAlpha = 0.5; ctx.strokeStyle = COL.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sX(xp), yp, 9, 0, 2 * PI); ctx.stroke();
        }
    }
    function bridge(T) {
        var k, p, f;
        var CON = '#e9edf7', GIR = '#cbd3e6', EDGE = 'rgba(20,16,56,0.6)';
        ctx.lineWidth = 1; ctx.strokeStyle = EDGE;
        for (k = 0; k < 4; k++) {                       // footings, then stems grow up from them
            f = FND[k]; p = ph(T, 26.4 + 0.1 * k, 26.9 + 0.1 * k); if (p <= 0) continue;
            var ft = f.z + f.h * eout(p);
            ctx.globalAlpha = p; ctx.fillStyle = CON; ctx.beginPath(); wrect(f.x0, ft, f.x1, f.z); ctx.fill(); ctx.stroke();
            var ps = ph(T, 26.9 + 0.1 * k, 27.8 + 0.1 * k); if (ps <= 0) continue;
            var pier = k === 1 || k === 2, zt = pier ? SOF - 0.55 : SOF, zs = lerp(f.z + f.h, zt, eout(ps));
            var x0 = pier ? f.x - 0.55 : (k === 0 ? 135.2 : 183.5), x1 = pier ? f.x + 0.55 : (k === 0 ? 136.5 : 184.8);
            ctx.globalAlpha = 1; ctx.beginPath(); wrect(x0, zs, x1, f.z + f.h); ctx.fill(); ctx.stroke();
            var pc = ph(T, 27.75 + 0.1 * k, 28.0 + 0.1 * k); if (pc <= 0) continue;
            ctx.globalAlpha = pc; ctx.beginPath();
            if (pier) wrect(f.x - 1.3, SOF, f.x + 1.3, SOF - 0.55); else wrect(k === 0 ? 135.2 : 184.3, FRL_B, k === 0 ? 135.7 : 184.8, SOF);
            ctx.fill(); ctx.stroke();
        }
        var SPANS = [[136.5, 151.92], [152.08, 167.92], [168.08, 183.5]];
        for (k = 0; k < 3; k++) {
            p = ph(T, 27.95 + 0.24 * k, 28.5 + 0.24 * k); if (p <= 0) continue;
            ctx.save(); ctx.translate(0, -(1 - eout(p)) * 20); ctx.globalAlpha = p;
            ctx.fillStyle = GIR; ctx.beginPath(); wrect(SPANS[k][0] + 0.25, FRL_B - 0.28, SPANS[k][1] - 0.25, SOF); ctx.fill(); ctx.stroke();
            ctx.fillStyle = CON; ctx.beginPath(); wrect(SPANS[k][0], FRL_B, SPANS[k][1], FRL_B - 0.28); ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        p = ph(T, 28.7, 29.3);
        if (p > 0) {
            var xr = lerp(136.5, 183.5, eout(p)), x;
            ctx.globalAlpha = 0.8; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; line(sX(136.5), sY(FRL_B + 1.0), sX(xr), sY(FRL_B + 1.0));
            ctx.lineWidth = 1; ctx.beginPath();
            for (x = 136.5; x <= xr; x += 2.35) { ctx.moveTo(sX(x), sY(FRL_B + 1.0)); ctx.lineTo(sX(x), sY(FRL_B)); }
            ctx.globalAlpha = 0.55; ctx.stroke();
        }
    }
    function hfl(T) {
        var p = ph(T, 29.2, 29.9), x; if (p <= 0) return;
        ctx.beginPath(); ctx.moveTo(sX(HFL_X0), sY(HFL));
        for (x = HFL_X0 + 1; x < HFL_X1; x++) ctx.lineTo(sX(x), sY(min(HFL, GP[x])));
        ctx.lineTo(sX(HFL_X1), sY(HFL)); ctx.closePath();
        var wg = ctx.createLinearGradient(0, sY(HFL), 0, sY(HFL - 3.6)); wg.addColorStop(0, 'rgba(40,150,225,0.5)'); wg.addColorStop(1, 'rgba(24,84,176,0.62)');
        ctx.globalAlpha = p; ctx.fillStyle = wg; ctx.fill();
        ctx.globalAlpha = p; ctx.strokeStyle = COL.skyL; ctx.lineWidth = 1.4; ctx.setLineDash([8, 4]);
        line(sX(HFL_X0), sY(HFL), lerp(sX(HFL_X0), sX(HFL_X1), eout(p)), sY(HFL)); ctx.setLineDash([]);
        if (compact) return;
        var pl = ph(T, 29.6, 30.0); if (pl <= 0) return;
        ctx.globalAlpha = pl; text('HFL ' + HFL.toFixed(1), sX(160), sY(HFL) + 14, { size: 10.5, weight: 500, color: '#c9eeff', align: 'center' });
        var cx = sX(160), y1 = sY(HFL), y2 = sY(SOF);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.1; line(cx, y1 - 1, cx, y2 + 1);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx, y2 + 1); ctx.lineTo(cx - 3.5, y2 + 7); ctx.lineTo(cx + 3.5, y2 + 7); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx, y1 - 1); ctx.lineTo(cx - 3.5, y1 - 7); ctx.lineTo(cx + 3.5, y1 - 7); ctx.closePath(); ctx.fill();
        text((SOF - HFL).toFixed(2) + ' m', cx + 7, (y1 + y2) / 2, { size: 10.5, weight: 600, base: 'middle' });
    }
    function band(T, a, xp, bandTop) {
        if (a <= 0) return;
        var bot = H - (compact ? 10 : 16), rh = (bot - bandTop) / 3, st = compact ? 40 : 20, x, k = 0, r;
        var fs = compact ? 9 : 11, off = (1 - a) * 14;
        ctx.save(); ctx.translate(0, off);
        ctx.globalAlpha = a * 0.9; ctx.fillStyle = 'rgba(15,12,44,0.92)'; ctx.fillRect(0, bandTop, W, H - bandTop + 20);
        ctx.globalAlpha = a * 0.3; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; line(0, bandTop + 0.5, W, bandTop + 0.5);
        ctx.globalAlpha = a * 0.1; for (r = 1; r < 3; r++) line(0, bandTop + r * rh + 0.5, W, bandTop + r * rh + 0.5);
        ctx.font = '500 ' + fs + 'px ' + F_BODY;
        var roomy = !compact && sX(XA) - 24 - 14 >= ctx.measureText('Finished RL').width;
        var labs = roomy ? ['Chainage', 'Existing GL', 'Finished RL'] : ['Ch.', 'GL', 'FRL'], cols = ['rgba(255,255,255,0.72)', '#fff', COL.amber];
        for (r = 0; r < 3; r++) {
            ctx.globalAlpha = a * (r === 2 ? 1 : 0.7);
            text(labs[r], compact ? 4 : 14, bandTop + (r + 0.5) * rh + 0.5, { size: fs, weight: 500, base: 'middle', color: r === 2 ? COL.amber : '#fff' });
        }
        for (x = XA; x <= XB; x += st, k++) {
            var cx = sX(x), ch = x - XA;
            if (compact && x === XA) cx += 8;
            ctx.globalAlpha = a * 0.75; text('0/' + ('00' + ch).slice(-3), cx, bandTop + 0.5 * rh + 0.5, { size: fs, align: 'center', base: 'middle', color: cols[0] });
            var ga = ph(T, T2 + 0.55 + 0.06 * k, T2 + 0.85 + 0.06 * k);
            if (ga > 0) { ctx.globalAlpha = a * ga * 0.92; text(GP[x].toFixed(2), cx, bandTop + 1.5 * rh + 0.5 + (1 - ga) * 5, { size: fs, align: 'center', base: 'middle' }); }
            var fa = ph(xp, x - 3, x - 0.2);
            if (xp > XA - 1 && fa > 0 && T >= 23.6) { ctx.globalAlpha = a * fa; text(FR[x].toFixed(2), cx, bandTop + 2.5 * rh + 0.5 + (1 - fa) * 5, { size: fs, weight: 600, align: 'center', base: 'middle', color: COL.amber }); }
        }
        ctx.restore();
    }
    function stations(a, bandTop) {
        var x; ctx.globalAlpha = a * 0.13; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath();
        for (x = XA; x <= XB; x += 20) { ctx.moveTo(sX(x) + 0.5, sY(GP[x]) + 3); ctx.lineTo(sX(x) + 0.5, bandTop); }
        ctx.stroke();
    }
    var CRUST = [['BC', '30 mm', '#3b3f60', 9], ['DBM', '50 mm', '#5a5f86', 12], ['WMM', '250 mm', '#8f99b0', 24], ['GSB', '200 mm', '#b6975f', 20], ['Subgrade', '500 mm', '#705842', 28]];
    function crustInset(T) {
        if (!wideInset) return;
        var a = min(ph(T, 27.2, 27.6), 1 - ph(T, T3 - 0.1, T3 + 0.3)); if (a <= 0) return;
        var w = 276, x = W - w - 18, y = 16, h = min(146, insetBottom - y), k, yy = y + h - 14, lw = 96, lx = x + 16;
        panel(x, y, w, h, a);
        ctx.globalAlpha = a; text('Pavement crust, approaches', x + 14, y + 22, { size: 12.5, weight: 600, head: true });
        var sc = (h - 52) / 93;
        for (k = 4; k >= 0; k--) {
            var c = CRUST[k], hh = c[3] * sc, t0 = 27.7 + (4 - k) * 0.42, p = ph(T, t0, t0 + 0.4), e = eout(p);
            yy -= hh; if (p <= 0) continue;
            ctx.globalAlpha = a * p; ctx.fillStyle = c[2]; ctx.fillRect(lx - (1 - e) * 22, yy, lw, hh);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(lx - (1 - e) * 22 + 0.5, yy + 0.5, lw - 1, hh - 1);
            var ly = y + 44 + k * ((h - 60) / 4.6);
            ctx.globalAlpha = a * p * 0.35; ctx.strokeStyle = '#fff'; line(lx + lw + 3, yy + hh / 2, x + 124, ly - 3.5);
            ctx.globalAlpha = a * p; text(c[0], x + 128, ly, { size: 11, weight: 600 });
            ctx.globalAlpha = a * p * 0.68; text(c[1], x + 128 + ctx.measureText(c[0]).width + 7, ly, { size: 11 });
        }
    }
    function design(T, bandTop, bandA) {
        var pp = ph(T, 23.6, 26.6), xp = lerp(XA, XB, lerp(pp, ease(pp), 0.7));
        stations(bandA, bandTop);
        if (pp > 0) cutfill(xp);
        hfl(T);
        bridge(T);
        if (pp > 0) frlLine(xp, pp < 1);
        band(T, bandA, pp > 0 ? xp : XA - 2, bandTop);
    }
    function drawSec(T) {
        var dim = ease(ph(T, T2, T2 + 0.7)), bandA = ease(ph(T, T2 + 0.15, T2 + 0.75)), bandTop = round(H * (compact ? 0.83 : 0.815));
        var sw = ph(T, 19.9, 21.2);
        ridges(1); face(1, 1);
        nalaWater();
        if (sw > 0) strata(sw, 1 - 0.42 * dim);
        boreholes(T, 1 - 0.5 * dim, 1 - dim);
        if (T > 21.3) founding(T, 1 - ph(T, 26.2, 26.6));
        rig(T);
        rlScale(ph(T, T2S, T2S + 0.5), T >= T2 ? lerp(H + 20, bandTop, bandA) : H + 20);
        if (T >= T2) design(T, bandTop, bandA);
        flag(XA, 'A', 1); flag(XB, 'A′', 1);
        logInset(T); crustInset(T);
    }

    // ------------------------------------------------------------------ readouts, caption, stage tabs
    function grp(T, s, e) { return min(ph(T, s, s + 0.3), 1 - ph(T, e - 0.25, e)); }
    function count(T, a, b, v) { return round(v * eout(ph(T, a, b))); }
    function readouts(items, a) {
        if (a <= 0) return;
        var n = compact ? min(2, items.length) : items.length, x = compact ? 14 : 20, y = compact ? 52 : 64, cw = compact ? (W - 28) / 2 : 168, i;
        for (i = 0; i < n; i++) {
            ctx.globalAlpha = a * 0.62; text(items[i][0], x + i * cw, y, { size: compact ? 10 : 11.5, base: 'top' });
            ctx.globalAlpha = a; text(items[i][1], x + i * cw, y + (compact ? 14 : 17), { size: compact ? 15 : 19, weight: 600, base: 'top', head: true });
        }
    }
    function hud(T) {
        var a, i, b;
        if (T < T1 + 0.5) {
            var sp = c01((T - T_L0) / (T_LEND - T_L0)), g = 0;
            for (i = 0; i < GCP.length; i++) if (T > 0.25 + i * 0.14 + 0.2) g++;
            readouts([['Area flown', (7.04 * sp).toFixed(1) + ' ha'], ['Points captured', round(35 * sp) + ' million'], ['Ground control', g + ' points']], grp(T, 0.2, T1 + 0.5));
        } else if (T < 19.9) {
            b = BH[0]; for (i = 0; i < 4; i++) if (T >= BH[i].t0 - 0.2) b = BH[i];
            var d = T < b.t0 ? 0 : T > b.t1 ? b.depth : depthAt(b, T), rw = null;
            // soil: the last SPT done; rock: the core run in progress
            var inRock = d > b.soil + 0.01;
            for (i = 0; i < b.rows.length; i++) {
                var r0 = b.rows[i];
                if (inRock) { if (!r0.n && r0.d >= d - 0.001) { rw = r0; break; } }
                else if (r0.n && T >= r0.t) rw = r0;
            }
            if (inRock && !rw) rw = b.rows[b.rows.length - 1];
            readouts([[b.name + ', depth', d.toFixed(2) + ' m'], [rw && !rw.n ? 'Rock quality' : 'SPT value', rw ? rw.val : '–'], ['Stratum', d <= 0 ? '–' : MAT[(b.g - d) > b.m ? 0 : (b.g - d) > b.w ? 1 : (b.g - d) > b.h ? 2 : 3].name]], grp(T, T2S + 0.15, 19.9));
        } else if (T < T2 + 0.3) {
            readouts([['Boreholes drilled', '4'], ['Total depth', totalDrilled.toFixed(1) + ' m'], ['Foundations on', 'Rock']].slice(0, T > 21.5 ? 3 : 2), grp(T, 19.95, T2 + 0.3));
        } else if (T < 26.7) {
            var pp = ph(T, 23.6, 26.6), xp = lerp(XA, XB, lerp(pp, ease(pp), 0.7)), xi = min(LX - 1, max(1, round(xp)));
            var gr = (FR[xi + 1] - FR[xi - 1]) / 2 * 100;
            readouts([['Chainage', '0/' + ('00' + round(xp - XA)).slice(-3)], ['Finished RL', FR[xi].toFixed(2) + ' m'], ['Gradient', (abs(gr) < 0.05 ? 'Level' : (gr > 0 ? '+' : '−') + abs(gr).toFixed(1) + '%')]], grp(T, T2 + 0.45, 26.7));
        } else if (T < 30.35) {
            readouts([['Bridge', '3 × 16 m spans'], ['Clearance over HFL', T > 29.7 ? (SOF - HFL).toFixed(2) + ' m' : '–'], ['Deck level', 'RL ' + FRL_B.toFixed(2) + ' m']], grp(T, 26.8, 30.35));
        } else {
            readouts([['Estimate', '₹ ' + (count(T, 31.0, 32.4, 472) / 100).toFixed(2) + ' crore'], ['Concrete', count(T, 30.7, 31.8, 815).toLocaleString('en-IN') + ' m³'], ['Earthwork', count(T, 30.5, 31.6, 3480).toLocaleString('en-IN') + ' m³']], min(ph(T, 30.45, 30.75), 1));
        }
    }
    function caption(T) {
        var i, c = compact;
        if (T < T_TO) return c ? 'Setting ground control' : 'Setting out ground control';
        if (T < T_L0) return 'Drone taking off';
        if (T < T_LEND) return 'Drone flight, line ' + min(NL, floor((T - T_L0) / (T_LINE + T_TURN)) + 1) + ' of ' + NL;
        if (T < 7.7) return c ? 'Building surface model' : 'Building the surface model';
        if (T < 9.0) return c ? 'Drawing 1 m contours' : 'Drawing contours at 1 m';
        if (T < T1) return c ? 'Marking section A\u2013A\u2032' : 'Marking section A\u2013A\u2032 on the bridge axis';
        if (T < T2S) return 'Cutting the section';
        for (i = 0; i < 4; i++) if (T < BH[i].t1 + 0.2) return c ? 'Drilling ' + BH[i].name + ' of 4' : 'Drilling ' + BH[i].name + ' at ' + BH[i].at.charAt(0).toLowerCase() + BH[i].at.slice(1);
        if (T < 21.3) return c ? 'Joining the strata' : 'Joining the strata between boreholes';
        if (T < T2) return 'Fixing founding levels';
        if (T < 23.6) return c ? 'Plotting ground levels' : 'Plotting existing ground levels';
        if (T < 26.6) return c ? 'Setting the road level' : 'Setting the finished road level';
        if (T < 29.2) return c ? 'Founding bridge on rock' : 'Founding the bridge on rock';
        if (T < 30.4) return c ? 'Checking flood clearance' : 'Checking clearance over high flood level';
        if (T < 32.6) return c ? 'Working out the cost' : 'Working out quantities and cost';
        return c ? 'DPR ready for sanction' : 'DPR ready for technical sanction';
    }
    var lastCap = null, lastStage = -1, lastP = [-1, -1, -1];
    function ui(T) {
        var s = T < T1 ? 0 : T < T2 ? 1 : 2, c = caption(T), i;
        if (capEl && c !== lastCap) { capEl.textContent = c; lastCap = c; }
        if (s !== lastStage) {
            steps.forEach(function (b, k) { b.classList.toggle('is-active', k === s); if (k === s) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
            lastStage = s;
        }
        for (i = 0; i < steps.length; i++) {
            var p = i < s ? 1 : i > s ? 0 : (reduce ? 1 : c01((T - ST0[i]) / (ST1[i] - ST0[i])));
            if (abs(p - lastP[i]) > 0.003 || (p !== lastP[i] && (p === 0 || p === 1))) { steps[i].style.setProperty('--p', p.toFixed(3)); lastP[i] = p; }
        }
    }

    // ------------------------------------------------------------------ frame
    var clock = 0, playing = false, userPaused = false, inView = false, raf = 0, last = 0;
    function draw() {
        if (!W || !H) return;
        var T = clock;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.setLineDash([]); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
        bg(1);
        var q = setCam(T);
        if (q < 1) draw3D(T, q); else drawSec(T);
        hud(T);
        var f = reduce ? 0 : max(1 - ph(T, 0, 0.45), ph(T, T3, TEND));
        if (f > 0) bg(ease(f));
        ctx.globalAlpha = 1;
        ui(T);
    }
    function frame(ts) {
        raf = 0; if (!playing) return;
        var raw = last ? (ts - last) / 1000 : 0, dt = min(0.05, raw); last = ts;
        if (raw > 0 && raw < 0.5) { fAcc += raw; fN++; if (fN >= 50) { if (fAcc / fN > 0.04 && quality < 2) { quality++; resize(true); } fAcc = 0; fN = 0; } }
        clock += dt; if (clock >= TEND) clock = 0;
        draw();
        raf = window.requestAnimationFrame(frame);
    }
    function sync() {
        var should = inView && !userPaused && !document.hidden && !reduce;
        if (should && !playing) { playing = true; last = 0; raf = window.requestAnimationFrame(frame); }
        else if (!should && playing) { playing = false; if (raf) window.cancelAnimationFrame(raf); raf = 0; }
        root.classList.toggle('is-paused', userPaused || reduce);
    }
    function resize(force) {
        var r = canvas.getBoundingClientRect(), w = round(r.width), h = round(r.height);
        if (!w || !h) return;
        var dpr = min(window.devicePixelRatio || 1, quality === 0 ? 2 : quality === 1 ? 1.5 : 1);
        if (force !== true && w === W && h === H && dpr === DPR) return;
        W = w; H = h; DPR = dpr; canvas.width = round(W * DPR); canvas.height = round(H * DPR);
        layout(); draw();
    }

    steps.forEach(function (b, k) {
        b.addEventListener('click', function () { clock = reduce || userPaused ? STILL[k] : ST0[k] + (k === 0 ? 0 : 0.01); draw(); });
    });
    if (toggle) {
        toggle.addEventListener('click', function () {
            userPaused = !userPaused;
            toggle.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
            toggle.setAttribute('aria-label', userPaused ? 'Play animation' : 'Pause animation');
            sync();
        });
        if (reduce) toggle.hidden = true;
    }
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.2 }).observe(canvas);
    } else { inView = true; }
    document.addEventListener('visibilitychange', sync);
    if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); }).observe(canvas); else window.addEventListener('resize', function () { resize(); });
    if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { reduce = e.matches; if (reduce) clock = STILL[lastStage < 0 ? 0 : lastStage]; if (toggle) toggle.hidden = reduce; sync(); draw(); });
    if (reduce) clock = STILL[0];
    resize(); sync();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (W) { layout(); draw(); } });
    root.classList.add('is-live');
    // small hook for testing and for jumping to a moment from the console
    root.showcase = { seek: function (t) { clock = t; draw(); }, duration: TEND, stages: ST0 };
})();
