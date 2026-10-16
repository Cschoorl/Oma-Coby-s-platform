/**
 * Oma Coby's Oliebollenbar — dashboard backend (Google Apps Script).
 *
 * Plak dit bestand in de Google Sheet via Extensies → Apps Script, vul CONFIG en
 * de Script-eigenschappen in en publiceer als web-app (zie apps-script/README.md).
 *
 * Het dashboard schrijft nooit in het tabblad met bestellingen: alle dashboardgegevens
 * (claims, opmerkingen, bevestigingen, aanmeldingen, kosten) staan in eigen tabbladen.
 */

const CONFIG = {
  /** Tabblad met de bestellingen (zakelijk, particulier en barter samen). */
  ORDERS_SHEET: 'Totaal_lijst bestellingen',
  /**
   * Seizoen voor datums zonder jaartal ("18 december"); januari telt als het jaar erna.
   * Normaal leidt het script het seizoen af uit de tijdstempels (Unique ID) in het blad;
   * dit jaar wordt alleen gebruikt als die er niet zijn.
   */
  SEASON_YEAR: 2026,
  /**
   * Kolomkoppen in het bestellingen-tabblad per veld. Meerdere namen mogen; de eerste
   * die bestaat wordt gebruikt. Niet-hoofdlettergevoelig, exacte kop.
   */
  COLUMNS: {
    order_id: ['unique id', 'order_id', 'ordernummer', 'bestelnummer'],
    leverdatum: ['datum', 'leverdatum', 'bezorgdatum'],
    leverancier_naam: ['bezorger', 'leverancier_naam'],
    locatie_naam: ['naam onderneming', 'locatie_naam', 'naam'],
    contactpersoon: ['contactpersoon'],
    telefoon: ['contactpersoon telefoonnummer', 'telefoon', 'telefoonnummer'],
    email: ['email', 'e-mail', 'emailadres', 'info'],
    adres: ['bezorglocatie', 'adres', 'straat'],
    postcode: ['postcode'],
    plaats: ['plaats', 'woonplaats'],
    geplande_tijd: ['geplande_tijd', 'tijd', 'bezorgtijd'],
    status: ['status'],
    oliebollen_met_krenten: ['met krenten', 'oliebollen_met_krenten', 'met'],
    oliebollen_zonder_krenten: ['zonder krenten', 'oliebollen_zonder_krenten', 'zonder'],
    extra_notities: ['comments', 'extra_notities', 'opmerkingen', 'opmerking'],
    type_klant: ['type', 'type_klant', 'klanttype'],
    bedrag: ['bedrag', 'totaalbedrag', 'total'],
    besteldatum: ['besteldatum', 'unique id', 'tijdstempel', 'timestamp'],
    afhalen_bezorgen: ['afhalen/bezorgen'],
    afhaallocatie: ['pick up locatie', 'afhaallocatie'],
    flyers: ['flyers'],
    dozen_of_zakjes: ['dozen of zakjes'],
    aantal_dozen: ['dozen #'],
    aantal_zakjes: ['zakjes #'],
    bezorgomgeving: ['bezorgomgeving'],
    bezorgmoment: ['bezorgmoment']
  },
  /** Startpunt (en eindpunt) van elke bezorgroute. */
  START_ADDRESS: 'Aalsmeerderweg 85, Aalsmeer',
  /** Route eindigt weer bij de baklocatie. */
  ROUND_TRIP: true,
  /** Afzendernaam van de klantbevestiging. */
  MAIL_SENDER_NAME: "Oma Coby's Oliebollenbar",
  /** Map in Google Drive voor foto's van bonnen. */
  RECEIPT_FOLDER: 'Oliebollen bonnen',
  /** Claude-model voor het uitlezen van bonnen. */
  CLAUDE_MODEL: 'claude-opus-5-5',
  /**
   * Aanmeldingen van vrijwilligers: het antwoordenblad van het Google Formulier.
   * Staat het in een ander bestand, zet dan de Script-eigenschap VOLUNTEERS_SPREADSHEET_ID
   * (het lange ID uit de URL). Zonder die eigenschap wordt dit bestand gebruikt.
   */
  VOLUNTEERS_SHEET: 'Formulierreacties 1',
  /** Kolomkoppen van het formulier. Een kop telt als hij precies zo is of zo begint. */
  VOLUNTEER_COLUMNS: {
    timestamp: ['tijdstempel'],
    name: ['naam + achternaam', 'naam'],
    city: ['woonplaats'],
    phone: ['telefoonnummer', 'telefoon'],
    email: ['emailadres', 'e-mailadres'],
    inpakken: ['wil je helpen inpakken'],
    inpakkenDays: ['op welke dag(en) wil je helpen inpakken'],
    fietskoerier: ['wil je helpen als fietskoerier'],
    cargoBike: ['kan je een bakfiets lenen'],
    fietskoerierDays: ['op welke dag(en) kan je helpen als fietskoerier', 'op welke dag(en) wil je helpen als fietskoerier'],
    autokoerier: ['wil je helpen als autokoerier'],
    autokoerierDays: ['op welke dag(en) wil je helpen als autokoerier', 'op welke dag(en) kan je helpen als autokoerier'],
    oliebollenbar: ['wil je helpen in de oliebollenbar'],
    oliebollenbarDays: ['op welke dag(en) wil je helpen in de oliebollenbar'],
    remark: ['wil je nog iets kwijt']
  }
};

