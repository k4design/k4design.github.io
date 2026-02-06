/**
 * Email Signature Generator - Application logic
 * Vanilla JS, no frameworks. Runs entirely in the browser.
 */

(function () {
  'use strict';

  // --- State ---
  let currentTemplate = 'figma';
  let headshotDataUrl = '';
  let logoDataUrl = '';

  // --- DOM refs (set in init) ---
  let form, previewInner, outputCode;
  let templateTabs, templateDesc;
  let brandColor, brandColorText, useHostedUrls;

  const TEMPLATE_DESCRIPTIONS = {
    figma: 'Dark card layout: circular headshot, name & title, vertical divider, company logo, phone/email, disclaimer, social links.',
    aperture_dark_luxury: 'Luxury dark signature: circular headshot, name & uppercase title, vertical divider, company logo + wordmark + tagline, social icons top-right, disclaimer below.',
    classic: 'Image on the left, contact details on the right. Works well in most email clients.',
    modern: 'Stacked, centered layout with minimal styling. Clean and professional.',
    compact: 'Tight spacing, no image emphasis. Ideal when space is limited.'
  };

  // --- Helpers: HTML escaping ---
  function escapeHtml(str) {
    if (str == null || str === '') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    if (str == null || str === '') return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // --- Helpers: Validation (gentle, inline hints) ---
  function validateEmail(email) {
    if (!email) return { valid: true };
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return { valid: re.test(email), message: re.test(email) ? '' : 'Enter a valid email address' };
  }

  function validateUrl(value, emptyOk) {
    if (!value) return { valid: emptyOk, message: '' };
    try {
      new URL(value);
      return { valid: true, message: '' };
    } catch (_) {
      return { valid: false, message: 'Enter a valid URL' };
    }
  }

  function formatPhoneDisplay(value) {
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length <= 3) return digits.replace(/(\d{1,3})/, '($1');
    if (digits.length <= 6) return digits.replace(/(\d{3})(\d{1,3})/, '($1) $2');
    return digits.replace(/(\d{3})(\d{3})(\d{1,4})/, '($1) $2-$3');
  }

  // --- Get current form values (for signature HTML) ---
  function getFormData() {
    const useHosted = useHostedUrls && useHostedUrls.checked;
    return {
      fullName: form.fullName.value.trim(),
      title: form.title.value.trim(),
      company: form.company.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      website: form.website.value.trim(),
      address: form.address.value.trim(),
      linkedin: form.linkedin.value.trim(),
      instagram: form.instagram.value.trim(),
      facebook: form.facebook ? form.facebook.value.trim() : '',
      twitter: form.twitter ? form.twitter.value.trim() : '',
      disclaimer: form.disclaimer ? form.disclaimer.value.trim() : '',
      equalHousingUrl: form.equalHousingUrl ? form.equalHousingUrl.value.trim() : '',
      companyTagline: form.companyTagline ? form.companyTagline.value.trim() : '',
      facebookIconUrl: form.facebookIconUrl ? form.facebookIconUrl.value.trim() : '',
      twitterIconUrl: form.twitterIconUrl ? form.twitterIconUrl.value.trim() : '',
      linkedinIconUrl: form.linkedinIconUrl ? form.linkedinIconUrl.value.trim() : '',
      brandColor: brandColor.value || '#2563eb',
      fontFamily: form.fontFamily.value || 'Arial, sans-serif',
      headshotSrc: useHosted && form.headshotUrl.value.trim() ? form.headshotUrl.value.trim() : headshotDataUrl,
      logoSrc: useHosted && form.logoUrl.value.trim() ? form.logoUrl.value.trim() : logoDataUrl
    };
  }

  // --- Build signature HTML (table-based, inline styles only) ---
  function buildSignatureHTML(template, data) {
    const c = data.brandColor;
    const font = data.fontFamily;
    const cellStyle = 'padding:0 8px 4px 0; vertical-align:top; font-family:' + font + '; font-size:13px; line-height:1.4; color:#333333;';
    const linkStyle = 'color:' + c + '; text-decoration:none;';
    const nameStyle = 'font-family:' + font + '; font-size:16px; font-weight:bold; color:#111111; line-height:1.3;';

    function link(href, text) {
      if (!href) return escapeHtml(text || '');
      return '<a href="' + escapeAttr(href) + '" style="' + linkStyle + '">' + escapeHtml(text || href) + '</a>';
    }

    function row(label, value) {
      if (!value) return '';
      return '<tr><td style="' + cellStyle + '">' + escapeHtml(value) + '</td></tr>';
    }

    function rowLink(label, href, displayText) {
      if (!href) return '';
      return '<tr><td style="' + cellStyle + '">' + link(href, displayText || href) + '</td></tr>';
    }

    const hasHeadshot = !!(data.headshotSrc);
    const hasLogo = !!(data.logoSrc);
    const hasImage = hasHeadshot || hasLogo;

    // --- Aperture Dark Luxury: matches Aperture Global Real Estate dark luxury signature (table + inline only) ---
    if (template === 'aperture_dark_luxury') {
      const bg = '#0d0d0d';
      const white = '#ffffff';
      const whiteMuted = 'rgba(255,255,255,0.4)';
      const pad = '12px';
      const fontSafe = 'Arial, Helvetica, sans-serif';
      const linkStyleA = 'color:' + white + '; text-decoration:none;';
      function linkA(href, text) {
        if (!href) return escapeHtml(text || '');
        return '<a href="' + escapeAttr(href) + '" style="' + linkStyleA + '">' + escapeHtml(text || href) + '</a>';
      }
      function socialIconA(href, iconUrl, alt) {
        if (!href) return '';
        if (iconUrl) return '<a href="' + escapeAttr(href) + '" style="text-decoration:none;"><img src="' + escapeAttr(iconUrl) + '" alt="' + escapeAttr(alt || '') + '" width="15" height="15" style="display:inline-block; width:15px; height:15px; border:0; vertical-align:middle;" /></a>';
        return linkA(href, alt);
      }
      // Left column: headshot 90x90 circle
      let headshotTd = '<td style="padding:0 16px 0 0; vertical-align:top; width:90px;">&nbsp;</td>';
      if (hasHeadshot) {
        headshotTd = '<td style="padding:0 16px 0 0; vertical-align:top; width:90px;"><img src="' + escapeAttr(data.headshotSrc) + '" alt="" width="90" height="90" style="display:block; width:90px; height:90px; border-radius:50%;" /></td>';
      }
      // Name: large bold white
      const nameBlock = data.fullName
        ? '<span style="font-family:' + fontSafe + '; font-size:16px; font-weight:bold; color:' + white + '; line-height:1.3;">' + escapeHtml(data.fullName) + '</span>'
        : '';
      // Title: uppercase, letter-spacing, smaller (letter-spacing in px for email)
      const titleBlock = data.title
        ? '<br/><span style="font-family:' + fontSafe + '; font-size:12px; color:' + white + '; letter-spacing:0.08em; text-transform:uppercase; line-height:1.5;">' + escapeHtml(data.title) + '</span>'
        : '';
      const nameTitleCell = '<td style="padding:0 16px 0 0; vertical-align:top; font-family:' + fontSafe + ';">' + (nameBlock || titleBlock ? nameBlock + titleBlock : '&nbsp;') + '</td>';
      const vertLineTd = '<td style="padding:0 16px 0 0; width:1px; background-color:' + white + '; vertical-align:top;">&nbsp;</td>';
      // Right column: logo 125x69, then company name, tagline, socials
      let rightTop = '';
      if (hasLogo) {
        rightTop += '<img src="' + escapeAttr(data.logoSrc) + '" alt="" width="125" height="69" style="display:block; max-width:125px; max-height:69px; padding-bottom:6px;" />';
      }
      if (data.company) {
        rightTop += '<span style="font-family:' + fontSafe + '; font-size:14px; font-weight:bold; color:' + white + '; text-transform:uppercase; letter-spacing:0.02em;">' + escapeHtml(data.company) + '</span>';
      }
      if (data.companyTagline) {
        rightTop += '<br/><span style="font-family:' + fontSafe + '; font-size:11px; color:' + white + '; text-transform:uppercase; letter-spacing:0.08em;">' + escapeHtml(data.companyTagline) + '</span>';
      }
      const socialParts = [];
      if (data.facebook) socialParts.push(socialIconA(data.facebook, data.facebookIconUrl, 'Facebook'));
      if (data.twitter) socialParts.push(socialIconA(data.twitter, data.twitterIconUrl, 'Twitter'));
      if (data.linkedin) socialParts.push(socialIconA(data.linkedin, data.linkedinIconUrl, 'LinkedIn'));
      if (socialParts.length) {
        rightTop += '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin-top:8px;"><tr><td style="font-family:' + fontSafe + '; text-align:right;">' + socialParts.join('<span style="padding:0 7px;"> </span>') + '</td></tr></table>';
      }
      const rightCell = '<td style="padding:0; vertical-align:top; width:125px;">' + (rightTop || '&nbsp;') + '</td>';
      const row1 = '<tr>' + headshotTd + nameTitleCell + vertLineTd + rightCell + '</tr>';
      const spacer90 = '<td style="vertical-align:top; width:90px;">&nbsp;</td>';
      const spacerLine = '<td style="vertical-align:top; width:1px;">&nbsp;</td>';
      const spacerRight = '<td style="vertical-align:top; width:125px;">&nbsp;</td>';
      const contactStyle = 'padding:2px 16px 0 0; vertical-align:top; font-family:' + fontSafe + '; font-size:13px; color:' + white + ';';
      const row2 = '<tr>' + spacer90 + '<td style="' + contactStyle + '">' + (data.phone ? linkA('tel:' + data.phone.replace(/\D/g, ''), data.phone) : '&nbsp;') + '</td>' + spacerLine + spacerRight + '</tr>';
      const row3 = '<tr>' + spacer90 + '<td style="' + contactStyle + '">' + (data.email ? linkA('mailto:' + data.email, data.email) : '&nbsp;') + '</td>' + spacerLine + spacerRight + '</tr>';
      const row4 = '<tr>' + spacer90 + '<td style="' + contactStyle + '">' + (data.website ? linkA(data.website, data.website) : '&nbsp;') + '</td>' + spacerLine + spacerRight + '</tr>';
      const row5Divider = '<tr><td colspan="4" style="padding:12px 0 0; border-top:1px solid ' + whiteMuted + ';">&nbsp;</td></tr>';
      const ehoImg = data.equalHousingUrl
        ? '<img src="' + escapeAttr(data.equalHousingUrl) + '" alt="Equal Housing Opportunity" width="18" height="19" style="display:block; width:18px; height:19px;" />'
        : '';
      const ehoTd = '<td style="padding:8px 8px 0 0; vertical-align:top; width:18px;">' + (ehoImg || '&nbsp;') + '</td>';
      const disclaimerTd = '<td colspan="3" style="padding:8px 0 0; vertical-align:top; font-family:' + fontSafe + '; font-size:11px; line-height:1.45; color:rgba(255,255,255,0.85);">' + (data.disclaimer ? escapeHtml(data.disclaimer) : '&nbsp;') + '</td>';
      const row6 = '<tr>' + ehoTd + disclaimerTd + '</tr>';
      const inner = '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' + row1 + row2 + row3 + row4 + row5Divider + row6 + '</table>';
      return '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; font-family:' + fontSafe + '; background-color:' + bg + '; border-radius:12px; max-width:656px;"><tr><td style="padding:' + pad + '; border-radius:12px;">' + inner + '</td></tr></table>';
    }

    // --- Figma "Signature with logo" template: dark card, circular headshot, vertical divider, company logo, disclaimer, social ---
    if (template === 'figma') {
      const bg = '#1a1a1a';
      const white = '#ffffff';
      const whiteMuted = 'rgba(255,255,255,0.4)';
      const pad = '12px';
      const fontFigma = data.fontFamily;
      const linkStyleFigma = 'color:' + white + '; text-decoration:none;';
      function linkFigma(href, text) {
        if (!href) return escapeHtml(text || '');
        return '<a href="' + escapeAttr(href) + '" style="' + linkStyleFigma + '">' + escapeHtml(text || href) + '</a>';
      }
      // Headshot cell (90x90 circle)
      let headshotCell = '<td style="padding:0 ' + pad + ' 0 0; vertical-align:top; width:90px;">&nbsp;</td>';
      if (hasHeadshot) {
        headshotCell = '<td style="padding:0 ' + pad + ' 0 0; vertical-align:top; width:90px;"><img src="' + escapeAttr(data.headshotSrc) + '" alt="" width="90" height="90" style="display:block; width:90px; height:90px; border-radius:50%;" /></td>';
      }
      // Name + title
      let nameTitle = '';
      if (data.fullName) nameTitle += '<span style="font-family:' + fontFigma + '; font-size:15px; font-weight:bold; color:' + white + '; line-height:1.3;">' + escapeHtml(data.fullName) + '</span>';
      if (data.title) nameTitle += (nameTitle ? '<br/>' : '') + '<span style="font-family:' + fontFigma + '; font-size:13px; color:' + white + ';">' + escapeHtml(data.title) + '</span>';
      const nameTitleCell = '<td style="padding:0 ' + pad + ' 0 0; vertical-align:top; font-family:' + fontFigma + ';">' + (nameTitle || '&nbsp;') + '</td>';
      // Vertical line (1px white)
      const lineCell = '<td style="padding:0 ' + pad + ' 0 0; width:1px; background-color:' + white + '; vertical-align:top;">&nbsp;</td>';
      // Company logo (125x69)
      let logoCell = '<td style="padding:0; vertical-align:top; width:125px;">&nbsp;</td>';
      if (hasLogo) {
        logoCell = '<td style="padding:0; vertical-align:top; width:125px;"><img src="' + escapeAttr(data.logoSrc) + '" alt="" width="125" height="69" style="display:block; max-width:125px; max-height:69px;" /></td>';
      }
      const row1 = '<tr>' + headshotCell + nameTitleCell + lineCell + logoCell + '</tr>';
      const phoneCell = data.phone
        ? '<td style="padding:4px ' + pad + ' 0 0; vertical-align:top; font-family:' + fontFigma + '; font-size:13px;"><span style="color:' + white + ';">' + linkFigma('tel:' + data.phone.replace(/\D/g, ''), data.phone) + '</span></td>'
        : '<td style="padding:4px ' + pad + ' 0 0; vertical-align:top;">&nbsp;</td>';
      const spacer = '<td style="vertical-align:top; width:90px;">&nbsp;</td>';
      const row2 = '<tr>' + spacer + phoneCell + '<td style="vertical-align:top;">&nbsp;</td><td style="vertical-align:top;">&nbsp;</td></tr>';
      const emailCell = data.email
        ? '<td style="padding:2px ' + pad + ' 0 0; vertical-align:top; font-family:' + fontFigma + '; font-size:13px;"><span style="color:' + white + ';">' + linkFigma('mailto:' + data.email, data.email) + '</span></td>'
        : '<td style="padding:2px ' + pad + ' 0 0; vertical-align:top;">&nbsp;</td>';
      const row3 = '<tr>' + spacer + emailCell + '<td style="vertical-align:top;">&nbsp;</td><td style="vertical-align:top;">&nbsp;</td></tr>';
      const row4 = '<tr><td colspan="4" style="padding:12px 0 0; border-top:1px solid ' + whiteMuted + ';">&nbsp;</td></tr>';
      const ehoImg = data.equalHousingUrl
        ? '<img src="' + escapeAttr(data.equalHousingUrl) + '" alt="Equal Housing Opportunity" width="18" height="19" style="display:block; width:18px; height:19px;" />'
        : '';
      const ehoCell = '<td style="padding:8px ' + pad + ' 0 0; vertical-align:top; width:18px;">' + (ehoImg || '&nbsp;') + '</td>';
      const disclaimerCell = '<td colspan="3" style="padding:8px 0 0; vertical-align:top; font-family:' + fontFigma + '; font-size:11px; line-height:1.4; color:' + white + ';">' + (data.disclaimer ? escapeHtml(data.disclaimer) : '&nbsp;') + '</td>';
      const row5 = '<tr>' + ehoCell + disclaimerCell + '</tr>';
      const socialLinks = [];
      if (data.facebook) socialLinks.push(linkFigma(data.facebook, 'Facebook'));
      if (data.twitter) socialLinks.push(linkFigma(data.twitter, 'Twitter'));
      if (data.linkedin) socialLinks.push(linkFigma(data.linkedin, 'LinkedIn'));
      if (data.instagram) socialLinks.push(linkFigma(data.instagram, 'Instagram'));
      const socialCell = socialLinks.length
        ? '<td colspan="3" style="padding:8px 0 0; vertical-align:top; text-align:right; font-family:' + fontFigma + '; font-size:12px;">' + socialLinks.join(' &nbsp;|&nbsp; ') + '</td>'
        : '<td colspan="3" style="padding:8px 0 0;">&nbsp;</td>';
      const row6 = '<tr>' + spacer + socialCell + '</tr>';
      const inner = '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' + row1 + row2 + row3 + row4 + row5 + row6 + '</table>';
      return '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; font-family:' + fontFigma + '; background-color:' + bg + '; border-radius:12px; max-width:656px;"><tr><td style="padding:' + pad + '; border-radius:12px;">' + inner + '</td></tr></table>';
    }

    if (template === 'classic') {
      // Classic: image left, text right (table-based for email clients)
      let imgCell = '';
      if (hasHeadshot) {
        imgCell = '<td style="padding:0 16px 0 0; vertical-align:top;"><img src="' + escapeAttr(data.headshotSrc) + '" alt="" width="80" height="80" style="display:block; width:80px; height:80px; border-radius:4px;" /></td>';
      } else if (hasLogo) {
        imgCell = '<td style="padding:0 16px 0 0; vertical-align:top;"><img src="' + escapeAttr(data.logoSrc) + '" alt="" width="80" height="80" style="display:block; max-width:80px; max-height:80px;" /></td>';
      }

      let rows = '';
      if (data.fullName) rows += '<tr><td style="' + nameStyle + ' padding-bottom:2px;">' + escapeHtml(data.fullName) + '</td></tr>';
      if (data.title) rows += row('', data.title);
      if (data.company) rows += row('', data.company);
      if (data.email) rows += rowLink('', 'mailto:' + data.email, data.email);
      if (data.phone) rows += rowLink('', 'tel:' + data.phone.replace(/\D/g, ''), data.phone);
      if (data.website) rows += rowLink('', data.website, data.website);
      if (data.address) rows += row('', data.address);
      if (data.linkedin) rows += rowLink('', data.linkedin, 'LinkedIn');
      if (data.instagram) rows += rowLink('', data.instagram, 'Instagram');

      const textCell = '<td style="vertical-align:top;"><table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' + rows + '</table></td>';
      const innerTable = '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>' +
        imgCell + textCell + '</tr></table>';

      if (hasLogo && hasHeadshot) {
        const logoRow = '<tr><td style="padding-bottom:8px;"><img src="' + escapeAttr(data.logoSrc) + '" alt="" style="display:block; max-width:120px; max-height:40px;" /></td></tr>';
        return '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; font-family:' + font + ';">' + logoRow + '<tr><td>' + innerTable + '</td></tr></table>';
      }
      return '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; font-family:' + font + ';"><tr><td>' + innerTable + '</td></tr></table>';
    }

    if (template === 'modern') {
      // Modern: stacked, centered, minimal
      let parts = [];
      if (hasLogo) {
        parts.push('<tr><td style="padding-bottom:12px; text-align:center;"><img src="' + escapeAttr(data.logoSrc) + '" alt="" style="display:block; max-width:140px; max-height:44px; margin:0 auto;" /></td></tr>');
      }
      if (hasHeadshot) {
        parts.push('<tr><td style="padding-bottom:12px; text-align:center;"><img src="' + escapeAttr(data.headshotSrc) + '" alt="" width="72" height="72" style="display:block; width:72px; height:72px; border-radius:50%; margin:0 auto;" /></td></tr>');
      }
      if (data.fullName) parts.push('<tr><td style="' + nameStyle + ' text-align:center; padding-bottom:4px;">' + escapeHtml(data.fullName) + '</td></tr>');
      if (data.title) parts.push('<tr><td style="' + cellStyle + ' text-align:center;">' + escapeHtml(data.title) + '</td></tr>');
      if (data.company) parts.push('<tr><td style="' + cellStyle + ' text-align:center;">' + escapeHtml(data.company) + '</td></tr>');
      if (data.email) parts.push('<tr><td style="' + cellStyle + ' text-align:center;">' + link('mailto:' + data.email, data.email) + '</td></tr>');
      if (data.phone) parts.push('<tr><td style="' + cellStyle + ' text-align:center;">' + link('tel:' + data.phone.replace(/\D/g, ''), data.phone) + '</td></tr>');
      if (data.website) parts.push('<tr><td style="' + cellStyle + ' text-align:center;">' + link(data.website, data.website) + '</td></tr>');
      if (data.address) parts.push('<tr><td style="' + cellStyle + ' text-align:center;">' + escapeHtml(data.address) + '</td></tr>');
      if (data.linkedin || data.instagram) {
        let social = [];
        if (data.linkedin) social.push(link(data.linkedin, 'LinkedIn'));
        if (data.instagram) social.push(link(data.instagram, 'Instagram'));
        parts.push('<tr><td style="' + cellStyle + ' text-align:center;">' + social.join(' &nbsp;|&nbsp; ') + '</td></tr>');
      }
      return '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin:0 auto; font-family:' + font + ';"><tr><td style="text-align:center;">' +
        '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin:0 auto;">' + parts.join('') + '</table></td></tr></table>';
    }

    // Compact: no image emphasis, tight spacing
    let compactRows = '';
    if (data.fullName) compactRows += '<tr><td style="' + nameStyle + ' padding:0 8px 2px 0;">' + escapeHtml(data.fullName) + '</td></tr>';
    if (data.title) compactRows += '<tr><td style="' + cellStyle + ' padding:0 8px 1px 0;">' + escapeHtml(data.title) + '</td></tr>';
    if (data.company) compactRows += '<tr><td style="' + cellStyle + ' padding:0 8px 1px 0;">' + escapeHtml(data.company) + '</td></tr>';
    if (data.email) compactRows += '<tr><td style="' + cellStyle + ' padding:0 8px 1px 0;">' + link('mailto:' + data.email, data.email) + '</td></tr>';
    if (data.phone) compactRows += '<tr><td style="' + cellStyle + ' padding:0 8px 1px 0;">' + link('tel:' + data.phone.replace(/\D/g, ''), data.phone) + '</td></tr>';
    if (data.website) compactRows += '<tr><td style="' + cellStyle + ' padding:0 8px 1px 0;">' + link(data.website, data.website) + '</td></tr>';
    if (data.address) compactRows += '<tr><td style="' + cellStyle + ' padding:0 8px 1px 0;">' + escapeHtml(data.address) + '</td></tr>';
    if (data.linkedin) compactRows += '<tr><td style="' + cellStyle + ' padding:0 8px 1px 0;">' + link(data.linkedin, 'LinkedIn') + '</td></tr>';
    if (data.instagram) compactRows += '<tr><td style="' + cellStyle + ' padding:0 8px 1px 0;">' + link(data.instagram, 'Instagram') + '</td></tr>';

    let compactLeft = '';
    if (hasHeadshot) {
      compactLeft = '<td style="padding:0 12px 0 0; vertical-align:top;"><img src="' + escapeAttr(data.headshotSrc) + '" alt="" width="50" height="50" style="display:block; width:50px; height:50px; border-radius:4px;" /></td>';
    } else if (hasLogo) {
      compactLeft = '<td style="padding:0 12px 0 0; vertical-align:top;"><img src="' + escapeAttr(data.logoSrc) + '" alt="" style="display:block; max-width:50px; max-height:50px;" /></td>';
    }
    const compactTable = '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>' +
      compactLeft +
      '<td><table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' + compactRows + '</table></td></tr></table>';
    return '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; font-family:' + font + ';"><tr><td>' + compactTable + '</td></tr></table>';
  }

  // --- Update preview and code output ---
  function updatePreviewAndOutput() {
    const data = getFormData();
    const html = buildSignatureHTML(currentTemplate, data);
    previewInner.innerHTML = html;
    outputCode.value = html;
    const container = document.getElementById('preview-container');
    if (container) container.classList.toggle('preview-figma', currentTemplate === 'figma' || currentTemplate === 'aperture_dark_luxury');
  }

  // --- Copy HTML to clipboard ---
  function copyHtmlToClipboard() {
    const html = outputCode.value;
    if (!html) return;
    navigator.clipboard.writeText(html).then(function () {
      showCopyFeedback(document.getElementById('copy-html-btn'), 'Copied!');
    }).catch(function () {
      fallbackCopyText(html, document.getElementById('copy-html-btn'));
    });
  }

  // --- Copy rich signature (HTML) for pasting into Gmail etc. ---
  function copyRichToClipboard() {
    const html = outputCode.value;
    if (!html) return;
    const plain = previewInner.innerText || previewInner.textContent || '';
    const blobHtml = new Blob([html], { type: 'text/html' });
    const blobPlain = new Blob([plain], { type: 'text/plain' });
    const item = new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain });
    navigator.clipboard.write([item]).then(function () {
      showCopyFeedback(document.getElementById('copy-rich-btn'), 'Rich signature copied!');
    }).catch(function () {
      fallbackCopyText(html, document.getElementById('copy-rich-btn'));
    });
  }

  function showCopyFeedback(btn, text) {
    const orig = btn.textContent;
    btn.textContent = text;
    btn.disabled = true;
    setTimeout(function () {
      btn.textContent = orig;
      btn.disabled = false;
    }, 2000);
  }

  function fallbackCopyText(text, btn) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showCopyFeedback(btn, 'Copied!');
    } catch (_) {}
    document.body.removeChild(ta);
  }

  // --- Download HTML file ---
  function downloadHtmlFile() {
    const html = outputCode.value;
    if (!html) return;
    const fullDoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Email Signature</title></head><body>' + html + '</body></html>';
    const blob = new Blob([fullDoc], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'email-signature.html';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // --- Image upload: read as data URL ---
  function readFileAsDataUrl(file, callback) {
    if (!file || !file.type.match(/^image\//)) {
      callback('');
      return;
    }
    const reader = new FileReader();
    reader.onload = function () { callback(reader.result || ''); };
    reader.onerror = function () { callback(''); };
    reader.readAsDataURL(file);
  }

  // --- Validation hints ---
  function updateHints() {
    const emailRes = validateEmail(form.email.value);
    setHint('email-hint', emailRes.message, emailRes.valid);

    setHint('website-hint', validateUrl(form.website.value, true).message, validateUrl(form.website.value, true).valid);
    setHint('linkedin-hint', validateUrl(form.linkedin.value, true).message, validateUrl(form.linkedin.value, true).valid);
    setHint('instagram-hint', validateUrl(form.instagram.value, true).message, validateUrl(form.instagram.value, true).valid);
    if (form.facebook) setHint('facebook-hint', validateUrl(form.facebook.value, true).message, validateUrl(form.facebook.value, true).valid);
    if (form.twitter) setHint('twitter-hint', validateUrl(form.twitter.value, true).message, validateUrl(form.twitter.value, true).valid);
  }

  function setHint(id, message, valid) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.className = 'hint' + (message ? (valid ? ' success' : ' error') : '');
  }

  // --- Phone display formatting (optional, non-destructive) ---
  function formatPhoneInput() {
    const input = form.phone;
    const cursor = input.selectionStart;
    const oldLen = input.value.length;
    const formatted = formatPhoneDisplay(input.value);
    if (formatted === input.value) return;
    input.value = formatted;
    const newLen = input.value.length;
    const newCursor = Math.max(0, cursor + (newLen - oldLen));
    input.setSelectionRange(newCursor, newCursor);
  }

  // --- Reset ---
  function resetForm() {
    form.reset();
    brandColor.value = '#2563eb';
    brandColorText.value = '#2563eb';
    if (form.useHostedUrls) form.useHostedUrls.checked = false;
    headshotDataUrl = '';
    logoDataUrl = '';
    currentTemplate = 'figma';
    templateTabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-template') === 'figma');
      t.setAttribute('aria-selected', t.getAttribute('data-template') === 'figma');
    });
    templateDesc.textContent = TEMPLATE_DESCRIPTIONS.figma;
    document.querySelectorAll('.hint').forEach(function (h) { h.textContent = ''; h.className = 'hint'; });
    updatePreviewAndOutput();
  }

  // --- Init ---
  function init() {
    form = document.getElementById('signature-form');
    previewInner = document.getElementById('preview-inner');
    outputCode = document.getElementById('output-code');
    templateTabs = Array.from(document.querySelectorAll('.template-tab'));
    templateDesc = document.getElementById('template-desc');
    brandColor = document.getElementById('brandColor');
    brandColorText = document.getElementById('brandColorText');
    useHostedUrls = document.getElementById('useHostedUrls');

    if (!form || !previewInner || !outputCode) return;

    // Template tabs
    templateTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentTemplate = tab.getAttribute('data-template');
        templateTabs.forEach(function (t) {
          t.classList.toggle('active', t === tab);
          t.setAttribute('aria-selected', t === tab);
        });
        templateDesc.textContent = TEMPLATE_DESCRIPTIONS[currentTemplate] || '';
        updatePreviewAndOutput();
      });
    });

    // Form inputs: live update
    form.addEventListener('input', function () {
      updatePreviewAndOutput();
      updateHints();
    });
    form.addEventListener('change', function () {
      updatePreviewAndOutput();
      updateHints();
    });

    // Phone format on blur
    form.phone.addEventListener('blur', formatPhoneInput);

    // Color picker sync
    brandColor.addEventListener('input', function () {
      brandColorText.value = brandColor.value;
      updatePreviewAndOutput();
    });
    brandColorText.addEventListener('input', function () {
      if (/^#[0-9A-Fa-f]{6}$/.test(brandColorText.value)) {
        brandColor.value = brandColorText.value;
        updatePreviewAndOutput();
      }
    });

    // File uploads
    form.headshot.addEventListener('change', function () {
      const file = form.headshot.files[0];
      readFileAsDataUrl(file, function (data) {
        headshotDataUrl = data;
        updatePreviewAndOutput();
      });
    });
    form.logo.addEventListener('change', function () {
      const file = form.logo.files[0];
      readFileAsDataUrl(file, function (data) {
        logoDataUrl = data;
        updatePreviewAndOutput();
      });
    });

    // Buttons
    document.getElementById('reset-btn').addEventListener('click', resetForm);
    document.getElementById('copy-html-btn').addEventListener('click', copyHtmlToClipboard);
    document.getElementById('copy-rich-btn').addEventListener('click', copyRichToClipboard);
    document.getElementById('download-btn').addEventListener('click', downloadHtmlFile);

    updatePreviewAndOutput();
    updateHints();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
