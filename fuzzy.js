/**
 * Fuzzy Logic Engine (Mamdani Murni)
 */
class FuzzyMamdani {
    constructor() {
        // Rentang output kecepatan kipas (0 - 100%)
        // Mamdani membutuhkan fungsi keanggotaan untuk output
    }

    // --- INPUT: Suhu & Kelembapan (Sama seperti kode Anda) ---
    getMembershipCold(t) {
        if (t <= 15) return 1;
        if (t >= 25) return 0;
        return (25 - t) / (25 - 15);
    }

    // Normal: 0 @ 15, 1 @ 25-30, 0 @ 35
    getMembershipNormal(t) {
        if (t <= 15 || t >= 35) return 0;
        if (t >= 25 && t <= 30) return 1;
        if (t < 25) return (t - 15) / (25 - 15);
        if (t > 30) return (35 - t) / (35 - 30);
    }

    // Hot: 0 @ 30, 1 @ 35+
    getMembershipHot(t) {
        if (t <= 30) return 0;
        if (t >= 35) return 1;
        return (t - 30) / (35 - 30);
    }

    // --- Humidity Membership Functions (0 - 100%) ---

    // Dry: 1 @ 0, 0 @ 40
    getMembershipDry(h) {
        if (h <= 0) return 1;
        if (h >= 40) return 0;
        return (40 - h) / 40;
    }

    // Normal: 0 @ 20, 1 @ 50, 0 @ 80
    getMembershipHumidNormal(h) {
        if (h <= 20 || h >= 80) return 0;
        if (h >= 50 && h <= 50) return 1; // Correct peak? No, triangle usually encompasses a range. Let's say 40-60 is peak?
        // Let's use simple triangle: 20-50-80
        if (h >= 50) return (80 - h) / (80 - 50);
        return (h - 20) / (50 - 20);
    }

    // Wet: 0 @ 60, 1 @ 100
    getMembershipWet(h) {
        if (h <= 60) return 0;
        if (h >= 100) return 1;
        return (h - 60) / (100 - 60);
    }

    // --- OUTPUT: Keanggotaan Kecepatan Kipas (Mamdani Requirement) ---

    // Kecepatan Lambat: 1 @ 0%, 0 @ 40%
    outLambat(z) {
        if (z <= 20) return 1;
        if (z >= 40) return 0;
        return (40 - z) / (40 - 20);
    }

    // Kecepatan Sedang: 0 @ 30%, 1 @ 50%, 0 @ 70%
    outSedang(z) {
        if (z <= 30 || z >= 70) return 0;
        if (z === 50) return 1;
        if (z < 50) return (z - 30) / (50 - 30);
        return (70 - z) / (70 - 50);
    }

    // Kecepatan Cepat: 0 @ 60%, 1 @ 90%+
    outCepat(z) {
        if (z <= 60) return 0;
        if (z >= 90) return 1;
        return (z - 60) / (90 - 60);
    }

    compute(temp, hum) {
        // 1. Fuzzifikasi
        const u = {
            t: { cold: this.getMembershipCold(temp), norm: this.getMembershipNormal(temp), hot: this.getMembershipHot(temp) },
            h: { dry: this.getMembershipDry(hum), norm: this.getMembershipHumidNormal(hum), wet: this.getMembershipWet(hum) }
        };

        // 2. Inference (Mencari nilai Alpha/Kekuatan Rule)
        // Kita mengelompokkan kekuatan rule berdasarkan kategori outputnya
        let aLambat = Math.max(
            Math.min(u.t.cold, u.h.dry), Math.min(u.t.cold, u.h.norm), Math.min(u.t.cold, u.h.wet),
            Math.min(u.t.norm, u.h.dry)
        );
        let aSedang = Math.max(
            Math.min(u.t.norm, u.h.norm), Math.min(u.t.norm, u.h.wet),
            Math.min(u.t.hot, u.h.dry)
        );
        let aCepat = Math.max(
            Math.min(u.t.hot, u.h.norm), Math.min(u.t.hot, u.h.wet)
        );

        // 3. Defuzzifikasi (Metode Centroid / Luas Area)
        // Karena Mamdani sulit dihitung manual, kita gunakan sampling (Diskrit)
        let numerator = 0;
        let denominator = 0;

        // Kita scan dari 0% sampai 100% kecepatan
        for (let z = 0; z <= 100; z += 2) {
            // Komposisi aturan: Mencari nilai max dari perpotongan tiap output
            let muLambat = Math.min(aLambat, this.outLambat(z));
            let muSedang = Math.min(aSedang, this.outSedang(z));
            let muCepat = Math.min(aCepat, this.outCepat(z));

            let muMax = Math.max(muLambat, muSedang, muCepat);

            numerator += z * muMax;
            denominator += muMax;
        }

        const crispOutput = denominator === 0 ? 0 : numerator / denominator;

        return {
            fuzzified: u,
            alpha: { aLambat, aSedang, aCepat },
            output: Math.round(crispOutput)
        };
    }
}