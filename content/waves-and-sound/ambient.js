/* scene { "id": "hall", "name": "Resonant hall", "note": "Soft air in a big quiet room, and now and then a far-off singing bowl whose overtones beat slowly as they fade." } */
      hall: function (c) {
        var out = c.createGain(), stops = [];
        // the room: soft, dark air
        var air = loop(c, noise('pink', 7), stops), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
        var g = c.createGain(); g.gain.value = 0.3; air.connect(lp); lp.connect(g); g.connect(out); lfo(c, 0.021, 0.05, g.gain, stops);
        var low = loop(c, noise('brown', 9), stops), lp2 = c.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 200;
        var g2 = c.createGain(); g2.gain.value = 0.34; low.connect(lp2); lp2.connect(g2); g2.connect(out);
        // a distant bowl: the first four harmonics of a low note, each paired with a twin a fraction of a hertz away,
        // so every overtone beats slowly while the note fades over about ten seconds
        var NOTES = [196, 220, 261.63, 293.66, 329.63];
        function bowl(t) {
          var f0 = NOTES[Math.floor(Math.random() * NOTES.length)], bus = c.createGain(), lpf = c.createBiquadFilter();
          lpf.type = 'lowpass'; lpf.frequency.value = 1600; bus.connect(lpf); connectPanned(c, lpf, out, Math.random() * 1.2 - 0.6);
          [[1, 0.022], [2, 0.009], [3, 0.0045], [4, 0.002]].forEach(function (p, i) {
            [-1, 1].forEach(function (s) {
              var o = c.createOscillator(), e = c.createGain(), d = 9 + Math.random() * 3 - i * 1.5;
              o.type = 'sine'; o.frequency.value = f0 * p[0] + s * (0.3 + 0.22 * i);
              e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(p[1], t + 0.35); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
              o.connect(e); e.connect(bus); o.start(t); o.stop(t + d + 0.1);
            });
          });
        }
        stops.push(scheduler(c, 0.085, bowl));
        return finish(out, stops, 1.05);
      },
