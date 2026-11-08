import Link from "next/link";
import type { ReactNode } from "react";

export type LegalSection = {
  title: string;
  paragraphs?: ReactNode[];
  bullets?: ReactNode[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  updatedAt: string;
  intro?: ReactNode;
  reviewNotice?: string;
  sections: LegalSection[];
};

const email = (
  <a className="font-medium text-gold underline underline-offset-4" href="mailto:contact@passyeventz.com">
    contact@passyeventz.com
  </a>
);

export const legalDocuments: LegalDocument[] = [
  {
    slug: "mentions-legales",
    title: "Mentions légales",
    updatedAt: "7 novembre 2026",
    intro: "Informations relatives à l’éditeur et à l’utilisation du site Passyeventz.",
    sections: [
      {
        title: "Éditeur du site",
        paragraphs: ["Le présent site est édité par Passyeventz."],
        bullets: [
          <><strong>Nom commercial :</strong> Passyeventz</>,
          <><strong>Nom et prénom de l’exploitant :</strong> ATOU Rose</>,
          <><strong>Statut juridique :</strong> Entrepreneur individuel (EI) – Micro-entrepreneur</>,
          <><strong>Adresse professionnelle :</strong> 717 Route Nationale 7, 38121 Reventin-Vaugris</>,
          <><strong>Adresse e-mail :</strong> {email}</>,
          <><strong>Téléphone :</strong> +33 (0) 670 256 831</>,
          <><strong>Numéro SIRET :</strong> 10700501900016</>,
        ],
      },
      {
        title: "Directeur de la publication",
        paragraphs: ["Le directeur de la publication est l’exploitant de l’entreprise Passyeventz : ATOU Rose."],
      },
      {
        title: "Hébergement du site",
        paragraphs: [
          <>Le site est hébergé par Vercel, Inc. Vous pouvez consulter le site de l’hébergeur sur <a className="font-medium text-gold underline underline-offset-4" href="https://vercel.com" target="_blank" rel="noreferrer">vercel.com</a>.</>,
          "Adresse indiquée par l’hébergeur : 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis (ou 440 N Barranca Ave Suite 4133, Covina, CA 91789).",
        ],
      },
      {
        title: "Activité",
        paragraphs: ["Passyeventz propose notamment :"],
        bullets: [
          "La location de mobilier & vaisselle événementielle ;",
          "La location d’articles d’art de la table ;",
          "La location d’accessoires et d’éléments décoratifs ;",
          "La mise à disposition d’équipements pour réceptions et événements ;",
          "Des prestations de décoration et de mise en scène événementielle, selon les services proposés.",
        ],
      },
      {
        title: "Propriété intellectuelle",
        paragraphs: [
          "L’ensemble des contenus présents sur ce site, notamment les textes, photographies, logos, visuels, graphismes, éléments de présentation et identité de marque, est protégé par les dispositions relatives à la propriété intellectuelle.",
          "Toute reproduction ou exploitation sans autorisation préalable est interdite, sauf exceptions prévues par la loi.",
        ],
      },
      {
        title: "Contact",
        paragraphs: [<>Pour toute question relative au site ou aux services proposés, vous pouvez contacter Passyeventz à l’adresse suivante : {email}.</>],
      },
    ],
  },
  {
    slug: "politique-de-confidentialite",
    title: "Politique de confidentialité",
    updatedAt: "7 novembre 2026",
    intro: (
      <>
        Chez <strong>Passyeventz</strong>, nous accordons une importance particulière à la protection de vos données personnelles. La présente politique explique quelles informations nous collectons, pourquoi nous les utilisons, combien de temps nous les conservons et quels sont vos droits. Nous nous engageons à respecter le Règlement général sur la protection des données (RGPD) et la réglementation française applicable.
      </>
    ),
    sections: [
      {
        title: "Responsable du traitement",
        paragraphs: ["Le responsable du traitement est :"],
        bullets: [
          <><strong>Nom commercial :</strong> Passyeventz</>,
          <><strong>Exploitant :</strong> ATOU Rose – Entrepreneur individuel (EI)</>,
          <><strong>Adresse professionnelle :</strong> 717 Route Nationale 7, 38121 Reventin-Vaugris</>,
          <><strong>E-mail :</strong> {email}</>,
          <><strong>SIRET :</strong> 10700501900016</>,
        ],
      },
      {
        title: "Données personnelles collectées",
        paragraphs: [
          "Dans le cadre de nos activités de location et de nos échanges avec les clients, nous pouvons collecter :",
          "Nous veillons à ne collecter que les informations nécessaires à la réalisation de nos services.",
        ],
        bullets: [
          "Nom et prénom ;",
          "Adresse e-mail ;",
          "Numéro de téléphone ;",
          "Adresse de facturation et de livraison ;",
          "Informations relatives aux événements (date, lieu, nature de l’événement) ;",
          "Informations concernant les demandes de devis et les réservations ;",
          "Détails des commandes, paiements et prestations ;",
          "Échanges avec notre service client ;",
          "Données techniques nécessaires au fonctionnement et à la sécurité du site.",
        ],
      },
      {
        title: "Finalités du traitement",
        paragraphs: ["Les données collectées sont utilisées pour :"],
        bullets: [
          "Répondre aux demandes de renseignements ;",
          "Établir et transmettre des devis ;",
          "Gérer les réservations et les contrats de location ;",
          "Organiser la préparation, la livraison, la mise à disposition et la récupération du matériel ;",
          "Assurer le suivi des paiements et la facturation ;",
          "Gérer les réclamations et le service après-vente ;",
          "Respecter nos obligations légales et comptables ;",
          "Améliorer le fonctionnement et la sécurité du site ;",
          "Adresser des communications commerciales lorsque la réglementation le permet.",
        ],
      },
      {
        title: "Paiements en ligne",
        paragraphs: [
          "Les paiements en ligne peuvent être réalisés par l’intermédiaire de prestataires tiers, notamment Stripe et PayPal. Ces prestataires traitent les informations nécessaires à la réalisation et à la sécurisation des transactions conformément à leurs propres conditions et politiques de confidentialité.",
          "Lorsque le paiement est directement effectué sur l’interface sécurisée du prestataire, Passyeventz ne collecte ni ne conserve les numéros complets de cartes bancaires ni les cryptogrammes de sécurité.",
          "Certaines informations relatives à la transaction, telles que le montant, la date, le statut du paiement et une référence de transaction, peuvent être communiquées à Passyeventz pour assurer le suivi de la réservation et de la comptabilité.",
        ],
      },
      {
        title: "Destinataires des données",
        paragraphs: ["Les données peuvent être accessibles, dans la limite de leurs missions respectives, à :"],
        bullets: [
          "Passyeventz et aux personnes habilitées ;",
          "Vercel, en qualité de prestataire d’hébergement et d’infrastructure du site ;",
          "Stripe et PayPal, pour le traitement des paiements ;",
          "Aux prestataires techniques intervenant dans la maintenance et le fonctionnement du site ;",
          "Aux prestataires de livraison, lorsque cela est nécessaire ;",
          "Aux autorités compétentes lorsque la loi l’exige.",
        ],
      },
      {
        title: "Durée de conservation",
        paragraphs: [
          "Les données sont conservées pendant une durée proportionnée à leur finalité et conformément aux obligations légales.",
          "Les informations relatives aux devis non suivis d’une réservation, aux clients, aux prospects et aux factures font l’objet de durées de conservation distinctes, définies selon les obligations applicables. Les documents comptables et pièces justificatives sont conservés pendant les durées légales requises.",
        ],
      },
      {
        title: "Sécurité des données",
        paragraphs: [
          "Passyeventz met en œuvre des mesures techniques et organisationnelles adaptées pour protéger les informations personnelles contre les accès non autorisés, la perte, l’altération ou la divulgation.",
          "Les paiements sont confiés à des prestataires spécialisés disposant de leurs propres dispositifs de sécurité.",
        ],
      },
      {
        title: "Transferts de données",
        paragraphs: [
          "Certains prestataires techniques ou de paiement peuvent traiter des données depuis des pays situés en dehors de l’Espace économique européen.",
          "Lorsque de tels transferts ont lieu, ils doivent être encadrés conformément au RGPD, notamment par une décision d’adéquation ou des garanties appropriées lorsque celles-ci sont nécessaires.",
        ],
      },
      {
        title: "Vos droits",
        paragraphs: [
          "Conformément à la réglementation applicable, vous disposez notamment des droits suivants :",
          <>Pour exercer vos droits, contactez-nous à l’adresse suivante : {email}.</>,
          <>Vous pouvez également déposer une réclamation auprès de la CNIL : <a className="font-medium text-gold underline underline-offset-4" href="https://www.cnil.fr" target="_blank" rel="noreferrer">cnil.fr</a>.</>,
        ],
        bullets: [
          "Droit d’accès ;",
          "Droit de rectification ;",
          "Droit à l’effacement, dans les limites prévues par la loi ;",
          "Droit à la limitation du traitement ;",
          "Droit d’opposition ;",
          "Droit à la portabilité lorsque celui-ci est applicable ;",
          "Droit de retirer votre consentement lorsque le traitement repose sur celui-ci.",
        ],
      },
      {
        title: "Modification de la politique",
        paragraphs: ["Passyeventz se réserve le droit de modifier la présente politique afin de tenir compte des évolutions légales, réglementaires ou techniques. La version actualisée sera publiée sur le site."],
      },
      {
        title: "Contact",
        paragraphs: [<>Pour toute question relative à vos données personnelles, vous pouvez nous contacter à {email}.</>],
      },
    ],
  },
  {
    slug: "conditions-generales-utilisation",
    title: "Conditions générales d’utilisation",
    updatedAt: "7 novembre 2026",
    intro: <>Bienvenue sur le site <strong>Passyeventz</strong>. Les présentes Conditions générales d’utilisation définissent les modalités d’accès et d’utilisation du site Internet Passyeventz. En naviguant sur le site, l’utilisateur s’engage à respecter les présentes conditions.</>,
    sections: [
      {
        title: "Présentation du site",
        paragraphs: ["Le site Passyeventz est destiné à présenter les articles et services proposés par l’entreprise, notamment :"],
        bullets: [
          "La location de mobilier événementiel ;",
          "La location d’articles d’art de la table ;",
          "La location d’accessoires et d’éléments décoratifs ;",
          "Les prestations de décoration et de mise en scène événementielle ;",
          "Les demandes de renseignements et de devis.",
        ],
      },
      {
        title: "Accès au site",
        paragraphs: ["Le site est accessible gratuitement à tout utilisateur disposant d’une connexion Internet.", "Passyeventz met tout en œuvre pour assurer la disponibilité du site. Toutefois, l’accès peut être temporairement interrompu pour des opérations de maintenance, de mise à jour ou en raison de difficultés techniques."],
      },
      {
        title: "Utilisation du site",
        paragraphs: ["L’utilisateur s’engage à utiliser le site conformément aux lois et réglementations en vigueur. Il s’interdit notamment :"],
        bullets: [
          "Toute utilisation frauduleuse ou illicite du site ;",
          "Toute tentative d’accès non autorisé aux systèmes informatiques ;",
          "Toute action susceptible de perturber le fonctionnement du site ;",
          "Toute transmission de contenu malveillant ;",
          "Toute utilisation non autorisée des contenus et éléments de propriété intellectuelle.",
        ],
      },
      {
        title: "Informations relatives aux produits et services",
        paragraphs: ["Passyeventz s’efforce de présenter des informations exactes concernant les articles et prestations proposés.", "Les photographies, descriptions et visuels sont communiqués à titre illustratif. Des différences mineures peuvent exister entre les photographies présentées et les articles effectivement disponibles.", "Les disponibilités, tarifs et conditions de location sont confirmés dans le devis ou le document contractuel applicable. La présentation d’un article sur le site ne constitue pas une garantie de disponibilité à une date donnée."],
      },
      {
        title: "Demandes de devis et réservations",
        paragraphs: ["Les utilisateurs peuvent effectuer des demandes de renseignements et de devis depuis le site. Une demande de devis ne constitue pas une réservation définitive.", "Les conditions de confirmation, de paiement et d’exécution d’une location sont précisées dans le devis et les Conditions générales de location ou de vente applicables."],
      },
      {
        title: "Propriété intellectuelle",
        paragraphs: ["Les textes, photographies, logos, graphismes, visuels, éléments de design et contenus présents sur le site sont protégés par les dispositions relatives à la propriété intellectuelle.", "Toute reproduction, représentation, diffusion ou exploitation sans autorisation écrite préalable de Passyeventz est interdite, sauf exceptions prévues par la loi."],
      },
      {
        title: "Liens externes",
        paragraphs: ["Le site peut contenir des liens vers des sites ou plateformes tiers. Passyeventz ne contrôle pas ces services externes et ne saurait être tenue responsable de leur contenu, de leur disponibilité ou de leurs pratiques."],
      },
      {
        title: "Responsabilité",
        paragraphs: ["Passyeventz ne saurait être tenue responsable des dommages résultant d’une mauvaise utilisation du site ou d’une interruption indépendante de sa volonté. Cette disposition ne limite pas les droits dont bénéficient les utilisateurs en vertu des dispositions légales impératives applicables."],
      },
      {
        title: "Données personnelles et cookies",
        paragraphs: [<>Les données personnelles sont traitées conformément à notre <Link className="font-medium text-gold underline underline-offset-4" href="/legal/politique-de-confidentialite">Politique de confidentialité</Link>. L’utilisation des cookies et autres traceurs est détaillée dans notre <Link className="font-medium text-gold underline underline-offset-4" href="/legal/politique-de-cookies">Politique de cookies</Link>.</>],
      },
      {
        title: "Modification des conditions",
        paragraphs: ["Passyeventz peut modifier les présentes conditions à tout moment afin de tenir compte des évolutions du site ou de la réglementation. La version applicable est celle publiée sur le site au moment de la consultation."],
      },
      {
        title: "Droit applicable",
        paragraphs: ["Les présentes conditions sont soumises au droit français, sous réserve des dispositions impératives applicables. En cas de difficulté, les parties sont invitées à rechercher une solution amiable."],
      },
      {
        title: "Contact",
        paragraphs: [<>Pour toute question relative à l’utilisation du site, vous pouvez contacter Passyeventz à {email}.</>],
      },
    ],
  },
  {
    slug: "conditions-generales-location",
    title: "Conditions générales de location",
    updatedAt: "7 novembre 2026",
    reviewNotice: "Projet de conditions générales de location à relire et valider avant application. Les conditions particulières du devis signé prévalent pour chaque réservation. Les modalités de livraison, de retour, d’annulation, de caution et de retard doivent être confirmées par Passyeventz avant publication définitive.",
    intro: "Les présentes conditions encadrent les demandes de location de mobilier, d’articles d’art de la table, d’accessoires et d’équipements événementiels proposés par Passyeventz.",
    sections: [
      {
        title: "Demande et disponibilité",
        paragraphs: ["La sélection effectuée sur le site et l’envoi d’une demande ne constituent pas une réservation définitive. Les quantités, tarifs et disponibilités sont vérifiés par Passyeventz et confirmés dans un devis personnalisé."],
      },
      {
        title: "Confirmation de la réservation",
        paragraphs: ["Selon les conditions communiquées dans le devis, la réservation est confirmée après acceptation et signature du devis ainsi que le versement de l’acompte indiqué. Le devis signé accompagné du versement de l’acompte de 40 % vaut acceptation des conditions de la prestation et confirmation de la réservation de la date, conformément aux conditions actuellement indiquées sur les devis Passyeventz."],
      },
      {
        title: "Prix et prestations",
        paragraphs: ["Les prix, quantités, prestations, frais éventuels de livraison et de nettoyage sont précisés dans le devis. Les tarifs affichés dans le catalogue en ligne sont indicatifs ; le prix confirmé dans le devis accepté s’applique à la réservation."],
      },
      {
        title: "Paiement",
        paragraphs: ["L’échéancier, le montant de l’acompte et le solde à régler sont précisés dans le devis. Les paiements en ligne peuvent être opérés par les prestataires indiqués au moment du paiement. Toute prestation complémentaire non mentionnée dans le devis initial fait l’objet d’un devis additionnel soumis à validation préalable du client."],
      },
      {
        title: "Mise à disposition et livraison",
        paragraphs: ["Les modalités, horaires, lieu et frais de mise à disposition ou de livraison sont convenus dans le devis ou avec Passyeventz avant la réservation. Le client s’assure que le lieu et les accès permettent la livraison, l’installation et la récupération du matériel aux horaires convenus."],
      },
      {
        title: "Utilisation et restitution du matériel",
        paragraphs: ["Le client s’engage à utiliser le matériel conformément à sa destination, à en prendre soin et à le restituer dans les conditions et délais convenus dans le devis. Les modalités de retour, de conditionnement et de nettoyage doivent être confirmées pour chaque réservation."],
      },
      {
        title: "Casse, perte et détérioration",
        paragraphs: ["Toute assiette ou tout verre cassé est facturé à hauteur de 5 € par pièce, conformément aux conditions actuellement indiquées sur les devis Passyeventz. Tout mobilier ou équipement Passyeventz endommagé est facturé sur la base de sa valeur de remplacement au prix du marché. Les modalités de constat et de facturation restent à préciser dans le devis applicable."],
      },
      {
        title: "Nettoyage",
        paragraphs: ["Le devis précise si le nettoyage est réalisé par Passyeventz ou par le client et, le cas échéant, les frais associés. Le choix du nettoyage par Passyeventz peut faire l’objet d’un tarif par convive indiqué dans le devis."],
      },
      {
        title: "Modification et annulation",
        paragraphs: ["Toute demande de modification ou d’annulation doit être adressée à Passyeventz par écrit. Les conséquences éventuelles sur les sommes versées, les frais engagés et la disponibilité du matériel doivent être confirmées dans le devis ou par accord écrit entre les parties avant validation de la réservation."],
      },
      {
        title: "Responsabilité",
        paragraphs: ["Le client est responsable du matériel pendant la période et selon les modalités définies dans le devis. Aucune stipulation des présentes ne limite les droits ou responsabilités auxquels il ne peut être dérogé en vertu des dispositions légales applicables."],
      },
      {
        title: "Droit applicable et réclamations",
        paragraphs: ["Les présentes conditions sont soumises au droit français, sous réserve des dispositions impératives applicables. Toute question ou réclamation peut être adressée à Passyeventz à l’adresse suivante : ", email],
      },
    ],
  },
  {
    slug: "politique-de-cookies",
    title: "Politique de cookies",
    updatedAt: "7 novembre 2026",
    intro: <>Le site <strong>Passyeventz</strong> peut utiliser des cookies et autres traceurs afin d’assurer son fonctionnement, de sécuriser la navigation et, sous réserve de votre consentement lorsque celui-ci est requis, d’améliorer votre expérience utilisateur.</>,
    sections: [
      {
        title: "Qu’est-ce qu’un cookie ?",
        paragraphs: ["Un cookie est un petit fichier texte enregistré sur votre ordinateur, tablette ou téléphone lors de la consultation d’un site Internet. Il permet notamment de mémoriser certaines informations relatives à votre navigation et à vos préférences."],
      },
      {
        title: "Catégories de cookies",
        paragraphs: [
          "Selon les fonctionnalités effectivement installées sur le site, différentes catégories de cookies peuvent être utilisées.",
          "À la date de mise à jour de cette politique, aucun outil optionnel de mesure d’audience ou de publicité n’est activé sur le site. Le choix de consentement est mémorisé dans le stockage local du navigateur.",
        ],
        bullets: [
          <><strong>Cookies strictement nécessaires :</strong> ils assurent la sécurité, le fonctionnement technique du site et la mémorisation des choix indispensables. Ils ne nécessitent pas de consentement préalable lorsqu’ils répondent aux critères d’exemption réglementaire.</>,
          <><strong>Cookies de mesure d’audience :</strong> ils mesurent la fréquentation et analysent les pages consultées ; ils sont soumis au consentement lorsqu’ils ne bénéficient pas d’une exemption.</>,
          <><strong>Cookies fonctionnels :</strong> ils peuvent mémoriser certaines préférences de navigation ou améliorer des fonctionnalités.</>,
          <><strong>Cookies publicitaires et de réseaux sociaux :</strong> ils peuvent personnaliser des contenus, mesurer des campagnes ou faciliter des interactions avec des plateformes externes ; ils nécessitent un consentement préalable lorsque celui-ci est requis.</>,
        ],
      },
      {
        title: "Gestion de votre consentement",
        paragraphs: [<>Lors de votre première visite, vous pouvez accepter, refuser ou personnaliser les catégories optionnelles. Vous pouvez modifier votre choix à tout moment à l’aide du lien « Gérer mes cookies » accessible depuis le pied de page.</>,
          "Le refus des cookies non essentiels ne doit pas empêcher l’accès aux fonctionnalités principales du site."],
      },
      {
        title: "Durée de conservation",
        paragraphs: ["La durée de conservation des cookies dépend de leur finalité et de la réglementation applicable. Le choix exprimé par l’utilisateur concernant les cookies est conservé pendant une durée limitée. La CNIL recommande généralement une durée de six mois pour conserver le choix de consentement ou de refus, sous réserve du contexte."],
      },
      {
        title: "Services tiers",
        paragraphs: ["Certains services intégrés au site peuvent utiliser leurs propres traceurs. Les services de paiement Stripe et PayPal peuvent notamment utiliser des technologies nécessaires à la sécurité et au fonctionnement de leurs interfaces de paiement. Les conditions applicables à ces services sont précisées dans leurs propres politiques."],
      },
      {
        title: "Paramétrage du navigateur",
        paragraphs: ["Vous pouvez également configurer votre navigateur pour bloquer ou supprimer certains cookies. La désactivation de cookies strictement nécessaires peut toutefois affecter certaines fonctionnalités du site."],
      },
      {
        title: "Modification de la politique",
        paragraphs: ["Passyeventz peut modifier la présente politique en fonction des évolutions techniques, réglementaires et des services utilisés."],
      },
      {
        title: "Contact",
        paragraphs: [<>Pour toute question concernant les cookies, vous pouvez nous contacter à {email}.</>],
      },
    ],
  },
];

export function getLegalDocument(slug: string) {
  return legalDocuments.find((document) => document.slug === slug);
}
