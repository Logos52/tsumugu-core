// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { resetUserStoreForTest } from "../store/userStore.js";
import { devForceLogin, getSession, isLoggedIn, resetSessionForTest } from "./session.js";

describe("session", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserStoreForTest();
    resetSessionForTest();
  });

  it("isLoggedIn is false when logged out", () => {
    expect(isLoggedIn()).toBe(false);
    expect(getSession().status).toBe("logged-out");
  });

  it("isLoggedIn tracks login via userStore", async () => {
    await devForceLogin("user@example.com");
    expect(isLoggedIn()).toBe(true);
    expect(getSession().status).toBe("logged-in");
    expect(getSession().email).toBe("user@example.com");
  });

  it("isLoggedIn falls back to tsumugu-session key", () => {
    localStorage.setItem("tsumugu-session", JSON.stringify({ userId: "u_x", email: "x@test.com" }));
    expect(isLoggedIn()).toBe(true);
  });
});