const VOLUNTEER_ROLES = ['inpakken', 'fietskoerier', 'autokoerier', 'oliebollenbar'];

/** Headers used when the form tab does not exist yet (same as the 2025 form). */
const VOLUNTEER_DEFAULT_HEADERS = [
  'Tijdstempel', 'Wil je helpen inpakken?', 'Op welke dag(en) wil je helpen inpakken?',
  'Wil je helpen als fietskoerier?', 'Kan je een bakfiets lenen van iemand?', 'Op welke dag(en) kan je helpen als fietskoerier?',
  'Wil je helpen als autokoerier?', 'Op welke dag(en) wil je helpen als autokoerier?',
  'Wil je helpen in de Oliebollenbar?', 'Op welke dag(en) wil je helpen in de Oliebollenbar?',
  'Naam + achternaam', 'Woonplaats', 'Telefoonnummer', 'Emailadres', 'Wil je nog iets kwijt? Opmerkingen, vragen, ideeën, suggesties ?'
];

/*
 * Script-eigenschappen (Projectinstellingen → Script-eigenschappen):
 *   CODE_BEHEER, CODE_INPAKKER, CODE_BEZORGER  — toegangscodes per rol
 *   ANTHROPIC_API_KEY                          — voor het uitlezen van bonnen
 */

const TABS = {
  meta: ['Dashboard_Orders', ['order_id', 'opmerking_status', 'opmerking_aangepast', 'bevestiging_tekst', 'bevestiging_status', 'bevestiging_verzonden_op', 'bezorger', 'bijgewerkt_door', 'bijgewerkt_op']],
  packing: ['Inpakken', ['order_id', 'geclaimd_door', 'geclaimd_op', 'met_klaar', 'zonder_klaar', 'totaal_klaar', 'ingepakt_door', 'ingepakt_op']],
  baked: ['Gebakken', ['leverdatum', 'met_krenten', 'zonder_krenten', 'bijgewerkt_op']],
  routes: ['Routes', ['sleutel', 'leverdatum', 'bezorger', 'vervoer', 'km', 'minuten', 'volgorde', 'maps_url', 'berekend_op']],
  costs: ['Kosten', ['id', 'ingevoerd_op', 'ingevoerd_door', 'datum', 'bedrag', 'leverancier', 'omschrijving', 'foto_url']],
  history: ['Historie', ['jaar', 'datum', 'bestellingen', 'oliebollen', 'omzet']],
  settings: ['Instellingen', ['sleutel', 'waarde']]
};

const PERMISSIONS = {
  state: ['beheer', 'inpakker', 'bezorger'],
  version: ['beheer', 'inpakker', 'bezorger'],
  claim: ['beheer', 'inpakker'],
  release: ['beheer', 'inpakker'],
  checkPart: ['beheer', 'inpakker'],
  complete: ['beheer', 'inpakker'],
  setBaked: ['beheer', 'inpakker'],
  updateNote: ['beheer'],
  saveConfirmation: ['beheer'],
  sendConfirmation: ['beheer'],
  computeRoute: ['beheer'],
  assignCourier: ['beheer'],
  extractReceipt: ['beheer', 'inpakker', 'bezorger'],
  saveCost: ['beheer', 'inpakker', 'bezorger'],
  registerVolunteer: ['public'],
  login: ['public']
};

// ---------------------------------------------------------------------------
// HTTP

