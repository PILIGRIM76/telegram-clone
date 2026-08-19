import { generateSecret, verifyTotp, generateBackupCodes, authenticateWith2FA } from "./authService";

jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,mock"),
}));

// Mock otplib to avoid ESM issues
jest.mock("otplib", () => ({
  authenticator: {
    generateSecret: jest.fn().mockReturnValue("TESTSECRET123"),
    generate: jest.fn().mockReturnValue("123456"),
    keyuri: jest.fn().mockReturnValue("otpauth://"),
    verify: jest.fn().mockReturnValue(true),
  },
}));

describe("authService", () => {
  describe("generateSecret", () => {
    it("should generate a secret", () => {
      const secret = generateSecret("test@example.com");
      expect(secret).toBe("TESTSECRET123");
    });
  });

  describe("verifyTotp", () => {
    it("should verify correct code", () => {
      expect(verifyTotp("123456", "secret")).toBe(true);
    });
  });

  describe("generateBackupCodes", () => {
    it("should generate 10 codes by default", () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(10);
    });
  });

  describe("authenticateWith2FA", () => {
    it("should succeed without 2FA", async () => {
      const result = await authenticateWith2FA("test@example.com", "password");
      expect(result.success).toBe(true);
    });
  });
});
