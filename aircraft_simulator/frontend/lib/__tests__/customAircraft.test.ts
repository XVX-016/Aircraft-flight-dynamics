import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    CUSTOM_AIRCRAFT_STORAGE_KEY,
    type CustomAircraftDefinition,
    deleteAircraft,
    duplicateAircraft,
    loadCustomAircraftRegistry,
    makeDefaultCustomAircraft,
    saveCustomAircraftRegistry,
    upsertAircraft,
    validateCustomAircraft,
} from "../customAircraft";

function rawGet(): CustomAircraftDefinition[] | null {
    const raw = window.localStorage.getItem(CUSTOM_AIRCRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomAircraftDefinition[]) : null;
}

beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

function makeAircraft(overrides: Partial<CustomAircraftDefinition> = {}): CustomAircraftDefinition {
    return { ...makeDefaultCustomAircraft(), ...overrides };
}

describe("loadCustomAircraftRegistry", () => {
    it("returns empty array when storage is empty", () => {
        expect(loadCustomAircraftRegistry()).toEqual([]);
    });

    it("returns empty array when stored value is not an array", () => {
        window.localStorage.setItem(CUSTOM_AIRCRAFT_STORAGE_KEY, JSON.stringify({ bad: true }));
        expect(loadCustomAircraftRegistry()).toEqual([]);
    });

    it("returns empty array and does not throw on corrupt JSON", () => {
        window.localStorage.setItem(CUSTOM_AIRCRAFT_STORAGE_KEY, "{{not-json}}");
        expect(() => loadCustomAircraftRegistry()).not.toThrow();
        expect(loadCustomAircraftRegistry()).toEqual([]);
    });

    it("returns previously saved items intact", () => {
        const a = makeAircraft({ id: "custom-aaa", name: "Alpha" });
        const b = makeAircraft({ id: "custom-bbb", name: "Beta" });
        saveCustomAircraftRegistry([a, b]);

        const loaded = loadCustomAircraftRegistry();
        expect(loaded).toHaveLength(2);
        expect(loaded[0].id).toBe("custom-aaa");
        expect(loaded[1].id).toBe("custom-bbb");
    });
});

describe("upsertAircraft - insert", () => {
    it("adds a new aircraft to an empty registry", () => {
        const a = makeAircraft({ name: "Glider One" });
        const result = upsertAircraft(a);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Glider One");
    });

    it("persists to localStorage so a fresh load sees the record", () => {
        const a = makeAircraft({ name: "Persisted" });
        upsertAircraft(a);

        const reloaded = loadCustomAircraftRegistry();
        expect(reloaded).toHaveLength(1);
        expect(reloaded[0].name).toBe("Persisted");
    });

    it("stamps updated_at on insert", () => {
        vi.setSystemTime(new Date("2026-01-15T10:00:00.000Z"));
        const a = makeAircraft();
        const result = upsertAircraft(a);

        expect(result[0].updated_at).toBe("2026-01-15T10:00:00.000Z");
    });

    it("preserves supplied created_at on insert", () => {
        const originalCreated = "2025-06-01T08:00:00.000Z";
        const a = makeAircraft({ created_at: originalCreated });
        const result = upsertAircraft(a);

        expect(result[0].created_at).toBe(originalCreated);
    });

    it("inserts multiple aircraft without overwriting earlier ones", () => {
        upsertAircraft(makeAircraft({ id: "custom-1", name: "First" }));
        upsertAircraft(makeAircraft({ id: "custom-2", name: "Second" }));
        upsertAircraft(makeAircraft({ id: "custom-3", name: "Third" }));

        const registry = loadCustomAircraftRegistry();
        expect(registry).toHaveLength(3);
        expect(registry.map((a) => a.name)).toEqual(["First", "Second", "Third"]);
    });
});

