import { Suspense } from "react";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ statut?: string | string[] }>;
};

export default function PaymentConfirmationPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<PaymentConfirmationContent />}>
      <PaymentConfirmationStatus searchParams={searchParams} />
    </Suspense>
  );
}

async function PaymentConfirmationStatus({ searchParams }: Props) {
  const { statut } = await searchParams;
  const paymentError = statut === "erreur";
  const paymentCanceled = statut === "annule";

  return (
    <PaymentConfirmationContent
      heading={
        paymentError
          ? "Vérification en cours"
          : paymentCanceled
            ? "Paiement interrompu"
            : "Merci pour votre paiement"
      }
      message={
        paymentError
          ? "Nous n’avons pas pu confirmer le paiement pour le moment. Si votre compte a été débité, contactez-nous avant de réessayer."
          : paymentCanceled
            ? "Aucun paiement n’a été confirmé. Contactez-nous si vous souhaitez recevoir un nouveau lien de paiement."
            : "Le prestataire nous transmet la confirmation de votre paiement. Votre réservation sera confirmée après vérification."
      }
    />
  );
}

function PaymentConfirmationContent({
  heading = "Vérification du paiement",
  message = "Veuillez patienter pendant que nous vérifions les informations transmises par le prestataire.",
}: {
  heading?: string;
  message?: string;
}) {
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-4 py-16 sm:px-6">
      <section className="w-full rounded-3xl border border-line bg-white p-7 text-center shadow-[0_18px_40px_rgba(8,7,6,0.04)] sm:p-12">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">PASSYEVENTZ</p>
        <h1 className="mt-4 font-serif text-4xl text-foreground">{heading}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">{message}</p>
        <Link
          href="/"
          className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-gold px-6 text-sm font-semibold text-foreground hover:bg-light-gold"
        >
          Retour à l’accueil
        </Link>
      </section>
    </main>
  );
}
