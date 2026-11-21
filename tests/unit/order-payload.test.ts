import { describe, expect, it } from "vitest";
import {
  LIMITS, cleanString, isEmail, isIsoDate, isPhone, validateCustomerFields, validateDeliveryFields, validateGreetingFields, validateRecipientFields,
} from "@/lib/order-payload";

const recipient = {
  firstName: "Anna", lastName: "Huber", street: "Mariahilfer Straße", houseNumber: "12/3", zip: "1060", city: "Wien", phone: "+43 664 1234567",
};
const customer = { firstName: "Paul", lastName: "Maier", email: "paul@example.at", phone: "0664 1234567", acceptedTerms: true };

describe("primitive validators", () => {
  it("isEmail", () => {
    expect(isEmail("anna@example.at")).toBe(true);
    expect(isEmail("  anna@example.at  ")).toBe(true);
    expect(isEmail("anna@example")).toBe(false);
    expect(isEmail("anna@@example.at")).toBe(false);
    expect(isEmail("anna example@x.at")).toBe(false);
    expect(isEmail("")).toBe(false);
  });

  it("isPhone accepts local and international formats", () => {
    expect(isPhone("+43 664 1234567")).toBe(true);
    expect(isPhone("0664 1234567")).toBe(true);
    expect(isPhone("(01) 234-5678")).toBe(true);
    expect(isPhone("12345")).toBe(false); // too short
    expect(isPhone("+43 664 123456789012345")).toBe(false); // too long
    expect(isPhone("abc")).toBe(false);
  });

  it("isIsoDate", () => {
    expect(isIsoDate("2026-09-12")).toBe(true);
    expect(isIsoDate("12.09.2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("validateRecipientFields", () => {
  it("passes a complete recipient", () => {
    expect(validateRecipientFields(recipient)).toEqual({});
  });

  it("reports every missing required field", () => {
    const e = validateRecipientFields({});
    expect(Object.keys(e).sort()).toEqual(["city", "firstName", "houseNumber", "lastName", "phone", "street", "zip"]);
    expect(e.firstName).toBe("Bitte gib den Vornamen an.");
    expect(validateRecipientFields({ ...recipient, firstName: "   " }).firstName).toBeDefined();
  });

  it("validates the postal code and phone number", () => {
    expect(validateRecipientFields({ ...recipient, zip: "106" }).zip).toBe("Bitte gib eine gültige Postleitzahl ein.");
    expect(validateRecipientFields({ ...recipient, zip: "0123" }).zip).toBeDefined();
    expect(validateRecipientFields({ ...recipient, zip: " 1060 " })).toEqual({});
    expect(validateRecipientFields({ ...recipient, phone: "" }).phone).toBe("Bitte gib eine Telefonnummer für die Zustellung an.");
    expect(validateRecipientFields({ ...recipient, phone: "123" }).phone).toBe("Bitte gib eine gültige Telefonnummer ein.");
  });

  it("enforces length limits on optional fields too", () => {
    expect(validateRecipientFields({ ...recipient, company: "x".repeat(LIMITS.company + 1) }).company).toBe(`Maximal ${LIMITS.company} Zeichen.`);
    expect(validateRecipientFields({ ...recipient, addition: "x".repeat(LIMITS.addition) })).toEqual({});
    expect(validateRecipientFields({ ...recipient, houseNumber: "x".repeat(LIMITS.houseNumber + 1) }).houseNumber).toBeDefined();
  });
});

describe("validateCustomerFields", () => {
  it("passes a complete customer", () => {
    expect(validateCustomerFields(customer)).toEqual({});
  });

  it("requires name, e-mail, phone and accepted terms", () => {
    const e = validateCustomerFields({});
    expect(Object.keys(e).sort()).toEqual(["acceptedTerms", "email", "firstName", "lastName", "phone"]);
    expect(e.acceptedTerms).toBe("Bitte bestätige die AGB und die Datenschutzerklärung.");
    expect(validateCustomerFields({ ...customer, acceptedTerms: false }).acceptedTerms).toBeDefined();
  });

  it("distinguishes empty from invalid e-mail and phone", () => {
    expect(validateCustomerFields({ ...customer, email: "" }).email).toBe("Bitte gib deine E-Mail-Adresse an.");
    expect(validateCustomerFields({ ...customer, email: "nope" }).email).toBe("Bitte gib eine gültige E-Mail-Adresse ein.");
    expect(validateCustomerFields({ ...customer, email: `${"a".repeat(LIMITS.email)}@x.at` }).email).toBeDefined();
    expect(validateCustomerFields({ ...customer, phone: "" }).phone).toBe("Bitte gib deine Telefonnummer an.");
    expect(validateCustomerFields({ ...customer, phone: "12" }).phone).toBe("Bitte gib eine gültige Telefonnummer ein.");
  });
});

describe("greeting & delivery", () => {
  it("limits the message length and the sender name", () => {
    expect(validateGreetingFields({ message: "Alles Liebe" }, 200)).toEqual({});
    expect(validateGreetingFields({ message: "x".repeat(201) }, 200).message).toBe("Die Grußbotschaft darf maximal 200 Zeichen lang sein.");
    expect(validateGreetingFields({ senderName: "x".repeat(LIMITS.name + 1) }, 200).senderName).toBeDefined();
    expect(validateGreetingFields({ senderName: "x".repeat(LIMITS.name + 1), anonymous: true }, 200)).toEqual({}); // name ignored when anonymous
  });

  it("requires an ISO date and limits the note", () => {
    expect(validateDeliveryFields({ date: "2026-09-12" })).toEqual({});
    expect(validateDeliveryFields({}).date).toBe("Bitte wähle ein Lieferdatum.");
    expect(validateDeliveryFields({ date: "12.09.2026" }).date).toBeDefined();
    expect(validateDeliveryFields({ date: "2026-09-12", note: "x".repeat(LIMITS.note + 1) }).note).toBe(`Maximal ${LIMITS.note} Zeichen.`);
  });

  it("cleanString trims, truncates and drops empty values", () => {
    expect(cleanString("  hallo ")).toBe("hallo");
    expect(cleanString("   ")).toBeUndefined();
    expect(cleanString(42)).toBeUndefined();
    expect(cleanString("abcdef", 3)).toBe("abc");
  });
});