describe("upsertAircraft - update / edit", () => {
    it("updates an existing record in place by id", () => {
        const original = makeAircraft({ id: "custom-edit", name: "Before" });
        upsertAircraft(original);

        const edited = { ...original, name: "After" };
        const result = upsertAircraft(edited);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("After");
    });

    it("stamps a new updated_at on edit without changing created_at", () => {
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
        const original = makeAircraft({ id: "custom-ts" });
        upsertAircraft(original);

        vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
        const result = upsertAircraft({ ...original, name: "Updated" });

        expect(result[0].created_at).toBe(original.created_at);
        expect(result[0].updated_at).toBe("2026-06-01T12:00:00.000Z");
    });

    it("edit is reflected on the next independent load", () => {
        const a = makeAircraft({ id: "custom-reload", name: "Original" });
        upsertAircraft(a);
        upsertAircraft({ ...a, name: "Renamed" });

        const loaded = loadCustomAircraftRegistry();
        expect(loaded[0].name).toBe("Renamed");
    });

    it("edit preserves all nested aero/params fields not in the patch", () => {
        const original = makeAircraft({ id: "custom-nested" });
        upsertAircraft(original);

        const patched = { ...original, name: "Patched" };
        const result = upsertAircraft(patched);

        expect(result[0].aero.Mq).toBe(original.aero.Mq);
        expect(result[0].params.Cm_de_per_rad).toBe(original.params.Cm_de_per_rad);
        expect(result[0].geometry.cg_location).toBe(original.geometry.cg_location);
    });
});

describe("deleteAircraft", () => {
    it("removes the target aircraft by id", () => {
        upsertAircraft(makeAircraft({ id: "custom-del", name: "ToDelete" }));
        upsertAircraft(makeAircraft({ id: "custom-keep", name: "ToKeep" }));

        const result = deleteAircraft("custom-del");

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("custom-keep");
    });

    it("persists the deletion so a fresh load does not see the record", () => {
        upsertAircraft(makeAircraft({ id: "custom-gone" }));
        deleteAircraft("custom-gone");

        expect(loadCustomAircraftRegistry()).toHaveLength(0);
    });

    it("is a no-op and does not throw when id does not exist", () => {
        upsertAircraft(makeAircraft({ id: "custom-exists" }));
        expect(() => deleteAircraft("custom-nonexistent")).not.toThrow();

        expect(loadCustomAircraftRegistry()).toHaveLength(1);
    });

    it("leaves registry empty after deleting the only aircraft", () => {
        const a = makeAircraft({ id: "custom-only" });
        upsertAircraft(a);
        deleteAircraft(a.id);

        expect(loadCustomAircraftRegistry()).toEqual([]);
        expect(rawGet()).toEqual([]);
    });
});

describe("duplicateAircraft", () => {
    it("adds a copy with a different id", () => {
        const source = makeAircraft({ id: "custom-src", name: "Original" });
        upsertAircraft(source);

        const result = duplicateAircraft("custom-src");

        expect(result).toHaveLength(2);
        expect(result[1].id).not.toBe("custom-src");
    });

    it('prefixes the duplicate name with "Copy of "', () => {
        const source = makeAircraft({ id: "custom-src2", name: "Research UAV" });
        upsertAircraft(source);

        const result = duplicateAircraft("custom-src2");
        expect(result[1].name).toBe("Copy of Research UAV");
    });

    it("gives the copy fresh created_at and updated_at timestamps", () => {
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
        const source = makeAircraft({ id: "custom-src3" });
        upsertAircraft(source);

        vi.setSystemTime(new Date("2026-03-15T09:00:00.000Z"));
        const result = duplicateAircraft("custom-src3");
        const copy = result[1];

        expect(copy.created_at).toBe("2026-03-15T09:00:00.000Z");
        expect(copy.updated_at).toBe("2026-03-15T09:00:00.000Z");
        expect(result[0].created_at).toBe(source.created_at);
    });

    it("deep-clones nested objects - mutating the copy does not affect the source", () => {
        const source = makeAircraft({ id: "custom-deep" });
        upsertAircraft(source);

        const result = duplicateAircraft("custom-deep");
        const copy = result[1];

        copy.aero.Mq = 999;

        const stored = loadCustomAircraftRegistry();
        const storedSource = stored.find((a) => a.id === "custom-deep");
        expect(storedSource?.aero.Mq).toBe(source.aero.Mq);
        expect(storedSource?.aero.Mq).not.toBe(999);
    });

    it("persists the duplicate so a fresh load sees both records", () => {
        upsertAircraft(makeAircraft({ id: "custom-persist" }));
        duplicateAircraft("custom-persist");

        expect(loadCustomAircraftRegistry()).toHaveLength(2);
    });

    it("is a no-op when source id does not exist", () => {
        upsertAircraft(makeAircraft({ id: "custom-real" }));
        const result = duplicateAircraft("custom-nonexistent");

        expect(result).toHaveLength(1);
    });
});

