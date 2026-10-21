export interface RecoveryStats {
  cartsReminded: number;
  recoveredOrders: number;
  recoveredRevenue: number;
  byStage: { first: { orders: number; revenue: number }; second: { orders: number; revenue: number } };
}

/** Whether the dashboard has anything to say about reminders: either some went out or an order came back. */
export function hasRecoveryActivity(recovery: RecoveryStats | undefined): recovery is RecoveryStats {
  return recovery !== undefined && (recovery.cartsReminded > 0 || recovery.recoveredOrders > 0);
}

/** Share of reminded carts that turned into an order, as a whole percent (never above 100). Null with nothing reminded. */
export function recoveryRate(recovery: RecoveryStats): number | null {
  if (recovery.cartsReminded <= 0) return null;

  return Math.min(100, Math.round((recovery.recoveredOrders / recovery.cartsReminded) * 100));
}