function doGet() {
  return json_({ ok: true, message: 'Oma Coby dashboard API. Gebruik POST.' });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(body.action || '');
    const allowed = PERMISSIONS[action];
    if (!allowed) return json_({ ok: false, error: 'Onbekende actie: ' + action });

    const role = roleForCode_(body.code);
    if (allowed.indexOf('public') === -1 && (!role || allowed.indexOf(role) === -1)) {
      return json_({ ok: false, error: 'Geen toegang. Controleer je toegangscode.' });
    }

    const handler = HANDLERS[action];
    return json_({ ok: true, data: handler(body, role) });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function roleForCode_(code) {
  const value = String(code || '').trim();
  if (!value) return null;
  const props = PropertiesService.getScriptProperties();
  if (value === props.getProperty('CODE_BEHEER')) return 'beheer';
  if (value === props.getProperty('CODE_INPAKKER')) return 'inpakker';
  if (value === props.getProperty('CODE_BEZORGER')) return 'bezorger';
  return null;
}

const HANDLERS = {
  login: function (body) {
    const role = roleForCode_(body.code);
    if (!role) throw new Error('Onbekende toegangscode.');
    return { role: role };
  },
  version: function () {
    return { version: getVersion_() };
  },
  state: function (body, role) {
    return buildState_(role);
  },
  claim: function (body) {
    return withLock_(function () {
      const name = requireName_(body.name);
      const row = findOrCreate_('packing', body.orderId);
      const current = row.values;
      if (current.ingepakt_door) throw new Error('Deze order is al ingepakt door ' + current.ingepakt_door + '.');
      if (current.geclaimd_door && current.geclaimd_door !== name) {
        throw new Error('Deze order is al geclaimd door ' + current.geclaimd_door + '.');
      }
      row.set({ geclaimd_door: name, geclaimd_op: now_() });
      return bump_();
    });
  },
  release: function (body, role) {
    return withLock_(function () {
      const name = requireName_(body.name);
      const row = findOrCreate_('packing', body.orderId);
      if (row.values.geclaimd_door && row.values.geclaimd_door !== name && role !== 'beheer') {
        throw new Error('Alleen ' + row.values.geclaimd_door + ' of beheer kan deze claim vrijgeven.');
      }
      row.set({ geclaimd_door: '', geclaimd_op: '', met_klaar: false, zonder_klaar: false, totaal_klaar: false });
      return bump_();
    });
  },
  checkPart: function (body) {
    return withLock_(function () {
      const name = requireName_(body.name);
      const column = { met: 'met_klaar', zonder: 'zonder_klaar', totaal: 'totaal_klaar' }[body.part];
      if (!column) throw new Error('Onbekend onderdeel.');
      const row = findOrCreate_('packing', body.orderId);
      if (row.values.geclaimd_door !== name) throw new Error('Claim de order eerst voordat je afvinkt.');
      if (row.values.ingepakt_door) throw new Error('Deze order is al afgerond.');
      const update = {};
      update[column] = !!body.done;
      row.set(update);
      return bump_();
    });
  },
  complete: function (body) {
    return withLock_(function () {
      const name = requireName_(body.name);
      const row = findOrCreate_('packing', body.orderId);
      const v = row.values;
      if (v.geclaimd_door !== name) throw new Error('Alleen degene die de order claimde kan afronden.');
      if (!truthy_(v.met_klaar) || !truthy_(v.zonder_klaar) || !truthy_(v.totaal_klaar)) {
        throw new Error('Vink eerst MET, ZONDER en TOTAAL af.');
      }
      row.set({ ingepakt_door: name, ingepakt_op: now_() });
      return bump_();
    });
  },
  setBaked: function (body) {
    return withLock_(function () {
      const row = findOrCreate_('baked', body.date);
      row.set({
        met_krenten: Math.max(0, Number(body.withRaisins) || 0),
        zonder_krenten: Math.max(0, Number(body.withoutRaisins) || 0),
        bijgewerkt_op: now_()
      });
      return bump_();
    });
  },
  updateNote: function (body) {
    return withLock_(function () {
      const row = findOrCreate_('meta', body.orderId);
      row.set({
        opmerking_aangepast: String(body.note || ''),
        opmerking_status: body.reviewed ? 'beoordeeld' : 'nieuw',
        bijgewerkt_door: String(body.name || ''),
        bijgewerkt_op: now_()
      });
      return bump_();
    });
  },
  saveConfirmation: function (body) {
    return withLock_(function () {
      const row = findOrCreate_('meta', body.orderId);
      if (row.values.bevestiging_status === 'verzonden' && !body.allowResend) {
        throw new Error('Deze bevestiging is al verzonden.');
      }
      row.set({
        bevestiging_tekst: String(body.text || ''),
        bevestiging_status: 'concept',
        bijgewerkt_door: String(body.name || ''),
        bijgewerkt_op: now_()
      });
      return bump_();
    });
  },
  sendConfirmation: function (body) {
    const order = findOrder_(body.orderId);
    if (!order) throw new Error('Order niet gevonden.');
    if (!order.email) throw new Error('Deze order heeft geen e-mailadres.');
    const text = String(body.text || '').trim();
    if (!text) throw new Error('De bevestiging is leeg.');
    const subject = String(body.subject || ('Bevestiging van je bestelling ' + order.order_id));
    MailApp.sendEmail({ to: order.email, subject: subject, body: text, name: CONFIG.MAIL_SENDER_NAME });
    return withLock_(function () {
      findOrCreate_('meta', body.orderId).set({
        bevestiging_tekst: text,
        bevestiging_status: 'verzonden',
        bevestiging_verzonden_op: now_(),
        bijgewerkt_door: String(body.name || ''),
        bijgewerkt_op: now_()
      });
      return bump_();
    });
  },
  assignCourier: function (body) {
    return withLock_(function () {
      findOrCreate_('meta', body.orderId).set({
        bezorger: String(body.courier || '').trim(),
        bijgewerkt_door: String(body.name || ''),
        bijgewerkt_op: now_()
      });
      return bump_();
    });
  },
  computeRoute: function (body) {
    const stops = (body.stops || []).filter(function (s) { return s && s.address; });
    if (stops.length === 0) throw new Error('Geen adressen voor deze route.');
    if (stops.length > 23) throw new Error('Maximaal 23 stops per route.');
    const mode = body.mode === 'bicycling' ? 'bicycling' : 'driving';

    const finder = Maps.newDirectionFinder()
      .setOrigin(CONFIG.START_ADDRESS)
      .setMode(mode === 'bicycling' ? Maps.DirectionFinder.Mode.BICYCLING : Maps.DirectionFinder.Mode.DRIVING)
      .setLanguage('nl')
      .setRegion('nl');

    let waypoints = stops;
    let destination;
    if (CONFIG.ROUND_TRIP) {
      destination = CONFIG.START_ADDRESS;
    } else {
      destination = stops[stops.length - 1].address;
      waypoints = stops.slice(0, -1);
    }
    finder.setDestination(destination);
    waypoints.forEach(function (s) { finder.addWaypoint(s.address); });
    if (waypoints.length > 1) finder.setOptimizeWaypoints(true);

    const result = finder.getDirections();
    if (!result.routes || result.routes.length === 0) throw new Error('Google Maps vond geen route (' + result.status + ').');
    const route = result.routes[0];
    let meters = 0;
    let seconds = 0;
    route.legs.forEach(function (leg) {
      meters += leg.distance.value;
      seconds += leg.duration.value;
    });
    const order = (route.waypoint_order || waypoints.map(function (_, i) { return i; })).map(function (i) { return waypoints[i]; });
    if (!CONFIG.ROUND_TRIP) order.push(stops[stops.length - 1]);

    const travelmode = mode === 'bicycling' ? 'bicycling' : 'driving';
    const enc = encodeURIComponent;
    const mapsUrl = 'https://www.google.com/maps/dir/?api=1&origin=' + enc(CONFIG.START_ADDRESS) +
      '&destination=' + enc(destination) +
      '&waypoints=' + order.slice(0, CONFIG.ROUND_TRIP ? order.length : -1).map(function (s) { return enc(s.address); }).join('%7C') +
      '&travelmode=' + travelmode;

    const info = {
      key: body.date + '|' + body.courier,
      date: String(body.date),
      courier: String(body.courier),
      mode: mode,
      km: Math.round(meters / 100) / 10,
      minutes: Math.round(seconds / 60),
      orderIds: order.map(function (s) { return String(s.orderId); }),
      mapsUrl: mapsUrl,
      computedAt: now_()
    };
    withLock_(function () {
      findOrCreate_('routes', info.key).set({
        leverdatum: info.date,
        bezorger: info.courier,
        vervoer: info.mode,
        km: info.km,
        minuten: info.minutes,
        volgorde: info.orderIds.join(','),
        maps_url: info.mapsUrl,
        berekend_op: info.computedAt
      });
      bump_();
    });
    return info;
  },
  registerVolunteer: function (body) {
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    if (!name) throw new Error('Vul je naam in.');
    if (!phone && !email) throw new Error('Vul een telefoonnummer of e-mailadres in.');
    if (!body.consent) throw new Error('Geef toestemming voor het bewaren van je gegevens.');
    const roles = body.roles || {};
    const wantsSomething = VOLUNTEER_ROLES.some(function (r) { return roles[r] && roles[r].wants; });
    if (!wantsSomething) throw new Error('Kies minstens één taak waarmee je wilt helpen.');

    const values = { timestamp: new Date(), name: name, city: String(body.city || '').trim(), phone: phone, email: email, remark: String(body.remark || '').slice(0, 1000) };
    VOLUNTEER_ROLES.forEach(function (role) {
      const r = roles[role] || {};
      values[role] = r.wants ? 'Ja' : 'Nee';
      values[role + 'Days'] = r.wants ? (r.days || []).map(String).join(', ') : '';
    });
    values.cargoBike = roles.fietskoerier && roles.fietskoerier.wants ? (body.cargoBike ? 'Ja' : 'Nee') : '';

    return withLock_(function () {
      const sheet = volunteerSheet_();
      const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
      const index = volunteerIndex_(headers);
      const row = headers.map(function () { return ''; });
      Object.keys(index).forEach(function (field) {
        if (values[field] !== undefined) row[index[field]] = values[field];
      });
      sheet.appendRow(row);
      bump_();
      return { saved: true };
    });
  },
  extractReceipt: function (body) {
    const base64 = String(body.imageBase64 || '');
    const mediaType = String(body.mediaType || 'image/jpeg');
    if (!base64) throw new Error('Geen foto ontvangen.');
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].indexOf(mediaType) === -1) {
      throw new Error('Alleen foto\'s (jpg, png, webp) worden ondersteund.');
    }

    const folder = receiptFolder_();
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), mediaType, 'bon-' + now_().replace(/[: ]/g, '-') + '.jpg');
    const file = folder.createFile(blob);

    let fields = { date: '', amount: null, supplier: '', description: '' };
    let warning = '';
    try {
      fields = readReceiptWithClaude_(base64, mediaType);
    } catch (err) {
      warning = 'Automatisch uitlezen lukte niet: ' + (err && err.message ? err.message : err) + ' Vul de gegevens zelf in.';
    }
    return { fields: fields, photoUrl: file.getUrl(), warning: warning };
  },
  saveCost: function (body) {
    const amount = Number(body.amount);
    if (!body.date) throw new Error('Vul de datum in.');
    if (!isFinite(amount) || amount <= 0) throw new Error('Vul een geldig bedrag in.');
    if (!String(body.supplier || '').trim()) throw new Error('Vul de leverancier in.');
    return withLock_(function () {
      sheet_('costs').appendRow([
        Utilities.getUuid(), now_(), String(body.name || ''), String(body.date), amount,
        String(body.supplier).trim(), String(body.description || '').trim(), String(body.photoUrl || '')
      ]);
      bump_();
      return { saved: true };
    });
  }
};

