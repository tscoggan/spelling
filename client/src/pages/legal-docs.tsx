import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Shield, Lock } from "lucide-react";

interface DocConfig {
  title: string;
  version: string;
  effectiveDate: string;
  icon: React.ElementType;
  summary: string;
  sections: { heading: string; body: string }[];
}

const DOCS: Record<string, DocConfig> = {
  "school-tos": {
    title: "School Terms of Service",
    version: "1.0",
    effectiveDate: "January 1, 2025",
    icon: FileText,
    summary:
      "These terms govern the relationship between Spelling Playground and schools that create accounts on the platform. By creating a school account, the authorized school administrator accepts these terms on behalf of the school.",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: "[Placeholder] The school, through its authorized administrator, agrees to be bound by these Terms of Service. Use of the platform by teachers and students constitutes acceptance of these terms.",
      },
      {
        heading: "2. School Responsibilities",
        body: "[Placeholder] The school is responsible for ensuring that all use of the platform by its teachers and students complies with applicable law, school policies, and these terms. The school must designate an authorized administrator.",
      },
      {
        heading: "3. Student Accounts",
        body: "[Placeholder] Schools are responsible for creating and managing student accounts. Student accounts may only be created by authorized school administrators or teachers. Students shall not self-register.",
      },
      {
        heading: "4. Data Use",
        body: "[Placeholder] Spelling Playground will use student data solely to provide the educational services described herein. We will not sell or share student data with third parties for advertising purposes.",
      },
      {
        heading: "5. FERPA Compliance",
        body: "[Placeholder] Spelling Playground operates as a school official under FERPA. The school retains ownership and control over student educational records. This section describes our obligations under the Family Educational Rights and Privacy Act.",
      },
      {
        heading: "6. Termination",
        body: "[Placeholder] Either party may terminate the school account with 30 days written notice. Upon termination, the school may export its data. Student data will be deleted within 60 days of account closure.",
      },
      {
        heading: "7. Limitation of Liability",
        body: "[Placeholder] Full limitation of liability terms, warranties, and disclaimers will be included in the final version of this document.",
      },
      {
        heading: "8. Governing Law",
        body: "[Placeholder] These terms shall be governed by the laws of the applicable jurisdiction. Dispute resolution and arbitration provisions will appear in the final document.",
      },
    ],
  },
  "student-dpa": {
    title: "Student Data Privacy Addendum",
    version: "1.0",
    effectiveDate: "January 1, 2025",
    icon: Shield,
    summary:
      "This Data Privacy Addendum (DPA) governs the collection, use, and protection of student personal information. It supplements the School Terms of Service and is incorporated by reference into that agreement.",
    sections: [
      {
        heading: "1. Scope and Purpose",
        body: "[Placeholder] This DPA applies to all student personal information collected or processed by Spelling Playground in connection with providing educational services to the school. This information is used solely to deliver the spelling practice and assessment features of the platform.",
      },
      {
        heading: "2. Data Collection",
        body: "[Placeholder] We collect only the minimum data necessary to provide the service. For students, this includes: username, first name, last initial (for privacy), and game performance data. We do not collect student email addresses, full last names, or location data.",
      },
      {
        heading: "3. Data Use Limitations",
        body: "[Placeholder] Student data will not be used for advertising, sold to third parties, or used for any purpose other than providing the contracted educational services. Aggregated, de-identified data may be used to improve the platform.",
      },
      {
        heading: "4. COPPA Compliance",
        body: "[Placeholder] The school serves as the operator under the COPPA school exception. By certifying their authority during account creation, the school administrator confirms that required parental consents have been obtained and that the school has authority to consent on behalf of parents for the educational use of this platform.",
      },
      {
        heading: "5. FERPA Compliance",
        body: "[Placeholder] Spelling Playground is designated as a school official with a legitimate educational interest in student data. Student education records remain under the control of the school.",
      },
      {
        heading: "6. Data Security",
        body: "[Placeholder] We implement appropriate technical and organizational measures to protect student data, including encryption at rest and in transit, access controls, and regular security assessments.",
      },
      {
        heading: "7. Data Retention and Deletion",
        body: "[Placeholder] Student data is retained for the duration of the school account. Schools may request deletion of student data at any time. Upon account termination, student data is deleted within 60 days unless legal retention obligations apply.",
      },
      {
        heading: "8. Data Breach Notification",
        body: "[Placeholder] In the event of a data breach affecting student personal information, we will notify the school within 72 hours of becoming aware of the breach, as required by applicable law.",
      },
      {
        heading: "9. Subprocessors",
        body: "[Placeholder] A list of authorized subprocessors will be maintained and made available upon request. We will notify schools of material changes to our subprocessor list.",
      },
    ],
  },
  "privacy-policy": {
    title: "Privacy Policy",
    version: "1.0",
    effectiveDate: "January 1, 2025",
    icon: Lock,
    summary:
      "This Privacy Policy explains how Spelling Playground collects, uses, and protects personal information from all users, including school administrators, teachers, and the students whose accounts are managed by schools.",
    sections: [
      {
        heading: "1. Information We Collect",
        body: "[Placeholder] We collect information you provide when creating an account (name, email, username), information generated through use of the platform (game scores, word lists, progress data), and technical information (IP address, browser type, device information).",
      },
      {
        heading: "2. How We Use Information",
        body: "[Placeholder] We use collected information to provide and improve our educational services, authenticate users, communicate about the service, and comply with legal obligations. We do not use student information for advertising.",
      },
      {
        heading: "3. Children's Privacy (COPPA)",
        body: "[Placeholder] We do not knowingly collect personal information from children under 13 except through the school account exception under COPPA. Student accounts are created and managed by schools, which certify compliance with COPPA on behalf of parents.",
      },
      {
        heading: "4. Data Sharing",
        body: "[Placeholder] We do not sell personal information. We may share information with service providers who assist in operating the platform, when required by law, or with your consent.",
      },
      {
        heading: "5. IP Address Collection",
        body: "[Placeholder] IP addresses are collected for security purposes, legal compliance (including logging acceptance of legal agreements), and fraud prevention. IP addresses associated with legal agreement acceptance are encrypted at rest and retained for the duration of the account plus a legally required buffer period.",
      },
      {
        heading: "6. Data Retention",
        body: "[Placeholder] We retain personal information for as long as necessary to provide services and comply with legal obligations. Legal acceptance logs are retained for the duration of the account relationship plus a statute-of-limitations buffer period.",
      },
      {
        heading: "7. Your Rights",
        body: "[Placeholder] Depending on your jurisdiction, you may have rights to access, correct, delete, or port your personal information. Schools may exercise these rights on behalf of students. Contact us at privacy@spellingplayground.com to make a request.",
      },
      {
        heading: "8. Data Deletion Policy",
        body: "[Placeholder] You may request deletion of your account and associated data at any time. Student data can only be deleted by the school administrator. We will fulfill deletion requests within 30 days, subject to legal retention requirements.",
      },
      {
        heading: "9. Security",
        body: "[Placeholder] We use industry-standard security measures including AES-256 encryption at rest, TLS in transit, and access controls. No system is perfectly secure; we will notify you of any breach affecting your data.",
      },
      {
        heading: "10. Contact",
        body: "[Placeholder] For privacy questions, contact us at privacy@spellingplayground.com. For data deletion requests, use the account settings or contact us directly.",
      },
    ],
  },
  "family-tos": {
    title: "Family Terms of Service",
    version: "1.0",
    effectiveDate: "January 1, 2025",
    icon: FileText,
    summary:
      "These terms govern the relationship between Spelling Playground and families (parents and their children) who create accounts on the platform. By creating a family account, you accept these terms.",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: "[Placeholder] By creating a family account and using Spelling Playground, you agree to be bound by these Terms of Service. Use of the platform by you or your children constitutes acceptance of these terms.",
      },
      {
        heading: "2. Parent and Guardian Responsibilities",
        body: "[Placeholder] The parent or legal guardian is responsible for supervising their children's use of the platform, ensuring that their children's use complies with applicable law and these terms, and for all account activity under the family account.",
      },
      {
        heading: "3. Children's Accounts",
        body: "[Placeholder] Child accounts may only be created by the parent or legal guardian account holder. Parents are responsible for managing their children's accounts and may delete them at any time.",
      },
      {
        heading: "4. Subscription and Payment",
        body: "[Placeholder] Family accounts require a paid subscription. Subscriptions automatically renew unless cancelled before the renewal date. Prices are subject to change with 30 days notice. Refunds are handled in accordance with our refund policy.",
      },
      {
        heading: "5. Data Use",
        body: "[Placeholder] Spelling Playground uses account data solely to provide the educational services described herein. We do not sell or share your children's personal data with third parties for advertising purposes. See our Privacy Policy for full details.",
      },
      {
        heading: "6. COPPA Compliance",
        body: "[Placeholder] Spelling Playground complies with the Children's Online Privacy Protection Act (COPPA). By creating child accounts, you certify that you are the parent or legal guardian and you consent to the collection of your child's information as described in our Privacy Policy.",
      },
      {
        heading: "7. Acceptable Use",
        body: "[Placeholder] The platform is for educational use only. You agree not to misuse the platform, create inappropriate content, or use the service in any manner inconsistent with these terms.",
      },
      {
        heading: "8. Termination",
        body: "[Placeholder] Either party may terminate the account at any time. Upon cancellation, access continues until the end of the paid subscription period. All account data may be requested for export before termination.",
      },
      {
        heading: "9. Limitation of Liability",
        body: "[Placeholder] Full limitation of liability terms, warranties, and disclaimers will be included in the final version of this document.",
      },
      {
        heading: "10. Contact",
        body: "[Placeholder] For questions about these terms, contact us at support@spellingplayground.com.",
      },
    ],
  },
};

