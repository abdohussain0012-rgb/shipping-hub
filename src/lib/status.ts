// Normalized shipment statuses. Every courier's raw status maps to one of these (see status_map).
export const STATUSES = [
  'pending_pickup',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'returned',
  'cancelled',
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  pending_pickup: 'بانتظار الاستلام',
  in_transit: 'في الطريق',
  out_for_delivery: 'خرجت للتسليم',
  delivered: 'تم التسليم',
  failed: 'فشل التسليم',
  returned: 'مرتجع',
  cancelled: 'ملغي',
};

// A shipment is "closed" once nothing more is expected from the courier.
export const CLOSED_STATUSES: Status[] = ['delivered', 'returned', 'cancelled'];

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export function isClosed(status: string) {
  return (CLOSED_STATUSES as string[]).includes(status);
}
