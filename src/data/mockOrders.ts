import { mapSheetRowsToOrders, type GoogleSheetOrderRow } from "./googleSheetAdapter";

// Demo rows in the same shape as the Google Sheet. `extra_notities` uses the
// "Rol: Ja | dag: dagdeel" format the agenda parser understands.
const mockSheetRows: GoogleSheetOrderRow[] = [
  {
    order_id: "ORDER-001",
    leverdatum: "2026-12-30",
    leverancier_naam: "Bezorger Anna",
    locatie_naam: "Sportschool De Kracht",
    contactpersoon: "Anna de Vries",
    telefoon: "+31600000001",
    adres: "Stationsweg 12",
    postcode: "1431EG",
    plaats: "Aalsmeer",
    geplande_tijd: "10:30",
    status: "open",
    oliebollen_met_krenten: 30,
    oliebollen_zonder_krenten: 20,
    extra_notities: "Fietskoerier: Ja | Woensdag 30 december: ochtend, Donderdag 31 december: ochtend"
  },
  {
    order_id: "ORDER-002",
    leverdatum: "2026-12-30",
    leverancier_naam: "Bezorger Bram",
    locatie_naam: "Kantoor Bloemenveiling",
    contactpersoon: "Bram Jansen",
    telefoon: "+31600000002",
    adres: "Legmeerdijk 313",
    postcode: "1431GB",
    plaats: "Aalsmeer",
    geplande_tijd: "11:15",
    status: "onderweg",
    oliebollen_met_krenten: 40,
    oliebollen_zonder_krenten: 10,
    extra_notities: "Autokoerier: Ja | Woensdag 30 december: middag || Inpakken: Ja | Dinsdag 29 december"
  },
  {
    order_id: "ORDER-003",
    leverdatum: "2026-12-30",
    leverancier_naam: "Bezorger Anna",
    locatie_naam: "Basisschool De Wegwijzer",
    contactpersoon: "Anna de Vries",
    telefoon: "+31600000003",
    adres: "Ophelialaan 99",
    postcode: "1431HM",
    plaats: "Aalsmeer",
    geplande_tijd: "11:50",
    status: "open",
    oliebollen_met_krenten: 12,
    oliebollen_zonder_krenten: 18,
    extra_notities: "Fietskoerier: Ja | Woensdag 30 december: ochtend"
  },
  {
    order_id: "ORDER-004",
    leverdatum: "2026-12-30",
    leverancier_naam: "Bezorger Bram",
    locatie_naam: "Zorgcentrum Kloosterhof",
    contactpersoon: "Bram Jansen",
    telefoon: "+31600000004",
    adres: "Clematisstraat 16",
    postcode: "1431RR",
    plaats: "Aalsmeer",
    geplande_tijd: "13:20",
    status: "bezorgd",
    oliebollen_met_krenten: 20,
    oliebollen_zonder_krenten: 20,
    extra_notities: "Autokoerier: Ja | Woensdag 30 december: middag"
  },
  {
    order_id: "ORDER-005",
    leverdatum: "2026-12-31",
    leverancier_naam: "Bezorger Anna",
    locatie_naam: "Gemeentehuis",
    contactpersoon: "Anna de Vries",
    telefoon: "+31600000005",
    adres: "Raadhuisplein 1",
    postcode: "1431EH",
    plaats: "Aalsmeer",
    geplande_tijd: "10:00",
    status: "open",
    oliebollen_met_krenten: 50,
    oliebollen_zonder_krenten: 25,
    extra_notities: "Fietskoerier: Ja | Donderdag 31 december: ochtend"
  },
  {
    order_id: "ORDER-006",
    leverdatum: "2026-12-31",
    leverancier_naam: "Bezorger Chris",
    locatie_naam: "Brandweerkazerne",
    contactpersoon: "Chris Bakker",
    telefoon: "+31600000006",
    adres: "Zwarteweg 87",
    postcode: "1431VL",
    plaats: "Aalsmeer",
    geplande_tijd: "12:30",
    status: "open",
    oliebollen_met_krenten: 25,
    oliebollen_zonder_krenten: 15,
    extra_notities: "Autokoerier: Ja | Donderdag 31 december 11:00-15:00 || Oliebollenbar: Ja | Woensdag 30 december"
  }
];

export const mockOrders = mapSheetRowsToOrders(mockSheetRows);
