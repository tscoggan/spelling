import { createHash } from "crypto";

export const AGREEMENT_VERSIONS = {
  coppa_certification: "1.1",
  school_tos: "1.0",
  student_dpa: "1.0",
} as const;

export type AgreementType = keyof typeof AGREEMENT_VERSIONS;

export const AGREEMENT_TEXT: Record<AgreementType, string> = {
  coppa_certification:
    "I certify that I am an authorized representative of this school and am legally permitted to create student accounts on behalf of the school under COPPA and applicable law. The school assumes responsibility for obtaining any required parental consents. The School represents and warrants that it has obtained all necessary parental consents under COPPA and applicable law.",
  school_tos:
    "By creating a school account, the school agrees to the Spelling Playground Terms of Service and Student Data Privacy Policy, including the school's obligations to protect student data and comply with applicable education privacy laws.",
  student_dpa:
    "The school agrees to the Student Data Privacy Addendum, which governs the collection, use, and protection of student personal information in accordance with FERPA, COPPA, and applicable state student privacy laws. The school acknowledges its role as the data controller for student information and Spelling Playground's role as a service provider acting on the school's behalf.",
};

export function hashAgreementText(type: AgreementType): string {
  return createHash("sha256").update(AGREEMENT_TEXT[type]).digest("hex");
}
