import test from "node:test";
import assert from "node:assert/strict";
import {
  registerSchema,
  jobSchema,
  pagination,
  skillMatch,
  stripHtml,
} from "../lib/server/domain.ts";
import {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt,
} from "../lib/server/crypto.ts";
test("registration blocks privilege escalation and requires an employer company", () => {
  assert.equal(
    registerSchema.safeParse({
      name: "Test",
      email: "test@example.com",
      password: "strong-pass-123",
      role: "admin",
    }).success,
    false,
  );
  assert.equal(
    registerSchema.safeParse({
      name: "Test",
      email: "test@example.com",
      password: "strong-pass-123",
      role: "employer",
    }).success,
    false,
  );
});
test("job validation rejects unsupported modes and missing descriptions", () => {
  assert.equal(
    jobSchema.safeParse({
      title: "Engineer",
      location: "Remote",
      work_mode: "invalid",
      employment_type: "Full-time",
      skills: [],
      description: "short",
    }).success,
    false,
  );
});
test("pagination bounds untrusted input", () => {
  assert.deepEqual(pagination(new URLSearchParams("page=-4&limit=900")), {
    page: 1,
    limit: 50,
    offset: 0,
  });
  assert.deepEqual(pagination(new URLSearchParams("page=2&limit=9")), {
    page: 2,
    limit: 9,
    offset: 9,
  });
});
test("skill overlap is case insensitive and avoids false matches", () => {
  assert.deepEqual(skillMatch(["react", "SQL"], ["React", "TypeScript"]), {
    score: 50,
    matched: ["React"],
    missing: ["TypeScript"],
    method: "Deterministic skill overlap; not an AI assessment",
  });
});
test("imported descriptions remove script and markup", () => {
  assert.equal(
    stripHtml("<script>alert(1)</script><p>Hello &amp; goodbye</p>"),
    "Hello & goodbye",
  );
});
test("password hashes are salted and verify correctly", async () => {
  const a = await hashPassword("correct horse battery");
  const b = await hashPassword("correct horse battery");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("correct horse battery", a), true);
  assert.equal(await verifyPassword("incorrect", a), false);
});
test("JWTs reject tampering and wrong signing secrets", async () => {
  const token = await signJwt("user-123", "test-only-secret");
  assert.equal(await verifyJwt(token, "test-only-secret"), "user-123");
  assert.equal(await verifyJwt(token, "wrong-secret"), null);
  assert.equal(await verifyJwt(token + "x", "test-only-secret"), null);
});
