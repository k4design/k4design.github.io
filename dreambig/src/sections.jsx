const { useState: useStateS, useEffect: useEffectS, useRef: useRefS } = React;

function Nav({ scrolled, onApply }) {
  const links = [
    { id: 'about', label: 'The Experience' },
    { id: 'pillars', label: 'Highlights' },
    { id: 'itinerary', label: 'Schedule' },
    { id: 'lineup', label: 'Who&rsquo;s Coming' },
    { id: 'apply', label: 'Register' },
  ];
  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <a className="nav-brand" href="#top">
        <div className="nav-mark" style={{ backgroundImage: 'url(assets/logo-gold.jpg)' }} />
        <div className="nav-title">
          Dream Big, Big Sky
          <small>Montana · July 13&ndash;17, 2026</small>
        </div>
      </a>
      <div className="nav-links">
        {links.map(l => (
          <a key={l.id} href={`#${l.id}`}
            onClick={e => { e.preventDefault(); window.smoothScroll(l.id); }}
            dangerouslySetInnerHTML={{ __html: l.label }}
          />
        ))}
      </div>
      <button className="nav-cta" onClick={onApply}>Reserve Your Seat</button>
    </nav>
  );
}

function Hero({ onApply, onWatch }) {
  return (
    <section className="hero" id="top">
      <div className="hero-media">
        <window.HeroMedia label="0:42 — Cinematic aerial, Gallatin Range at golden hour" />
      </div>
      <div className="hero-mobile-overlay" />
      <div className="hero-grain" />
      <div className="hero-inner">
        <div className="hero-eyebrow">
          <span className="dot" />
          <span className="eyebrow">Mastermind, Music &amp; Mountains · July 13&ndash;17, 2026 · Big Sky, MT</span>
        </div>
        <h1 className="hero-title display">
          <span className="line-1">Dream Big,</span>
          <span className="line-2">Big <em>Sky.</em></span>
        </h1>
        <div className="hero-foot">
          <p className="hero-sub">
            An elevated, high-impact experience for the leaders, builders, and visionaries of the Reside and Team Growth Plus communities &mdash; five days in the Montana mountains where growth, connection, and momentum come together.
          </p>
          <div className="hero-meta">
            <span>Reside members &amp; TG+ Team Leaders</span>
            <span>Intentionally capped</span>
            <span>$5,000 per seat · 50% off for Reside</span>
          </div>
          <div className="hero-cta-group">
            <button className="btn-primary" onClick={onApply}>Reserve Your Seat</button>
            <button className="btn-ghost" onClick={onWatch}><span className="play">▶</span> Watch Last Year&rsquo;s Film</button>
          </div>
        </div>
      </div>
      <div className="scroll-hint">
        <span>Scroll</span>
        <span className="line" />
      </div>
    </section>
  );
}

function Marquee() {
  const items = ['Mastermind', 'Mountains', 'Music', 'Momentum', 'Vision', 'Community', 'Connection'];
  const row = [...items, ...items, ...items];
  return (
    <div className="marquee">
      <div className="marquee-track">
        <span>
          {row.map((it, i) => (
            <React.Fragment key={i}>
              <em>{it}</em>
              <span className="star">✦</span>
            </React.Fragment>
          ))}
        </span>
      </div>
    </div>
  );
}

function Recap() {
  return (
    <section className="recap" id="recap">
      <div className="wrap">
        <div className="recap-head">
          <div className="recap-label anim from-left">
            <div className="num">Film / 2025</div>
            <div className="eyebrow">Press play — last year&rsquo;s recap</div>
          </div>
          <div className="anim anim-d1">
            <h2 className="display-upright">A taste of<br/>what&rsquo;s <em>coming.</em></h2>
            <p>Three minutes from Dream Big, Big Sky 2025 &mdash; the mastermind rooms, the mountaintop, the Riverhouse, the PBR. If last year&rsquo;s film doesn&rsquo;t make the case, nothing we write here will.</p>
          </div>
        </div>
        <div className="recap-player-wrap anim anim-d2">
          <div className="recap-player">
            <wistia-player
              media-id="ovtazqlroz"
              aspect="1.7777777777777777"
              player-color="#B08D3F"
            ></wistia-player>
          </div>
        </div>
      </div>
    </section>
  );
}