// ---------------------------------------------------------------------------
// State

function buildState_(role) {
  const isAdmin = role === 'beheer';
  const state = {
    version: getVersion_(),
    rows: readOrders_(),
    meta: {},
    packing: {},
    baked: {},
    routes: {},
    volunteers: [],
    costs: [],
    history: [],
    pricePerPiece: null
  };

  readTab_('meta').forEach(function (r) {
    state.meta[r.order_id] = {
      noteStatus: r.opmerking_status === 'beoordeeld' ? 'beoordeeld' : 'nieuw',
      noteOverride: String(r.opmerking_aangepast || ''),
      confirmationText: String(r.bevestiging_tekst || ''),
      confirmationStatus: r.bevestiging_status || 'geen',
      confirmationSentAt: String(r.bevestiging_verzonden_op || ''),
      courier: String(r.bezorger || ''),
      updatedBy: String(r.bijgewerkt_door || ''),
      updatedAt: String(r.bijgewerkt_op || '')
    };
  });
  readTab_('packing').forEach(function (r) {
    state.packing[r.order_id] = {
      claimedBy: String(r.geclaimd_door || ''),
      claimedAt: String(r.geclaimd_op || ''),
      met: truthy_(r.met_klaar),
      zonder: truthy_(r.zonder_klaar),
      totaal: truthy_(r.totaal_klaar),
      packedBy: String(r.ingepakt_door || ''),
      packedAt: String(r.ingepakt_op || '')
    };
  });
  readTab_('baked').forEach(function (r) {
    state.baked[isoDate_(r.leverdatum)] = { withRaisins: Number(r.met_krenten) || 0, withoutRaisins: Number(r.zonder_krenten) || 0 };
  });
  readTab_('routes').forEach(function (r) {
    state.routes[r.sleutel] = {
      key: r.sleutel, date: isoDate_(r.leverdatum), courier: String(r.bezorger), mode: r.vervoer,
      km: Number(r.km) || 0, minutes: Number(r.minuten) || 0,
      orderIds: String(r.volgorde || '').split(',').filter(String), mapsUrl: String(r.maps_url || ''),
      computedAt: String(r.berekend_op || '')
    };
  });

  // Everyone sees who is available when (agenda); contact details only for beheer.
  state.volunteers = readVolunteers_().map(function (v) {
    if (isAdmin) return v;
    return Object.assign({}, v, { phone: '', email: '', remark: '' });
  });

  const price = Number(getSetting_('prijs_per_oliebol'));
  state.pricePerPiece = isFinite(price) && price > 0 ? price : null;

  if (isAdmin) {
    state.costs = readTab_('costs').map(function (r) {
      return {
        id: String(r.id), createdAt: String(r.ingevoerd_op), createdBy: String(r.ingevoerd_door || ''),
        date: isoDate_(r.datum), amount: Number(r.bedrag) || 0, supplier: String(r.leverancier || ''),
        description: String(r.omschrijving || ''), photoUrl: String(r.foto_url || '')
      };
    });
    state.history = readTab_('history').map(function (r) {
      const revenue = r.omzet === '' || r.omzet === null ? null : Number(r.omzet);
      return { year: Number(r.jaar), date: isoDate_(r.datum), orders: Number(r.bestellingen) || 0, oliebollen: Number(r.oliebollen) || 0, revenue: isFinite(revenue) ? revenue : null };
    }).filter(function (r) { return r.year && r.date; });
  }
  return state;
}

