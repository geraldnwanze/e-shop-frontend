import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { blankSchedule, describeSchedule, ordinal, toSchedulePayload, validateSchedule } from "../lib/admin/campaign-series.ts";

describe("ordinal", () => {
  it("handles the awkward ones", () => {
    assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 28].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "28th"]);
  });
});

describe("describeSchedule", () => {
  it("reads naturally for weekly and monthly series", () => {
    assert.equal(describeSchedule({ frequency: "weekly", dayOfWeek: 2, dayOfMonth: null, sendTime: "08:00" }), "Every Tuesday at 08:00");
    assert.equal(describeSchedule({ frequency: "weekly", dayOfWeek: 7, dayOfMonth: null, sendTime: "18:30" }), "Every Sunday at 18:30");
    assert.equal(describeSchedule({ frequency: "monthly", dayOfWeek: null, dayOfMonth: 15, sendTime: "09:00" }), "On the 15th of every month at 09:00");
  });
});

describe("toSchedulePayload", () => {
  it("sends only the day that applies and turns a blank end date into null", () => {
    assert.deepEqual(toSchedulePayload({ ...blankSchedule, frequency: "weekly", dayOfWeek: 3, dayOfMonth: 20 }), { frequency: "weekly", day_of_week: 3, day_of_month: null, send_time: "08:00", ends_on: null });
    assert.deepEqual(toSchedulePayload({ ...blankSchedule, frequency: "monthly", dayOfMonth: 20, endsOn: "2027-01-31" }), { frequency: "monthly", day_of_week: null, day_of_month: 20, send_time: "08:00", ends_on: "2027-01-31" });
  });
});

describe("validateSchedule", () => {
  const today = new Date(2026, 9, 12);

  it("accepts the defaults and a sensible end date", () => {
    assert.deepEqual(validateSchedule(blankSchedule, today), {});
    assert.deepEqual(validateSchedule({ ...blankSchedule, endsOn: "2026-12-31" }, today), {});
  });

  it("rejects a bad time, a day outside the allowed range, and an end date that is not in the future", () => {
    assert.ok(validateSchedule({ ...blankSchedule, sendTime: "" }, today).sendTime);
    assert.ok(validateSchedule({ ...blankSchedule, sendTime: "25:00" }, today).sendTime);
    assert.ok(validateSchedule({ ...blankSchedule, frequency: "monthly", dayOfMonth: 29 }, today).dayOfMonth);
    assert.ok(validateSchedule({ ...blankSchedule, frequency: "monthly", dayOfMonth: 0 }, today).dayOfMonth);
    assert.ok(validateSchedule({ ...blankSchedule, dayOfWeek: 8 }, today).dayOfWeek);
    assert.ok(validateSchedule({ ...blankSchedule, endsOn: "2026-10-12" }, today).endsOn);
    assert.ok(validateSchedule({ ...blankSchedule, endsOn: "soon" }, today).endsOn);
  });

  it("does not check the day that does not apply", () => {
    assert.deepEqual(validateSchedule({ ...blankSchedule, frequency: "weekly", dayOfMonth: 99 }, today), {});
    assert.deepEqual(validateSchedule({ ...blankSchedule, frequency: "monthly", dayOfWeek: 99 }, today), {});
  });
});
