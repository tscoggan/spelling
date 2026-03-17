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
        body: "This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.\n\nWe use Your Personal Data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.",
      },
      {
        heading: "2. Interpretation and Definitions",
        body: "The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.\n\nFor the purposes of this Privacy Policy:\n\n**Account** means a unique account created for You to access our Service or parts of our Service.\n\n**Affiliate** means an entity that controls, is controlled by, or is under common control with a party, where \"control\" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.\n\n**Application** refers to Spelling Playground, the software program provided by the Company.\n\n**Business**, for the purpose of CCPA/CPRA, refers to the Company as the legal entity that collects Consumers' personal information and determines the purposes and means of the processing of Consumers' personal information, or on behalf of which such information is collected and that alone, or jointly with others, determines the purposes and means of the processing of consumers' personal information, that does business in the State of California.\n\n**CCPA and/or CPRA** refers to the California Consumer Privacy Act (the \"CCPA\") as amended by the California Privacy Rights Act of 2020 (the \"CPRA\").\n\n**Child Account** is a sub-account created and controlled by a parent or legal guardian for a child under the age of 13 for the purpose of using the Service.\n\n**Company** (referred to as either \"the Company\", \"We\", \"Us\" or \"Our\" in this Privacy Policy) refers to Spelling Playground LLC, 650 Jersey Ave., Jersey City, NJ 07302. For the purposes of the GDPR, the Company is the Data Controller.\n\n**Consumer**, for the purpose of the CCPA/CPRA, means a natural person who is a California resident. A resident, as defined in the law, includes (1) every individual who is in the USA for other than a temporary or transitory purpose, and (2) every individual who is domiciled in the USA who is outside the USA for a temporary or transitory purpose.\n\n**Cookies** are small files that are placed on Your computer, mobile device or any other device by a website, containing the details of Your browsing history on that website among its many uses.\n\n**Country** refers to: New Jersey, United States.\n\n**Data Controller**, for the purposes of the GDPR (General Data Protection Regulation), refers to the Company as the legal person which alone or jointly with others determines the purposes and means of the processing of Personal Data.\n\n**Device** means any device that can access the Service such as a computer, a cell phone or a digital tablet.\n\n**Do Not Track (DNT)** is a concept that has been promoted by US regulatory authorities, in particular the U.S. Federal Trade Commission (FTC), for the Internet industry to develop and implement a mechanism for allowing internet users to control the tracking of their online activities across websites.\n\n**Family Account** is an account created and managed by a parent or legal guardian that allows the parent to create and manage one or more Child Accounts.\n\n**GDPR** refers to EU General Data Protection Regulation.\n\n**Personal Data** (or \"Personal Information\") is any information that relates to an identified or identifiable individual.\n\nFor the purposes of GDPR, Personal Data means any information relating to You such as a name, an identification number, location data, online identifier or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural or social identity.\n\nFor the purposes of the CCPA/CPRA, Personal Data means any information that identifies, relates to, describes or is capable of being associated with, or could reasonably be linked, directly or indirectly, with You.\n\nWe use \"Personal Data\" and \"Personal Information\" interchangeably unless a law uses a specific term.\n\n**Service** refers to the Application or the Website or both.\n\n**Service Provider** means any natural or legal person who processes the data on behalf of the Company. It refers to third-party companies or individuals employed by the Company to facilitate the Service, to provide the Service on behalf of the Company, to perform services related to the Service or to assist the Company in analyzing how the Service is used. For the purposes of the GDPR, Service Providers are considered Data Processors.\n\n**Usage Data** refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).\n\n**Website** refers to Spelling Playground, accessible from https://spellingplayground.com.\n\n**You** means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.\n\nUnder GDPR, You can be referred to as the Data Subject or as the User as you are the individual using the Service.",
      },
      {
        heading: "3. Family Accounts and School Use",
        body: "The Service allows parents or legal guardians to create Family Accounts and manage Child Accounts for children under the age of 13. Parents control all Child Accounts created under their Family Account, including the ability to view, modify, or delete the child's information.\n\nSchools or teachers may create accounts for educational use. When the Service is used by a school or teacher on behalf of students, the school or educational institution represents and warrants that it has obtained any legally required parental consent.\n\nThe Company processes student information solely to provide the educational Service and does not use such information for advertising or commercial profiling.\n\nWhen the Service is used by a school or educational institution, the Company acts as a service provider processing student information solely on behalf of the school for educational purposes.",
      },
      {
        heading: "4. Collecting and Using Your Personal Data",
        body: "While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:\n- Parent or guardian name\n- Parent or guardian email address\n- Child first name (Children are encouraged to use first names or nicknames only. The Service does not require children to provide a full legal name.)\n- Username\n- Password\n- Grade level\n\nUsage Data is collected automatically when using the Service.\n\nUsage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.\n\nWhen You access the Service by or through a mobile device, We may collect certain information automatically, including, but not limited to, the type of mobile device You use, Your mobile device's unique ID, the IP address of Your mobile device, Your mobile operating system, the type of mobile Internet browser You use, unique device identifiers and other diagnostic data.\n\nWe may also collect information transmitted automatically by your browser or device when you access the Service.",
      },
      {
        heading: "5. Tracking Technologies and Cookies",
        body: "We use Cookies and similar tracking technologies to track the activity on Our Service and store certain information. Tracking technologies We use include beacons, tags, and scripts to collect and track information and to improve and analyze Our Service. The technologies We use may include:\n\n**Cookies or Browser Cookies.** A cookie is a small file placed on Your Device. You can instruct Your browser to refuse all Cookies or to indicate when a Cookie is being sent. However, if You do not accept Cookies, You may not be able to use some parts of our Service.\n\n**Web Beacons.** Certain sections of our Service and our emails may contain small electronic files known as web beacons (also referred to as clear gifs, pixel tags, and single-pixel gifs) that permit the Company to count users who have visited those pages or opened an email and for other related website statistics.\n\nCookies can be \"Persistent\" or \"Session\" Cookies. Persistent Cookies remain on Your personal computer or mobile device when You go offline, while Session Cookies are deleted as soon as You close Your web browser.\n\nWhere required by law, we use non-essential cookies only with Your consent. You can withdraw or change Your consent at any time through Your browser/device settings.\n\nWe use both Session and Persistent Cookies for the purposes set out below:\n\n**Necessary / Essential Cookies**\nType: Session Cookies | Administered by: Us\nPurpose: These Cookies are essential to provide You with services available through the Website and to enable You to use some of its features. They help to authenticate users and prevent fraudulent use of user accounts. Without these Cookies, the services that You have asked for cannot be provided, and We only use these Cookies to provide You with those services.\n\n**Cookies Policy / Notice Acceptance Cookies**\nType: Persistent Cookies | Administered by: Us\nPurpose: These Cookies identify if users have accepted the use of cookies on the Website.\n\n**Functionality Cookies**\nType: Persistent Cookies | Administered by: Us\nPurpose: These Cookies allow Us to remember choices You make when You use the Website, such as remembering your login details or language preference. The purpose of these Cookies is to provide You with a more personal experience and to avoid You having to re-enter your preferences every time You use the Website.",
      },
      {
        heading: "6. Use of Your Personal Data",
        body: "The Company may use Personal Data for the following purposes:\n- To provide and maintain our Service, including to monitor the usage of our Service.\n- To manage Your Account: to manage Your registration as a user of the Service. The Personal Data You provide can give You access to different functionalities of the Service that are available to You as a registered user.\n- For the performance of a contract: the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased or of any other contract with Us through the Service.\n- To contact You: To contact You by email or other electronic communications regarding updates, support responses, or important service notices.\n- To send account-related communications and optional product updates to parents or account holders who have opted to receive such communications.\n- To manage Your requests: To attend and manage Your requests to Us.\n- For business transfers: We may use Your Personal Data to evaluate or conduct a merger, divestiture, restructuring, reorganization, dissolution, or other sale or transfer of some or all of Our assets, whether as a going concern or as part of bankruptcy, liquidation, or similar proceeding, in which Personal Data held by Us about our Service users is among the assets transferred.\n- For other purposes: We may use Your information for other purposes, such as data analysis, identifying usage trends, determining the effectiveness of our promotional campaigns and to evaluate and improve our Service, products, services, marketing and your experience.\n\nWe may share Your Personal Data in the following situations:\n- With Service Providers: We may share Your Personal Data with Service Providers to monitor and analyze the use of our Service, or to contact You.\n- For business transfers: We may share or transfer Your Personal Data in connection with, or during negotiations of, any merger, sale of Company assets, financing, or acquisition of all or a portion of Our business to another company.\n- With Affiliates: We may share Your Personal Data with Our affiliates, in which case we will require those affiliates to honor this Privacy Policy.\n- With other users: The Service is not designed for public posting by children. Any public or shared features that may be introduced in the future will be subject to additional safeguards.\n- With Your consent: We may disclose Your Personal Data for any other purpose with Your consent.\n\nThe Service does not display targeted or behavioral advertising to Child Accounts or users known to be under the age of 13. The Service does not use third-party advertising networks and does not allow advertising technologies to collect personal information from children.",
      },
      {
        heading: "7. Data Minimization",
        body: "We collect only the minimum personal information necessary to operate the Service and provide educational features.",
      },
      {
        heading: "8. Retention of Your Personal Data",
        body: "The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use Your Personal Data to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our legal agreements and policies. Personal information associated with a Child Account will be deleted within a reasonable time after the parent closes the account, unless retention is required for legal or security purposes.\n\nWhere possible, We apply shorter retention periods and/or reduce identifiability by deleting, aggregating, or anonymizing data.\n\n**Account Information**\n- User Accounts: retained for the duration of your account relationship plus up to 24 months after account closure to handle any post-termination issues or resolve disputes.\n\n**Customer Support Data**\n- Support tickets and correspondence: up to 24 months from the date of ticket closure.\n- Chat transcripts: up to 24 months for quality assurance and staff training purposes.\n\n**Usage Data**\n- Website analytics data (cookies, IP addresses, device identifiers): up to 24 months from the date of collection.\n- Server logs (IP addresses, access times): up to 24 months for security monitoring and troubleshooting purposes.\n\n**Marketing Data**\n- Email Marketing: retained until you unsubscribe or up to 24 months from your last engagement, whichever comes first.\n\nWe may retain Personal Data beyond the periods stated above where required by legal obligation, to establish or defend legal claims, at Your explicit request, or due to technical backup limitations.\n\nWhen retention periods expire, We securely delete or anonymize Personal Data. In some cases, We convert Personal Data into anonymous statistical data that cannot be linked back to You.",
      },
      {
        heading: "9. Transfer of Your Personal Data",
        body: "Your information, including Personal Data, is processed at the Company's operating offices and in any other places where the parties involved in the processing are located. It means that this information may be transferred to — and maintained on — computers located outside of Your state, province, country or other governmental jurisdiction where the data protection laws may differ from those from Your jurisdiction.\n\nWhere required by applicable law, We will ensure that international transfers of Your Personal Data are subject to appropriate safeguards. The Company will take all steps reasonably necessary to ensure that Your data is treated securely and in accordance with this Privacy Policy and no transfer of Your Personal Data will take place to an organization or a country unless there are adequate controls in place including the security of Your data and other personal information.",
      },
      {
        heading: "10. Delete Your Personal Data",
        body: "You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You.\n\nOur Service may give You the ability to delete certain information about You from within the Service.\n\nYou may update, amend, or delete Your information at any time by signing in to Your Account, if You have one, and visiting the account settings section that allows you to manage Your personal information. You may also contact Us to request access to, correct, or delete any Personal Data that You have provided to Us.\n\nPlease note, however, that We may need to retain certain information when we have a legal obligation or lawful basis to do so.",
      },
      {
        heading: "11. Disclosure of Your Personal Data",
        body: "**Business Transactions**\n\nIf the Company is involved in a merger, acquisition or asset sale, Your Personal Data may be transferred. We will provide notice before Your Personal Data is transferred and becomes subject to a different Privacy Policy.\n\n**Law Enforcement**\n\nUnder certain circumstances, the Company may be required to disclose Your Personal Data if required to do so by law or in response to valid requests by public authorities (e.g. a court or a government agency).\n\n**Other Legal Requirements**\n\nThe Company may disclose Your Personal Data in the good faith belief that such action is necessary to:\n- Comply with a legal obligation\n- Protect and defend the rights or property of the Company\n- Prevent or investigate possible wrongdoing in connection with the Service\n- Protect the personal safety of Users of the Service or the public\n- Protect against legal liability",
      },
      {
        heading: "12. Security of Your Personal Data",
        body: "The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially reasonable means to protect Your Personal Data, We cannot guarantee its absolute security.\n\nThe Company implements reasonable administrative, technical, and physical safeguards designed to protect personal information collected from children. We will notify you of any breach affecting your data as required by applicable law.",
      },
      {
        heading: "13. Detailed Information on the Processing of Your Personal Data",
        body: "The Service Providers We use may have access to Your Personal Data. These third-party vendors collect, store, use, process and transfer information about Your activity on Our Service in accordance with their Privacy Policies.\n\n**Email Marketing**\n\nWe may use the parent or account holder's email address to send service-related communications, updates about the Service, and optional newsletters or product updates. Parents may opt out of non-essential communications at any time by contacting Us.\n\nWe may use Email Marketing Service Providers to manage and send emails to You.\n\n- Resend — Their Privacy Policy can be viewed at https://resend.com/legal/privacy-policy",
      },
      {
        heading: "14. GDPR Privacy",
        body: "**Legal Basis for Processing Personal Data under GDPR**\n\nWe may process Personal Data under the following conditions:\n- Consent: You have given Your consent for processing Personal Data for one or more specific purposes.\n- Performance of a contract: Provision of Personal Data is necessary for the performance of an agreement with You and/or for any pre-contractual obligations thereof.\n- Legal obligations: Processing Personal Data is necessary for compliance with a legal obligation to which the Company is subject.\n- Vital interests: Processing Personal Data is necessary in order to protect Your vital interests or of another natural person.\n- Public interests: Processing Personal Data is related to a task that is carried out in the public interest or in the exercise of official authority vested in the Company.\n- Legitimate interests: Processing Personal Data is necessary for the purposes of the legitimate interests pursued by the Company.\n\nIn any case, the Company will gladly help to clarify the specific legal basis that applies to the processing, and in particular whether the provision of Personal Data is a statutory or contractual requirement, or a requirement necessary to enter into a contract.\n\n**International Transfer of Personal Data**\n\nWe may transfer, store, and process Personal Data in countries other than the country in which You are located, including countries outside the European Economic Area (EEA) and the United Kingdom (UK), where data protection laws may differ.\n\nWhere we transfer Personal Data outside the EEA/UK to a country that has not been recognized as providing an adequate level of protection, We rely on appropriate safeguards, such as the European Commission's Standard Contractual Clauses (SCCs) and/or the UK International Data Transfer Agreement (IDTA). You may contact Us to request further information about the safeguards We use for international transfers.\n\n**Your Rights under the GDPR**\n\nThe Company undertakes to respect the confidentiality of Your Personal Data and to guarantee You can exercise Your rights.\n\nYou have the right under this Privacy Policy, and by law if You are within the EU, to:\n- Request access to Your Personal Data. The right to access, update or delete the information We have on You. Whenever made possible, you can access, update or request deletion of Your Personal Data directly within Your Account settings section.\n- Request restriction of processing. You have the right to ask Us to restrict processing of Your Personal Data in certain circumstances.\n- Request correction of the Personal Data that We hold about You. You have the right to have any incomplete or inaccurate information We hold about You corrected.\n- Object to processing of Your Personal Data. This right exists where We are relying on a legitimate interest as the legal basis for Our processing and there is something about Your particular situation, which makes You want to object to our processing of Your Personal Data on this ground.\n- Request erasure of Your Personal Data. You have the right to ask Us to delete or remove Personal Data when there is no good reason for Us to continue processing it.\n- Request the transfer of Your Personal Data. We will provide to You, or to a third-party You have chosen, Your Personal Data in a structured, commonly used, machine-readable format.\n- Withdraw Your consent. You have the right to withdraw Your consent on using your Personal Data. If You withdraw Your consent, We may not be able to provide You with access to certain specific functionalities of the Service.\n\n**Exercising of Your GDPR Data Protection Rights**\n\nYou may exercise Your rights of access, rectification, cancellation and opposition by contacting Us. Please note that we may ask You to verify Your identity before responding to such requests. We generally respond within one month, and may extend by two further months where necessary, in accordance with applicable law.\n\nYou have the right to complain to a Data Protection Authority about Our collection and use of Your Personal Data. For more information, if You are in the European Economic Area (EEA), please contact Your local data protection authority in the EEA.",
      },
      {
        heading: "15. CCPA/CPRA Privacy Notice",
        body: "This privacy notice section for California residents supplements the information contained in Our Privacy Policy and it applies solely to all visitors, users, and others who reside in the State of California.\n\n**Categories of Personal Information Collected**\n\nWe collect information that identifies, relates to, describes, references, is capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular Consumer or Device. Please note that the categories and examples provided in the list below are those defined in the CCPA/CPRA. This does not mean that all examples of that category of personal information were in fact collected by Us, but reflects our good faith belief to the best of Our knowledge that some of that information from the applicable category may be and may have been collected.\n- **Category A: Identifiers.** Examples: A real name, alias, postal address, unique personal identifier, online identifier, Internet Protocol address, email address, account name, or other similar identifiers.\nCollected: Yes.\n- **Category B: Personal information categories listed in the California Customer Records statute (Cal. Civ. Code § 1798.80(e)).** Examples: A name, signature, address, telephone number, bank account number, credit card number, debit card number, or any other financial information. Some personal information included in this category may overlap with other categories.\nCollected: Yes (limited to name and email address provided by the parent or guardian).\n- **Category C: Protected classification characteristics** under California or federal law. Examples: Age (40 years or older), race, color, ancestry, national origin, citizenship, religion or creed, marital status, medical condition, physical or mental disability, sex, sexual orientation, veteran or military status, genetic information.\nCollected: No.\n- **Category D: Commercial information.** Examples: Records of personal property, products or services purchased, obtained, or considered, or other purchasing or consuming histories or tendencies.\nCollected: No.\n- **Category E: Biometric information.** Examples: Genetic, physiological, behavioral, and biological characteristics, or activity patterns used to extract a template or other identifier or identifying information, such as, fingerprints, faceprints, and voiceprints, iris or retina scans, keystroke, gait, or other physical patterns, and sleep, health, or exercise data.\nCollected: No.\n- **Category F: Internet or other similar network activity.** Examples: Browsing history, search history, information on a consumer's interaction with a website, application, or advertisement.\nCollected: Yes (limited to usage analytics and diagnostic data used to operate and improve the Service).\n- **Category G: Geolocation data.** Examples: Approximate physical location, physical location or movements.\nCollected: No.\n- **Category H: Sensory data.** Examples: Audio, electronic, visual, thermal, olfactory, or similar information.\nCollected: No.\n- **Category I: Professional or employment-related information.** Examples: Current or past job history or performance evaluations.\nCollected: No.\n- **Category J: Non-public education information (per the Family Educational Rights and Privacy Act (20 U.S.C. Section 1232g, 34 C.F.R. Part 99)).** Examples: Education records directly related to a student maintained by an educational institution or party acting on its behalf, such as grades, transcripts, class lists, student schedules, student identification codes, student financial information, or student disciplinary records.\nCollected: No.\n- **Category K: Inferences drawn from other personal information.** Examples: Profile reflecting a person's preferences, characteristics, psychological trends, predispositions, behavior, attitudes, intelligence, abilities, and aptitudes.\nCollected: No.\n- **Category L: Sensitive personal information.**\nCollected: No.\n\nUnder CCPA/CPRA, Personal Information does not include publicly available information from government records, deidentified or aggregated consumer information, or information excluded from the CCPA/CPRA's scope such as health or medical information covered by HIPAA.\n\n**Sources of Personal Information**\n- Directly from You. For example, from the forms You complete on our Service, preferences You express or provide through our Service.\n- Indirectly from You. For example, from observing Your activity on our Service.\n- Automatically from You. For example, through cookies We or our Service Providers set on Your Device as You navigate through our Service.\n- From Service Providers. For example, third-party vendors We use to provide the Service to You.",
      },
      {
        heading: "16. CCPA/CPRA: Use, Disclosure, and Sale of Personal Information",
        body: "**Use of Personal Information**\n\nWe may use or disclose personal information We collect for legitimate business purposes necessary to operate and improve the Service, which may include the following:\n- To operate our Service and provide You with Our Service.\n- To provide You with support and to respond to Your inquiries.\n- To respond to law enforcement requests and as required by applicable law, court order, or governmental regulations.\n- For internal administrative and auditing purposes.\n- To detect security incidents and protect against malicious, deceptive, fraudulent or illegal activity.\n- Other purposes consistent with the context in which the information was collected.\n\n**Disclosure of Personal Information**\n\nWe may use or disclose the following categories of personal information for business purposes:\n- Category A: Identifiers\n- Category B: Personal information categories listed in the California Customer Records statute (Cal. Civ. Code § 1798.80(e))\n\nWhen We disclose Personal Information for a business purpose, We enter a contract that describes the purpose and requires the recipient to both keep that personal information confidential and not use it for any purpose except performing the contract.\n\n**Sharing of Personal Information**\n\nWe may share personal information only with:\n- Service Providers that help us operate the Service (such as hosting providers, analytics providers, and email delivery services)\n- Affiliates under common ownership or control with the Company\n- Third parties when required by law or to protect the rights, safety, and security of the Company or its users\n\n**Sale of Personal Information**\n\nThe Company does not sell or share Personal Information as those terms are defined under the CCPA/CPRA.\n\nPersonal Information is disclosed only to Service Providers that process information on our behalf to operate the Service. Service Providers are contractually prohibited from using personal information for their own marketing or advertising purposes.",
      },
      {
        heading: "17. Sale of Personal Information of Minors Under 16",
        body: "We do not sell the Personal Information of Consumers We actually know are less than 16 years of age, unless We receive affirmative authorization (the \"right to opt-in\") from the parent or guardian of a Consumer less than 16 years of age. Consumers who opt-in to the sale of personal information may opt-out of future sales at any time. To exercise the right to opt-out, You (or Your authorized representative) may submit a request to Us by contacting Us.\n\nIf You have reason to believe that a child under the age of 16 has provided Us with personal information, please contact Us with sufficient detail to enable Us to delete that information.",
      },
      {
        heading: "18. Your Rights under the CCPA/CPRA",
        body: "The CCPA/CPRA provides California residents with specific rights regarding their personal information. If You are a resident of California, You have the following rights:\n- **The right to notice.** You have the right to be notified which categories of Personal Information are being collected and the purposes for which the Personal Information is being used.\n- **The right to know/access.** You have the right to request that We disclose information to You about Our collection, use, sale, disclosure for business purposes and share of personal information over the past 12 months.\n- **The right to say no to the sale or sharing of Personal Information (opt-out).** You have the right to direct Us to not sell Your personal information. We do not sell Personal Information.\n- **The right to correct Personal Information.** You have the right to correct or rectify any inaccurate personal information about You that We collected.\n- **The right to limit use and disclosure of sensitive Personal Information.** You have the right to request to limit the use or disclosure of certain sensitive personal information We collected about You, unless an exception applies.\n- **The right to delete Personal Information.** You have the right to request the deletion of Your Personal Information under certain circumstances, subject to certain exceptions.\n- **The right not to be discriminated against.** You have the right not to be discriminated against for exercising any of Your consumer's rights.\n\n**Exercising Your CCPA/CPRA Data Protection Rights**\n\nTo exercise any of Your rights under the CCPA/CPRA, if You are a California resident, You can contact Us:\n- By email: support@spellingplayground.com\n- By visiting this page on our website: https://spellingplayground.com/contact\n\nOnly You, or a person registered with the California Secretary of State that You authorize to act on Your behalf, may make a verifiable request related to Your personal information. We will disclose and deliver the required information free of charge within 45 days of receiving Your verifiable request. Any disclosures We provide will only cover the 12-month period preceding the verifiable request's receipt.\n\n**Do Not Sell or Share My Personal Information**\n\nThe Company does not sell or share Personal Information as those terms are defined under the CCPA/CPRA. Service Providers that assist in operating the Service are contractually prohibited from using personal information for their own marketing or advertising purposes.\n\n**Limit the Use or Disclosure of My Sensitive Personal Information**\n\nWe do not collect sensitive personal information as defined by the CCPA/CPRA. For more information on how We use Your personal information, please see the \"Use of Your Personal Data\" section or contact us.",
      },
      {
        heading: "19. Do Not Track and California Privacy Rights",
        body: "**\"Do Not Track\" Policy as Required by CalOPPA**\n\nOur Service does not respond to Do Not Track signals.\n\nHowever, some third-party websites do keep track of Your browsing activities. If You are visiting such websites, You can set Your preferences in Your web browser to inform websites that You do not want to be tracked. You can enable or disable DNT by visiting the preferences or settings page of Your web browser.\n\n**Your California Privacy Rights (California's Shine the Light law)**\n\nUnder California Civil Code Section 1798 (California's Shine the Light law), California residents with an established business relationship with Us can request information once a year about sharing their Personal Data with third parties for the third parties' direct marketing purposes.\n\nIf you'd like to request more information under the California Shine the Light law, and if You are a California resident, You can contact Us using the contact information provided below.\n\n**California Privacy Rights for Minor Users (California Business and Professions Code Section 22581)**\n\nCalifornia Business and Professions Code Section 22581 allows California residents under the age of 18 who are registered users of online sites, services or applications to request and obtain removal of content or information they have publicly posted.\n\nTo request removal of such data, and if You are a California resident, You can contact Us using the contact information provided below, and include the email address associated with Your Account.\n\nBe aware that Your request does not guarantee complete or comprehensive removal of content or information posted online and that the law may not permit or require removal in certain circumstances.",
      },
      {
        heading: "20. Children's Privacy",
        body: "The Service may contain content appropriate for children under the age of 13. Through the Service, children under the age of 13 may participate in educational spelling activities that involve limited collection of personal information as described in this Privacy Policy. We use reasonable efforts to ensure that before we collect any personal information from a child, the child's parent receives notice of and consents to our personal information practices.\n\nWe also may limit how We collect, use, and store some of the information of Users between 13 and 18 years old. In some cases, this means We will be unable to provide certain functionality of the Service to these Users. If We need to rely on consent as a legal basis for processing Your information and Your country requires consent from a parent, We may require Your parent's consent before We collect and use that information.\n\nWe may ask a User to verify its date of birth before collecting any personal information from them. If the User is under the age of 13, the Service will be either blocked or redirected to a parental consent process.",
      },
      {
        heading: "21. Parental Consent and Parental Access",
        body: "**Parental Consent for Family Accounts**\n\nParents or legal guardians must create and manage Child Accounts.\n\nDuring Family Account registration, the parent or legal guardian is required to provide verifiable consent for the collection and use of the child's personal information.\n\nBy creating a Child Account, the parent or guardian represents that they are the child's parent or legal guardian and consent to the collection, use, and disclosure of the child's information as described in this Privacy Policy.\n\n**Information Collected from Children Under the Age of 13**\n\nThe Company may collect and store persistent identifiers (such as cookies or IP addresses) from children without parental consent solely for the purpose of supporting the internal operations of the Service, as permitted under applicable law.\n\nWe may collect and store other personal information about children if this information is submitted by a child with prior parent consent or by the parent or guardian of the child.\n\nWhen a parent or guardian creates a Child Account, the Company may collect and store limited information necessary to operate the Service, such as:\n- Child first name\n- Grade level\n- Username\n- Password\n- Parent's or guardian's full name\n- Parent's or guardian's email address\n- Spelling performance and progress data\n- Word lists created or practiced\n- Usage statistics related to learning activities\n\nParents or guardians with questions about their child's privacy may contact us directly at support@spellingplayground.com.\n\n**Parental Access**\n\nA parent or guardian who has provided consent for the collection and use of their child's personal information may, at any time:\n- Review, correct or delete the child's personal information\n- Discontinue further collection or use of the child's personal information\n\nParents or guardians may review, update, or delete their child's information at any time through the parent account's family dashboard or by contacting the Company.",
      },
      {
        heading: "22. Links to Other Websites",
        body: "Our Service may contain links to other websites that are not operated by Us. If You click on a third party link, You will be directed to that third party's site. We strongly advise You to review the Privacy Policy of every site You visit.\n\nWe have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.",
      },
      {
        heading: "23. Changes to This Privacy Policy",
        body: "We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.\n\nWe will let You know via email and/or a prominent notice on Our Service, prior to the change becoming effective and update the \"Last updated\" date at the top of this Privacy Policy.\n\nYou are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.",
      },
      {
        heading: "24. Contact Us",
        body: "If you have any questions about this Privacy Policy, You can contact us:\n- By email: support@spellingplayground.com\n- By visiting this page on our website: https://spellingplayground.com/contact",
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

function renderInlineSingleLine(text: string): React.ReactNode[] {
  const combined = /\*\*([^*]+)\*\*|https?:\/\/[^\s,)]+|[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={match.index}>{match[1]}</strong>);
    } else if (/^https?:\/\//.test(token)) {
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
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderInline(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  if (lines.length === 1) return renderInlineSingleLine(text);
  const result: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    result.push(...renderInlineSingleLine(line));
    if (i < lines.length - 1) result.push(<br key={`br-${i}`} />);
  });
  return result;
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
          <p className="mt-1">Questions? Contact{" "}
            <a href="mailto:support@spellingplayground.com" className="underline underline-offset-2 hover:text-foreground transition-colors">
              support@spellingplayground.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function SchoolTosPage() { return <LegalDocPage docType="school-tos" />; }
export function StudentDpaPage() { return <LegalDocPage docType="student-dpa" />; }
export function PrivacyPolicyPage() { return <LegalDocPage docType="privacy-policy" />; }
export function FamilyTosPage() { return <LegalDocPage docType="family-tos" />; }
