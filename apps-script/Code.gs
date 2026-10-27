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
  /** Vertrektijd als er bij de route geen is opgegeven, en minuten per stop (parkeren, praatje, afgeven). */
  ROUTE_START_TIME: '09:00',
  MINUTES_PER_STOP: 15,
  /**
   * Startinhoud van het tabblad Agenda (alleen als het nog leeg is). Daarna past Mark de agenda in de
   * Sheet aan: één regel per dag, taak en dagdeel, met tijd, locatie en hoeveel mensen nodig zijn.
   */
  AGENDA_DEFAULT: {
    days: ['2026-12-15', '2026-12-16', '2026-12-17', '2026-12-18', '2026-12-19', '2026-12-20', '2026-12-21', '2026-12-22',
      '2026-12-23', '2026-12-24', '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31'],
    slots: [
      ['inpakken', '', '07:30'],
      ['fietskoerier', 'ochtend', '09:00–12:00'], ['fietskoerier', 'middag', '12:00–16:00'],
      ['autokoerier', 'ochtend', '09:00–12:00'], ['autokoerier', 'middag', '12:00–16:00'],
      ['oliebollenbar', '', '']
    ],
    needed: 4
  },
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
    remark: ['wil je nog iets kwijt'],
    address: ['adres', 'straat + huisnummer']
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
  routes: ['Routes', ['sleutel', 'leverdatum', 'bezorger', 'vervoer', 'km', 'minuten', 'volgorde', 'maps_url', 'berekend_op', 'starttijd', 'tijden', 'dagdeel', 'eindpunt', 'maps_url_zonder_eindpunt']],
  costs: ['Kosten', ['id', 'ingevoerd_op', 'ingevoerd_door', 'datum', 'bedrag', 'leverancier', 'omschrijving', 'foto_url', 'iban', 'status', 'reden', 'beoordeeld_door', 'beoordeeld_op', 'uitbetaald_op']],
  delivery: ['Bezorgstatus', ['order_id', 'afgeleverd_door', 'afgeleverd_op']],
  agenda: ['Agenda', ['datum', 'taak', 'dagdeel', 'tijd', 'locatie', 'nodig']],
  history: ['Historie', ['jaar', 'datum', 'bestellingen', 'oliebollen', 'omzet']],
  settings: ['Instellingen', ['sleutel', 'waarde']],
  packlog: ['Inpaklog', ['tijd', 'order_id', 'klant', 'actie', 'door', 'met_krenten', 'zonder_krenten']],
  // Coordinates per address for the automatic planning, so each address is looked up only once.
  places: ['Locaties', ['adres', 'lat', 'lng', 'opgezocht_op']]
};

const PERMISSIONS = {
  state: ['beheer', 'inpakker', 'bezorger'],
  version: ['beheer', 'inpakker', 'bezorger'],
  claim: ['beheer', 'inpakker'],
  release: ['beheer', 'inpakker'],
  checkPart: ['beheer', 'inpakker'],
  complete: ['beheer', 'inpakker'],
  reopen: ['beheer', 'inpakker'],
  signupStats: ['public'],
  setBaked: ['beheer', 'inpakker'],
  updateNote: ['beheer'],
  saveConfirmation: ['beheer'],
  sendConfirmation: ['beheer'],
  computeRoute: ['beheer'],
  assignCourier: ['beheer'],
  assignCouriers: ['beheer'],
  geocode: ['beheer'],
  extractReceipt: ['beheer', 'inpakker', 'bezorger'],
  saveCost: ['beheer', 'inpakker', 'bezorger'],
  registerVolunteer: ['public'],
  login: ['public'],
  setDelivered: ['beheer', 'bezorger'],
  reviewCost: ['beheer'],
  payCost: ['beheer'],
  anonymize: ['beheer']
};

// ---------------------------------------------------------------------------
// HTTP

/**
 * GET with ?p=<json> works the same as POST. The dashboard uses GET for small requests: a POST can
 * turn into a GET on a redirect (and then lose its body), a GET never does.
 */
function doGet(e) {
  const payload = e && e.parameter && e.parameter.p;
  if (!payload) return json_({ ok: true, message: 'Oma Coby dashboard API.' });
  return handle_(payload);
}

function doPost(e) {
  return handle_((e && e.postData && e.postData.contents) || '{}');
}