/** Reads the order tab and returns rows keyed by the dashboard field names. */
function readOrders_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.ORDERS_SHEET);
  if (!sheet) throw new Error('Tabblad "' + CONFIG.ORDERS_SHEET + '" niet gevonden. Pas CONFIG.ORDERS_SHEET aan.');
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  const index = {};
  Object.keys(CONFIG.COLUMNS).forEach(function (field) {
    const names = CONFIG.COLUMNS[field];
    for (let i = 0; i < names.length; i++) {
      const at = headers.indexOf(names[i].toLowerCase());
      if (at !== -1) { index[field] = at; break; }
    }
  });
  const seen = {};
  const tz = Session.getScriptTimeZone();
  // Season = the most common year among the order timestamps; CONFIG.SEASON_YEAR when there are none.
  const yearCount = {};
  if (index.besteldatum !== undefined) {
    values.slice(1).forEach(function (row) {
      const v = row[index.besteldatum];
      if (v instanceof Date) yearCount[v.getFullYear()] = (yearCount[v.getFullYear()] || 0) + 1;
    });
  }
  const sheetSeason = Object.keys(yearCount).sort(function (a, b) { return yearCount[b] - yearCount[a]; })[0];
  const defaultSeason = sheetSeason ? Number(sheetSeason) : CONFIG.SEASON_YEAR;
  return values.slice(1).map(function (row, i) {
    const out = {};
    Object.keys(index).forEach(function (field) {
      const value = row[index[field]];
      out[field] = value instanceof Date ? formatCell_(value, field) : value;
    });
    // A timestamp as Unique ID: keep it to the second, otherwise orders of one day collide.
    const rawId = index.order_id !== undefined ? row[index.order_id] : '';
    let id = rawId instanceof Date ? Utilities.formatDate(rawId, tz, 'yyyy-MM-dd HH:mm:ss') : String(rawId || '').trim();
    if (!id) id = 'rij-' + (i + 2);
    if (seen[id]) id = id + '-' + (i + 2);
    seen[id] = true;
    out.order_id = id;

    const placed = index.besteldatum !== undefined ? row[index.besteldatum] : '';
    out.besteldatum = placed instanceof Date ? Utilities.formatDate(placed, tz, 'yyyy-MM-dd') : dutchDate_(placed, defaultSeason);
    // An order placed in January belongs to the season of the year before.
    const seasonYear = placed instanceof Date ? (placed.getMonth() < 6 ? placed.getFullYear() - 1 : placed.getFullYear()) : defaultSeason;
    if (!(row[index.leverdatum] instanceof Date)) out.leverdatum = dutchDate_(out.leverdatum, seasonYear);
    return out;
  }).filter(function (r) { return r.leverdatum && (Number(r.oliebollen_met_krenten) || Number(r.oliebollen_zonder_krenten) || r.locatie_naam); });
}

