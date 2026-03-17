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
  hasPlaceholder?: boolean;
  sections: { heading: string; body: string }[];
}

const DOCS: Record<string, DocConfig> = {
  "school-tos": {
    title: "School Terms of Service",
    version: "1.0",
    effectiveDate: "January 1, 2025",
    icon: FileText,
    hasPlaceholder: true,
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
        heading: "8. Contact",
        body: "[Placeholder] For questions about these terms, contact us at support@spellingplayground.com.",
      },
    ],
  },
  "student-dpa": {
    title: "Student Data Privacy Agreement",
    version: "1.0",
    effectiveDate: "January 1, 2025",
    icon: Shield,
    hasPlaceholder: true,
    summary:
      "This Student Data Privacy Agreement (DPA) describes how Spelling Playground collects, uses, and protects student personal information when the platform is used by schools.",
    sections: [
      {
        heading: "1. Purpose",
        body: "[Placeholder] This DPA establishes the terms under which Spelling Playground processes student personal information on behalf of the school. The school acts as the data controller; Spelling Playground acts as the data processor.",
      },
      {
        heading: "2. Data Collected",
        body: "[Placeholder] Spelling Playground collects only the student information necessary to provide the educational service: username, grade level, and game performance data. No sensitive personal information is collected from students.",
      },
      {
        heading: "3. Permitted Uses",
        body: "[Placeholder] Student data shall be used solely for the purpose of providing the educational service. Spelling Playground shall not use student data for advertising, profiling, or any commercial purpose unrelated to the educational service.",
      },
      {
        heading: "4. Data Security",
        body: "[Placeholder] Spelling Playground implements administrative, technical, and physical safeguards designed to protect student personal information. We use industry-standard encryption and access controls.",
      },
      {
        heading: "5. Data Deletion",
        body: "[Placeholder] Upon termination of the school agreement, all student personal information shall be deleted within 60 days unless retention is required by law. Schools may request deletion at any time.",
      },
      {
        heading: "6. Subprocessors",
        body: "[Placeholder] A list of authorized subprocessors will be maintained and made available upon request. We will notify schools of material changes to our subprocessor list.",
      },
    ],
  },
  "privacy-policy": {
    title: "Privacy Policy",
    version: "1.1",
    effectiveDate: "March 10, 2026",
    icon: Lock,
    summary:
      "This Privacy Policy describes how Spelling Playground LLC collects, uses, and protects your personal information when you use our Service. It covers all users including parents, school administrators, teachers, and children whose accounts are managed by parents or schools.",
    sections: [
      {
        heading: "1. Introduction",
        body: "This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.\n\nWe use Your Personal Data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.\n\nThe Company refers to Spelling Playground LLC, 650 Jersey Ave., Jersey City, NJ 07302.",
      },
      {
        heading: "2. Interpretation and Definitions",
        body: "The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.\n\nAccount means a unique account created for You to access our Service or parts of our Service.\n\nChild Account is a sub-account created and controlled by a parent or legal guardian for a child under the age of 13 for the purpose of using the Service.\n\nFamily Account is an account created and managed by a parent or legal guardian that allows the parent to create and manage one or more Child Accounts.\n\nPersonal Data (or \"Personal Information\") is any information that relates to an identified or identifiable individual.\n\nService Provider means any natural or legal person who processes the data on behalf of the Company. It refers to third-party companies or individuals employed by the Company to facilitate the Service.\n\nUsage Data refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).\n\nYou means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.",
      },
      {
        heading: "3. Family Accounts and School Use",
        body: "The Service allows parents or legal guardians to create Family Accounts and manage Child Accounts for children under the age of 13. Parents control all Child Accounts created under their Family Account, including the ability to view, modify, or delete the child's information.\n\nSchools or teachers may create accounts for educational use. When the Service is used by a school or teacher on behalf of students, the school or educational institution represents and warrants that it has obtained any legally required parental consent.\n\nThe Company processes student information solely to provide the educational Service and does not use such information for advertising or commercial profiling. When the Service is used by a school or educational institution, the Company acts as a service provider processing student information solely on behalf of the school for educational purposes.",
      },
      {
        heading: "4. Information We Collect",
        body: "We collect information you provide directly when creating an account, such as first name, username, email address (parent/guardian only), and password.\n\nFor Child Accounts created by parents, we collect: child first name, grade level, username, password, and the parent's or guardian's full name and email address.\n\nWe also collect Usage Data automatically when using the Service, including Your Device's Internet Protocol (IP) address, browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, and unique device identifiers.\n\nSpelling performance data, game scores, word lists created or practiced, and usage statistics related to learning activities are collected as part of providing the educational Service.",
      },
      {
        heading: "5. Tracking Technologies and Cookies",
        body: "We use Cookies and similar tracking technologies to track the activity on Our Service and store certain information. Tracking technologies We use include beacons, tags, and scripts to collect and track information and to improve and analyze Our Service.\n\nCookies can be Persistent or Session Cookies. Persistent Cookies remain on Your device when You go offline, while Session Cookies are deleted as soon as You close Your web browser.\n\nNecessary / Essential Cookies (Session): These Cookies are essential to provide You with services available through the Website, including user authentication and fraud prevention.\n\nCookies Policy / Notice Acceptance Cookies (Persistent): These Cookies identify if users have accepted the use of cookies on the Website.\n\nFunctionality Cookies (Persistent): These Cookies allow Us to remember choices You make when You use the Website, such as remembering your login details or language preference.\n\nWhere required by law, we use non-essential cookies only with Your consent. You can withdraw or change Your consent at any time through Your browser/device settings.",
      },
      {
        heading: "6. How We Use Your Personal Data",
        body: "The Company may use Personal Data for the following purposes:\n\nTo provide and maintain our Service, including to monitor the usage of our Service.\n\nTo manage Your Account and Your registration as a user of the Service.\n\nTo contact You by email or other electronic communications regarding updates, support responses, or important service notices.\n\nTo send account-related communications and optional product updates to parents or account holders who have opted to receive such communications.\n\nTo manage Your requests and to attend to inquiries You make to Us.\n\nFor business transfers: We may use Your Personal Data to evaluate or conduct a merger, divestiture, or other sale or transfer of some or all of Our assets.\n\nFor other purposes such as data analysis, identifying usage trends, and evaluating and improving our Service.\n\nWe may share Your Personal Data with Service Providers to monitor and analyze the use of our Service. We may also share data in connection with business transfers, with affiliates, or with Your consent.\n\nThe Service does not display targeted or behavioral advertising to Child Accounts or users known to be under the age of 13. The Service does not use third-party advertising networks and does not allow advertising technologies to collect personal information from children.",
      },
      {
        heading: "7. Data Minimization",
        body: "We collect only the minimum personal information necessary to operate the Service and provide educational features. We do not collect last names from child users. We do not collect email addresses from child users directly — only from the parent or guardian account holder.",
      },
      {
        heading: "8. Retention of Your Personal Data",
        body: "The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. Personal information associated with a Child Account will be deleted within a reasonable time after the parent closes the account, unless retention is required for legal or security purposes.\n\nUser Accounts are retained for the duration of your account relationship plus up to 24 months after account closure to handle any post-termination issues or resolve disputes.\n\nCustomer Support Data (support tickets, chat transcripts): up to 24 months from the date of ticket closure.\n\nUsage Data (website analytics, IP addresses, device identifiers, server logs): up to 24 months from the date of collection.\n\nEmail Marketing data: retained until you unsubscribe or up to 24 months from your last engagement, whichever comes first.\n\nWe may retain Personal Data beyond these periods for legal obligations, legal claims, at Your explicit request, or due to technical backup limitations.\n\nWhen retention periods expire, We securely delete or anonymize Personal Data. In some cases, We convert Personal Data into anonymous statistical data that cannot be linked back to You.",
      },
      {
        heading: "9. Transfer of Your Personal Data",
        body: "Your information, including Personal Data, is processed at the Company's operating offices and in any other places where the parties involved in the processing are located. This information may be transferred to — and maintained on — computers located outside of Your state, province, country or other governmental jurisdiction where the data protection laws may differ from those from Your jurisdiction.\n\nWhere required by applicable law, We will ensure that international transfers of Your Personal Data are subject to appropriate safeguards. The Company will take all steps reasonably necessary to ensure that Your data is treated securely and in accordance with this Privacy Policy.",
      },
      {
        heading: "10. Delete Your Personal Data",
        body: "You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You. You may delete or update Your information at any time through Your Account settings. For Child Accounts, the parent or guardian may request deletion through the Family Dashboard or by contacting Us.\n\nPlease note, however, that We may need to retain certain information when We have a legal obligation or lawful basis to do so. We will fulfill verified deletion requests within 30 days, subject to legal retention requirements.",
      },
      {
        heading: "11. Disclosure of Your Personal Data",
        body: "Business Transactions: If the Company is involved in a merger, acquisition or asset sale, Your Personal Data may be transferred. We will provide notice before Your Personal Data is transferred and becomes subject to a different Privacy Policy.\n\nLaw Enforcement: Under certain circumstances, the Company may be required to disclose Your Personal Data if required to do so by law or in response to valid requests by public authorities (e.g. a court or a government agency).\n\nOther Legal Requirements: The Company may disclose Your Personal Data in the good faith belief that such action is necessary to comply with a legal obligation, protect and defend the rights or property of the Company, prevent or investigate possible wrongdoing in connection with the Service, protect the personal safety of users of the Service or the public, or protect against legal liability.",
      },
      {
        heading: "12. Security of Your Personal Data",
        body: "The security of Your Personal Data is important to Us. We use industry-standard security measures including encryption in transit (TLS) and at rest, and access controls. The Company implements reasonable administrative, technical, and physical safeguards designed to protect personal information collected from children.\n\nHowever, remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security. We will notify you of any breach affecting your data as required by applicable law.",
      },
      {
        heading: "13. Email Marketing",
        body: "We may use Your email address to send You newsletters or marketing materials related to the Service. You may opt-out of receiving any, or all, of these communications from Us by following the unsubscribe link provided in any email We send, or by contacting Us directly.\n\nWe do not send marketing emails to child users. Marketing communications are sent only to parents or account holders who have opted to receive such communications.",
      },
      {
        heading: "14. Children's Privacy (COPPA)",
        body: "The Service may contain content appropriate for children under the age of 13. Through the Service, children under the age of 13 may participate in educational spelling activities that involve limited collection of personal information as described in this Privacy Policy. We use reasonable efforts to ensure that before we collect any personal information from a child, the child's parent receives notice of and consents to our personal information practices.\n\nWe also may limit how We collect, use, and store some of the information of Users between 13 and 18 years old. If We need to rely on consent as a legal basis for processing Your information and Your country requires consent from a parent, We may require Your parent's consent before We collect and use that information.\n\nWe may ask a User to verify its date of birth before collecting any personal information from them. If the User is under the age of 13, the Service will be either blocked or redirected to a parental consent process.",
      },
      {
        heading: "15. Parental Consent and Parental Access",
        body: "Parents or legal guardians must create and manage Child Accounts. During Family Account registration, the parent or legal guardian is required to provide verifiable consent for the collection and use of the child's personal information. By creating a Child Account, the parent or guardian represents that they are the child's parent or legal guardian and consent to the collection, use, and disclosure of the child's information as described in this Privacy Policy.\n\nThe Company may collect and store persistent identifiers (such as cookies or IP addresses) from children without parental consent solely for the purpose of supporting the internal operations of the Service, as permitted under applicable law.\n\nWhen a parent or guardian creates a Child Account, the Company may collect and store limited information necessary to operate the Service, such as: child first name, grade level, username, password, spelling performance and progress data, word lists created or practiced, and usage statistics related to learning activities.\n\nA parent or guardian who has provided consent for the collection and use of their child's personal information may, at any time: review, correct or delete the child's personal information, or discontinue further collection or use of the child's personal information. Parents or guardians may review, update, or delete their child's information at any time through the Family Dashboard or by contacting Us at support@spellingplayground.com.",
      },
      {
        heading: "16. GDPR Privacy (EU Users)",
        body: "Legal Basis for Processing Personal Data under GDPR — We may process Personal Data under the following conditions: Consent (You have given Your consent for processing for one or more specific purposes); Performance of a contract (Provision of Personal Data is necessary for the performance of an agreement with You); Legal obligations (Processing is necessary for compliance with a legal obligation); Vital interests; Public interests; or Legitimate interests.\n\nInternational Transfer of Personal Data — We may transfer, store, and process Personal Data in countries other than the country in which You are located, including countries outside the European Economic Area (EEA) and the United Kingdom (UK). Where we transfer Personal Data outside the EEA/UK to a country that has not been recognized as providing an adequate level of protection, We rely on appropriate safeguards, such as the European Commission's Standard Contractual Clauses (SCCs) and/or the UK International Data Transfer Agreement (IDTA).\n\nYour Rights under the GDPR — You have the right to: request access to Your Personal Data; request restriction of processing; request correction of inaccurate Personal Data; object to processing of Your Personal Data; request erasure of Your Personal Data; request the transfer of Your Personal Data in a structured, commonly used, machine-readable format; and withdraw Your consent at any time.\n\nTo exercise these rights, please contact Us. We generally respond within one month, and may extend by two further months where necessary, in accordance with applicable law. You have the right to complain to a Data Protection Authority in the EEA.",
      },
      {
        heading: "17. CCPA/CPRA Privacy Notice (California Users)",
        body: "This privacy notice section for California residents supplements the information contained in Our Privacy Policy and applies solely to all visitors, users, and others who reside in the State of California.\n\nCategories of Personal Information We Collect:\n• Category A (Identifiers — real name, email address, IP address, account name): Collected: Yes.\n• Category B (Personal information per Cal. Civ. Code § 1798.80(e) — name, email): Collected: Yes (limited to name and email address provided by the parent or guardian).\n• Category C (Protected classification characteristics): Collected: No.\n• Category D (Commercial information): Collected: No.\n• Category E (Biometric information): Collected: No.\n• Category F (Internet or network activity — usage analytics): Collected: Yes (limited to usage analytics and diagnostic data used to operate and improve the Service).\n• Category G (Geolocation data): Collected: No.\n• Category H (Sensory data): Collected: No.\n• Category I (Professional or employment-related information): Collected: No.\n• Category J (Non-public education information per FERPA): Collected: No.\n• Category K (Inferences drawn from other personal information): Collected: No.\n• Category L (Sensitive personal information): Collected: No.\n\nSources of Personal Information — Directly from You (forms You complete on our Service), indirectly from You (observing Your activity on our Service), automatically from You (through cookies or device data), and from Service Providers.",
      },
      {
        heading: "18. Your CCPA/CPRA Rights",
        body: "California residents have the following rights:\n\nThe right to notice: You have the right to be notified about what categories of Personal Data are being collected and the purposes for which they are used.\n\nThe right to know/access: You have the right to request that We disclose information to You about Our collection, use, sale, disclosure, and sharing of Your personal information over the past 12 months.\n\nThe right to say no to the sale or sharing of Personal Information (opt-out): We do not sell personal information. Service Providers that assist in operating the Service are contractually prohibited from using personal information for their own marketing or advertising purposes.\n\nThe right to correct Personal Information: You have the right to request that We correct inaccurate personal information that we maintain about You.\n\nThe right to delete Personal Information: You have the right to request deletion of Your personal information, subject to certain exceptions.\n\nThe right not to be discriminated against: We will not discriminate against You for exercising any of Your CCPA/CPRA rights, including by denying goods or services, charging different prices or rates, or providing a different level or quality of goods or services.\n\nTo exercise Your rights, contact Us by email at support@spellingplayground.com or by visiting https://spellingplayground.com/contact. We will respond within 45 days of receiving Your verifiable request. Any disclosures We provide will only cover the 12-month period preceding the verifiable request's receipt.",
      },
      {
        heading: "19. Do Not Track and California Privacy Rights",
        body: "Do Not Track (CalOPPA): Our Service does not respond to Do Not Track signals. However, some third-party websites do keep track of Your browsing activities. You can set Your preferences in Your web browser to inform websites that You do not want to be tracked.\n\nCalifornia's Shine the Light Law (Cal. Civil Code § 1798): California residents with an established business relationship with Us can request information once a year about sharing their Personal Data with third parties for the third parties' direct marketing purposes. To submit such a request, contact Us using the information provided below.\n\nCalifornia Minor Users (California Business and Professions Code Section 22581): California residents under the age of 18 who are registered users may request removal of content or information they have publicly posted. To request removal, contact Us using the information provided below. Be aware that such a request does not guarantee complete or comprehensive removal of content or information posted online.",
      },
      {
        heading: "20. Links to Other Websites",
        body: "Our Service may contain links to other websites that are not operated by Us. If You click on a third-party link, You will be directed to that third party's site. We strongly advise You to review the Privacy Policy of every site You visit.\n\nWe have no control over and assume no responsibility for the content, privacy policies or practices of any third-party sites or services.",
      },
      {
        heading: "21. Changes to This Privacy Policy",
        body: "We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.\n\nWe will let You know via email and/or a prominent notice on Our Service, prior to the change becoming effective and update the \"Last updated\" date at the top of this Privacy Policy.\n\nYou are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.",
      },
      {
        heading: "22. Contact Us",
        body: "If you have any questions about this Privacy Policy, You can contact us:\n\nBy email: support@spellingplayground.com\n\nBy visiting this page on our website: https://spellingplayground.com/contact\n\nSpelling Playground LLC\n650 Jersey Ave.\nJersey City, NJ 07302",
      },
    ],
  },
  "family-tos": {
    title: "Family Terms of Service",
    version: "1.0",
    effectiveDate: "January 1, 2025",
    icon: FileText,
    hasPlaceholder: true,
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

function renderInline(text: string): React.ReactNode[] {
  const combined = /https?:\/\/[^\s,)]+|[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (/^https?:\/\//.test(token)) {
      parts.push(
        <a key={match.index} href={token} target="_blank" rel="noopener noreferrer"
           className="text-primary underline underline-offset-2 break-all">
          {token}
        </a>
      );
    } else {
      parts.push(
        <a key={match.index} href={`mailto:${token}`}
           className="text-primary underline underline-offset-2">
          {token}
        </a>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function SectionBody({ body }: { body: string }) {
  const blocks = body.split("\n\n");

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isBulletBlock = lines.every(l => /^[•\-–]\s/.test(l.trim()));

        if (isBulletBlock) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {lines.map((line, j) => (
                <li key={j} className="text-sm text-muted-foreground leading-relaxed">
                  {renderInline(line.replace(/^[•\-–]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        const hasBullets = lines.some(l => /^[•\-–]\s/.test(l.trim()));
        if (hasBullets) {
          const nodes: React.ReactNode[] = [];
          let bulletBuffer: string[] = [];

          const flushBullets = () => {
            if (bulletBuffer.length > 0) {
              nodes.push(
                <ul key={`ul-${nodes.length}`} className="list-disc pl-5 space-y-1">
                  {bulletBuffer.map((b, k) => (
                    <li key={k} className="text-sm text-muted-foreground leading-relaxed">
                      {renderInline(b.replace(/^[•\-–]\s+/, ""))}
                    </li>
                  ))}
                </ul>
              );
              bulletBuffer = [];
            }
          };

          lines.forEach((line, j) => {
            if (/^[•\-–]\s/.test(line.trim())) {
              bulletBuffer.push(line.trim());
            } else if (line.trim()) {
              flushBullets();
              nodes.push(
                <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                  {renderInline(line.trim())}
                </p>
              );
            }
          });
          flushBullets();

          return <div key={i} className="space-y-2">{nodes}</div>;
        }

        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

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
          {doc.hasPlaceholder && (
            <div className="mt-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                PLACEHOLDER DOCUMENT — Full legal text coming soon. This stub establishes the structure and version for compliance tracking purposes.
              </p>
            </div>
          )}
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
                <SectionBody body={section.body} />
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