function handle_(raw) {
  resetMemo_();
  try {
    const body = JSON.parse(raw);
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
  if (value === prop_('CODE_BEHEER')) return 'beheer';
  if (value === prop_('CODE_INPAKKER')) return 'inpakker';
  if (value === prop_('CODE_BEZORGER')) return 'bezorger';
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
    // The platform asks "anything new since version X?"; then one request is enough for both.
    if (body.since && Number(body.since) === getVersion_()) return { unchanged: true, version: getVersion_() };
    return buildState_(role, String(body.name || '').trim());
  },
  setDelivered: function (body) {
    return withLock_(function () {
      const name = requireName_(body.name);
      if (!findOrder_(body.orderId)) throw new Error('Order niet gevonden.');
      const row = findOrCreate_('delivery', body.orderId);
      row.set(body.delivered ? { afgeleverd_door: name, afgeleverd_op: now_() } : { afgeleverd_door: '', afgeleverd_op: '' });
      return bump_();
    });
  },
  reviewCost: function (body) {
    const status = String(body.status || '');
    if (['goedgekeurd', 'afgekeurd', 'ingediend'].indexOf(status) === -1) throw new Error('Onbekende status.');
    const reason = String(body.reason || '').trim();
    if (status === 'afgekeurd' && !reason) throw new Error('Geef een reden waarom je de declaratie afkeurt.');
    return withLock_(function () {
      const row = findRow_('costs', body.id);
      if (row.values.status === 'uitbetaald') throw new Error('Deze declaratie is al uitbetaald.');
      row.set({ status: status, reden: status === 'afgekeurd' ? reason : '', beoordeeld_door: String(body.name || ''), beoordeeld_op: status === 'ingediend' ? '' : now_() });
      return bump_();
    });
  },
  payCost: function (body) {
    return withLock_(function () {
      const row = findRow_('costs', body.id);
      const current = row.values.status || 'ingediend';
      if (body.paid) {
        if (current !== 'goedgekeurd') throw new Error('Keur de declaratie eerst goed.');
        row.set({ status: 'uitbetaald', uitbetaald_op: String(body.date || '').trim() || now_().slice(0, 10) });
      } else {
        if (current !== 'uitbetaald') throw new Error('Deze declaratie is nog niet uitbetaald.');
        row.set({ status: 'goedgekeurd', uitbetaald_op: '' });
      }
      return bump_();
    });
  },
  anonymize: function (body) {
    if (String(body.confirm || '') !== 'VERWIJDER') throw new Error('Typ VERWIJDER om te bevestigen.');
    return withLock_(function () {
      const result = anonymize_();
      bump_();
      return result;
    });
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
      const done = !!body.done;
      const update = {};
      update[column] = done;
      // GEHEEL (totaal) can only be ticked after MET and ZONDER; unticking either clears it again.
      if (body.part === 'totaal' && done && !(truthy_(row.values.met_klaar) && truthy_(row.values.zonder_klaar))) {
        throw new Error('Vink eerst MET en ZONDER af.');
      }
      if (body.part !== 'totaal' && !done) update.totaal_klaar = false;
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
      logPacking_(body.orderId, 'ingepakt', name);
      return bump_();
    });
  },
  reopen: function (body) {
    return withLock_(function () {
      const name = requireName_(body.name);
      const row = findOrCreate_('packing', body.orderId);
      if (!row.values.ingepakt_door) throw new Error('Deze order is nog niet afgerond.');
      // The person reopening takes the order over; the ticks stay so only the change needs doing.
      row.set({ ingepakt_door: '', ingepakt_op: '', geclaimd_door: name, geclaimd_op: now_() });
      logPacking_(body.orderId, 'heropend', name);
      return bump_();
    });
  },
  signupStats: function () {
    // Only counts, never names: this is shown on the public signup page.
    const counts = {};
    VOLUNTEER_ROLES.forEach(function (role) { counts[role] = {}; });
    readVolunteers_().forEach(function (v) {
      VOLUNTEER_ROLES.forEach(function (role) {
        if (!v.roles[role].wants) return;
        v.roles[role].days.forEach(function (option) {
          const key = String(option).trim().toLowerCase();
          counts[role][key] = (counts[role][key] || 0) + 1;
        });
      });
    });
    return { counts: counts, agenda: readAgenda_() };
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
  assignCouriers: function (body) {
    const list = (body.assignments || []).filter(function (a) { return a && a.orderId; });
    if (list.length === 0) throw new Error('Niets om in te delen.');
    return withLock_(function () {
      list.forEach(function (a) {
        findOrCreate_('meta', a.orderId).set({
          bezorger: String(a.courier || '').trim(),
          bijgewerkt_door: String(body.name || ''),
          bijgewerkt_op: now_()
        });
      });
      return bump_();
    });
  },
  /** Coordinates for the automatic planning. Looked up once per address and kept in the tab Locaties. */
  geocode: function (body) {
    const wanted = [CONFIG.START_ADDRESS].concat((body.addresses || []).map(function (a) { return String(a || '').trim(); }).filter(String));
    const known = {};
    readTab_('places').forEach(function (r) {
      const lat = num_(r.lat);
      const lng = num_(r.lng);
      known[String(r.adres).trim().toLowerCase()] = lat && lng ? { lat: lat, lng: lng } : null;
    });
    const geocoder = Maps.newGeocoder().setRegion('nl').setLanguage('nl');
    const points = {};
    const fresh = [];
    wanted.slice(0, 300).forEach(function (address) {
      const key = address.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(known, key)) { points[address] = known[key]; return; }
      let point = null;
      try {
        const res = geocoder.geocode(address);
        if (res.status === 'OK' && res.results && res.results.length) {
          const loc = res.results[0].geometry.location;
          point = { lat: loc.lat, lng: loc.lng };
        }
      } catch (err) {
        point = null;
      }
      known[key] = point;
      points[address] = point;
      fresh.push([address, point ? point.lat : '', point ? point.lng : '', now_()]);
    });
    if (fresh.length) {
      withLock_(function () {
        const sheet = sheet_('places');
        sheet.getRange(sheet.getLastRow() + 1, 1, fresh.length, 4).setValues(fresh);
      });
    }
    return { start: { address: CONFIG.START_ADDRESS, point: points[CONFIG.START_ADDRESS] || null }, points: points };
  },
  computeRoute: function (body) {
    const stops = (body.stops || []).filter(function (s) { return s && s.address; });
    if (stops.length === 0) throw new Error('Geen adressen voor deze route.');
    if (stops.length > 23) throw new Error('Maximaal 23 stops per route.');
    const mode = body.mode === 'bicycling' ? 'bicycling' : 'driving';
    const part = String(body.part || '').trim();
    // The last trip of the day may end at the courier's home: then the last stop is the one nearest home.
    const endAddress = String(body.endAddress || '').trim();
    const perStop = Number(body.minutesPerStop) > 0 ? Number(body.minutesPerStop) : CONFIG.MINUTES_PER_STOP;

    const finder = Maps.newDirectionFinder()
      .setOrigin(CONFIG.START_ADDRESS)
      .setMode(mode === 'bicycling' ? Maps.DirectionFinder.Mode.BICYCLING : Maps.DirectionFinder.Mode.DRIVING)
      .setLanguage('nl')
      .setRegion('nl');

    let waypoints = stops;
    let destination;
    if (endAddress) {
      destination = endAddress;
    } else if (CONFIG.ROUND_TRIP) {
      destination = CONFIG.START_ADDRESS;
    } else {
      destination = stops[stops.length - 1].address;
      waypoints = stops.slice(0, -1);
    }
    const lastIsStop = !endAddress && !CONFIG.ROUND_TRIP;
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
    if (lastIsStop) order.push(stops[stops.length - 1]);

    // Expected arrival per stop: departure + driving time of each leg + time spent at earlier stops.
    const startTime = /^\d{1,2}:\d{2}$/.test(String(body.startTime || '')) ? String(body.startTime) : CONFIG.ROUTE_START_TIME;
    let clock = Number(startTime.split(':')[0]) * 60 + Number(startTime.split(':')[1]);
    const stopTimes = order.map(function (_, i) {
      clock += Math.round(route.legs[i].duration.value / 60) + (i > 0 ? perStop : 0);
      return hhmm_(clock);
    });
    seconds += order.length * perStop * 60;
    // The way home after the last stop is not work time.
    if (endAddress) seconds -= route.legs[route.legs.length - 1].duration.value;

    const travelmode = mode === 'bicycling' ? 'bicycling' : 'driving';
    const enc = encodeURIComponent;
    const mapsUrl = 'https://www.google.com/maps/dir/?api=1&origin=' + enc(CONFIG.START_ADDRESS) +
      '&destination=' + enc(destination) +
      '&waypoints=' + order.slice(0, lastIsStop ? -1 : order.length).map(function (s) { return enc(s.address); }).join('%7C') +
      '&travelmode=' + travelmode;
    // Other volunteers see the route without the home address: it then ends at the last stop.
    const publicUrl = !endAddress ? mapsUrl : 'https://www.google.com/maps/dir/?api=1&origin=' + enc(CONFIG.START_ADDRESS) +
      '&destination=' + enc(order[order.length - 1].address) +
      '&waypoints=' + order.slice(0, -1).map(function (s) { return enc(s.address); }).join('%7C') +
      '&travelmode=' + travelmode;

    const info = {
      key: body.date + '|' + body.courier + (part ? '|' + part : ''),
      part: part,
      endAddress: endAddress,
      date: String(body.date),
      courier: String(body.courier),
      mode: mode,
      km: Math.round(meters / 100) / 10,
      minutes: Math.round(seconds / 60),
      orderIds: order.map(function (s) { return String(s.orderId); }),
      mapsUrl: mapsUrl,
      computedAt: now_(),
      startTime: startTime,
      stopTimes: stopTimes
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
        berekend_op: info.computedAt,
        starttijd: info.startTime,
        tijden: info.stopTimes.join(','),
        dagdeel: part,
        eindpunt: endAddress,
        maps_url_zonder_eindpunt: publicUrl
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

    const values = { timestamp: new Date(), name: name, address: String(body.address || '').trim(), city: String(body.city || '').trim(), phone: phone, email: email, remark: String(body.remark || '').slice(0, 1000) };
    VOLUNTEER_ROLES.forEach(function (role) {
      const r = roles[role] || {};
      values[role] = r.wants ? 'Ja' : 'Nee';
      values[role + 'Days'] = r.wants ? (r.days || []).map(String).join(', ') : '';
    });
    values.cargoBike = roles.fietskoerier && roles.fietskoerier.wants ? (body.cargoBike ? 'Ja' : 'Nee') : '';

    return withLock_(function () {
      const sheet = volunteerSheet_();
      let headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
      let index = volunteerIndex_(headers);
      // The 2025 form has no address question: add the column at the end when someone fills it in.
      if (values.address && index.address === undefined) {
        sheet.getRange(1, headers.length + 1).setValue('Adres');
        headers = headers.concat(['Adres']);
        index = volunteerIndex_(headers);
      }
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
    const iban = String(body.iban || '').replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(iban)) throw new Error('Vul een geldig IBAN in, bijvoorbeeld NL91ABNA0417164300.');
    return withLock_(function () {
      appendObject_('costs', {
        id: Utilities.getUuid(), ingevoerd_op: now_(), ingevoerd_door: String(body.name || ''), datum: String(body.date), bedrag: amount,
        leverancier: String(body.supplier).trim(), omschrijving: String(body.description || '').trim(), foto_url: String(body.photoUrl || ''),
        iban: iban, status: 'ingediend'
      });
      bump_();
      return { saved: true };
    });
  }
};

// ---------------------------------------------------------------------------
// State

/**
 * The state for one person. The full state is built once per data version and kept in the
 * script cache, so opening the platform or refreshing does not read every tab again; any change
 * (dashboard, form or a cell in the Sheet) bumps the version and the next request rebuilds it.
 */
function buildState_(role, name) {
  const version = getVersion_();
  let full = readStateCache_(version);
  if (!full) {
    full = buildFullState_();
    full.version = version;
    writeStateCache_(version, full);
  }
  return viewFor_(full, role, name);
}

/** Everything, as beheer sees it; viewFor_ takes out what other roles may not see. */
function buildFullState_() {
  const state = {
    version: 0,
    rows: readOrders_(),
    meta: {},
    packing: {},
    baked: {},
    routes: {},
    volunteers: [],
    costs: [],
    history: [],
    pricePerPiece: null,
    kmRate: null,
    delivery: {},
    agenda: readAgenda_()
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
    state.baked[isoDate_(r.leverdatum)] = { withRaisins: num_(r.met_krenten), withoutRaisins: num_(r.zonder_krenten) };
  });
  readTab_('routes').forEach(function (r) {
    state.routes[r.sleutel] = {
      key: r.sleutel, date: isoDate_(r.leverdatum), courier: String(r.bezorger), mode: r.vervoer,
      km: num_(r.km), minutes: num_(r.minuten),
      orderIds: String(r.volgorde || '').split(',').filter(String),
      mapsUrl: String(r.maps_url || ''),
      // For everyone but beheer: the route without the courier's home address.
      publicMapsUrl: String(r.maps_url_zonder_eindpunt || (r.eindpunt ? '' : r.maps_url) || ''),
      computedAt: String(r.berekend_op || ''),
      startTime: String(r.starttijd || ''), stopTimes: String(r.tijden || '').split(',').filter(String),
      part: String(r.dagdeel || ''), endAddress: String(r.eindpunt || '')
    };
  });
  readTab_('delivery').forEach(function (r) {
    if (r.afgeleverd_door) state.delivery[r.order_id] = { deliveredBy: String(r.afgeleverd_door), deliveredAt: String(r.afgeleverd_op || '') };
  });
  state.volunteers = readVolunteers_();

  const settings = {};
  readTab_('settings').forEach(function (r) { settings[r.sleutel] = r.waarde; });
  const price = num_(settings.prijs_per_oliebol);
  state.pricePerPiece = isFinite(price) && price > 0 ? price : null;
  const kmRate = num_(settings.km_vergoeding);
  state.kmRate = kmRate > 0 ? kmRate : null;

  state.costs = readTab_('costs').map(function (r) {
    return {
      id: String(r.id), createdAt: String(r.ingevoerd_op), createdBy: String(r.ingevoerd_door || ''),
      date: isoDate_(r.datum), amount: num_(r.bedrag), supplier: String(r.leverancier || ''),
      description: String(r.omschrijving || ''), photoUrl: String(r.foto_url || ''),
      iban: String(r.iban || ''),
      status: String(r.status || 'ingediend'), reason: String(r.reden || ''),
      reviewedBy: String(r.beoordeeld_door || ''), reviewedAt: String(r.beoordeeld_op || ''), paidAt: isoDate_(r.uitbetaald_op)
    };
  });
  state.history = readTab_('history').map(function (r) {
    const revenue = r.omzet === '' || r.omzet === null || r.omzet === undefined ? null : num_(r.omzet);
    return { year: Number(r.jaar), date: isoDate_(r.datum), orders: num_(r.bestellingen), oliebollen: num_(r.oliebollen), revenue: isFinite(revenue) ? revenue : null };
  }).filter(function (r) { return r.year && r.date; });
  return state;
}