const DUTCH_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

/** "18 december", "Donderdag 18 december", "18-12-2025" or "2025-12-18" → "2025-12-18". January belongs to the next year. */
function dutchDate_(value, seasonYear) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const pad = function (n) { return (n < 10 ? '0' : '') + n; };
  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + pad(Number(m[2])) + '-' + pad(Number(m[3]));
  m = raw.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
  if (m) return m[3] + '-' + pad(Number(m[2])) + '-' + pad(Number(m[1]));
  m = raw.toLowerCase().match(/(\d{1,2})\s+([a-z]+)/);
  if (m) {
    const month = DUTCH_MONTHS.indexOf(m[2]);
    if (month !== -1) {
      const year = month < 6 && seasonYear ? seasonYear + 1 : seasonYear;
      return year + '-' + pad(month + 1) + '-' + pad(Number(m[1]));
    }
  }
  return '';
}

function volunteerSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('VOLUNTEERS_SPREADSHEET_ID');
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(CONFIG.VOLUNTEERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.VOLUNTEERS_SHEET);
    sheet.appendRow(VOLUNTEER_DEFAULT_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Column index per field, matching headers exactly first and then by prefix. */
function volunteerIndex_(headers) {
  const norm = headers.map(function (h) { return String(h).replace(/\s+/g, ' ').trim().toLowerCase(); });
  const index = {};
  const used = {};
  Object.keys(CONFIG.VOLUNTEER_COLUMNS).forEach(function (field) {
    const names = CONFIG.VOLUNTEER_COLUMNS[field];
    let at = -1;
    names.some(function (n) { at = norm.indexOf(n); return at !== -1 && !used[at]; });
    if (at === -1 || used[at]) {
      at = -1;
      names.some(function (n) {
        for (let i = 0; i < norm.length; i++) if (!used[i] && norm[i].indexOf(n) === 0) { at = i; return true; }
        return false;
      });
    }
    if (at !== -1) { index[field] = at; used[at] = true; }
  });
  return index;
}

function readVolunteers_() {
  const values = volunteerSheet_().getDataRange().getValues();
  if (values.length < 2) return [];
  const index = volunteerIndex_(values[0]);
  const cell = function (row, field) {
    if (index[field] === undefined) return '';
    const v = row[index[field]];
    if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    return String(v === null || v === undefined ? '' : v).trim();
  };
  return values.slice(1).map(function (row, i) {
    const roles = {};
    VOLUNTEER_ROLES.forEach(function (role) {
      const days = splitList_(cell(row, role + 'Days'));
      roles[role] = { wants: truthy_(cell(row, role)) || days.length > 0, days: days };
    });
    return {
      id: 'rij-' + (i + 2),
      createdAt: cell(row, 'timestamp'),
      name: cell(row, 'name'),
      city: cell(row, 'city'),
      phone: cell(row, 'phone'),
      email: cell(row, 'email'),
      roles: roles,
      cargoBike: truthy_(cell(row, 'cargoBike')),
      remark: cell(row, 'remark')
    };
  }).filter(function (v) { return v.name; });
}

function findOrder_(orderId) {
  const rows = readOrders_();
  for (let i = 0; i < rows.length; i++) if (String(rows[i].order_id) === String(orderId)) return rows[i];
  return null;
}

// ---------------------------------------------------------------------------
// Receipt reading (Claude vision)

function readReceiptWithClaude_(base64, mediaType) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY ontbreekt in de Script-eigenschappen.');

  const schema = {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Datum van de bon als YYYY-MM-DD, leeg als onleesbaar' },
      amount: { type: ['number', 'null'], description: 'Totaal te betalen bedrag in euro, inclusief btw' },
      supplier: { type: 'string', description: 'Naam van de winkel of leverancier' },
      description: { type: 'string', description: 'Korte omschrijving van wat er gekocht is, max 120 tekens' }
    },
    required: ['date', 'amount', 'supplier', 'description'],
    additionalProperties: false
  };

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01'
    },
    payload: JSON.stringify({
      model: CONFIG.CLAUDE_MODEL,
      max_tokens: 2000,
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: schema } },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'Dit is een foto van een kassabon of factuur van een uitgave voor een oliebollenactie. Lees de datum, het totaalbedrag, de leverancier en een korte omschrijving van de gekochte artikelen uit. Laat een veld leeg (of null voor het bedrag) als het niet leesbaar is; verzin niets.' }
        ]
      }]
    })
  });

  const status = response.getResponseCode();
  const result = JSON.parse(response.getContentText());
  if (status !== 200) throw new Error((result.error && result.error.message) || ('HTTP ' + status));
  if (result.stop_reason === 'refusal') throw new Error('Het model weigerde deze foto te verwerken.');
  const textBlock = (result.content || []).filter(function (b) { return b.type === 'text'; })[0];
  if (!textBlock) throw new Error('Geen antwoord ontvangen.');
  const parsed = JSON.parse(textBlock.text);
  return {
    date: String(parsed.date || ''),
    amount: typeof parsed.amount === 'number' ? parsed.amount : null,
    supplier: String(parsed.supplier || ''),
    description: String(parsed.description || '')
  };
}