function Countdown() {
  const TARGET = new Date('2026-07-13T00:00:00');
  const calc = () => {
    const diff = TARGET - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s };
  };
  const [t, setT] = useStateS(calc);
  useEffectS(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = n => String(n).padStart(2, '0');
  return (
    <div className="stat countdown-stat anim">
      <div className="n countdown-n">
        <em>{t.d}</em><span className="cd-sep">d</span>
        <em>{pad(t.h)}</em><span className="cd-sep">h</span>
        <em>{pad(t.m)}</em><span className="cd-sep">m</span>
        <em>{pad(t.s)}</em><span className="cd-sep">s</span>
      </div>
      <div className="l">Until arrival day &mdash; Jul 13, 2026</div>
    </div>
  );
}

function Intro() {
  return (
    <section className="intro cream-section" id="about">
      <div className="wrap">
        <div className="intro-grid">
          <div className="intro-label anim from-left">
            <div className="num">01 / Who This Is For</div>
            <h4>More than an event &mdash; a curated environment where growth, connection, and momentum come together.</h4>
          </div>
          <div className="anim anim-d1">
            <p className="intro-body">
              <span className="drop">Dream Big, Big Sky</span> is reserved for <em>Reside members</em> and <em>Team Growth Plus</em> team leaders &mdash; one seat per TG+ firm. <br /><br />Attendance is intentionally limited to ensure meaningful collaboration, deeper relationships, and focused strategic conversations with the people actually building what comes next.
            </p>
          </div>
        </div>
        <div className="intro-footer">
          <div className="stat anim"><div className="n"><em>$5,000</em></div><div className="l">Per seat · 50% off for Reside members</div></div>
          <div className="stat anim"><div className="n"><em>5</em></div><div className="l">Days in the Montana mountains</div></div>
          <div className="stat anim"><div className="n"><em>1</em></div><div className="l">Seat per TG+ firm &mdash; Team Leaders only</div></div>
          <Countdown />
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  const items = [
    { n: '01', t: 'Dream Big Mastermind', d: 'A private, high-level mastermind built for leaders ready to expand their vision and execution. Strategic growth discussions, peer-to-peer collaboration, and insight from top performers. The core of the experience — come prepared to engage, contribute, and dream bigger.', bg: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80' },
    { n: '02', t: 'Mountaintop Mastermind', d: 'Breakout groups meet at elevation — Yellowstone Club or Big Sky Resort — followed by a picnic lunch on the ridge. The air is thinner, the conversation is sharper, and the ideas have room to land.', bg: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80' },
    { n: '03', t: 'Riverhouse BBQ & Dancing', d: 'An evening down by the Gallatin. Casual riverside BBQ, live music, cowboy attire optional. This is where relationships deepen and the Dream Big community truly comes alive.', bg: 'assets/riverhouse.png' },
    { n: '04', t: 'Big Sky PBR Night', d: 'Experience the culture of Big Sky with a premium group outing to the PBR (Professional Bull Riders), followed by a live concert. High-adrenaline, memorable, and unmistakably Montana.', bg: 'assets/pbr2.jpg' },
  ];
  return (
    <section className="pillars" id="pillars">
      <div className="wrap">
        <div className="pillars-head">
          <h2 className="display-upright anim">The <em>four</em><br/>moments.</h2>
          <p className="anim anim-d1">Intentional programming woven through five days &mdash; a mastermind indoors, a mastermind on the mountain, an evening by the river, and a night at the PBR. Wide open space, the right people in the room, and the energy to think bigger.</p>
        </div>
      </div>
      <div className="pillars-grid">
        {items.map(p => (
          <div className="pillar anim" key={p.n} style={{ backgroundImage: `linear-gradient(180deg, rgba(10,9,8,0.62) 0%, rgba(10,9,8,0.82) 100%), url(${p.bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="n">{p.n}</div>
            <h3>{p.t}</h3>
            <p>{p.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <section className="gallery">
      <div className="wrap">
        <div className="gallery-head anim">
          <h3>Scenes from <em style={{color:'var(--gold-2)'}}>Big Sky.</em></h3>
          <div className="kicker">Montana · July 2025</div>
        </div>
        <div className="gallery-grid">
          <div className="g-cell g-a ken anim">
            <window.Photo label="assets/community.jpg" />
            <div className="cap"><b>01 — Riverhouse</b><span>Gallatin Gateway · Wednesday</span></div>
          </div>
          <div className="g-cell g-b ken anim">
            <window.Photo label="assets/gallatin.jpg" />
            <div className="cap"><b>02 — The Gallatin</b><span>Arrival Day</span></div>
          </div>
          <div className="g-cell g-c ken anim">
            <window.Photo label="assets/mastermind2.png" />
            <div className="cap"><b>03 — Mastermind</b><span>Tuesday</span></div>
          </div>
          <div className="g-cell g-d ken anim">
            <window.Photo label="Breakout roundtable with handwritten agenda" />
            <div className="cap"><b>04 — Breakouts</b><span>Mastermind Day</span></div>
          </div>
          <div className="g-cell g-e ken anim">
            <window.Photo label="assets/yc.jpg" />
            <div className="cap"><b>05 — Mountaintop</b><span>Yellowstone Club</span></div>
          </div>
          <div className="g-cell g-f ken anim">
            <window.Photo label="assets/pbr3.jpg" />
            <div className="cap"><b>06 — PBR Night</b><span>Thursday</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Lineup() {
  const people = [
    { name: 'Reside Members', role: 'Visionary Team Leaders', bio: 'The builders and leaders inside the Reside community who set the pace for the industry. Reserved seats, 50% member pricing, and a front-row role in every mastermind session.', photo: 'assets/reside_team.png' },
    { name: 'Team Growth Plus', role: 'Team Leaders · One Seat Per Firm', bio: 'Top Team Leaders from across TG+. One seat per firm, intentionally — proximity to other high-level thinkers without the noise of a full conference floor.', photo: 'assets/tg.png' },
    { name: 'Mastermind Speakers', role: 'Top Performers & Operators', bio: 'A curated lineup of speakers to open Tuesday\u2019s sessions and inspire the breakout groups. Names announced to confirmed attendees closer to the event.', photo: 'assets/mastermindspeakers.png' },
    { name: 'PBR Night Guest', role: 'Special Guest Speaker', bio: 'A guest speaker joining the group Thursday before the PBR and concert — the kind of conversation you only get around a bonfire and a beer.', photo: 'assets/pbrguest.png' },
  ];
  return (
    <section className="lineup" id="lineup">
      <div className="wrap">
        <div className="lineup-head">
          <h2 className="anim from-left">Who&rsquo;s <em>in</em><br/>the room.</h2>
          <p className="anim anim-d1">Attendance is intentionally limited to ensure meaningful collaboration, deeper relationships, and focused strategic conversations. Reside members and Team Growth Plus team leaders, side by side.</p>
        </div>
        <div className="lineup-grid">
          {people.map((p, i) => (
            <div className="figure-card anim" key={i}>
              <div className="portrait">
                {p.photo
                  ? <div className="img-ph real light" style={{ backgroundImage: `url(${p.photo})`, backgroundSize: 'cover', backgroundPosition: 'center top' }} />
                  : <window.Photo label={`Candid portrait — ${p.name.split(' ')[0]}`} variant="light" />
                }
              </div>
              <div className="role">{p.role}</div>
              <h4>{p.name}</h4>
              <p>{p.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  const quotes = [
    {
      q: 'I\u2019ve never been to Montana. I\u2019ve been to very few baller places just like this one. So that just lends itself to the whole idea of dreaming big and seeing what\u2019s possible on the other side of the story that you\u2019re stuck telling yourself or the beliefs that are limiting your growth. The thing that made the Dream Big Mastermind so cool was getting to be around other people in the LVT community doing big things just like we\u2019re trying to all do. Being in that environment where it\u2019s collaboration over competition, it inspires me to work my ass off even more so I can keep on coming to cool stuff like this.',
      name: 'Suneet Agarwal',
      title: 'Best Sac Team Founder · Reside Platform Co-Founder',
      sub: 'Dream Big, Big Sky 2025',
      wistiaId: '51bopsvrr1',
      headshot: 'assets/SuneetAgarwal.png',
    },
    {
      q: 'We\u2019re in Montana. We\u2019re in nature. We\u2019re sitting around a fire pit, sitting on a couch in a living room. It changes the dynamic from a boardroom or a ballroom to \u2014 no, we\u2019re family, chilling by the fireplace. This kind of mastermind is where you go to be vulnerable and talk to people at your level or above, because they\u2019ve either walked the path you\u2019re trying to walk or they\u2019re walking it alongside you right now. Robert is the polar opposite of unapproachable. That\u2019s a humble leader right there.',
      name: 'Austin Zaback',
      title: 'Space Team Founder',
      sub: 'Dream Big, Big Sky 2025',
      wistiaId: 'hhkn3n7ruk',
      headshot: 'assets/austin-zaback.avif',
    },
    {
      q: 'Some places just have magic in the air. Being here at Big Sky Montana at the Montage elevated and accelerated the way the juices were flowing. To have the opportunity to be in a room focused on the pillars that matter \u2014 that will make your life better, your business more enjoyable, your profitability more exciting \u2014 it\u2019s hands down the best experience I\u2019ve had. Led by experts in the industry and a titan like Robert Palmer, this is gonna be a game changer for my team, my business, and my partners.',
      name: 'Sam Khorramian',
      title: 'Big Block Team Co-Founder',
      sub: 'Dream Big, Big Sky 2025',
      wistiaId: '9q8ty5o2yz',
      headshot: 'assets/SamKhorramian.png',
    },
  ];
  const [i, setI] = useStateS(0);
  const [modal, setModal] = useStateS(false);
  const q = quotes[i];

  useEffectS(() => {
    const onKey = (e) => { if (e.key === 'Escape') setModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section className="testimonial">
      <div className="wrap">
        <div className="t-grid">
          <div className="t-media anim from-left" onClick={() => setModal(true)}>
            <div className="t-headshot" style={{ backgroundImage: `url(${q.headshot})` }} />
            <button className="t-play-btn" aria-label={`Watch ${q.name}`}>
              <span className="t-play-ring">
                <svg width="18" height="20" viewBox="0 0 18 20"><path d="M1 1l16 9L1 19V1z"/></svg>
              </span>
            </button>
          </div>
          <div className="anim from-right">
            <div className="eyebrow">Voices</div>
            <blockquote className="t-quote" style={{ marginTop: 18 }}>
              <span className="q">&ldquo;</span>{q.q}<span className="q">&rdquo;</span>
            </blockquote>
            <div className="t-attrib">
              <div>
                <div className="name">{q.name}</div>
                <div className="sub" style={{ marginTop: 4 }}>{q.title}</div>
                <div className="sub" style={{ marginTop: 2, opacity: 0.6 }}>{q.sub}</div>
              </div>
              <div style={{ opacity: 0.6 }}>{String(i + 1).padStart(2, '0')} / {String(quotes.length).padStart(2, '0')}</div>
            </div>
            <div className="t-nav">
              <button onClick={() => setI((i - 1 + quotes.length) % quotes.length)} aria-label="Previous">←</button>
              <button onClick={() => setI((i + 1) % quotes.length)} aria-label="Next">→</button>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="t-modal-overlay" onClick={() => setModal(false)}>
          <div className="t-modal" onClick={e => e.stopPropagation()}>
            <button className="t-modal-close" onClick={() => setModal(false)}>
              Close &nbsp;✕
            </button>
            <div className="t-modal-player">
              <wistia-player media-id={q.wistiaId} aspect="1.7777777777777777" autoplay="true" />
            </div>
            <div className="t-modal-name">{q.name} &nbsp;·&nbsp; Dream Big, Big Sky 2025</div>
          </div>
        </div>
      )}
    </section>
  );
}

function Itinerary() {
  const days = [
    {
      day: 'Day 01', sub: 'Mon · Jul 13 · Arrival',
      rows: [
        ['Afternoon', 'Arrive in Big Sky', 'Guests arrive and settle into accommodations. A relaxed day to acclimate, meet your transportation buddy, and connect informally.'],
        ['Evening', 'Informal Welcome', 'Nothing on the books — explore Big Sky Town Center, or settle in and prepare for the days ahead.'],
      ],
      img: 'assets/day1.png',
    },
    {
      day: 'Day 02', sub: 'Tue · Jul 14 · Mastermind',
      rows: [
        ['Morning', 'Welcome & Housekeeping', 'The event officially begins. Welcome from ML, followed by the opening mastermind session led by RP.'],
        ['Late Morning', 'Speaker Sessions', 'Two opening speakers frame the day. Strategic growth discussions, insight from top performers, and focused time to refine direction.'],
        ['Lunch', 'Seated Lunch', 'Continue the conversation at the table. Connection is part of the program.'],
        ['Afternoon', 'Breakout Groups', 'A third speaker inspires breakout groups. Each group takes a special assignment — the same groups reconvene tomorrow on the mountaintop.'],
        ['Late Afternoon', 'Breakout Presentations & Wrap', 'Groups present. Day 1 wrap and housekeeping for the rest of the week.'],
        ['Evening', 'Dinner on Your Own', 'Big Sky Town Center suggestions provided. Optional: Lone Mountain Ranch Summer Rodeo, 6\u20138pm.'],
      ],
      img: 'assets/breakout.png',
    },
    {
      day: 'Day 03', sub: 'Wed · Jul 15 · Mountain & River',
      rows: [
        ['Morning', 'Mountaintop Breakouts', 'Nature-based mastermind at elevation — Yellowstone Club or Big Sky Resort, tents if the weather cooperates. Same breakout groups as Day 02.'],
        ['Midday', 'Mountaintop Picnic Lunch', 'Lunch on the ridge. Thin air, sharper ideas, wide-open views.'],
        ['Afternoon', 'Return & Freshen Up', 'Transportation back to the hotel. Cowboy attire optional for the evening.'],
        ['Evening', 'Riverhouse BBQ & Dancing', 'Transportation to the Riverhouse, 45130 Gallatin Road. Riverside BBQ, live music, dancing down by the Gallatin.'],
      ],
      img: 'assets/mountain.jpg',
    },
    {
      day: 'Day 04', sub: 'Thu · Jul 16 · PBR Night',
      rows: [
        ['Morning', 'Brunch Mastermind', 'RP inspirational wrap-up over brunch. Reflections from the week so far, and a preview of tonight\u2019s PBR.'],
        ['Midday', 'Special Speaker & Snacks', 'PBR-themed keynote from a special speaker, with snacks before the evening kicks off.'],
        ['Afternoon', 'Return & Freshen Up', 'Back to the hotel. Cowboy attire recommended.'],
        ['Evening', 'PBR & Concert', 'Arrive at Big Sky Town Center. Cocktails and appetizers, then the Professional Bull Riders event, followed by a live concert.'],
        ['Late', 'Transport Home', 'Transportation back to the hotel at close.'],
      ],
      img: 'assets/pbr_sunset.jpg',
    },
    {
      day: 'Day 05', sub: 'Fri · Jul 17 · Departure',
      rows: [
        ['Morning', 'Departures', 'Guests depart with renewed clarity, stronger connections, and expanded vision. The community continues year-round.'],
      ],
      img: 'Big Sky morning — departure day',
    },
  ];
  const [active, setActive] = useStateS(0);
  const tabsRef = useRefS(null);
  useEffectS(() => {
    const el = tabsRef.current;
    if (!el) return;
    const onScroll = () => {
      const center = el.scrollLeft + el.clientWidth / 2;
      let closest = 0, minDist = Infinity;
      Array.from(el.querySelectorAll('.itin-tab')).forEach((tab, idx) => {
        const dist = Math.abs((tab.offsetLeft + tab.offsetWidth / 2) - center);
        if (dist < minDist) { minDist = dist; closest = idx; }
      });
      setActive(closest);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  const d = days[active];
  return (
    <section className="itinerary" id="itinerary">
      <div className="wrap">
        <div className="itin-head">
          <h2 className="anim from-left">Five days,<br/>one <em>valley.</em></h2>
          <p className="anim anim-d1">A preview of the schedule &mdash; final programming is shared with confirmed attendees. Arrive Monday, depart Friday, everything in between is intentional.</p>
        </div>
        <div className="itin-tabs-wrap">
          <div className="itin-scroll-arrow" aria-hidden="true" />
          <div className="itin-tabs anim anim-d2" ref={tabsRef}>
            {days.map((x, i) => (
              <button
                key={i}
                className={`itin-tab ${active === i ? 'active' : ''}`}
                onClick={() => setActive(i)}
              >
                <span className="day">{x.day}</span>
                {x.sub}
              </button>
            ))}
          </div>
        </div>
        <div className="itin-body">
          <div className="itin-timeline">
            {d.rows.map((r, i) => (
              <div className="itin-row" key={i}>
                <div className="time">{r[0]}</div>
                <div>
                  <div className="title">{r[1]}</div>
                  <div className="desc">{r[2]}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="itin-image">
            <window.Photo label={d.img} variant="light" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand anim from-left">
            <div className="mark" style={{ backgroundImage: 'url(assets/logo-gold.jpg)' }} />
            <p>Dream Big, Big Sky &mdash; Mastermind, Music &amp; Mountains for the Reside and Team Growth Plus communities. July 13&ndash;17, 2026.</p>
          </div>
          <div className="foot-col anim anim-d1">
            <h5>The Experience</h5>
            <ul>
              <li><a href="#about" onClick={e => { e.preventDefault(); window.smoothScroll('about'); }}>Who This Is For</a></li>
              <li><a href="#pillars" onClick={e => { e.preventDefault(); window.smoothScroll('pillars'); }}>Highlights</a></li>
              <li><a href="#itinerary" onClick={e => { e.preventDefault(); window.smoothScroll('itinerary'); }}>Schedule</a></li>
              <li><a href="#lineup" onClick={e => { e.preventDefault(); window.smoothScroll('lineup'); }}>Who&rsquo;s Coming</a></li>
            </ul>
          </div>
          <div className="foot-col anim anim-d2">
            <h5>Practical</h5>
            <ul>
              <li><a href="#apply" onClick={e => { e.preventDefault(); window.smoothScroll('apply'); }}>Register</a></li>
              <li><a href="#">Travel &amp; Lodging</a></li>
              <li><a href="#">Big Sky, MT</a></li>
              <li><a href="#">FAQ</a></li>
            </ul>
          </div>
          <div className="foot-col anim anim-d3">
            <h5>Event Concierge</h5>
            <ul>
              <li><a href="tel:+14079292335">Text / Call 407.929.2335</a></li>
              <li><a href="#">Big Sky, Montana</a></li>
              <li><a href="#">DreamBigBigSky.com</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <div>© 2026 Dream Big, Big Sky · Mastermind, Music &amp; Mountains</div>
          <div>Reside · Team Growth Plus · Big Sky, MT</div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Nav, Hero, Marquee, Recap, Intro, Pillars, Gallery, Lineup, Testimonial, Itinerary, Footer });
