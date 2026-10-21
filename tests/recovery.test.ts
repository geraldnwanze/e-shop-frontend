import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasRecoveryActivity, recoveryRate, type RecoveryStats } from "../lib/admin/recovery.ts";

const stats = (over: Partial<RecoveryStats> = {}): RecoveryStats => ({ cartsReminded: 0, recoveredOrders: 0, recoveredRevenue: 0, byStage: { first: { orders: 0, revenue: 0 }, second: { orders: 0, revenue: 0 } }, ...over });

describe("hasRecoveryActivity", () => {
  it("is false until reminders go out or an order comes back, and for older API responses", () => {
    assert.equal(hasRecoveryActivity(undefined), false);
    assert.equal(hasRecoveryActivity(stats()), false);
    assert.equal(hasRecoveryActivity(stats({ cartsReminded: 3 })), true);
    assert.equal(hasRecoveryActivity(stats({ recoveredOrders: 1 })), true);
  });
});

describe("recoveryRate", () => {
  it("is the percent of reminded carts that became orders", () => {
    assert.equal(recoveryRate(stats({ cartsReminded: 8, recoveredOrders: 2 })), 25);
    assert.equal(recoveryRate(stats({ cartsReminded: 3, recoveredOrders: 1 })), 33);
  });

  it("caps at 100 (orders can come from carts reminded before the period) and is null with nothing reminded", () => {
    assert.equal(recoveryRate(stats({ cartsReminded: 1, recoveredOrders: 4 })), 100);
    assert.equal(recoveryRate(stats({ cartsReminded: 0, recoveredOrders: 2 })), null);
  });
});