function receiptFolder_() {
  const folders = DriveApp.getFoldersByName(CONFIG.RECEIPT_FOLDER);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.RECEIPT_FOLDER);
}

// ---------------------------------------------------------------------------
// Sheet helpers

function sheet_(tab) {
  const def = TABS[tab];
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(def[0]);
  if (!sheet) {
    sheet = ss.insertSheet(def[0]);
    // Keys stay text, so "001" or "2026-12-30" are not turned into numbers or dates.
    sheet.getRange('A:A').setNumberFormat('@');
    sheet.appendRow(def[1]);
    sheet.setFrozenRows(1);
  } else {
    // Add columns introduced by a newer script version to an existing tab.
    const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(String);
    def[1].forEach(function (h) {
      if (headers.indexOf(h) === -1) {
        headers.push(h);
        sheet.getRange(1, headers.length).setValue(h);
      }
    });
  }
  return sheet;
}

function readTab_(tab) {
  const sheet = sheet_(tab);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).map(function (row) {
    const out = {};
    headers.forEach(function (h, i) { out[h] = row[i] instanceof Date ? formatCell_(row[i], h) : row[i]; });
    return out;
  });
}

/** Returns a row handle for the first-column key, creating the row when missing. Call inside withLock_. */
function findOrCreate_(tab, key) {
  const id = String(key || '').trim();
  if (!id) throw new Error('Ontbrekende sleutel.');
  const sheet = sheet_(tab);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    const cell = values[i][0] instanceof Date ? isoDate_(values[i][0]) : String(values[i][0]);
    if (cell === id) { rowIndex = i; break; }
  }
  if (rowIndex === -1) {
    const blank = headers.map(function (_, i) { return i === 0 ? id : ''; });
    sheet.appendRow(blank);
    values.push(blank);
    rowIndex = values.length - 1;
  }
  const current = {};
  headers.forEach(function (h, i) { current[h] = values[rowIndex][i]; });
  return {
    values: current,
    set: function (update) {
      Object.keys(update).forEach(function (field) {
        const col = headers.indexOf(field);
        if (col !== -1) sheet.getRange(rowIndex + 1, col + 1).setValue(update[field]);
      });
    }
  };
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return fn();
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function getSetting_(key) {
  const rows = readTab_('settings');
  for (let i = 0; i < rows.length; i++) if (rows[i].sleutel === key) return rows[i].waarde;
  return '';
}

