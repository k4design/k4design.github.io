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
        {links.map(l => <a key={l.id} href={`#${l.id}`} dangerouslySetInnerHTML={{ __html: l.label }} />)}
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
          <div className="recap-label">
            <div className="num">Film / 2025</div>
            <div className="eyebrow">Press play — last year&rsquo;s recap</div>
          </div>
          <h2 className="display-upright">A taste of<br/>what&rsquo;s <em>coming.</em></h2>
          <p>Three minutes from Dream Big, Big Sky 2025 &mdash; the mastermind rooms, the mountaintop, the Riverhouse, the PBR. If last year&rsquo;s film doesn&rsquo;t make the case, nothing we write here will.</p>
        </div>
        <div className="recap-player-wrap">
          <div className="recap-player">
            <wistia-player
              media-id="ovtazqlroz"
              aspect="1.7777777777777777"
            ></wistia-player>
          </div>
          <div className="recap-meta">
            <div className="recap-meta-col">
              <div className="recap-meta-label">Runtime</div>
              <div className="recap-meta-val">≈ 3 min</div>
            </div>
            <div className="recap-meta-col">
              <div className="recap-meta-label">Year</div>
              <div className="recap-meta-val">July 2025</div>
            </div>
            <div className="recap-meta-col">
              <div className="recap-meta-label">Location</div>
              <div className="recap-meta-val">Big Sky, MT</div>
            </div>
            <div className="recap-meta-col">
              <div className="recap-meta-label">Audience</div>
              <div className="recap-meta-val">Reside · TG+</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section className="intro cream-section" id="about">
      <div className="wrap">
        <div className="intro-grid">
          <div className="intro-label">
            <div className="num">01 / Who This Is For</div>
            <h4>More than an event &mdash; a curated environment where growth, connection, and momentum come together.</h4>
          </div>
          <div>
            <p className="intro-body">
              <span className="drop">Dream Big, Big Sky</span> is reserved for <em>Reside members</em> and <em>Team Growth Plus</em> team leaders &mdash; one seat per TG+ firm. Attendance is intentionally limited to ensure meaningful collaboration, deeper relationships, and focused strategic conversations with the people actually building what comes next.
            </p>
          </div>
        </div>
        <div className="intro-footer">
          <div className="stat"><div className="n">$<em>5</em>K</div><div className="l">Per seat · 50% off for Reside members</div></div>
          <div className="stat"><div className="n"><em>5</em></div><div className="l">Days in the Montana mountains</div></div>
          <div className="stat"><div className="n"><em>1</em></div><div className="l">Seat per TG+ firm &mdash; Team Leaders only</div></div>
          <div className="stat"><div className="n"><em>07</em>/<em>13</em></div><div className="l">Arrival day, Big Sky MT 2026</div></div>
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  const items = [
    { n: '01', t: 'Dream Big Mastermind', d: 'A private, high-level mastermind built for leaders ready to expand their vision and execution. Strategic growth discussions, peer-to-peer collaboration, and insight from top performers. The core of the experience — come prepared to engage, contribute, and dream bigger.' },
    { n: '02', t: 'Mountaintop Mastermind', d: 'Breakout groups meet at elevation — Yellowstone Club or Big Sky Resort — followed by a picnic lunch on the ridge. The air is thinner, the conversation is sharper, and the ideas have room to land.' },
    { n: '03', t: 'Riverhouse BBQ &amp; Dancing', d: 'An evening down by the Gallatin. Casual riverside BBQ, live music, cowboy attire optional. This is where relationships deepen and the Dream Big community truly comes alive.' },
    { n: '04', t: 'Big Sky PBR Night', d: 'Experience the culture of Big Sky with a premium group outing to the PBR (Professional Bull Riders), followed by a live concert. High-adrenaline, memorable, and unmistakably Montana.' },
  ];
  return (
    <section className="pillars" id="pillars">
      <div className="wrap">
        <div className="pillars-head">
          <h2 className="display-upright">The <em>four</em><br/>moments.</h2>
          <p>Intentional programming woven through five days &mdash; a mastermind indoors, a mastermind on the mountain, an evening by the river, and a night at the PBR. Wide open space, the right people in the room, and the energy to think bigger.</p>
        </div>
      </div>
      <div className="pillars-grid">
        {items.map(p => (
          <div className="pillar" key={p.n}>
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
        <div className="gallery-head">
          <h3>Scenes from Big Sky.</h3>
          <div className="kicker">Montana · July 2025</div>
        </div>
        <div className="gallery-grid">
          <div className="g-cell g-a ken">
            <window.Photo label="Riverhouse BBQ long table, Gallatin Road" />
            <div className="cap"><b>01 — Riverhouse</b><span>Gallatin Gateway · Wednesday</span></div>
          </div>
          <div className="g-cell g-b ken">
            <window.Photo label="Gallatin River, morning light" />
            <div className="cap"><b>02 — The Gallatin</b><span>Arrival Day</span></div>
          </div>
          <div className="g-cell g-c ken">
            <window.Photo label="Mastermind keynote, candid, low light" />
            <div className="cap"><b>03 — Mastermind</b><span>Tuesday</span></div>
          </div>
          <div className="g-cell g-d ken">
            <window.Photo label="Breakout roundtable with handwritten agenda" />
            <div className="cap"><b>04 — Breakouts</b><span>Mastermind Day</span></div>
          </div>
          <div className="g-cell g-e ken">
            <window.Photo label="Mountaintop picnic ride through open meadow" />
            <div className="cap"><b>05 — Mountaintop</b><span>Yellowstone Club</span></div>
          </div>
          <div className="g-cell g-f ken">
            <window.Photo label="PBR night, Big Sky Town Center, cowboy attire" />
            <div className="cap"><b>06 — PBR Night</b><span>Thursday</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Lineup() {
  const people = [
    { name: 'Reside Members', role: 'Visionary Team Leaders', bio: 'The builders and leaders inside the Reside community who set the pace for the industry. Reserved seats, 50% member pricing, and a front-row role in every mastermind session.' },
    { name: 'Team Growth Plus', role: 'Team Leaders · One Seat Per Firm', bio: 'Top Team Leaders from across TG+. One seat per firm, intentionally — proximity to other high-level thinkers without the noise of a full conference floor.' },
    { name: 'Mastermind Speakers', role: 'Top Performers &amp; Operators', bio: 'A curated lineup of speakers to open Tuesday\u2019s sessions and inspire the breakout groups. Names announced to confirmed attendees closer to the event.' },
    { name: 'PBR Night Guest', role: 'Special Guest Speaker', bio: 'A guest speaker joining the group Thursday before the PBR and concert — the kind of conversation you only get around a bonfire and a beer.' },
  ];
  return (
    <section className="lineup" id="lineup">
      <div className="wrap">
        <div className="lineup-head">
          <h2>Who&rsquo;s <em>in</em><br/>the room.</h2>
          <p>Attendance is intentionally limited to ensure meaningful collaboration, deeper relationships, and focused strategic conversations. Reside members and Team Growth Plus team leaders, side by side.</p>
        </div>
        <div className="lineup-grid">
          {people.map((p, i) => (
            <div className="figure-card" key={i}>
              <div className="portrait">
                <window.Photo label={`Candid portrait — ${p.name.split(' ')[0]}`} variant="light" />
                <div className="cap">Confirmed · 04</div>
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
      q: 'I came to step out of daily operations and think long-term. I left with a clearer vision, a stronger team strategy, and friendships I\u2019ll lean on for years.',
      name: 'A Reside Member',
      sub: 'Team Leader · Previous attendee',
      media: 'Candid — mastermind breakout, Tuesday',
    },
    {
      q: 'The Riverhouse BBQ was the unlock. You dance with the same people you did deep work with that morning, and suddenly the relationship is real.',
      name: 'A Team Growth Plus Team Leader',
      sub: 'One-seat attendee · previous year',
      media: 'Candid — Riverhouse, Gallatin Road',
    },
    {
      q: 'Proximity to this caliber of thinker, in a place like Big Sky, is the thing you can\u2019t manufacture anywhere else. Show up fully engaged. It pays back for a year.',
      name: 'A Visionary Team Leader',
      sub: 'Past Dream Big attendee',
      media: 'Candid — mountaintop, Yellowstone Club',
    },
  ];
  const [i, setI] = useStateS(0);
  const q = quotes[i];
  return (
    <section className="testimonial">
      <div className="wrap">
        <div className="t-grid">
          <div className="t-media">
            <window.Photo label={q.media} />
            <div className="cap">Past attendees · Shared with permission</div>
          </div>
          <div>
            <div className="eyebrow">Voices</div>
            <blockquote className="t-quote" style={{ marginTop: 18 }}>
              <span className="q">&ldquo;</span>{q.q}<span className="q">&rdquo;</span>
            </blockquote>
            <div className="t-attrib">
              <div>
                <div className="name">{q.name}</div>
                <div className="sub" style={{ marginTop: 4 }}>{q.sub}</div>
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
      img: 'Big Sky arrival — mountain light, first evening',
    },
    {
      day: 'Day 02', sub: 'Tue · Jul 14 · Mastermind',
      rows: [
        ['Morning', 'Welcome &amp; Housekeeping', 'The event officially begins. Welcome from ML, followed by the opening mastermind session led by RP.'],
        ['Late Morning', 'Speaker Sessions', 'Two opening speakers frame the day. Strategic growth discussions, insight from top performers, and focused time to refine direction.'],
        ['Lunch', 'Seated Lunch', 'Continue the conversation at the table. Connection is part of the program.'],
        ['Afternoon', 'Breakout Groups', 'A third speaker inspires breakout groups. Each group takes a special assignment — the same groups reconvene tomorrow on the mountaintop.'],
        ['Late Afternoon', 'Breakout Presentations &amp; Wrap', 'Groups present. Day 1 wrap and housekeeping for the rest of the week.'],
        ['Evening', 'Dinner on Your Own', 'Big Sky Town Center suggestions provided. Optional: Lone Mountain Ranch Summer Rodeo, 6&ndash;8pm.'],
      ],
      img: 'Mastermind room — breakout session, Tuesday',
    },
    {
      day: 'Day 03', sub: 'Wed · Jul 15 · Mountain &amp; River',
      rows: [
        ['Morning', 'Mountaintop Breakouts', 'Nature-based mastermind at elevation — Yellowstone Club or Big Sky Resort, tents if the weather cooperates. Same breakout groups as Day 02.'],
        ['Midday', 'Mountaintop Picnic Lunch', 'Lunch on the ridge. Thin air, sharper ideas, wide-open views.'],
        ['Afternoon', 'Return &amp; Freshen Up', 'Transportation back to the hotel. Cowboy attire optional for the evening.'],
        ['Evening', 'Riverhouse BBQ &amp; Dancing', 'Transportation to the Riverhouse, 45130 Gallatin Road. Riverside BBQ, live music, dancing down by the Gallatin.'],
      ],
      img: 'Riverhouse BBQ — Gallatin Gateway, evening',
    },
    {
      day: 'Day 04', sub: 'Thu · Jul 16 · PBR Night',
      rows: [
        ['Morning', 'Brunch Mastermind', 'RP inspirational wrap-up over brunch. Reflections from the week so far, and a preview of tonight\u2019s PBR.'],
        ['Midday', 'Special Speaker &amp; Snacks', 'PBR-themed keynote from a special speaker, with snacks before the evening kicks off.'],
        ['Afternoon', 'Return &amp; Freshen Up', 'Back to the hotel. Cowboy attire recommended.'],
        ['Evening', 'PBR &amp; Concert', 'Arrive at Big Sky Town Center. Cocktails and appetizers, then the Professional Bull Riders event, followed by a live concert.'],
        ['Late', 'Transport Home', 'Transportation back to the hotel at close.'],
      ],
      img: 'PBR night — Big Sky Town Center',
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
  const d = days[active];
  return (
    <section className="itinerary" id="itinerary">
      <div className="wrap">
        <div className="itin-head">
          <h2>Five days,<br/>one <em>valley.</em></h2>
          <p>A preview of the schedule &mdash; final programming is shared with confirmed attendees. Arrive Monday, depart Friday, everything in between is intentional.</p>
        </div>
        <div className="itin-tabs">
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
          <div className="foot-brand">
            <div className="mark" style={{ backgroundImage: 'url(assets/logo-gold.jpg)' }} />
            <p>Dream Big, Big Sky &mdash; Mastermind, Music &amp; Mountains for the Reside and Team Growth Plus communities. July 13&ndash;17, 2026.</p>
          </div>
          <div className="foot-col">
            <h5>The Experience</h5>
            <ul>
              <li><a href="#about">Who This Is For</a></li>
              <li><a href="#pillars">Highlights</a></li>
              <li><a href="#itinerary">Schedule</a></li>
              <li><a href="#lineup">Who&rsquo;s Coming</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h5>Practical</h5>
            <ul>
              <li><a href="#apply">Register</a></li>
              <li><a href="#">Travel &amp; Lodging</a></li>
              <li><a href="#">Big Sky, MT</a></li>
              <li><a href="#">FAQ</a></li>
            </ul>
          </div>
          <div className="foot-col">
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