/** What one role sees: contact details, home addresses, IBANs and other people's costs only for beheer. */
function viewFor_(full, role, name) {
  const isAdmin = role === 'beheer';
  const routes = {};
  Object.keys(full.routes).forEach(function (key) {
    const r = full.routes[key];
    const out = Object.assign({}, r, isAdmin ? {} : { mapsUrl: r.publicMapsUrl, endAddress: '' });
    delete out.publicMapsUrl;
    routes[key] = out;
  });
  const lower = String(name || '').toLowerCase();
  return Object.assign({}, full, {
    routes: routes,
    // Everyone sees who is available when (agenda); contact details only for beheer.
    volunteers: isAdmin ? full.volunteers : full.volunteers.map(function (v) {
      return Object.assign({}, v, { phone: '', email: '', remark: '', address: '' });
    }),
    // Beheer sees every declaration; a volunteer only their own, with the IBAN masked.
    costs: full.costs.filter(function (c) {
      return isAdmin || (lower && c.createdBy.toLowerCase() === lower);
    }).map(function (c) {
      return isAdmin || !c.iban ? c : Object.assign({}, c, { iban: '•••• ' + c.iban.slice(-4) });
    }),
    history: isAdmin ? full.history : []
  });
}

// The script cache holds at most 100 KB per entry: the state is zipped and split into parts.
// A change that skips the triggers (e.g. via another app) shows up after at most 5 minutes.
const STATE_CACHE_SECONDS = 300;
const STATE_CACHE_PART = 90000;

