type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <p className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.28em] text-gold">
        {eyebrow}
      </p>
      <h2 className="font-serif text-4xl leading-none text-foreground sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-muted">{description}</p>
    </div>
  );
}