interface LegalDocPageProps {
  docType: "school-tos" | "student-dpa" | "privacy-policy" | "family-tos";
}

export function LegalDocPage({ docType }: LegalDocPageProps) {
  const [, setLocation] = useLocation();
  const doc = DOCS[docType];
  const Icon = doc.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => window.history.back()} data-testid="button-back-legal">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Icon className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-legal-doc-title">{doc.title}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline">Version {doc.version}</Badge>
            <span>Effective {doc.effectiveDate}</span>
          </div>
          <div className="mt-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
              PLACEHOLDER DOCUMENT — Full legal text coming soon. This stub establishes the structure and version for compliance tracking purposes.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-sm text-muted-foreground leading-relaxed">{doc.summary}</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {doc.sections.map((section) => (
            <Card key={section.heading}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-base">{section.heading}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4 pb-8">
          <p>Spelling Playground &mdash; {doc.title} v{doc.version}</p>
          <p className="mt-1">Questions? Contact <span className="underline">legal@spellingplayground.com</span></p>
        </div>
      </div>
    </div>
  );
}

export function SchoolTosPage() { return <LegalDocPage docType="school-tos" />; }
export function StudentDpaPage() { return <LegalDocPage docType="student-dpa" />; }
export function PrivacyPolicyPage() { return <LegalDocPage docType="privacy-policy" />; }
export function FamilyTosPage() { return <LegalDocPage docType="family-tos" />; }