function readStateCache_(version) {
  try {
    const cache = CacheService.getScriptCache();
    const count = Number(cache.get('state:' + version));
    if (!count) return null;
    const keys = [];
    for (let i = 0; i < count; i++) keys.push('state:' + version + ':' + i);
    const parts = cache.getAll(keys);
    let text = '';
    for (let i = 0; i < count; i++) {
      if (!parts[keys[i]]) return null;
      text += parts[keys[i]];
    }
    const blob = Utilities.newBlob(Utilities.base64Decode(text), 'application/x-gzip');
    return JSON.parse(Utilities.ungzip(blob).getDataAsString('UTF-8'));
  } catch (err) {
    return null;
  }
}

function writeStateCache_(version, state) {
  try {
    const zipped = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(state), 'application/json')).getBytes());
    const entries = {};
    let count = 0;
    for (let at = 0; at < zipped.length; at += STATE_CACHE_PART) entries['state:' + version + ':' + count++] = zipped.slice(at, at + STATE_CACHE_PART);
    // Too big for the cache (very large Sheet): just build it every time.
    if (count > 50) return;
    const cache = CacheService.getScriptCache();
    cache.putAll(entries, STATE_CACHE_SECONDS);
    cache.put('state:' + version, String(count), STATE_CACHE_SECONDS);
  } catch (err) {
    // Without cache the platform still works, only slower.
  }
}

