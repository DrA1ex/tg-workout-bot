import {
    convertToUserTimezone,
    dateKeyInTimezone,
    dateFromUserDateInput,
    getTimezoneOffsetMinutes,
    getTimezoneOffsetSQL,
    isValidTimezone,
    normalizeTimezoneOffset,
    startOfUserDate,
} from "../../src/utils/timezone.js";

describe("timezone utilities", () => {
    it("normalizes one-digit hour UTC offsets", () => {
        expect(normalizeTimezoneOffset("+5:00")).toBe("+05:00");
        expect(normalizeTimezoneOffset("-3:30")).toBe("-03:30");
        expect(normalizeTimezoneOffset("utc")).toBe("UTC");
    });

    it("preserves IANA timezone names so DST can be calculated for each date", () => {
        expect(normalizeTimezoneOffset("Asia/Yekaterinburg")).toBe("Asia/Yekaterinburg");
        expect(normalizeTimezoneOffset("Europe/Berlin")).toBe("Europe/Berlin");
    });

    it("validates timezone inputs", () => {
        expect(isValidTimezone("UTC")).toBe(true);
        expect(isValidTimezone("+5:00")).toBe(true);
        expect(isValidTimezone("+05:00")).toBe(true);
        expect(isValidTimezone("Asia/Yekaterinburg")).toBe(true);
        expect(isValidTimezone("Europe/Mosc")).toBe(false);
        expect(isValidTimezone("+13:00")).toBe(true);
        expect(isValidTimezone("+14:30")).toBe(false);
    });

    it("uses normalized offsets for SQLite modifiers", () => {
        expect(getTimezoneOffsetSQL("+5:00")).toBe("+5 hours");
        expect(getTimezoneOffsetSQL("-3:30")).toBe("-3 hours 30 minutes");
        expect(getTimezoneOffsetSQL("Asia/Yekaterinburg")).toBe("+5 hours");
    });

    it("calculates timezone offset minutes", () => {
        expect(getTimezoneOffsetMinutes("UTC")).toBe(0);
        expect(getTimezoneOffsetMinutes("+5:00")).toBe(300);
        expect(getTimezoneOffsetMinutes("-3:30")).toBe(-210);
        expect(getTimezoneOffsetMinutes("Asia/Yekaterinburg")).toBe(300);
    });

    it("uses the date-specific DST offset for IANA zones", () => {
        expect(getTimezoneOffsetMinutes("America/New_York", new Date("2026-01-15T12:00:00Z"))).toBe(-300);
        expect(getTimezoneOffsetMinutes("America/New_York", new Date("2026-06-15T12:00:00Z"))).toBe(-240);
        expect(startOfUserDate("2026-06-23", "America/New_York").toISOString()).toBe("2026-06-23T04:00:00.000Z");
        expect(startOfUserDate("2026-01-23", "America/New_York").toISOString()).toBe("2026-01-23T05:00:00.000Z");
    });

    it("creates UTC dates from user date input using user timezone noon", () => {
        expect(dateFromUserDateInput("2026-06-12", "UTC").toISOString()).toBe("2026-06-12T12:00:00.000Z");
        expect(dateFromUserDateInput("2026-06-12", "+5:00").toISOString()).toBe("2026-06-12T07:00:00.000Z");
        expect(dateFromUserDateInput("2026-06-12", "Asia/Yekaterinburg").toISOString()).toBe("2026-06-12T07:00:00.000Z");
        expect(dateFromUserDateInput("2026-06-12", "-03:30").toISOString()).toBe("2026-06-12T15:30:00.000Z");
    });

    it("uses normalized offsets for date conversion", () => {
        const date = new Date("2026-06-11T20:00:00.000Z");

        expect(convertToUserTimezone(date, "+5:00").toISOString()).toBe("2026-06-12T01:00:00.000Z");
        expect(convertToUserTimezone(date, "Asia/Yekaterinburg").toISOString()).toBe("2026-06-12T01:00:00.000Z");
    });

    it("gets date keys in user timezone", () => {
        expect(dateKeyInTimezone(new Date("2026-06-11T20:00:00.000Z"), "+05:00")).toBe("2026-06-12");
        expect(dateKeyInTimezone(new Date("2026-06-12T02:00:00.000Z"), "-03:30")).toBe("2026-06-11");
    });

    it("creates UTC start boundaries for user dates", () => {
        expect(startOfUserDate("2026-06-12", "UTC").toISOString()).toBe("2026-06-12T00:00:00.000Z");
        expect(startOfUserDate("2026-06-12", "+05:00").toISOString()).toBe("2026-06-11T19:00:00.000Z");
        expect(startOfUserDate("2026-06-12", "-03:30").toISOString()).toBe("2026-06-12T03:30:00.000Z");
    });
});
