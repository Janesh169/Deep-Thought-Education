/* scene { "id": "still", "name": "Still-room", "note": "Warm room tone with the slow, sparse bubbling of a flask on a low flame." } */
      still: function (c) {
        var out = c.createGain(), stops = [];
        // warm, low room tone
        var room = loop(c, noise('brown', 9), stops), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
        var g = c.createGain(); g.gain.value = 0.5; room.connect(lp); lp.connect(g); g.connect(out); lfo(c, 0.017, 0.05, g.gain, stops);
        // the faint, steady hiss of a small flame
        var hiss = loop(c, noise('pink', 7), stops), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2300; bp.Q.value = 0.7;
        var g2 = c.createGain(); g2.gain.value = 0.02; hiss.connect(bp); bp.connect(g2); g2.connect(out); lfo(c, 0.047, 0.007, g2.gain, stops);
        // bubbles: a soft sine whose pitch rises as the bubble lifts off (its resonance climbs as it shrinks)
        function bubble(t, big) {
          var o = c.createOscillator(), f = c.createBiquadFilter(), e = c.createGain();
          var f0 = (big ? 190 : 280) + Math.pow(Math.random(), 1.6) * 460, d = 0.05 + Math.random() * 0.08;
          var amp = (big ? 0.05 : 0.014) + Math.pow(Math.random(), 2.5) * 0.04;
          o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (1.5 + Math.random() * 0.7), t + d);
          f.type = 'lowpass'; f.frequency.value = 1500;
          e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(amp, t + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
          o.connect(f); f.connect(e); connectPanned(c, e, out, Math.random() * 0.9 - 0.45);
          o.start(t); o.stop(t + d + 0.03);
        }
        stops.push(scheduler(c, 0.85, function (t) {
          bubble(t, Math.random() < 0.25);
          if (Math.random() < 0.3) { var n = 1 + Math.floor(Math.random() * 3); for (var k = 1; k <= n; k++) bubble(t + k * (0.07 + Math.random() * 0.12), false); }
        }));
        return finish(out, stops, 0.88);
      },
