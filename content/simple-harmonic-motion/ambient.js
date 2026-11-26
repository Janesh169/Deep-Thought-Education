/* scene { "id": "swell", "name": "Slow swell", "note": "Distant surf rising and falling about every eleven seconds: a slow, steady oscillation you can breathe along with." } */
      swell: function (c) {
        var out = c.createGain(), stops = [];
        // the sea floor: deep, steady brown noise
        var deep = loop(c, noise('brown', 9), stops), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
        var g = c.createGain(); g.gain.value = 0.42; deep.connect(lp); lp.connect(g); g.connect(out);
        // the swell: a softer band whose loudness and brightness rise and fall together, like a wave arriving
        var surf = loop(c, noise('pink', 7), stops), bp = c.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 700; bp.Q.value = 0.4;
        var g2 = c.createGain(); g2.gain.value = 0.2; surf.connect(bp); bp.connect(g2); g2.connect(out);
        lfo(c, 0.09, 0.14, g2.gain, stops); lfo(c, 0.09, 380, bp.frequency, stops);
        // a second, slower swell slightly out of step, so the pattern never sounds mechanical
        lfo(c, 0.061, 0.05, g2.gain, stops, 2.1);
        // foam: the faint wash after each crest, a quarter-cycle later
        var foam = loop(c, noise('pink', 7), stops), hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 1700; hp.Q.value = 0.55;
        var g3 = c.createGain(); g3.gain.value = 0.022; foam.connect(hp); hp.connect(g3); g3.connect(out);
        lfo(c, 0.09, 0.02, g3.gain, stops, 4.4);
        return finish(out, stops, 0.98);
      },