/** Reads the order tab and returns rows keyed by the dashboard field names. */
function readOrders_() {
  const sheet = ss_().getSheetByName(CONFIG.ORDERS_SHEET);
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
  const tz = tz_();
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
  }).filter(function (r) { return r.leverdatum && (num_(r.oliebollen_met_krenten) || num_(r.oliebollen_zonder_krenten) || r.locatie_naam); });
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

function logPacking_(orderId, action, name) {
  const order = findOrder_(orderId) || {};
  sheet_('packlog').appendRow([now_(), String(orderId), String(order.locatie_naam || order.contactpersoon || ''), action, name,
    num_(order.oliebollen_met_krenten), num_(order.oliebollen_zonder_krenten)]);
}

function volunteerSheet_() {
  const id = prop_('VOLUNTEERS_SPREADSHEET_ID');
  const ss = id ? SpreadsheetApp.openById(id) : ss_();
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
    if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd HH:mm:ss');
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
      address: cell(row, 'address'),
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

// Every call to a Google service costs time (often 50–100 ms). Within one request we look up the
// spreadsheet, the tabs, the script properties and the time zone only once.
let SS_ = null;
let SP_ = null;
let PROPS_ = null;
let TZ_ = null;
const TAB_SHEETS_ = {};
const TAB_CHECKED_ = {};

/** Start of a request: forget lookups from an earlier one (the Sheet may have changed in between). */
function resetMemo_() {
  SS_ = null;
  SP_ = null;
  PROPS_ = null;
  Object.keys(TAB_SHEETS_).forEach(function (k) { delete TAB_SHEETS_[k]; });
  Object.keys(TAB_CHECKED_).forEach(function (k) { delete TAB_CHECKED_[k]; });
}

function ss_() {
  if (!SS_) SS_ = SpreadsheetApp.getActive();
  return SS_;
}

/** All script properties in one call; setProp_ keeps this copy up to date. */
function scriptProps_() {
  if (!SP_) SP_ = PropertiesService.getScriptProperties();
  return SP_;
}

function prop_(key) {
  if (!PROPS_) PROPS_ = scriptProps_().getProperties();
  return PROPS_[key] === undefined ? null : PROPS_[key];
}

function setProp_(key, value) {
  scriptProps_().setProperty(key, value);
  if (PROPS_) PROPS_[key] = value;
}

function tz_() {
  if (!TZ_) TZ_ = Session.getScriptTimeZone();
  return TZ_;
}

/** The tab for reading: no header or format checks, those happen when writing. */
function readSheet_(tab) {
  if (TAB_SHEETS_[tab]) return TAB_SHEETS_[tab];
  const sheet = ss_().getSheetByName(TABS[tab][0]);
  return sheet ? (TAB_SHEETS_[tab] = sheet) : sheet_(tab);
}

function sheet_(tab) {
  if (TAB_CHECKED_[tab]) return TAB_CHECKED_[tab];
  const def = TABS[tab];
  const ss = ss_();
  let sheet = TAB_SHEETS_[tab] || ss.getSheetByName(def[0]);
  if (!sheet) {
    sheet = ss.insertSheet(def[0]);
    // Keys stay text, so "001" or "2026-12-30" are not turned into numbers or dates.
    sheet.getRange('A:A').setNumberFormat('@');
    sheet.appendRow(def[1]);
    sheet.setFrozenRows(1);
    if (tab === 'agenda') defaultAgendaRows_().forEach(function (row) { sheet.appendRow(row); });
  } else {
    textKeys_(tab, sheet);
    // Add columns introduced by a newer script version to an existing tab. Checked once per set of
    // columns (remembered in the script properties), not on every click.
    const flag = 'HEADERS_' + tab;
    const want = def[1].join(',');
    if (prop_(flag) !== want) {
      const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(String);
      def[1].forEach(function (h) {
        if (headers.indexOf(h) === -1) {
          headers.push(h);
          sheet.getRange(1, headers.length).setValue(h);
        }
      });
      setProp_(flag, want);
    }
  }
  TAB_SHEETS_[tab] = sheet;
  TAB_CHECKED_[tab] = sheet;
  return sheet;
}

function readTab_(tab) {
  const sheet = readSheet_(tab);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).map(function (row) {
    const out = {};
    headers.forEach(function (h, i) {
      const v = row[i];
      // The first column and order_id are keys: a timestamp key keeps its time, or it no longer matches the order.
      out[h] = i === 0 || h === 'order_id' ? keyOf_(v) : v instanceof Date ? formatCell_(v, h) : v;
    });
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
    const cell = keyOf_(values[i][0]);
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
    // One write for all changed cells (each call to the Sheet costs time): the span from the first
    // to the last changed column, with the cells in between as they are.
    set: function (update) {
      const cols = Object.keys(update).map(function (field) { return headers.indexOf(field); }).filter(function (c) { return c !== -1; });
      if (cols.length === 0) return;
      const from = Math.min.apply(null, cols);
      const to = Math.max.apply(null, cols);
      const row = values[rowIndex].slice(from, to + 1);
      while (row.length < to - from + 1) row.push('');
      Object.keys(update).forEach(function (field) {
        const col = headers.indexOf(field);
        if (col !== -1) {
          row[col - from] = update[field];
          values[rowIndex][col] = update[field];
          current[field] = update[field];
        }
      });
      sheet.getRange(rowIndex + 1, from + 1, 1, row.length).setValues([row]);
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

function getVersion_() {
  return Number(prop_('DATA_VERSION')) || 1;
}

function bump_() {
  // Read fresh: another request may have bumped in the meantime.
  const next = (Number(scriptProps_().getProperty('DATA_VERSION')) || 1) + 1;
  setProp_('DATA_VERSION', String(next));
  return { version: next };
}

/** Simple trigger: handmatige wijzigingen in de Sheet zijn zo direct zichtbaar in het dashboard. */
function onEdit() {
  bump_();
}

/**
 * Eenmalig uitvoeren (kies "installeer" bovenin de editor en klik Uitvoeren).
 * onEdit ziet alleen getypte wijzigingen. Deze triggers zorgen dat ook nieuwe formulierinzendingen,
 * ingevoegde of verwijderde rijen, sorteren en geplakte blokken direct in het platform verschijnen.
 * Nog eens uitvoeren kan geen kwaad: oude triggers van dit script worden eerst verwijderd.
 */
function installeer() {
  const ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['bijWijziging', 'bijFormulier'].indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('bijWijziging').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('bijFormulier').forSpreadsheet(ss).onFormSubmit().create();
  // Make sure every dashboard tab exists, with its key column as text.
  Object.keys(TABS).forEach(function (tab) { sheet_(tab); });
  bump_();
  return 'Klaar: wijzigingen in de Sheet komen nu direct door in het platform.';
}

/** Installable trigger (onChange): rijen invoegen/verwijderen, sorteren, plakken, tabbladen. */
function bijWijziging() {
  bump_();
}

/** Installable trigger (onFormSubmit): nieuwe bestelling of aanmelding via een Google Formulier. */
function bijFormulier() {
  bump_();
}

/** Appends a row to a dashboard tab, matching values to the columns by header name. */
function appendObject_(tab, obj) {
  const sheet = sheet_(tab);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; }));
}

/** Like findOrCreate_, but the row must exist. Call inside withLock_. */
function findRow_(tab, key) {
  const id = String(key || '').trim();
  const sheet = sheet_(tab);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) if (keyOf_(values[i][0]) === id) return findOrCreate_(tab, id);
  throw new Error('Niet gevonden: ' + id);
}

