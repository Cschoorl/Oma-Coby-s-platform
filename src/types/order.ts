export type DeliveryStatus = "open" | "onderweg" | "bezorgd";

export interface Order {
  id: string;
  deliveryDate: string;
  supplierName: string;
  locationName: string;
  contactPerson: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  plannedTime: string;
  status: DeliveryStatus;
  withRaisins: number;
  withoutRaisins: number;
  extras?: string;
}
