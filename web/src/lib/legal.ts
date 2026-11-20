/**
 * Legal documents for the Predict 360 prototype. Each section has an id (for links and the table of
 * contents), a title, optional intro text, and numbered clauses. A clause may carry bullet points.
 */
export interface Clause {
  text: string;
  points?: string[];
}
export interface LegalSection {
  id: string;
  title: string;
  intro?: string;
  clauses: Clause[];
}
export interface LegalDoc {
  title: string;
  alsoKnownAs?: string;
  effective: string;
  summary: string[];
  sections: LegalSection[];
}

export const EFFECTIVE = 'November 20, 2026';
export const SUPPORT_URL = 'https://github.com/nc1b/Predict360/issues';

export const TERMS: LegalDoc = {
  title: 'Terms of Service',
  alsoKnownAs: 'Terms of Use',
  effective: EFFECTIVE,
  summary: [
    'Predict 360 is a free student research prototype, not a medical device. It cannot diagnose, detect or rule out any illness.',
    'You must be at least 13 (or the minimum digital-consent age where you live) to use it, and only track your own computer.',
    'AI explanations from Claude Opus 5.5 can be wrong. Do not use any result for medical, employment or insurance decisions.',
    'Never use Predict 360 to monitor someone else secretly.',
    'The service is provided “as is”, and our liability is limited as far as the law allows.',
    'You can stop at any time and delete your data from your dashboard.',
  ],
  sections: [
    {
      id: 'acceptance',
      title: 'Acceptance of these terms',
      clauses: [
        { text: 'These Terms of Service (also called the Terms of Use) form an agreement between you and the Predict 360 project team (“we”, “us”). They apply to the Predict 360 website at predict360.vercel.app, the Predict 360 desktop apps for Windows and macOS, and the sync service that connects them (together, the “Service”).' },
        { text: 'By creating an account, installing the desktop app, or otherwise using the Service, you agree to these Terms and to our Privacy Policy, which explains how we handle your information. If you do not agree, do not use the Service.' },
        { text: 'If you use the Service on behalf of an organisation, you confirm that you have authority to accept these Terms for that organisation.' },
      ],
    },
    {
      id: 'about',
      title: 'About Predict 360',
      clauses: [
        { text: 'Predict 360 is a research prototype built by high-school students for the Veritas AI International High School Hackathon 2026. It compares the timing of your typing with your own earlier check-ins and, if you install the desktop app, counts your computer activity.' },
        { text: 'The Service is experimental. Features may change, break or be removed, and it is not designed or tested for any safety-critical, clinical or commercial use.' },
      ],
    },
    {
      id: 'eligibility',
      title: 'Eligibility',
      clauses: [
        { text: 'You must be at least 13 years old, or the minimum age of digital consent where you live if that is higher (for example, 16 in some countries of the European Economic Area).' },
        { text: 'If you are under 18 or the age of majority where you live, you may use the Service only with the involvement and permission of a parent or legal guardian, who agrees to these Terms on your behalf.' },
        { text: 'You may not use the Service if you are barred from doing so under the laws that apply to you.' },
      ],
    },
    {
      id: 'not-medical',
      title: 'Not medical advice and not a medical device',
      intro: 'Please read this section carefully.',
      clauses: [
        { text: 'Predict 360 is not a medical device and has not been reviewed, cleared or approved by any health authority. Nothing in the Service is medical advice, a diagnosis or a treatment recommendation.' },
        {
          text: 'The Service does not and cannot:',
          points: [
            'detect, diagnose, predict, screen for or rule out any disease or condition, including Parkinson’s disease, depression, multiple sclerosis, cognitive impairment, sleep disorders or stress;',
            'measure fatigue, alertness, hydration, intoxication or fitness to work, drive or operate equipment;',
            'replace a consultation with a doctor or another qualified professional.',
          ],
        },
        { text: 'References to health research, and the “Condition screening · coming soon” models, describe research only. Those models are not used to produce any result shown to you.' },
        { text: 'A score, flag, trend or AI explanation only describes a difference from your own usual typing or computer use. Ordinary causes such as a different keyboard, distraction or tiredness are common. If you are worried about your health, contact a qualified healthcare professional. In an emergency, call your local emergency number.' },
      ],
    },
    {
      id: 'accounts',
      title: 'Your account',
      clauses: [
        { text: 'You need an account to save check-ins and use the desktop app. Accounts are provided through our sign-in provider, Clerk. You agree to give accurate information and keep it up to date.' },
        { text: 'You are responsible for keeping your sign-in details secure and for everything that happens under your account. Tell us promptly through the support link if you think your account has been used without permission.' },
        { text: 'Each account is for one person. Do not share your account, and do not connect a desktop app to an account that is not yours.' },
      ],
    },
    {
      id: 'desktop-app',
      title: 'Desktop app licence and tracking',
      clauses: [
        { text: 'Subject to these Terms, we grant you a personal, non-exclusive, non-transferable, revocable licence to download, install and use the Predict 360 desktop app on computers you own or are authorised to control, for your own personal use.' },
        {
          text: 'You may not:',
          points: [
            'sell, rent, sublicense or redistribute the app as your own product;',
            'remove or alter notices, or misrepresent the app’s origin;',
            'modify the app to collect information it is designed not to collect (such as typed words or key values), or to hide that tracking is on;',
            'use the app to break any law or the rights of others.',
          ],
        },
        { text: 'Tracking is opt-in. Once you choose Start tracking, the app keeps counting activity in the background: closing its window leaves it running in the system tray (menu bar on macOS), and it starts with your computer and resumes tracking. Pause stops tracking and turns off launch at login. Quit stops it until you next sign in to your computer. You are responsible for knowing when tracking is on.' },
        { text: 'Installers may be unsigned during the prototype phase, so your operating system may show a warning. Only download the app from the official website.' },
      ],
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable use',
      clauses: [
        {
          text: 'You agree not to:',
          points: [
            'use the Service to monitor, track or assess another person without their informed consent, or install the desktop app on a device you are not authorised to control;',
            'use any output of the Service to make or support decisions about a person’s employment, hiring, discipline, education, insurance, credit, housing, legal status or access to healthcare;',
            'present any output as a medical, clinical or professional assessment;',
            'access or try to access another user’s account or data, or probe, scan or test the Service’s security without our written permission;',
            'interfere with or disrupt the Service, including by overloading it, uploading malicious code or bypassing rate limits and access controls;',
            'scrape, copy or harvest data from the Service by automated means, other than the public research files we publish;',
            'use the AI features to generate unlawful, harmful or misleading content, or to try to extract the system instructions;',
            'use the Service in breach of any applicable law or regulation.',
          ],
        },
        { text: 'We may investigate suspected breaches and take any action we consider appropriate, including suspending or ending access.' },
      ],
    },
    {
      id: 'workplace',
      title: 'Workplace and third-party use',
      clauses: [
        { text: 'Predict 360 is designed for individuals. It does not offer an employer dashboard, and your results are private to your account.' },
        { text: 'An employer, school or other organisation must not require anyone to use the Service, and must not request, view or use another person’s results. Any organisation that encourages voluntary use is responsible for giving clear notice, obtaining valid consent and complying with employment, privacy and data-protection law.' },
      ],
    },
    {
      id: 'ai',
      title: 'AI features',
      clauses: [
        { text: 'Optional AI features (result explanations, the assistant chat, the daily analysis and the desktop “Explain my day”) are generated by Claude Opus 5.5, a model made by Anthropic, accessed through the Hack Club AI service.' },
        { text: 'Only numbers (timing measurements, scores, activity counts and, if you choose, your energy level and modelled weather pressure) and messages you type into the assistant chat are sent to these services. The two sentences you type in a check-in are never sent.' },
        { text: 'AI output can be inaccurate, incomplete or out of date, and it may sound more confident than it should. It is provided for reflection only. Do not rely on it for any medical, legal, financial or employment decision, and check anything important with a qualified person.' },
        { text: 'AI features may be unavailable, limited or changed at any time, and their use is also subject to the terms of the providers involved.' },
      ],
    },
    {
      id: 'research',
      title: 'Research results and models',
      clauses: [
        { text: 'The check-in model was trained and tested on public research datasets. Accuracy figures shown on the website describe those tests and do not guarantee how the Service will perform for you.' },
        { text: 'Condition-screening models are research experiments and are not offered as a feature. We will not release any such feature without clinician-confirmed data, independent validation and any approvals required by law.' },
        { text: 'Your personal data is not used to train our models or the public research pipeline.' },
      ],
    },
    {
      id: 'your-data',
      title: 'Your content and data',
      clauses: [
        { text: 'You keep all rights in the information you provide. You give us a limited licence to store, process and display it only as needed to provide the Service to you, including syncing it between your devices and sending numeric summaries to the AI providers when you use AI features.' },
        { text: 'You can delete your saved check-ins and activity at any time from your dashboard. How we collect, use, keep and delete information is explained in the Privacy Policy.' },
      ],
    },
    {
      id: 'feedback',
      title: 'Feedback',
      clauses: [{ text: 'If you send us ideas or feedback, you allow us to use them to improve the Service without any obligation to you. Please do not include personal health information in feedback or in public issues.' }],
    },
    {
      id: 'ip',
      title: 'Intellectual property',
      clauses: [
        { text: 'The Service, including its design, text, graphics, logos and software, belongs to the Predict 360 project team or its licensors and is protected by intellectual-property laws. Except for the licence in these Terms, and any rights granted by a licence published in the project repository, no rights are transferred to you.' },
        { text: 'Public datasets, libraries and third-party content used by the Service remain subject to their own licences and attribution requirements, listed on the Sources & research limits page.' },
        { text: '“Claude” is a trademark of Anthropic. Predict 360 is an independent project and is not affiliated with, endorsed by or sponsored by Anthropic, Hack Club, or 360factors (whose Predict360 software shares a similar name).' },
      ],
    },
    {
      id: 'third-parties',
      title: 'Third-party services',
      clauses: [
        {
          text: 'The Service relies on third-party providers, each with its own terms and policies, including:',
          points: [
            'Clerk (accounts and sign-in);',
            'Supabase (database and installer downloads);',
            'Vercel (website and API hosting);',
            'Hack Club AI and Anthropic (AI features);',
            'Open-Meteo (optional weather context);',
            'GitHub (source code, Mac downloads and support).',
          ],
        },
        { text: 'We are not responsible for third-party services, websites or content, and links to them are not endorsements.' },
      ],
    },
    {
      id: 'fees',
      title: 'Fees',
      clauses: [{ text: 'The Service is currently free. If we ever introduce paid features, we will tell you in advance, and you will not be charged unless you agree.' }],
    },
    {
      id: 'availability',
      title: 'Availability and changes to the Service',
      clauses: [
        { text: 'We aim to keep the Service running but do not promise that it will be available, uninterrupted, secure or error-free. We may change, suspend or discontinue any part of it at any time, with or without notice.' },
        { text: 'Keep your own copy of any information you want to keep. We do not guarantee that data can be recovered after loss.' },
      ],
    },
    {
      id: 'termination',
      title: 'Ending your use',
      clauses: [
        { text: 'You can stop using the Service at any time: pause or quit the desktop app, disconnect your devices, delete your data from the dashboard and close your account.' },
        { text: 'We may suspend or end your access if you break these Terms, if required by law, or to protect the Service or other users. Where reasonable, we will tell you why.' },
        { text: 'Sections that by their nature should survive (including Not medical advice, Intellectual property, Disclaimers, Limitation of liability, Indemnity and General terms) continue after your use ends.' },
      ],
    },
    {
      id: 'disclaimers',
      title: 'Disclaimers',
      clauses: [
        { text: 'To the fullest extent permitted by law, the Service is provided “as is” and “as available”, without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy, non-infringement and uninterrupted or error-free operation.' },
        { text: 'We do not warrant that any score, flag, trend, analysis or AI output is accurate, complete or suitable for any purpose.' },
        { text: 'Some jurisdictions do not allow certain warranties to be excluded, so some of these exclusions may not apply to you.' },
      ],
    },
    {
      id: 'liability',
      title: 'Limitation of liability',
      clauses: [
        { text: 'To the fullest extent permitted by law, the Predict 360 project team, its members and contributors will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of data, profits, opportunity or goodwill, arising from or related to the Service or these Terms, even if advised of the possibility.' },
        { text: 'To the fullest extent permitted by law, our total liability for all claims relating to the Service is limited to the greater of the amount you paid us for the Service in the 12 months before the claim (currently zero) or USD 50.' },
        { text: 'Nothing in these Terms limits liability that cannot be limited by law, such as liability for death or personal injury caused by negligence, or for fraud. If you are a consumer, you keep any rights you have under consumer-protection laws that cannot be waived.' },
      ],
    },
    {
      id: 'indemnity',
      title: 'Indemnity',
      clauses: [{ text: 'To the extent permitted by law, you agree to defend and compensate the Predict 360 project team against claims, losses and costs (including reasonable legal fees) arising from your breach of these Terms, your misuse of the Service, or your use of the Service to monitor or make decisions about another person.' }],
    },
    {
      id: 'disputes',
      title: 'Disputes and governing law',
      clauses: [
        { text: 'If you have a concern, please contact us first through the support link so we can try to resolve it informally.' },
        { text: 'These Terms are governed by the laws of the place where the Predict 360 project team is based, without regard to conflict-of-law rules, except where the law of the country where you live gives you the right to rely on its laws or bring proceedings in its courts.' },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      clauses: [
        { text: 'We may update these Terms as the Service develops. We will post the updated Terms on this page with a new effective date, and for material changes we will give reasonable notice in the Service.' },
        { text: 'If you keep using the Service after changes take effect, you accept the updated Terms. If you do not agree, stop using the Service and delete your data.' },
      ],
    },
    {
      id: 'general',
      title: 'General terms',
      clauses: [
        {
          text: 'These general provisions apply:',
          points: [
            'Entire agreement: these Terms and the Privacy Policy are the whole agreement between you and us about the Service.',
            'Severability: if any provision is found unenforceable, the rest stays in effect, and that provision is applied as far as the law allows.',
            'No waiver: not enforcing a provision is not a waiver of our right to do so later.',
            'Assignment: you may not transfer your rights under these Terms. We may transfer ours as part of a reorganisation or handover of the project.',
            'No third-party rights: no one other than you and us has rights under these Terms.',
            'Language: if these Terms are translated, the English version prevails.',
          ],
        },
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      clauses: [{ text: 'Questions about these Terms can be raised through the project support page. Public issues are visible to everyone, so do not include account details, personal activity or health information in them.' }],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  effective: EFFECTIVE,
  summary: [
    'Your typed words never leave your browser, and the desktop app never records words, key values, screenshots or app names.',
    'We store numeric timing summaries, activity counts, your energy answer, your daily analysis and basic account details, linked to your account.',
    'AI features send only numbers (and chat messages you type) to Claude Opus 5.5 through Hack Club AI.',
    'We do not sell your data, show ads, or give results to employers.',
    'You can delete your data from your dashboard at any time.',
  ],
  sections: [
    {
      id: 'scope',
      title: 'Who we are and what this covers',
      clauses: [
        { text: 'This Privacy Policy explains how the Predict 360 project team (“we”, “us”) collects, uses, shares and protects information when you use the Predict 360 website, desktop apps and sync service (the “Service”).' },
        { text: 'Predict 360 is a student research prototype and not a medical service. It should be read together with our Terms of Service.' },
      ],
    },
    {
      id: 'collect',
      title: 'Information we collect',
      clauses: [
        { text: 'Account information: your name, email address and sign-in details, handled by our sign-in provider Clerk. We store your account ID, a display name, your time zone, when you first and last signed in, how many times you have signed in, and whether you last used the website or desktop app.' },
        { text: 'Typing check-ins: the browser measures key timing while you type two sentences. Only timing categories and timestamps are sent for analysis. We save the resulting numeric summaries (such as median key-hold time, sentence pause and rhythm variation), your score and status, and a random device ID. The words you type stay in the text box and are cleared after each check-in.' },
        { text: 'Daily entries: your optional energy answer for the day and the AI-written daily analysis, so they sync between your devices.' },
        { text: 'Desktop activity (only after you start tracking): hourly counts of clicks, key presses and scrolls, tracked time, and active and idle time, plus a random device ID.' },
        { text: 'Optional weather context: if you enter a city and date, they are sent to Open-Meteo to look up modelled air pressure. The city is not saved.' },
        { text: 'Technical information: our hosting and service providers automatically process connection data such as IP address, browser type and request times to deliver and secure the Service.' },
      ],
    },
    {
      id: 'not-collect',
      title: 'Information we never collect',
      clauses: [
        {
          text: 'We do not collect or store:',
          points: [
            'the words you type in a check-in, or anywhere else;',
            'which keys you press, pointer positions or mouse paths;',
            'screenshots, screen recordings, window titles, application names or browsing history;',
            'your location, other than an optional city you choose for weather context;',
            'health records or diagnoses.',
          ],
        },
      ],
    },
    {
      id: 'use',
      title: 'How we use information',
      clauses: [
        {
          text: 'We use information to:',
          points: [
            'run your dashboard, compare each check-in with your own baseline, and show trends, streaks and research signals;',
            'sync your data between the website and your desktop apps;',
            'show the daily check-in on sign-in and remember your preferences;',
            'create AI explanations and daily analyses when AI features are on;',
            'keep the Service secure, prevent abuse and fix problems.',
          ],
        },
        { text: 'We do not use your data for advertising, profiling for marketing, or training our models, and we do not make automated decisions that have legal or similarly significant effects on you.' },
      ],
    },
    {
      id: 'ai',
      title: 'AI processing',
      clauses: [
        { text: 'When AI features run, numeric summaries (timing measurements, scores, recent check-in history, activity counts, and optionally your energy level and modelled weather pressure), together with any message you type in the assistant chat, are sent to the Hack Club AI service, which passes them to Anthropic’s Claude Opus 5.5 model to write a response.' },
        { text: 'Your check-in sentences and raw keystrokes are never sent. Responses are returned to you, and the daily analysis is saved to your account so it appears on your other devices. These providers process the data under their own terms and policies.' },
      ],
    },
    {
      id: 'legal-bases',
      title: 'Legal bases (EEA and UK users)',
      clauses: [
        {
          text: 'Where data-protection laws such as the GDPR apply, we rely on:',
          points: [
            'performance of our agreement with you, to provide the features you ask for;',
            'your consent, for optional features such as desktop tracking, energy answers, AI features and weather context, which you can withdraw at any time;',
            'our legitimate interests, to keep the Service secure and working.',
          ],
        },
        { text: 'Typing timing and activity counts are not used to infer health information. If any information you provide could be considered sensitive, we process it only with your explicit consent and only to provide the feature you chose.' },
      ],
    },
    {
      id: 'sharing',
      title: 'How we share information',
      clauses: [
        {
          text: 'We share information only with service providers that help run the Service:',
          points: [
            'Clerk (authentication);',
            'Supabase (database, sync and installer storage);',
            'Vercel (website and API hosting);',
            'Hack Club AI and Anthropic (AI features, numbers and chat messages only);',
            'Open-Meteo (optional weather lookup);',
            'GitHub (Mac app downloads and support).',
          ],
        },
        { text: 'We do not sell or rent personal information, and we do not share it for cross-context behavioural advertising. We do not give results to employers, schools or insurers.' },
        { text: 'We may disclose information if required by law, to protect the rights, safety or property of users or others, or as part of a transfer of the project, in which case this policy continues to apply.' },
      ],
    },
    {
      id: 'storage',
      title: 'Local storage and cookies',
      clauses: [
        { text: 'We use essential cookies and tokens from Clerk to keep you signed in. Your browser stores a local copy of your check-in summaries, pending sync items, a random device ID, your theme and dashboard preferences, and today’s energy and analysis.' },
        { text: 'The desktop app stores up to 30 days of activity summaries on your computer and protects its account credential with your operating system’s secure storage where available. We do not use advertising or cross-site tracking cookies.' },
      ],
    },
    {
      id: 'retention',
      title: 'How long we keep information',
      clauses: [
        {
          text: 'We keep information only as long as needed:',
          points: [
            'Desktop activity: about 30 days; older days are removed when your account next syncs activity.',
            'Daily entries (energy and analysis): about 90 days.',
            'Check-in summaries: until you delete them; the dashboard shows your latest 30.',
            'Account profile: until you delete your account data.',
            'Desktop connections: expire after 30 days or when revoked.',
          ],
        },
        { text: 'Our providers may keep operational logs and backups for a limited period under their own policies.' },
      ],
    },
    {
      id: 'rights',
      title: 'Your choices and rights',
      clauses: [
        {
          text: 'You can, at any time:',
          points: [
            'pause or quit desktop tracking, or disconnect a device;',
            'delete your check-in history and daily entries (Delete history) and your activity (Delete activity) from the dashboard;',
            'turn off the daily check-in prompt and automatic daily analysis in Preferences;',
            'manage or close your account from the account menu.',
          ],
        },
        { text: 'Depending on where you live, you may also have the right to access, correct, delete, restrict or object to the processing of your information, to receive a copy of it, and to withdraw consent. Please delete your app data before closing your account, as closing an account does not yet remove every stored record automatically. To make a request, use the support link; we will not discriminate against you for exercising your rights.' },
        { text: 'You also have the right to complain to your local data-protection authority.' },
      ],
    },
    {
      id: 'children',
      title: 'Children',
      clauses: [{ text: 'The Service is not directed to children under 13 (or the higher digital-consent age where they live). We do not knowingly collect their information. If you believe a child has provided information without appropriate consent, contact us and we will delete it.' }],
    },
    {
      id: 'security',
      title: 'Security',
      clauses: [{ text: 'We use encrypted connections, account-scoped records protected from anonymous access, hashed desktop tokens and operating-system credential encryption where available. No system is perfectly secure, so we cannot guarantee absolute security.' }],
    },
    {
      id: 'transfers',
      title: 'International transfers',
      clauses: [{ text: 'Our providers may process information in the United States and other countries whose data-protection laws may differ from yours. Where required, transfers rely on appropriate safeguards offered by those providers.' }],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      clauses: [{ text: 'We may update this policy as the Service changes. We will post the new version here with a new effective date and give reasonable notice of material changes in the Service.' }],
    },
    {
      id: 'contact',
      title: 'Contact',
      clauses: [{ text: 'For privacy questions or requests, use the project support page. Do not post account details, personal activity or health information in a public issue; we will arrange a private way to handle your request.' }],
    },
  ],
};
