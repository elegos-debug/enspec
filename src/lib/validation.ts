import { z } from "zod";
import { eventConfig } from "./config";

export const registrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Full name must contain at least 3 characters.")
    .max(100, "Full name must be 100 characters or fewer.")
    .regex(/^[\p{L}\p{M} .'’-]+$/u, "Enter a valid full name."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s().-]{7,19}$/u, "Enter a valid phone number."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  filiere: z.enum(eventConfig.filieres as readonly [string, ...string[]], {
    error: "Select a valid filière.",
  }),
  academicYear: z.enum(eventConfig.academicYears as readonly [string, ...string[]], {
    error: "Select a valid academic year.",
  }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}
