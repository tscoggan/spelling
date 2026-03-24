
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, FileText, Shield, Lock } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { getThemedTextClasses } from "@/lib/themeText";

interface DocConfig {
  title: string;
  version: string;
  effectiveDate: string;
  icon: React.ElementType;
  summary: string;
  hasPlaceholder?: boolean;
  sections: { heading: string; body?: string; subsections?: { heading: string; body: string }[] }[];
}

const DOCS: Record<string, DocConfig> = {
  "terms": {
    title: "Terms of Service",
    version: "1.1",
    effectiveDate: "March 17, 2026",
    icon: FileText,
    summary:
      "These Terms of Service govern your use of Spelling Playground. They apply to all users — parents, guardians, school administrators, teachers, and children using the Service — and set out your rights and obligations.",
    sections: [
      {
        heading: "Interpretation and Definitions",
        subsections: [
          {
            heading: "Interpretation",
            body: "The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.",
          },
          {
            heading: "Definitions",
            body: "For the purposes of these Terms and Conditions:\n\n**Application** means the software program provided by the Company downloaded by You on any electronic device, named Spelling Playground.\n\n**Application Store** means the digital distribution service operated and developed by Apple Inc. (Apple App Store) or Google Inc. (Google Play Store) in which the Application has been downloaded.\n\n**Affiliate** means an entity that controls, is controlled by, or is under common control with a party, where \"control\" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.\n\n**Account** means a unique account created for You to access our Service or parts of our Service.\n\n**Country** refers to: New Jersey, United States.\n\n**Company** (referred to as either \"the Company\", \"We\", \"Us\" or \"Our\" in these Terms and Conditions) refers to Spelling Playground LLC, 650 Jersey Ave., Jersey City, NJ 07302.\n\n**Content** refers to content such as text, images, or other information that can be posted, uploaded, linked to or otherwise made available by You, regardless of the form of that content.\n\n**Device** means any device that can access the Service such as a computer, a cell phone or a digital tablet.\n\n**Feedback** means feedback, innovations or suggestions sent by You regarding the attributes, performance or features of our Service.\n\n**Free Trial** refers to a limited period of time that may be free when purchasing a Subscription.\n\n**Service** refers to the Application or the Website or both.\n\n**Subscriptions** refer to the services or access to the Service offered on a subscription basis by the Company to You.\n\n**Terms and Conditions** (also referred to as \"Terms\") means these Terms and Conditions, including any documents expressly incorporated by reference, which govern Your access to and use of the Service and form the entire agreement between You and the Company regarding the Service.\n\n**Third-Party Social Media Service** means any services or content (including data, information, products or services) provided by a third party that is displayed, included, made available, or linked to through the Service.\n\n**Website** refers to Spelling Playground, accessible from https://spellingplayground.com.\n\n**You** means the individual accessing or using the Service, or the company or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.",
          },
        ],
      },
      {
        heading: "Acknowledgment",
        body: "These are the Terms and Conditions governing the use of this Service and the agreement between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service.\n\nYour access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions. These Terms and Conditions apply to all visitors, users and others who access or use the Service.\n\nBy accessing or using the Service You agree to be bound by these Terms and Conditions. If You disagree with any part of these Terms and Conditions then You may not access the Service.\n\nThe Service is intended for use by parents or legal guardians, and by children under the supervision of a parent, guardian, or educational institution. Children under the age of 13 may only use the Service through a parent or guardian account or through a school account authorized by an educational institution.\n\nBy creating an account, You represent that You are a parent or legal guardian, or that You are an authorized representative of a school or educational institution.\n\nYour access to and use of the Service is also subject to Our Privacy Policy, which describes how We collect, use, and disclose personal information. Please read Our Privacy Policy carefully before using Our Service.\n\nIf You are using the Service on behalf of a school or educational institution, additional terms may apply, including a School Terms Addendum (https://spellingplayground.com/legal/school-terms-addendum), which is incorporated into these Terms by reference.\n\nYou agree not to use the Service to collect, store, or share personal information about children except as permitted by these Terms and applicable law.",
      },
      {
        heading: "Educational Purpose",
        body: "The Service is provided for educational and personal learning purposes only. The Company does not guarantee specific educational outcomes or results.\n\nThe Service is not intended to provide professional educational, medical, or psychological advice.",
      },
      {
        heading: "Children and Parental Responsibility",
        subsections: [
          {
            heading: "Children's Use of the Service",
            body: "The Service is designed for use by children under the supervision of a parent, legal guardian, or educational institution.\n\nParents and guardians are responsible for:\n- Creating and managing child accounts\n- Supervising their child's use of the Service\n- Ensuring that any information provided about a child is accurate and appropriate\n\nThe Company does not knowingly permit children to create accounts independently.\n\nParents and legal guardians have the right to review, modify, or delete their child's personal information as described in the Privacy Policy.\n\nFor information about how We collect and use children's data, please refer to our Privacy Policy.",
          },
          {
            heading: "School and Educational Use",
            body: "If You create or use an account on behalf of a school, district, or other educational institution, You represent and warrant that You are authorized to do so.\n\nThe school or educational institution is responsible for obtaining any required parental consents for students to use the Service.\n\nWhen the Service is used by a school, the Company acts as a service provider and processes student data solely for educational purposes on behalf of the school.",
          },
          {
            heading: "Student Data Ownership",
            body: "As between the Company and the school or educational institution, the school retains ownership and control of student data. The Company uses such data solely to provide the Service in accordance with these Terms and applicable law.\n\nThe Company does not use student data for any purpose other than providing the Service and as directed by the educational institution, in accordance with applicable student data privacy laws.",
          },
        ],
      },
      {
        heading: "Subscriptions",
        subsections: [
          {
            heading: "Subscription period",
            body: "The Service or some parts of the Service are available only with a paid Subscription. You will be billed in advance on a recurring and periodic basis (such as daily, weekly, monthly or annually), depending on the type of Subscription plan you select when purchasing the Subscription.\n\nAt the end of each period, Your Subscription will automatically renew under the exact same conditions unless You cancel it or the Company cancels it.",
          },
          {
            heading: "Subscription cancellations",
            body: "You may cancel Your Subscription renewal either through Your Account settings page or by contacting the Company. You will not receive a refund for the fees You already paid for Your current Subscription period and You will be able to access the Service until the end of Your current Subscription period.",
          },
        ],
      },
      {
        heading: "Billing",
        body: "You shall provide the Company with accurate and complete billing information including full name, address, state, zip code, telephone number, and a valid payment method.\n\nShould automatic billing fail to occur for any reason, the Company will issue an electronic invoice indicating that you must proceed manually, within a certain deadline date, with the full payment corresponding to the billing period as indicated on the invoice.",
        subsections: [
          {
            heading: "Payment Processing",
            body: "Payments are processed through third-party payment processors (such as Stripe, Inc.). The Company does not store full payment card information. Your use of such payment services is subject to their terms and policies.",
          },
          {
            heading: "Fee Changes",
            body: "The Company, in its sole discretion and at any time, may modify the Subscription fees. Any Subscription fee change will become effective at the end of the then-current Subscription period.\n\nThe Company will provide You with reasonable prior notice of any change in Subscription fees to give You an opportunity to terminate Your Subscription before such change becomes effective.\n\nYour continued use of the Service after the Subscription fee change comes into effect constitutes Your agreement to pay the modified Subscription fee amount.",
          },
          {
            heading: "Refunds",
            body: "Except when required by law, paid Subscription fees are non-refundable. Certain refund requests for Subscriptions may be considered by the Company on a case-by-case basis and granted at the sole discretion of the Company.",
          },
        ],
      },
      {
        heading: "Free Trial",
        body: "The Company may, at its sole discretion, offer a Subscription with a Free Trial for a limited period of time.\n\nYou may be required to enter Your billing information in order to sign up for the Free Trial.\n\nIf You do enter Your billing information when signing up for a Free Trial, You will not be charged by the Company until the Free Trial has expired. On the last day of the Free Trial period, unless You canceled Your Subscription, You will be automatically charged the applicable Subscription fees for the type of Subscription You have selected.\n\nAt any time and without notice, the Company reserves the right to (i) modify the terms and conditions of the Free Trial offer, or (ii) cancel such Free Trial offer.",
      },
      {
        heading: "Account Types",
        body: "The Service may offer different types of accounts, including family accounts and school accounts.\n\nCertain features, permissions, and responsibilities may differ depending on the type of account. You agree to use the Service only in accordance with the account type You create.",
      },
      {
        heading: "User Accounts",
        body: "When You create an Account with Us, You must provide Us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of Your Account on Our Service.\n\nYou are responsible for safeguarding the password that You use to access the Service and for any activities or actions under Your password, whether Your password is with Our Service or a Third-Party Social Media Service.\n\nYou agree not to disclose Your password to any third party. You must notify Us immediately upon becoming aware of any breach of security or unauthorized use of Your Account.\n\nYou may not use as a username the name of another person or entity or that is not lawfully available for use, a name or trademark that is subject to any rights of another person or entity other than You without appropriate authorization, or a name that is otherwise offensive, vulgar or obscene.",
      },
      {
        heading: "Social Login and Linked Accounts",
        body: "If the Service allows You to sign in, connect, or otherwise interact with a Third-Party Social Media Service, You authorize the Company to access and use information made available by that Third-Party Social Media Service in accordance with Our Privacy Policy and Your settings with that Third-Party Social Media Service.\n\nThe Company does not control and is not responsible for the availability, accuracy, or content of any Third-Party Social Media Service, and Your relationship with that Third-Party Social Media Service is governed by its own terms and policies.",
      },
      {
        heading: "Account Deletion",
        body: "You may request deletion of Your account and associated data at any time by contacting the Company or using available account settings. Additional information is provided in the Privacy Policy.",
      },
      {
        heading: "Content",
        subsections: [
          {
            heading: "Your Content and License Grant",
            body: "The Service allows You to create, upload, and share Content, including custom word lists and images.\n\nYou retain ownership of any Content You submit to the Service. By submitting Content, You grant the Company a limited, non-exclusive, royalty-free, worldwide license to use, host, store, reproduce, and display such Content solely for the purpose of operating, providing, and improving the Service.\n\nThis includes the right for the Company to make such Content available for use, adaptation, and reuse by other users within the Service as part of its educational features.\n\nThe Company does not use Content created by children or students for advertising, marketing, or any purpose unrelated to providing the educational functionality of the Service.",
          },
          {
            heading: "Content Visibility",
            body: "You acknowledge that Content You choose to share may be accessible to other users of the Service. You are responsible for ensuring that any Content You share does not include sensitive personal information, including full names, contact information, or other identifying details of children.\n\nContent that is shared within the Service should not be considered private, and the Company cannot guarantee confidentiality of Content that is made available to other users.\n\nFor school accounts, teachers and school administrators are responsible for determining whether student-created Content is shared within the Service.",
          },
          {
            heading: "Content Restrictions",
            body: "The Company is not responsible for the content of the Service's users. You expressly understand and agree that You are solely responsible for the Content and for all activity that occurs under Your Account, whether done so by You or any third person using Your Account.\n\nYou may not transmit any Content that is unlawful, offensive, upsetting, intended to disgust, threatening, libelous, defamatory, obscene or otherwise objectionable. Examples of such objectionable Content include, but are not limited to:\n- Unlawful or promoting unlawful activity\n- Defamatory, discriminatory, or mean-spirited content, including references or commentary about religion, race, sexual orientation, gender, national/ethnic origin, or other targeted groups\n- Spam, machine- or randomly-generated, constituting unauthorized or unsolicited advertising, chain letters, any other form of unauthorized solicitation, or any form of lottery or gambling\n- Containing or installing any viruses, worms, malware, trojan horses, or other content that is designed or intended to disrupt, damage, or limit the functioning of any software, hardware or telecommunications equipment or to damage or obtain unauthorized access to any data or other information of a third person\n- Infringing on any proprietary rights of any party, including patent, trademark, trade secret, copyright, right of publicity or other rights\n- Impersonating any person or entity including the Company and its employees or representatives\n- Violating the privacy of any third person\n- False information and features\n\nThe Company reserves the right, but not the obligation, to in its sole discretion determine whether or not any Content is appropriate and complies with these Terms, and to refuse or remove such Content. The Company may monitor, review, remove, or restrict access to Content at any time, including to ensure compliance with these Terms, protect users, or maintain the educational integrity of the Service.",
          },
          {
            heading: "Content Backups",
            body: "Although regular backups of Content are performed, the Company does not guarantee there will be no loss or corruption of data.\n\nCorrupt or invalid backup points may be caused by, without limitation, Content that is corrupted prior to being backed up or that changes during the time a backup is performed.\n\nThe Company will provide support and attempt to troubleshoot any known or discovered issues that may affect the backups of Content. But You acknowledge that the Company has no liability related to the integrity of Content or the failure to successfully restore Content to a usable state.\n\nYou agree to maintain a complete and accurate copy of any Content in a location independent of the Service.",
          },
        ],
      },
      {
        heading: "Service Modifications",
        body: "The Company reserves the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice. The Company will not be liable for any modification, suspension, or discontinuation of the Service.",
      },
      {
        heading: "Advertising",
        body: "The Service does not display third-party advertising to children and does not use personal information for advertising purposes.\n\nThe Service does not use behavioral advertising or third-party ad networks.",
      },
      {
        heading: "Copyright Policy",
        subsections: [
          {
            heading: "Intellectual Property Infringement",
            body: "We respect the intellectual property rights of others. It is Our policy to respond to any claim that Content posted on the Service infringes a copyright or other intellectual property infringement of any person.\n\nIf You are a copyright owner, or authorized on behalf of one, and You believe that the copyrighted work has been copied in a way that constitutes copyright infringement that is taking place through the Service, You must submit Your notice in writing to the attention of our copyright agent via email at support@spellingplayground.com and include in Your notice a detailed description of the alleged infringement.\n\nYou may be held accountable for damages (including costs and attorneys\' fees) for misrepresenting that any Content is infringing Your copyright.",
          },
          {
            heading: "DMCA Notice and DMCA Procedure for Copyright Infringement Claims",
            body: "You may submit a notification pursuant to the Digital Millennium Copyright Act (DMCA) by providing our Copyright Agent with the following information in writing (see 17 U.S.C 512(c)(3) for further detail):\n- An electronic or physical signature of the person authorized to act on behalf of the owner of the copyright's interest\n- A description of the copyrighted work that You claim has been infringed, including the URL of the location where the copyrighted work exists or a copy of the copyrighted work\n- Identification of the URL or other specific location on the Service where the material that You claim is infringing is located\n- Your address, telephone number, and email address\n- A statement by You that You have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law\n- A statement by You, made under penalty of perjury, that the above information in Your notice is accurate and that You are the copyright owner or authorized to act on the copyright owner's behalf\n\nYou can contact our copyright agent via email at support@spellingplayground.com. Upon receipt of a notification, the Company will take whatever action, in its sole discretion, it deems appropriate, including removal of the challenged content from the Service.",
          },
        ],
      },
      {
        heading: "Intellectual Property",
        body: "The Service and its original content (excluding Content provided by You or other users), features and functionality are and will remain the exclusive property of the Company and its licensors.\n\nThe Service is protected by copyright, trademark, and other laws of both the Country and foreign countries.\n\nOur trademarks and trade dress may not be used in connection with any product or service without the prior written consent of the Company.",
      },
      {
        heading: "Your Feedback to Us",
        body: "You assign all rights, title and interest in any Feedback You provide the Company. If for any reason such assignment is ineffective, You agree to grant the Company a non-exclusive, perpetual, irrevocable, royalty free, worldwide right and license to use, reproduce, disclose, sub-license, distribute, modify and exploit such Feedback without restriction.",
      },
      {
        heading: "Links to Other Websites",
        body: "Our Service may contain links to third-party websites or services that are not owned or controlled by the Company.\n\nThe Company has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third-party websites or services. You further acknowledge and agree that the Company shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with the use of or reliance on any such content, goods or services available on or through any such websites or services.\n\nWe strongly advise You to read the terms and conditions and privacy policies of any third-party websites or services that You visit.",
      },
      {
        heading: "Links from a Third-Party Social Media Service",
        body: "The Service may display, include, make available, or link to content or services provided by a Third-Party Social Media Service. A Third-Party Social Media Service is not owned or controlled by the Company, and the Company does not endorse or assume responsibility for any Third-Party Social Media Service.\n\nYou acknowledge and agree that the Company shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with Your access to or use of any Third-Party Social Media Service, including any content, goods, or services made available through them. Your use of any Third-Party Social Media Service is governed by that Third-Party Social Media Service's terms and privacy policies.",
      },
      {
        heading: "Termination",
        body: "We may terminate or suspend Your Account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms and Conditions.\n\nUpon termination, Your right to use the Service will cease immediately. If You wish to terminate Your Account, You may simply discontinue using the Service.\n\nIf We terminate Your Subscription for convenience (and not due to Your breach), We will refund any prepaid fees covering the remainder of the term of the Subscription after the effective date of termination. In no event will any termination relieve You of the obligation to pay any fees payable to Us for the period prior to the effective date of termination.\n\nWe may also suspend or terminate access to the Service if required to comply with applicable law or to protect the safety of users, including children.",
      },
      {
        heading: "Limitation of Liability",
        body: "Notwithstanding any damages that You might incur, the entire liability of the Company and any of its suppliers under any provision of these Terms and Your exclusive remedy for all of the foregoing shall be limited to the amount actually paid by You through the Service or 100 USD if You haven't purchased anything through the Service.\n\nTo the maximum extent permitted by applicable law, in no event shall the Company or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to, damages for loss of profits, loss of data or other information, for business interruption, for personal injury, loss of privacy arising out of or in any way related to the use of or inability to use the Service, third-party software and/or third-party hardware used with the Service, or otherwise in connection with any provision of these Terms), even if the Company or any supplier has been advised of the possibility of such damages and even if the remedy fails of its essential purpose.\n\nSome states do not allow the exclusion of implied warranties or limitation of liability for incidental or consequential damages, which means that some of the above limitations may not apply. In these states, each party's liability will be limited to the greatest extent permitted by law.",
      },
      {
        heading: '\"AS IS\" and \"AS AVAILABLE\" Disclaimer',
        body: 'The Service is provided to You \"AS IS\" and \"AS AVAILABLE\" and with all faults and defects without warranty of any kind. To the maximum extent permitted under applicable law, the Company, on its own behalf and on behalf of its Affiliates and its and their respective licensors and service providers, expressly disclaims all warranties, whether express, implied, statutory or otherwise, with respect to the Service, including all implied warranties of merchantability, fitness for a particular purpose, title and non-infringement, and warranties that may arise out of course of dealing, course of performance, usage or trade practice.\n\nWithout limiting the foregoing, neither the Company nor any of the Company\'s providers makes any representation or warranty of any kind, express or implied: (i) as to the operation or availability of the Service, or the information, content, and materials or products included thereon; (ii) that the Service will be uninterrupted or error-free; (iii) as to the accuracy, reliability, or currency of any information or content provided through the Service; or (iv) that the Service, its servers, the content, or e-mails sent from or on behalf of the Company are free of viruses, scripts, trojan horses, worms, malware, timebombs or other harmful components.\n\nSome jurisdictions do not allow the exclusion of certain types of warranties or limitations on applicable statutory rights of a consumer, so some or all of the above exclusions and limitations may not apply to You.',
      },
      {
        heading: "Governing Law",
        body: "The laws of the Country, excluding its conflicts of law rules, shall govern these Terms and Your use of the Service. Your use of the Application may also be subject to other local, state, national, or international laws.\n\nAny legal action or proceeding arising under these Terms will be brought exclusively in the state or federal courts located in New Jersey, and the parties hereby consent to personal jurisdiction and venue therein.",
      },
      {
        heading: "Disputes Resolution",
        body: "If You have any concern or dispute about the Service, You agree to first try to resolve the dispute informally by contacting the Company.",
      },
      {
        heading: "For European Union (EU) Users",
        body: "If You are a European Union consumer, you will benefit from any mandatory provisions of the law of the country in which You are resident.",
      },
      {
        heading: "United States Federal Government End Use Provisions",
        body: "If You are a U.S. federal government end user, our Service is a \"Commercial Item\" as that term is defined at 48 C.F.R. §2.101.",
      },
      {
        heading: "United States Legal Compliance",
        body: "You represent and warrant that (i) You are not located in a country that is subject to the United States government embargo, or that has been designated by the United States government as a \"terrorist supporting\" country, and (ii) You are not listed on any United States government list of prohibited or restricted parties.",
      },
      {
        heading: "Severability and Waiver",
        subsections: [
          {
            heading: "Severability",
            body: "If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law and the remaining provisions will continue in full force and effect.",
          },
          {
            heading: "Waiver",
            body: "Except as provided herein, the failure to exercise a right or to require performance of an obligation under these Terms shall not affect a party's ability to exercise such right or require such performance at any time thereafter nor shall the waiver of a breach constitute a waiver of any subsequent breach.",
          },
        ],
      },
      {
        heading: "Translation Interpretation",
        body: "These Terms and Conditions may have been translated if We have made them available to You on our Service. You agree that the original English text shall prevail in the case of a dispute.",
      },
      {
        heading: "Changes to These Terms and Conditions",
        body: "We reserve the right, at Our sole discretion, to modify or replace these Terms at any time. If a revision is material We will make reasonable efforts to provide at least 30 days\' notice prior to any new terms taking effect. What constitutes a material change will be determined at Our sole discretion.\n\nBy continuing to access or use Our Service after those revisions become effective, You agree to be bound by the revised terms. If You do not agree to the new terms, in whole or in part, please stop using the Service.\n\nThese Terms, together with the Privacy Policy and any incorporated documents, constitute the entire agreement between You and the Company regarding the Service and supersede any prior agreements. You may not assign or transfer these Terms without the prior written consent of the Company. The Company may assign these Terms without restriction.",
      },
      {
        heading: "Contact Us",
        body: "If you have any questions about these Terms and Conditions, You can contact us:\n- By email: support@spellingplayground.com\n- By visiting this page on our website: https://spellingplayground.com/contact",
      },
    ],
  },
  "school-terms-addendum": {
    title: "School Terms Addendum",
    version: "1.1",
    effectiveDate: "March 17, 2026",
    icon: Shield,
    summary:
      "This School Terms Addendum supplements the Terms of Service for Spelling Playground and applies when the Service is used by a school, school district, or other educational institution. In the event of a conflict between this Addendum and the Terms, this Addendum controls with respect to School Accounts.",
    sections: [
      {
        heading: "1. Role of the Company",
        body: "Spelling Playground LLC (\"Company\") acts as a service provider (or \"school official\") to the School.\n\nThe Company:\n- Processes student data solely on behalf of and under the direction of the School\n- Uses student data only to provide and improve the Service\n- Does not use student data for advertising or commercial profiling",
      },
      {
        heading: "2. Student Data Ownership and Control",
        body: "As between the Company and the School:\n- The School retains ownership and control of all student data\n- The Company has no ownership rights in student data\n- The Company accesses and processes student data only as necessary to provide the Service\n\nThe School is responsible for:\n- Determining what student data is submitted to the Service\n- Managing access to student accounts\n- Authorizing teachers, staff, and administrators",
      },
      {
        heading: "3. Compliance with Student Privacy Laws",
        body: "The Company supports the School's compliance with applicable laws, including:\n- The Family Educational Rights and Privacy Act (FERPA)\n- The Children's Online Privacy Protection Act (COPPA), where applicable\n\nThe Company agrees that:\n- Student data is used only for educational purposes\n- Student data is not sold or rented\n- Student data is not used for targeted advertising",
      },
      {
        heading: "4. Parental Consent",
        body: "When the Service is used in a school context:\n- The School may act as the parent's agent in providing consent for student use of the Service, as permitted under applicable law\n- The School is responsible for obtaining any required parental notices and consents\n\nThe Company will:\n- Provide information reasonably requested by the School to support parental notice requirements",
      },
      {
        heading: "5. Use of Student Data",
        body: "The Company uses student data only to:\n- Provide spelling and educational functionality\n- Maintain and improve the Service\n- Ensure security and integrity of the platform\n- Comply with legal obligations\n\nThe Company does not:\n- Build profiles for non-educational purposes\n- Use student data for marketing\n- Share student data except as described in the Terms and Privacy Policy",
      },
      {
        heading: "6. Data Security",
        body: "The Company implements reasonable administrative, technical, and physical safeguards designed to:\n- Protect student data from unauthorized access, disclosure, or misuse\n- Maintain the confidentiality and integrity of student data",
      },
      {
        heading: "7. Data Retention and Deletion",
        body: "- Student data is retained only as long as necessary to provide the Service\n- The School may request deletion of student data at any time\n- Upon termination of the School's use of the Service, the Company will delete student data within a reasonable timeframe, unless retention is required by law",
      },
      {
        heading: "8. Subprocessors",
        body: "The Company may use trusted third-party service providers (\"subprocessors\") to operate the Service (e.g., hosting, payment processing).\n\nThe Company ensures that:\n- Subprocessors are bound by data protection obligations\n- They access student data only as necessary to provide their services",
      },
      {
        heading: "9. Access and Correction",
        body: "The School has the right to:\n- Request access to student data\n- Request correction or deletion of inaccurate data\n\nParents may exercise these rights through the School or as described in the Privacy Policy.",
      },
      {
        heading: "10. Content Created by Students",
        body: "Students and teachers may create content within the Service (such as word lists or images).\n- Such content may be shared within the Service as part of its educational functionality\n- The School is responsible for determining appropriate sharing settings\n- The Company does not use student-created content for advertising or non-educational purposes",
      },
      {
        heading: "11. Account Management",
        body: "The School is responsible for:\n- Managing teacher and student access\n- Ensuring accounts are used appropriately\n- Supervising student use of the Service\n\nThe Company may suspend accounts if necessary to:\n- Protect student safety\n- Prevent misuse\n- Comply with legal obligations",
      },
      {
        heading: "12. Changes to This Addendum",
        body: "The Company may update this Addendum from time to time.\n\nIf changes are material, the Company will provide reasonable notice to the School.\n\nContinued use of the Service constitutes acceptance of the updated Addendum.",
      },
      {
        heading: "13. Contact Information",
        body: "If you have any questions about this Addendum or student data practices, you may contact:\n- By email: support@spellingplayground.com\n- By visiting this page on our website: https://spellingplayground.com/contact",
      },
    ],
  },
  "coppa-parent-notice": {
    title: "COPPA Direct Parent Notice",
    version: "1.1",
    effectiveDate: "March 17, 2026",
    icon: Shield,
    summary:
      "This notice explains how Spelling Playground collects, uses, and protects information about children, as required by the Children's Online Privacy Protection Act (COPPA). It applies to all parents and legal guardians whose children use the Service.",
    sections: [
      {
        heading: "Notice to Parents",
        body: "Spelling Playground is an educational app designed for children to practice spelling and language skills under the supervision of a parent, legal guardian, or school.\n\nThis notice explains how we collect, use, and protect information about children.",
      },
      {
        heading: "1. Information We Collect About Children",
        body: "We collect only the information necessary to provide the Service.",
        subsections: [
          {
            heading: "Account Information",
            body: "- Child's first name or nickname\n- Username and password",
          },
          {
            heading: "Educational Content",
            body: "- Custom word lists created by parents, teachers, or students\n- Progress and performance data (e.g., quiz results)",
          },
          {
            heading: "Technical Information",
            body: "- Device type, browser type, and general usage data\n- IP address (used for security and service functionality)\n\nWe do not require children to provide more information than is reasonably necessary to use the Service.",
          },
        ],
      },
      {
        heading: "2. How We Use Children's Information",
        body: "We use this information only to:\n- Provide and operate the app\n- Track learning progress\n- Improve educational features\n- Maintain security and prevent misuse\n\nWe do not:\n- Sell children's personal information\n- Use children's data for advertising\n- Show targeted or behavioral ads to children",
      },
      {
        heading: "3. When Information Is Shared",
        body: "We do not share children's personal information except:\n- With service providers that help us operate the app (e.g., hosting, payments), under strict confidentiality obligations\n- When required by law or to protect safety\n- With a school or teacher, if the account is part of a school program",
      },
      {
        heading: "4. Parental Rights",
        body: "As a parent or legal guardian, you have the right to:\n- Review your child's personal information\n- Request correction of inaccurate information\n- Request deletion of your child's information\n- Refuse further collection or use of your child's information\n\nYou can exercise these rights by contacting us at support@spellingplayground.com.",
      },
      {
        heading: "5. Parental Consent",
        body: "We require that a parent or legal guardian create and manage any account used by a child.\n\nBy creating an account and allowing your child to use Spelling Playground, you consent to the collection and use of your child's information as described in this notice and our Privacy Policy.\n\nFor school-based use, the school may provide consent on behalf of parents, as permitted by law.",
      },
      {
        heading: "6. Data Retention",
        body: "We retain children's information only as long as necessary to:\n- Provide the Service\n- Maintain educational records\n- Comply with legal obligations\n\nYou may request deletion of your child's data at any time.",
      },
      {
        heading: "7. Data Security",
        body: "We take reasonable measures to protect children's information, including:\n- Secure data transmission (encryption)\n- Restricted access to personal data\n- Monitoring for unauthorized access",
      },
      {
        heading: "8. Contact Us",
        body: "If you have questions about this notice or your child's information, you can contact us:\n- By email: support@spellingplayground.com\n- By visiting this page on our website: https://spellingplayground.com/contact",
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
  docType: "terms" | "school-terms-addendum" | "coppa-parent-notice" | "privacy-policy";
}

export function LegalDocPage({ docType }: LegalDocPageProps) {
  const doc = DOCS[docType];
  const Icon = doc.icon;
  const { themeAssets, hasDarkBackground } = useTheme();
  const textClasses = getThemedTextClasses(hasDarkBackground);

  return (
    <div className="min-h-screen relative">
      {/* Themed background */}
      <div
        className="fixed inset-0 portrait:block landscape:hidden"
        style={{ backgroundImage: `url(${themeAssets.backgroundPortrait})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center top" }}
      />
      <div
        className="fixed inset-0 portrait:hidden landscape:block"
        style={{ backgroundImage: `url(${themeAssets.backgroundLandscape})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center top" }}
      />
      <div className="fixed inset-0 bg-white/5 dark:bg-black/50" />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 relative z-10">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { if (window.history.length > 1) { window.history.back(); } else { window.close(); } }} data-testid="button-close-legal">
            <X className="w-4 h-4 mr-1" />
            Close
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Icon className={`w-7 h-7 ${hasDarkBackground ? "text-white" : "text-primary"}`} />
            <h1 className={`text-2xl font-bold ${textClasses.headline}`} data-testid="text-legal-doc-title">{doc.title}</h1>
          </div>
          <div className={`flex items-center gap-3 text-sm ${textClasses.subtitle}`}>
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
                {section.body && <SectionBody body={section.body} />}
                {section.subsections && (
                  <div className={`space-y-4 ${section.body ? "mt-4" : ""}`}>
                    {section.subsections.map((sub) => (
                      <div key={sub.heading}>
                        <p className="text-sm font-semibold text-foreground mb-2">{sub.heading}</p>
                        <SectionBody body={sub.body} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className={`text-center text-xs pt-4 pb-8 ${textClasses.subtitle}`}>
          <p>Spelling Playground &mdash; {doc.title} v{doc.version}</p>
          <p className="mt-1">Questions? Contact{" "}
            <a href="mailto:support@spellingplayground.com" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
              support@spellingplayground.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function TermsPage() { return <LegalDocPage docType="terms" />; }
export function SchoolTermsAddendumPage() { return <LegalDocPage docType="school-terms-addendum" />; }
export function CoppaParentNoticePage() { return <LegalDocPage docType="coppa-parent-notice" />; }
export function PrivacyPolicyPage() { return <LegalDocPage docType="privacy-policy" />; }