function getVersion_() {
  return Number(PropertiesService.getScriptProperties().getProperty('DATA_VERSION')) || 1;
}

function bump_() {
  const props = PropertiesService.getScriptProperties();
  const next = getVersion_() + 1;
  props.setProperty('DATA_VERSION', String(next));
  return { version: next };
}

/** Simple trigger: handmatige wijzigingen in de Sheet zijn zo direct zichtbaar in het dashboard. */
function onEdit() {
  bump_();
}

function requireName_(name) {
  const value = String(name || '').trim();
  if (!value) throw new Error('Vul eerst je naam in.');
  return value;
}

function truthy_(v) {
  return v === true || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'ja';
}

function splitList_(v) {
  return String(v || '').split(',').map(function (s) { return s.trim(); }).filter(String);
}

function now_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function isoDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v || '');
}

function formatCell_(date, field) {
  const tz = Session.getScriptTimeZone();
  if (/tijd/.test(field) && date.getFullYear() < 1900) return Utilities.formatDate(date, tz, 'HH:mm');
  if (field === 'geplande_tijd') return Utilities.formatDate(date, tz, 'HH:mm');
  if (/_op$|tijdstempel|timestamp/.test(field)) return Utilities.formatDate(date, tz, 'yyyy-MM-dd HH:mm:ss');
  return Utilities.formatDate(date, tz, 'yyyy-MM-dd');
}