function defaultAgendaRows_() {
  const rows = [];
  CONFIG.AGENDA_DEFAULT.days.forEach(function (day) {
    CONFIG.AGENDA_DEFAULT.slots.forEach(function (slot) {
      rows.push([day, slot[0], slot[1], slot[2], '', CONFIG.AGENDA_DEFAULT.needed]);
    });
  });
  return rows;
}

/** The signup moments from the Agenda tab; rows with an unknown task or date are skipped. */
function readAgenda_() {
  return readTab_('agenda').map(function (r) {
    const needed = num_(r.nodig);
    return {
      date: dutchDate_(isoDate_(r.datum), CONFIG.SEASON_YEAR),
      role: String(r.taak || '').trim().toLowerCase(),
      part: String(r.dagdeel || '').trim().toLowerCase(),
      time: r.tijd instanceof Date ? hhmm_(r.tijd.getHours() * 60 + r.tijd.getMinutes()) : String(r.tijd || '').trim(),
      location: String(r.locatie || '').trim(),
      needed: needed > 0 ? needed : null
    };
  }).filter(function (a) { return a.date && VOLUNTEER_ROLES.indexOf(a.role) !== -1; });
}

/** Clears names, contact details and IBANs after the action. Order numbers and amounts stay for the figures. */
function anonymize_() {
  const out = { volunteers: 0, orders: 0, costs: 0, receipts: 0 };
  // Volunteer form answers: remove the rows, keep the header.
  const vs = volunteerSheet_();
  out.volunteers = clearRows_(vs);

  // Orders: blank the personal columns.
  const os = SpreadsheetApp.getActive().getSheetByName(CONFIG.ORDERS_SHEET);
  if (os && os.getLastRow() > 1) {
    const headers = os.getRange(1, 1, 1, os.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
    ['contactpersoon', 'telefoon', 'email', 'adres', 'extra_notities'].forEach(function (field) {
      CONFIG.COLUMNS[field].forEach(function (name) {
        const col = headers.indexOf(name.toLowerCase());
        if (col !== -1) os.getRange(2, col + 1, os.getLastRow() - 1, 1).clearContent();
      });
    });
    out.orders = os.getLastRow() - 1;
  }

  // Dashboard tabs: names and texts with personal data.
  const blank = function (tab, columns) {
    const sheet = sheet_(tab);
    if (sheet.getLastRow() < 2) return 0;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    columns.forEach(function (c) {
      const col = headers.indexOf(c);
      if (col !== -1) sheet.getRange(2, col + 1, sheet.getLastRow() - 1, 1).clearContent();
    });
    return sheet.getLastRow() - 1;
  };
  blank('meta', ['opmerking_aangepast', 'bevestiging_tekst', 'bezorger', 'bijgewerkt_door']);
  blank('packing', ['geclaimd_door', 'ingepakt_door']);
  blank('packlog', ['klant', 'door']);
  blank('delivery', ['afgeleverd_door']);
  out.costs = blank('costs', ['ingevoerd_door', 'iban', 'beoordeeld_door']);
  clearRows_(sheet_('routes'));
  // Looked-up addresses include volunteers' home addresses.
  clearRows_(sheet_('places'));

  // Receipt photos in Drive.
  const folders = DriveApp.getFoldersByName(CONFIG.RECEIPT_FOLDER);
  while (folders.hasNext()) {
    const files = folders.next().getFiles();
    while (files.hasNext()) { files.next().setTrashed(true); out.receipts++; }
  }
  return out;
}

/**
 * Empties everything below the header. Sheets refuses to delete all rows under a frozen header,
 * so row 2 is cleared instead of deleted. Returns the number of rows that had data.
 */
function clearRows_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  if (last > 2) sheet.deleteRows(3, last - 2);
  sheet.getRange(2, 1, 1, Math.max(1, sheet.getLastColumn())).clearContent();
  return last - 1;
}

