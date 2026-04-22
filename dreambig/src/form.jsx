const { useState: useStateF, useRef: useRefF } = React;

function ApplyForm() {
  const [step, setStep] = useStateF(0);
  const [data, setData] = useStateF({
    firstName: '', lastName: '', email: '', phone: '',
    company: '', title: '', website: '',
    community: '', focus: [], discountCode: '',
    dietary: '', roommate: '', why: '',
  });
  const [done, setDone] = useStateF(false);

  const toggleChip = (key, v) => {
    setData(d => ({
      ...d,
      [key]: d[key].includes(v) ? d[key].filter(x => x !== v) : [...d[key], v],
    }));
  };

  const steps = [
    { label: 'You', title: 'Start with who you are.' },
    { label: 'Community', title: 'Your community & ticket.' },
    { label: 'Details', title: 'A few final notes.' },
  ];

  const pct = done ? 100 : ((step + 1) / (steps.length + 1)) * 100;

  if (done) {
    return (
      <div className="form-card">
        <div className="form-success">
          <div className="seal">✦</div>
          <h3>Your registration is <em>with the concierge.</em></h3>
          <p>Thank you. You&rsquo;ll receive a confirmation and next steps by email within two business days. For anything urgent, text or call the Event Concierge at 407.929.2335.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-card" id="apply-form">
      <div className="form-step-head">
        <h3>{steps[step].title}</h3>
        <div className="progress">Step {String(step + 1).padStart(2, '0')} / 03</div>
      </div>
      <div className="progress-bar"><div className="fill" style={{ width: `${pct}%` }} /></div>

      {step === 0 && (
        <div>
          <div className="field-row">
            <div className="field">
              <label>First name</label>
              <input value={data.firstName} onChange={e => setData({ ...data, firstName: e.target.value })} placeholder="Margaux" />
            </div>
            <div className="field">
              <label>Last name</label>
              <input value={data.lastName} onChange={e => setData({ ...data, lastName: e.target.value })} placeholder="Deveraux" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Email</label>
              <input type="email" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} placeholder="you@firm.com" />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} placeholder="+1 ···" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Firm</label>
              <input value={data.company} onChange={e => setData({ ...data, company: e.target.value })} placeholder="Blackridge Capital" />
            </div>
            <div className="field">
              <label>Title</label>
              <input value={data.title} onChange={e => setData({ ...data, title: e.target.value })} placeholder="Managing Partner" />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="field-row">
            <div className="field full">
              <label>Community — select one</label>
              <div className="chips">
                {['Reside Member', 'Team Growth Plus (Team Leader)', 'Guest of Reside', 'Guest of TG+'].map(f => (
                  <button key={f} type="button" className={`chip ${data.community === f ? 'on' : ''}`} onClick={() => setData({ ...data, community: f })}>{f}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Ticket</label>
              <div className="ticket-fixed">
                <span className="ticket-price">$5,000</span>
                <span className="ticket-desc">One seat · Big Sky, Montana · July 13&ndash;17</span>
              </div>
            </div>
            <div className="field">
              <label>Discount code</label>
              <input value={data.discountCode} onChange={e => setData({ ...data, discountCode: e.target.value })} placeholder="Enter code if applicable" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Firm website</label>
              <input value={data.website} onChange={e => setData({ ...data, website: e.target.value })} placeholder="firm.com" />
            </div>
          </div>
          <div className="field-row">
            <div className="field full">
              <label>What do you lead? — select all that apply</label>
              <div className="chips">
                {['Team Leader', 'Broker / Agent', 'Founder', 'Operator', 'Coach', 'Executive', 'Investor', 'Builder'].map(f => (
                  <button key={f} type="button" className={`chip ${data.focus.includes(f) ? 'on' : ''}`} onClick={() => toggleChip('focus', f)}>{f}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="field-row">
            <div className="field">
              <label>Dietary or access notes</label>
              <input value={data.dietary} onChange={e => setData({ ...data, dietary: e.target.value })} placeholder="Allergies, preferences, accessibility" />
            </div>
            <div className="field">
              <label>Roommate / travel partner (optional)</label>
              <input value={data.roommate} onChange={e => setData({ ...data, roommate: e.target.value })} placeholder="Name" />
            </div>
          </div>
          <div className="field-row">
            <div className="field full">
              <label>What would make these five days worth it for you?</label>
              <textarea value={data.why} onChange={e => setData({ ...data, why: e.target.value })} placeholder="One paragraph. A goal, a question, a vision you want to pressure-test. We read every word." />
            </div>
          </div>
        </div>
      )}

      <div className="form-foot">
        <button
          className={`link ${step === 0 ? 'disabled' : ''}`}
          onClick={() => setStep(s => Math.max(0, s - 1))}
        >← Back</button>
        {step < steps.length - 1 ? (
          <button className="btn-submit" onClick={() => setStep(s => s + 1)}>
            Continue <span className="arrow" />
          </button>
        ) : (
          <button className="btn-submit" onClick={() => setDone(true)}>
            Complete Registration <span className="arrow" />
          </button>
        )}
      </div>
    </div>
  );
}

function ApplySection() {
  return (
    <section className="apply" id="apply">
      <div className="wrap apply-inner">
        <div className="apply-grid">
          <div className="apply-intro anim from-left">
            <div className="eyebrow" style={{ marginBottom: 24 }}>Register · July 2026</div>
            <h2 className="display-upright">Reserve<br/><em>your</em> seat.</h2>
            <p>For Reside members and Team Growth Plus team leaders. One seat per TG+ firm. Attendance is intentionally limited so every conversation counts.</p>
            <div className="apply-facts">
              <div className="apply-fact"><b>Jul 13&ndash;17</b>Big Sky, Montana · 2026</div>
              <div className="apply-fact"><b>$5,000</b>Per seat · Reside 50% off</div>
              <div className="apply-fact"><b>One Seat</b>Per TG+ firm · Team Leaders</div>
              <div className="apply-fact"><b>407.929.2335</b>Event Concierge · Text or Call</div>
            </div>
          </div>
          <div className="anim from-right anim-d1"><ApplyForm /></div>
        </div>
      </div>
    </section>
  );
}

window.ApplySection = ApplySection;
