/* @ds-bundle: {"format":4,"namespace":"ApertureGlobalDesignSystem_3b7c84","components":[{"name":"Divider","sourcePath":"components/display/Divider.jsx"},{"name":"MarketBar","sourcePath":"components/display/MarketBar.jsx"},{"name":"PageFooter","sourcePath":"components/display/PageFooter.jsx"},{"name":"PressCard","sourcePath":"components/display/PressCard.jsx"},{"name":"PropertyCard","sourcePath":"components/display/PropertyCard.jsx"},{"name":"SectionLabel","sourcePath":"components/display/SectionLabel.jsx"},{"name":"Stat","sourcePath":"components/display/Stat.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"}],"sourceHashes":{"components/display/Divider.jsx":"15463e8ddc35","components/display/MarketBar.jsx":"66a879166449","components/display/PageFooter.jsx":"ee2c17bcc8fa","components/display/PressCard.jsx":"735385c36e14","components/display/PropertyCard.jsx":"7688b1e95ca6","components/display/SectionLabel.jsx":"823bab671d0e","components/display/Stat.jsx":"38fd7868439f","components/forms/Button.jsx":"e80f6549019b","components/forms/Checkbox.jsx":"0d474e74f7b0","components/forms/Input.jsx":"b7a75d340372","components/forms/Radio.jsx":"c1a028c7f0d6","components/forms/Select.jsx":"e99fe96fdb19","ui_kits/campaign_report/ReportPages.jsx":"fd99dc667820","ui_kits/listing_presentation/DeckPages.jsx":"65e5de901206"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ApertureGlobalDesignSystem_3b7c84 = window.ApertureGlobalDesignSystem_3b7c84 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Divider.jsx
try { (() => {
/** 1px hairline rule. */
function Divider({
  onDark = false,
  strong = false,
  style
}) {
  return /*#__PURE__*/React.createElement("hr", {
    style: {
      border: 'none',
      borderTop: `1px solid ${onDark ? 'var(--rule-on-dark)' : strong ? 'var(--rule-strong)' : 'var(--rule)'}`,
      margin: 0,
      width: '100%',
      ...style
    }
  });
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Divider.jsx", error: String((e && e.message) || e) }); }

// components/display/MarketBar.jsx
try { (() => {
/** Horizontal data bar row: label left, thin muted bar, value right, hairline separator. */
function MarketBar({
  label,
  value,
  pct,
  onDark = false
}) {
  const rule = onDark ? 'var(--rule-on-dark)' : 'var(--rule)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '140px 1fr 60px',
      alignItems: 'center',
      gap: 18,
      padding: '11px 0',
      borderBottom: `1px solid ${rule}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '.18em',
      color: onDark ? 'var(--text-on-dark)' : 'var(--text-body)'
    }
  }, label), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      width: `${Math.max(0, Math.min(100, pct))}%`,
      background: 'var(--accent-data)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      textAlign: 'right',
      color: onDark ? 'var(--text-secondary-on-dark)' : 'var(--text-secondary)'
    }
  }, value));
}
Object.assign(__ds_scope, { MarketBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/MarketBar.jsx", error: String((e && e.message) || e) }); }

// components/display/PageFooter.jsx
try { (() => {
/** Document footer: running label left, URL or page marker right, hairline above. */
function PageFooter({
  left,
  right = 'APERTUREGLOBAL.COM',
  onDark = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: `1px solid ${onDark ? 'var(--rule-on-dark)' : 'var(--rule)'}`,
      paddingTop: 12,
      display: 'flex',
      justifyContent: 'space-between',
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--label-tracking)',
      color: onDark ? 'var(--text-secondary-on-dark)' : 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", null, left), /*#__PURE__*/React.createElement("span", null, right));
}
Object.assign(__ds_scope, { PageFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/PageFooter.jsx", error: String((e && e.message) || e) }); }

// components/display/PropertyCard.jsx
try { (() => {
/** Property listing card: photo, address in serif, price, optional agent line. */
function PropertyCard({
  image,
  address,
  price,
  agent,
  tag
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      maxWidth: 320
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, tag && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      background: 'var(--ag-black)',
      color: '#fff',
      font: 'var(--type-label)',
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      padding: '5px 8px'
    }
  }, tag), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      aspectRatio: '1.65/1',
      background: image ? `url(${image}) center/cover` : 'var(--surface-panel)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: 'var(--type-label)',
      letterSpacing: '.2em',
      color: 'var(--text-secondary)'
    }
  }, image ? '' : 'PHOTO')), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-display-sm)',
      fontSize: 19,
      marginTop: 4
    }
  }, address), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)',
      fontSize: 12
    }
  }, price), agent && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: 'var(--text-secondary)'
    }
  }, "Sold by ", agent));
}
Object.assign(__ds_scope, { PropertyCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/PropertyCard.jsx", error: String((e && e.message) || e) }); }

// components/display/SectionLabel.jsx
try { (() => {
/** Letterspaced uppercase eyebrow label, optionally with the 24px leading dash. */
function SectionLabel({
  children,
  dash = false,
  accent = false,
  onDark = false,
  wide = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: wide ? 'var(--label-tracking-wide)' : 'var(--label-tracking)',
      color: accent ? 'var(--accent)' : onDark ? 'var(--text-secondary-on-dark)' : 'var(--text-secondary)',
      ...style
    }
  }, dash && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 1,
      background: 'currentColor',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", null, children));
}
Object.assign(__ds_scope, { SectionLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/SectionLabel.jsx", error: String((e && e.message) || e) }); }

// components/display/PressCard.jsx
try { (() => {
/** Press mention card: source label, serif quote headline, teaser, Read More link. */
function PressCard({
  source,
  headline,
  teaser,
  image
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 280
    }
  }, image && /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: '100%',
      aspectRatio: '2.2/1',
      objectFit: 'cover',
      marginBottom: 6
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, {
    accent: true,
    style: {
      letterSpacing: '.2em'
    }
  }, source), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-display-sm)',
      fontSize: 19,
      lineHeight: 1.3,
      fontStyle: 'italic'
    }
  }, "\u201C", headline, "\u201D"), teaser && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)',
      margin: 0
    }
  }, teaser), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      font: 'var(--type-caption)',
      fontStyle: 'italic',
      color: 'var(--text-body)',
      textDecorationThickness: 1,
      width: 'fit-content'
    }
  }, "Read More"));
}
Object.assign(__ds_scope, { PressCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/PressCard.jsx", error: String((e && e.message) || e) }); }

// components/display/Stat.jsx
try { (() => {
/** Oversized serif figure with a letterspaced label. */
function Stat({
  value,
  label,
  onDark = false,
  size = 72,
  align = 'left'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      alignItems: align === 'center' ? 'center' : 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-stat)',
      fontSize: size,
      color: onDark ? 'var(--text-on-dark)' : 'var(--text-body)'
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--label-tracking)',
      color: onDark ? 'var(--text-secondary-on-dark)' : 'var(--text-secondary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Stat.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
/** Square-cornered button. Variants: primary (ink fill), outline, link (underlined text). */
function Button({
  children,
  variant = 'primary',
  onDark = false,
  disabled = false,
  onClick,
  style
}) {
  const base = {
    font: 'var(--type-label)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '.22em',
    padding: '14px 28px',
    border: '1px solid transparent',
    borderRadius: 0,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? .4 : 1,
    transition: 'opacity .3s ease-out',
    background: 'none'
  };
  const variants = {
    primary: onDark ? {
      background: '#fff',
      color: 'var(--ag-ink)'
    } : {
      background: 'var(--ag-ink)',
      color: '#fff'
    },
    outline: {
      borderColor: onDark ? 'var(--rule-on-dark)' : 'var(--rule-strong)',
      color: onDark ? '#fff' : 'var(--ag-ink)'
    },
    link: {
      padding: 0,
      textDecoration: 'underline',
      textUnderlineOffset: 4,
      textDecorationThickness: 1,
      color: onDark ? '#fff' : 'var(--ag-ink)'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    disabled: disabled,
    onClick: onClick,
    style: {
      ...base,
      ...variants[variant],
      ...style
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.opacity = .7;
    },
    onMouseLeave: e => {
      if (!disabled) e.currentTarget.style.opacity = 1;
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/** Square checkbox, 1px border, ink fill when checked. */
function Checkbox({
  label,
  checked,
  onChange,
  onDark = false
}) {
  const [internal, setInternal] = React.useState(!!checked);
  const isChecked = onChange ? checked : internal;
  const toggle = () => onChange ? onChange(!checked) : setInternal(v => !v);
  const c = onDark ? '#fff' : 'var(--ag-ink)';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      cursor: 'pointer',
      font: 'var(--type-body)',
      fontSize: 13,
      color: c
    },
    onClick: e => {
      e.preventDefault();
      toggle();
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 14,
      border: `1px solid ${c}`,
      background: isChecked ? c : 'transparent',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, isChecked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      background: onDark ? 'var(--ag-ink)' : '#fff'
    }
  })), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Underline-only text input with a letterspaced label above. */
function Input({
  label,
  onDark = false,
  style,
  ...rest
}) {
  const c = onDark ? '#fff' : 'var(--ag-ink)';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--label-tracking)',
      color: onDark ? 'var(--text-secondary-on-dark)' : 'var(--text-secondary)'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({}, rest, {
    style: {
      font: 'var(--type-body)',
      fontSize: 14,
      color: c,
      background: 'transparent',
      border: 'none',
      borderBottom: `1px solid ${onDark ? 'var(--rule-on-dark)' : 'var(--rule-strong)'}`,
      borderRadius: 0,
      padding: '6px 0',
      outline: 'none'
    },
    onFocus: e => e.target.style.borderBottomColor = c,
    onBlur: e => e.target.style.borderBottomColor = ''
  })));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
/** Circular radio, 1px border, ink dot when selected. */
function Radio({
  label,
  name,
  checked,
  onChange,
  onDark = false
}) {
  const c = onDark ? '#fff' : 'var(--ag-ink)';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      cursor: 'pointer',
      font: 'var(--type-body)',
      fontSize: 13,
      color: c
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    checked: checked,
    onChange: e => onChange && onChange(e.target.checked),
    style: {
      display: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 14,
      border: `1px solid ${c}`,
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    onClick: () => onChange && onChange(true)
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: c
    }
  })), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Underline select matching Input. */
function Select({
  label,
  options = [],
  onDark = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--label-tracking)',
      color: onDark ? 'var(--text-secondary-on-dark)' : 'var(--text-secondary)'
    }
  }, label), /*#__PURE__*/React.createElement("select", _extends({}, rest, {
    style: {
      font: 'var(--type-body)',
      fontSize: 14,
      color: onDark ? '#fff' : 'var(--ag-ink)',
      background: 'transparent',
      border: 'none',
      borderBottom: `1px solid ${onDark ? 'var(--rule-on-dark)' : 'var(--rule-strong)'}`,
      borderRadius: 0,
      padding: '6px 0',
      outline: 'none',
      appearance: 'none',
      backgroundImage: 'linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%)',
      backgroundPosition: 'calc(100% - 12px) 55%,calc(100% - 7px) 55%',
      backgroundSize: '5px 5px',
      backgroundRepeat: 'no-repeat'
    }
  }), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// ui_kits/campaign_report/ReportPages.jsx
try { (() => {
const DS = () => window.ApertureGlobalDesignSystem_3b7c84 || {};
const P = {
  width: 850,
  height: 1100,
  boxSizing: 'border-box',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0
};
const M = {
  padding: '64px 72px'
};
function Cover() {
  const {
    SectionLabel
  } = DS();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...P,
      background: 'linear-gradient(180deg,#141c22 0%,#0C1115 55%,#0a0e12 100%)',
      color: '#fff',
      ...M
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/aperture-white-vertical.png",
    style: {
      width: 110,
      alignSelf: 'center',
      marginTop: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: 24,
      paddingBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary-on-dark)',
      fontStyle: 'italic'
    }
  }, "Full-bleed property photograph, dimmed toward charcoal. Supply imagery; none shipped with this kit."), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display-xl)',
      fontSize: 54,
      margin: 0
    }
  }, "Your home, placed in front of the ", /*#__PURE__*/React.createElement("em", null, "right audience.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    onDark: true
  }, "Digital Campaign Report"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)',
      fontSize: 13,
      color: '#fff'
    }
  }, "141 Ulerys Lake Road, Big Sky, Montana"), /*#__PURE__*/React.createElement(SectionLabel, {
    onDark: true,
    wide: true
  }, "July 14 through August 16, 2026"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--rule-on-dark)',
      paddingTop: 14,
      textAlign: 'center',
      font: 'var(--type-label)',
      letterSpacing: 'var(--label-tracking-wide)',
      textTransform: 'uppercase',
      color: 'var(--text-secondary-on-dark)'
    }
  }, "APERTUREGLOBAL.COM"));
}
function Approach() {
  const {
    SectionLabel,
    PageFooter
  } = DS();
  const rows = [["Targeted feeder markets", "Nine markets chosen for their record of producing Montana buyers."], ["Curated digital reach", "Premium placements only, sized and styled for the home they present."], ["Measured results", "Every impression, viewer, and engagement accounted for and reported."]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...P,
      background: 'var(--surface-page)',
      color: 'var(--text-body)',
      ...M
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "The Approach"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display)',
      margin: '28px 0 24px'
    }
  }, "Precision over ", /*#__PURE__*/React.createElement("em", null, "volume.")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      maxWidth: '40ch',
      margin: 0
    }
  }, "Your home is not advertised everywhere. It is advertised where it matters. Over a thirty day flight, Aperture Global placed your residence before a curated digital audience of qualified buyers across the markets most likely to produce them. Every placement is selected, not scattered."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 56
    }
  }, rows.map(([l, d]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gap: 32,
      padding: '22px 0',
      borderBottom: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, l), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)'
    }
  }, d)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto'
    }
  }, /*#__PURE__*/React.createElement(PageFooter, {
    left: "Campaign Report \xB7 The Approach"
  })));
}
function Performance() {
  const {
    SectionLabel,
    Divider,
    PageFooter
  } = DS();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...P,
      background: 'var(--surface-page-dark)',
      color: '#fff',
      ...M
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    onDark: true
  }, "Campaign Performance"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display)',
      margin: '28px 0 8px'
    }
  }, "Thirty days, ", /*#__PURE__*/React.createElement("em", null, "measured.")), /*#__PURE__*/React.createElement(Divider, {
    onDark: true,
    style: {
      margin: '24px 0 8px'
    }
  }), [["46,663", "Impressions delivered"], ["33,670", "Unique viewers reached"], ["70%", "Viewability rate"]].map(([v, l]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '28px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-stat)',
      fontSize: 64
    }
  }, v), /*#__PURE__*/React.createElement(SectionLabel, {
    onDark: true,
    wide: true
  }, l))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      maxWidth: '42ch',
      marginTop: 24,
      color: 'rgba(255,255,255,.85)'
    }
  }, "Over its thirty day flight, your home was presented more than forty-six thousand times to a curated audience of nearly thirty-four thousand qualified viewers, with seven in ten placements confirmed as seen."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto'
    }
  }, /*#__PURE__*/React.createElement(PageFooter, {
    left: "Campaign Report \xB7 Performance",
    onDark: true
  })));
}
function Engagement() {
  const {
    SectionLabel,
    MarketBar,
    PageFooter
  } = DS();
  const data = [["British Columbia", "0.92%", 92], ["Colorado", "0.33%", 33], ["Utah", "0.28%", 28], ["Tennessee", "0.27%", 27], ["Florida", "0.24%", 24], ["California", "0.19%", 19]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...P,
      background: 'var(--surface-page)',
      color: 'var(--text-body)',
      ...M
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Engagement"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display)',
      margin: '28px 0 24px'
    }
  }, "Interest where it ", /*#__PURE__*/React.createElement("em", null, "counts.")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      maxWidth: '40ch',
      margin: 0
    }
  }, "Engagement tells you where a home resonates. The strongest response to your residence came from the mountain west, the buyers who already understand what Big Sky offers."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 56,
      paddingBottom: 8
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Click-through rate by market"), /*#__PURE__*/React.createElement(SectionLabel, null, "Top engaging regions")), /*#__PURE__*/React.createElement("div", null, data.map(([l, v, p]) => /*#__PURE__*/React.createElement(MarketBar, {
    key: l,
    label: l,
    value: v,
    pct: p
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      maxWidth: '44ch',
      marginTop: 40,
      color: 'var(--text-secondary)'
    }
  }, "Ninety-six qualified engagements across the flight carried buyers directly to your home's dedicated presentation."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto'
    }
  }, /*#__PURE__*/React.createElement(PageFooter, {
    left: "Campaign Report \xB7 Engagement"
  })));
}
function BackCover() {
  const {
    SectionLabel
  } = DS();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...P,
      background: 'var(--ag-black)',
      color: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 72px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(255,255,255,.35)',
      position: 'absolute',
      inset: 24
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display)',
      fontSize: 34,
      margin: 0
    }
  }, "Luxury without limits. ", /*#__PURE__*/React.createElement("em", null, "Global reach without boundaries.")), /*#__PURE__*/React.createElement(SectionLabel, {
    wide: true,
    style: {
      color: 'rgba(255,255,255,.6)'
    }
  }, "APERTUREGLOBAL.COM")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 90,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 1,
      background: 'rgba(255,255,255,.4)',
      marginBottom: 12
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)',
      fontSize: 13
    }
  }, "Agent Name"), /*#__PURE__*/React.createElement(SectionLabel, {
    style: {
      color: 'rgba(255,255,255,.6)'
    }
  }, "Aperture Global"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'rgba(255,255,255,.75)'
    }
  }, "000.000.0000", /*#__PURE__*/React.createElement("br", null), "agent@apertureglobal.com", /*#__PURE__*/React.createElement("br", null), "License No. 000000")));
}
Object.assign(window, {
  AgReportCover: Cover,
  AgReportApproach: Approach,
  AgReportPerformance: Performance,
  AgReportEngagement: Engagement,
  AgReportBackCover: BackCover
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/campaign_report/ReportPages.jsx", error: String((e && e.message) || e) }); }

// ui_kits/listing_presentation/DeckPages.jsx
try { (() => {
const DS = () => window.ApertureGlobalDesignSystem_3b7c84 || {};
const P = {
  width: 850,
  height: 1100,
  boxSizing: 'border-box',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0
};
function DeckCover() {
  const {
    SectionLabel
  } = DS();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...P,
      background: 'linear-gradient(180deg,#10151c 0%,#0A0A0A 40%,#04070d 100%)',
      color: '#fff',
      alignItems: 'center',
      padding: '56px 72px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/aperture-white-horizontal.png",
    style: {
      width: 260
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      font: 'var(--type-caption)',
      fontStyle: 'italic',
      color: 'var(--text-secondary-on-dark)'
    }
  }, "Full-bleed architectural photograph at dusk. Supply imagery; none shipped with this kit."), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display)',
      fontSize: 38,
      textAlign: 'center',
      margin: '0 0 40px'
    }
  }, /*#__PURE__*/React.createElement("em", {
    style: {
      color: 'var(--ag-blue)',
      fontStyle: 'normal'
    }
  }, "Luxury"), " without ", /*#__PURE__*/React.createElement("em", null, "limits."), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", {
    style: {
      color: 'var(--ag-blue)',
      fontStyle: 'normal'
    }
  }, "Global reach"), " without ", /*#__PURE__*/React.createElement("em", null, "boundaries.")), /*#__PURE__*/React.createElement(SectionLabel, {
    onDark: true,
    wide: true
  }, "APERTUREGLOBAL.COM"));
}
function DeckDivider() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...P,
      background: 'var(--ag-black)',
      color: '#fff',
      padding: '56px 72px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 190,
      height: 170
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/aperture-white-vertical.png",
    style: {
      width: 420,
      position: 'absolute',
      top: -90,
      left: -130,
      opacity: .28,
      filter: 'brightness(.9)',
      clipPath: 'inset(0 0 34% 0)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 76,
      left: 56,
      font: 'var(--type-body-strong)',
      fontSize: 15,
      letterSpacing: '.1em'
    }
  }, "0", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ag-blue)'
    }
  }, "1"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      marginBottom: 110
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 3,
      background: 'var(--ag-blue)'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display)',
      fontSize: 44,
      margin: '0 0 20px'
    }
  }, /*#__PURE__*/React.createElement("em", null, "Why"), " Aperture", /*#__PURE__*/React.createElement("br", null), "Global"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      maxWidth: '46ch',
      color: 'rgba(255,255,255,.8)',
      margin: 0
    }
  }, "How Aperture Global brings together experienced leadership, a global collective of real estate advisors and elevated marketing to create an experience defined by precision and discretion."))));
}
function DeckFoundation() {
  const {
    SectionLabel,
    PageFooter
  } = DS();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...P,
      background: '#fff',
      color: 'var(--ag-ink)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '56px 72px 40px',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    dash: true,
    accent: true
  }, "The Foundation"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display)',
      margin: '22px 0 20px'
    }
  }, "Built on the ", /*#__PURE__*/React.createElement("em", {
    style: {
      color: 'var(--ag-blue)'
    }
  }, "fastest-growing"), " brokerage in history."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      maxWidth: '52ch'
    }
  }, "Aperture Global is the international luxury arm of LPT Holdings, the technology-driven brokerage platform that, in just three years, broke into the top six of the RealTrends Verified Brokerage Rankings and now operates across all fifty U.S. states and Canada."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 72,
      marginTop: 48
    }
  }, [["#1", "Fastest-growing real estate company*"], ["#2", "Fastest-growing technology company**"], ["3yrs", "Became the sixth largest U.S. brokerage***"]].map(([v, l]) => /*#__PURE__*/React.createElement("div", {
    key: v,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-stat)',
      fontSize: 58,
      fontStyle: 'italic',
      color: 'var(--ag-blue)'
    }
  }, v), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '.2em',
      maxWidth: 150,
      lineHeight: 1.7
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ag-navy)',
      color: '#fff',
      padding: '40px 72px',
      display: 'flex',
      gap: 28,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-strong)',
      fontSize: 15,
      letterSpacing: '.06em',
      flexShrink: 0
    }
  }, "HOUSINGWIRE"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      alignSelf: 'stretch',
      background: 'var(--ag-blue)'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-display-sm)',
      fontSize: 21,
      fontStyle: 'italic'
    }
  }, "\u201COur team was up in arms with LPT because their growth was just incredible.\u201D"), /*#__PURE__*/React.createElement(SectionLabel, {
    onDark: true,
    style: {
      marginTop: 10
    }
  }, "\u2014 Mark Adams \xB7 SVP, Housingwire Real Estate Group"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 72px'
    }
  }, /*#__PURE__*/React.createElement(PageFooter, {
    left: "Why Aperture Global \xB7 Section 01",
    right: "THE FOUNDATION"
  })));
}
function DeckNews() {
  const {
    SectionLabel,
    PressCard,
    PageFooter
  } = DS();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...P,
      background: '#fff',
      color: 'var(--ag-ink)',
      padding: '56px 72px'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    dash: true,
    accent: true
  }, "In the News"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display)',
      margin: '22px 0 40px'
    }
  }, "A Global Collective, Noticed"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '40px 56px'
    }
  }, /*#__PURE__*/React.createElement(PressCard, {
    source: "Realtor.com \xB7 Celebrity",
    headline: "Steelers star Jalen Ramsey sells his Nashville condo for $3.75M, a $1.6M profit.",
    teaser: "Pittsburgh Steelers cornerback Jalen Ramsey has sold his luxury Nashville condo, highlighting the..."
  }), /*#__PURE__*/React.createElement(PressCard, {
    source: "Mansion Global",
    headline: "A 15-bedroom Florida mansion with spa and arcade sells for $14.245M, an Osceola County record.",
    teaser: "A luxury megamansion just south of Disney World in Osceola County has sold for a record-breaking price..."
  }), /*#__PURE__*/React.createElement(PressCard, {
    source: "Housingwire",
    headline: "LPT Launches International Luxury Brand Aperture Global",
    teaser: "LPT Holdings announces the launch of Aperture Global Real Estate, LPT's new independent global luxury brand..."
  }), /*#__PURE__*/React.createElement(PressCard, {
    source: "Real Estate News",
    headline: "The 2nd-fastest-growing tech company? It's a real estate firm.",
    teaser: "With revenue up nearly 30,000% over three years, LPT Aperture Holdings took second place in Deloitte's 2025 Technology Fast 500..."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto'
    }
  }, /*#__PURE__*/React.createElement(PageFooter, {
    left: "Why Aperture Global \xB7 Section 01",
    right: "IN THE NEWS"
  })));
}
Object.assign(window, {
  AgDeckCover: DeckCover,
  AgDeckDivider: DeckDivider,
  AgDeckFoundation: DeckFoundation,
  AgDeckNews: DeckNews
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/listing_presentation/DeckPages.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.MarketBar = __ds_scope.MarketBar;

__ds_ns.PageFooter = __ds_scope.PageFooter;

__ds_ns.PressCard = __ds_scope.PressCard;

__ds_ns.PropertyCard = __ds_scope.PropertyCard;

__ds_ns.SectionLabel = __ds_scope.SectionLabel;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

})();
