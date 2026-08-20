import { generateSecret, verifyTotp, generateBackupCodes, authenticateWith2FA } from "./authService";

describe("authService", () => {
  describe("generateSecret", () => {
    it("should generate a secret", () => {
      const secret = generateSecret();
      expect(secret).toBeDefined();
      expect(typeof secret).toBe("string");
    });
  });

  describe("verifyTotp", () => {
    it("should return boolean", () => {
      const result = verifyTotp("ABCDEFGHJKLMNPQRSTUVWX", "123456");
      expect(typeof result).toBe("boolean");
    });
  });

  describe("generateBackupCodes", () => {
    it("should generate 10 codes by default", () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(10);
    });
  });

  describe("authenticateWith2FA", () => {
    it("should return AuthResult type", async () => {
      const result = await authenticateWith2FA("test@example.com", "password");
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });
  });
});