function hhmm_(minutes) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return (m < 600 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60);
}

/** Key cell → text. Sheets may turn "2026-11-15 10:12:00" into a date; keep the time if it has one. */
function keyOf_(v) {
  if (v instanceof Date) {
    const tz = tz_();
    const hasTime = Utilities.formatDate(v, tz, 'HH:mm:ss') !== '00:00:00';
    return Utilities.formatDate(v, tz, hasTime ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd');
  }
  return String(v === null || v === undefined ? '' : v).trim();
}

/** Keeps the key column of a dashboard tab as plain text, so new keys are not turned into dates. Once per tab. */
function textKeys_(tab, sheet) {
  if (tab === 'history') return;
  const flag = 'TEXT_KEYS_' + tab;
  if (prop_(flag)) return;
  // The packing log has the time first and the order number second.
  sheet.getRange(tab === 'packlog' ? 'B:B' : 'A:A').setNumberFormat('@');
  setProp_(flag, '1');
}

/** Number from a cell: 12.5, "12,5", "€ 1.234,50" and "" (→ 0) all work. */
function num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let raw = String(v === null || v === undefined ? '' : v).replace(/[€\s]/g, '');
  if (!raw) return 0;
  if (raw.indexOf(',') !== -1) raw = raw.replace(/\./g, '').replace(',', '.');
  const n = Number(raw);
  return isFinite(n) ? n : 0;
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
  return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm:ss');
}

function isoDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  return String(v || '');
}

function formatCell_(date, field) {
  const tz = tz_();
  if (/tijd/.test(field) && date.getFullYear() < 1900) return Utilities.formatDate(date, tz, 'HH:mm');
  if (field === 'geplande_tijd') return Utilities.formatDate(date, tz, 'HH:mm');
  if (/_op$|tijdstempel|timestamp/.test(field)) return Utilities.formatDate(date, tz, 'yyyy-MM-dd HH:mm:ss');
  return Utilities.formatDate(date, tz, 'yyyy-MM-dd');
}