describe("full registry lifecycle", () => {
    it("completes the entire CRUD sequence with correct state at each step", () => {
        const alpha = makeAircraft({ id: "custom-alpha", name: "Alpha" });
        const beta = makeAircraft({ id: "custom-beta", name: "Beta" });
        upsertAircraft(alpha);
        upsertAircraft(beta);
        expect(loadCustomAircraftRegistry()).toHaveLength(2);

        const afterReload = loadCustomAircraftRegistry();
        expect(afterReload.find((a) => a.id === "custom-alpha")?.name).toBe("Alpha");
        expect(afterReload.find((a) => a.id === "custom-beta")?.name).toBe("Beta");

        upsertAircraft({ ...alpha, name: "Alpha v2" });
        const afterEdit = loadCustomAircraftRegistry();
        expect(afterEdit.find((a) => a.id === "custom-alpha")?.name).toBe("Alpha v2");
        expect(afterEdit.find((a) => a.id === "custom-beta")?.name).toBe("Beta");
        expect(afterEdit).toHaveLength(2);

        const afterDup = duplicateAircraft("custom-beta");
        expect(afterDup).toHaveLength(3);
        const betaCopy = afterDup.find((a) => a.name === "Copy of Beta");
        expect(betaCopy).toBeDefined();
        expect(betaCopy?.id).not.toBe("custom-beta");

        const afterDelete = deleteAircraft("custom-beta");
        expect(afterDelete).toHaveLength(2);
        expect(afterDelete.find((a) => a.id === "custom-beta")).toBeUndefined();
        expect(afterDelete.find((a) => a.name === "Copy of Beta")).toBeDefined();
        expect(afterDelete.find((a) => a.id === "custom-alpha")).toBeDefined();

        const finalLoad = loadCustomAircraftRegistry();
        expect(finalLoad).toHaveLength(2);
        expect(finalLoad.map((a) => a.id).sort()).toEqual([betaCopy?.id, "custom-alpha"].sort());
    });
});

describe("validateCustomAircraft", () => {
    it("returns no errors for a valid default aircraft", () => {
        expect(validateCustomAircraft(makeDefaultCustomAircraft())).toHaveLength(0);
    });

    it("rejects negative mass", () => {
        const a = makeAircraft();
        a.inertia.mass = -500;
        const errors = validateCustomAircraft(a);
        expect(errors.some((e) => e.includes("Mass"))).toBe(true);
    });

    it("rejects zero Iyy", () => {
        const a = makeAircraft();
        a.inertia.Iyy = 0;
        expect(validateCustomAircraft(a).some((e) => e.includes("Iyy"))).toBe(true);
    });

    it("rejects CG outside [0, 1]", () => {
        const a = makeAircraft();
        a.geometry.cg_location = 1.5;
        expect(validateCustomAircraft(a).some((e) => e.includes("CG"))).toBe(true);
    });

    it("rejects zero Cm_de_per_rad", () => {
        const a = makeAircraft();
        a.params.Cm_de_per_rad = 0;
        expect(validateCustomAircraft(a).some((e) => e.includes("Cm_de_per_rad"))).toBe(true);
    });

    it("rejects zero Mq", () => {
        const a = makeAircraft();
        a.aero.Mq = 0;
        expect(validateCustomAircraft(a).some((e) => e.includes("Mq"))).toBe(true);
    });

    it("rejects empty name", () => {
        const a = makeAircraft();
        a.name = "   ";
        expect(validateCustomAircraft(a).some((e) => e.includes("name"))).toBe(true);
    });

    it("accumulates multiple errors simultaneously", () => {
        const a = makeAircraft();
        a.inertia.mass = -1;
        a.geometry.cg_location = 2;
        a.aero.Mq = 0;
        a.name = "";
        const errors = validateCustomAircraft(a);
        expect(errors.length).toBeGreaterThanOrEqual(4);
    });
});
